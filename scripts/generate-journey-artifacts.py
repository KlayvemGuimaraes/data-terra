#!/usr/bin/env python3
"""Gera os cadernos de jornada e persona em PDF, além dos arquivos para o pitch.

Dependências: reportlab, fonttools, brotli, pillow e pymupdf.
Renderização de entrega: Poppler (pdftoppm). As fontes vêm de assets/fonts.
Uso: python scripts/generate-journey-artifacts.py
"""
from pathlib import Path
from html import escape
import json
import math
import re
import shutil
import subprocess
import tempfile
import zipfile
import xml.etree.ElementTree as ET

from fontTools.ttLib import TTFont as FontTool
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.basePen import BasePen
from fontTools.svgLib.path import parse_path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
import fitz

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output"
PDF = OUT / "pdf"
PNG = OUT / "png"
TEXT = OUT / "textos"
TMP = Path(tempfile.gettempdir()) / "dataterra-jornada-build"
for d in (PDF, PNG, TEXT, TMP):
    d.mkdir(parents=True, exist_ok=True)

W, H = 1280, 720
# A identidade vem do simulador em uso, não dos PNGs históricos de assets/.
css = (ROOT / "styles.css").read_text(encoding="utf-8")
dark_block = re.search(r'\[data-theme="dark"\]\s*\{([^}]+)\}', css).group(1)
dark = dict(re.findall(r'--([\w-]+):\s*(#[\da-fA-F]{6})', dark_block))
C = {key: dark[key] for key in ("bg", "panel", "ink", "muted", "line", "accent", "sage", "terra")}
C.update(panel_soft=dark["panel-soft"], accent_strong=dark["accent-dark"],
         warning="#332e24", warning_line="#504331", active="#2b4131",
         active_line="#49603e", on_accent="#14231c")
html = (ROOT / "index.html").read_text(encoding="utf-8")
brand_svg = ET.fromstring(re.search(r'<svg class="brand-icon"[\s\S]*?</svg>', html).group(0))
BRAND_PATHS = [p.attrib["d"] for p in brand_svg if p.tag.endswith("path")]

def register_font(name, filename, weight=None):
    f = FontTool(ROOT / "assets/fonts" / filename)
    f.flavor = None
    if weight is not None and "fvar" in f:
        f = instantiateVariableFont(f, {"wght": weight}, inplace=False)
    # Instâncias da mesma fonte variável precisam de PostScript names distintos
    # para o PDF preservar o peso 750 de "data" e o peso 400 de "terra".
    for record in f["name"].names:
        if record.nameID == 6:
            record.string = name.encode(record.getEncoding())
    target = TMP / (name + ".ttf")
    f.save(target)
    pdfmetrics.registerFont(TTFont(name, str(target)))

register_font("Poppins", "poppins-latin-400.woff2")
register_font("PoppinsMedium", "poppins-latin-500.woff2")
register_font("PoppinsBold", "poppins-latin-600.woff2")
register_font("Montserrat", "montserrat-latin-variable.woff2", 650)
register_font("MontserratBrandBold", "montserrat-latin-variable.woff2", 750)
register_font("MontserratBrandRegular", "montserrat-latin-variable.woff2", 400)
pdfmetrics.registerFontFamily("Poppins", normal="Poppins", bold="PoppinsBold", italic="Poppins", boldItalic="PoppinsBold")

def col(v):
    return HexColor(C.get(v, v))

class LogoPen(BasePen):
    """Reproduz exatamente os caminhos SVG da marca usada no cabeçalho do MVP."""
    def __init__(self, path):
        super().__init__(None)
        self.path = path

    def _moveTo(self, p): self.path.moveTo(*p)
    def _lineTo(self, p): self.path.lineTo(*p)
    def _curveToOne(self, p1, p2, p3): self.path.curveTo(*p1, *p2, *p3)
    def _closePath(self): self.path.close()

class Page:
    def __init__(self, c):
        self.c = c

    def rect(self, x, y, w, h, fill="panel", stroke=None, r=12, dash=False):
        c = self.c
        c.saveState()
        c.setFillColor(col(fill))
        if stroke:
            c.setStrokeColor(col(stroke))
            c.setLineWidth(1)
        if dash:
            c.setDash(5, 4)
        c.roundRect(x, H-y-h, w, h, r, fill=1, stroke=bool(stroke))
        c.restoreState()

    def text(self, txt, x, y, w, size=16, color="ink", font="Poppins", leading=None,
             maxh=None, align=0, markup=False):
        st = ParagraphStyle("p", fontName=font, fontSize=size, leading=leading or size*1.4,
                            textColor=col(color), alignment=align, splitLongWords=False,
                            spaceAfter=0, spaceBefore=0)
        p = Paragraph(txt if markup else escape(txt).replace("\n", "<br/>"), st)
        _, h = p.wrap(w, H)
        if maxh is not None and h > maxh + .1:
            raise ValueError(f"Texto excede caixa: {txt[:85]!r}: {h:.1f} > {maxh}")
        if y+h > 682:
            raise ValueError(f"Texto invade rodapé: {txt[:75]!r}: {y+h}")
        p.drawOn(self.c, x, H-y-h)
        return h

    def line(self, points, color="sage", width=2, arrow=False, dash=False):
        c=self.c
        c.saveState(); c.setStrokeColor(col(color)); c.setFillColor(col(color)); c.setLineWidth(width)
        if dash: c.setDash(5,4)
        p=c.beginPath(); p.moveTo(points[0][0],H-points[0][1])
        for x,y in points[1:]: p.lineTo(x,H-y)
        c.drawPath(p)
        if arrow:
            x,y=points[-1]; px,py=points[-2]
            a=math.atan2(y-py,x-px); length=7; wing=3.3
            verts=[(x,y),(x-length*math.cos(a)+wing*math.sin(a),y-length*math.sin(a)-wing*math.cos(a)),
                   (x-length*math.cos(a)-wing*math.sin(a),y-length*math.sin(a)+wing*math.cos(a))]
            p=c.beginPath(); p.moveTo(verts[0][0],H-verts[0][1])
            for vx,vy in verts[1:]: p.lineTo(vx,H-vy)
            p.close(); c.setDash(); c.drawPath(p,fill=1,stroke=0)
        c.restoreState()

    def circle(self,x,y,r,fill="accent"):
        self.c.setFillColor(col(fill)); self.c.circle(x,H-y,r,fill=1,stroke=0)

    def brand(self, x, y):
        c = self.c
        c.saveState()
        c.translate(x, H-y)
        c.scale(25/24, -25/24)
        c.setStrokeColor(col("accent")); c.setLineWidth(2)
        c.setLineCap(1); c.setLineJoin(1)
        for svg_path in BRAND_PATHS:
            path = c.beginPath()
            parse_path(svg_path, LogoPen(path))
            c.drawPath(path, stroke=1, fill=0)
        c.restoreState()
        c.saveState()
        text = c.beginText(x+34, H-y-23)
        text.setCharSpace(-1.3)
        for word, font, color in [("data", "MontserratBrandBold", "ink"),
                                  ("terra", "MontserratBrandRegular", "ink"),
                                  (".", "MontserratBrandBold", "terra")]:
            text.setFont(font,28); text.setFillColor(col(color)); text.textOut(word)
        c.drawText(text)
        c.restoreState()

    def header(self, kicker, title, sub, page, total):
        self.rect(0,0,W,H,"bg",r=0)
        self.brand(48,23)
        self.line([(268,23),(268,50)],"line",1)
        self.text(kicker,292,30,745,11,"sage","PoppinsBold",maxh=18)
        self.text("MATERIAL DE APOIO",1070,31,162,9.4,"muted",align=2)
        self.line([(48,70),(1232,70)],"line",.8)
        self.text(title,48,84,1184,31,"ink","Montserrat",maxh=46)
        self.text(sub,48,135,1184,13.2,"muted",maxh=23)
        self.line([(48,684),(1232,684)],"line",.8)
        self.c.setFillColor(col("muted")); self.c.setFont("Poppins",10)
        self.c.drawString(48,20,"DataTerra | Jornadas e público-alvo | 23/10/2026")
        self.c.drawRightString(1232,20,f"{page:02d} / {total:02d}")

    def node(self,x,y,w,h,n,title,body,fill="panel",size=14):
        self.rect(x,y,w,h,fill,"line")
        self.rect(x+10,y+11,28,27,"accent",r=7)
        self.text(f"{n:02d}",x+11,y+15,26,11,"on_accent","PoppinsBold",align=1,maxh=18)
        th=self.text(title,x+17,y+48,w-34,18,"ink","Montserrat",maxh=53)
        self.text(body,x+17,y+57+th,w-34,size,"muted",maxh=h-67-th)

    def smallnode(self,x,y,w,h,n,title,body):
        self.rect(x,y,w,h,"panel","line")
        self.rect(x+11,y+12,28,27,"accent",r=7)
        self.text(str(n),x+12,y+16,26,12,"on_accent","PoppinsBold",align=1,maxh=19)
        self.text(title,x+46,y+13,w-60,17,"ink","Montserrat",maxh=25)
        self.text(body,x+17,y+47,w-34,13.2,"muted",maxh=h-52)

    def link(self,text,url,x,y,w,size=13):
        self.text(f'<link href="{escape(url,quote=True)}" color="{C["accent"]}"><u>{escape(text)}</u></link>',x,y,w,size,markup=True)

SOURCES = [
 ("P1","Pitch DataTerra, slide 7","Quadro original de Fátima: cargo, objetivo e desafio.","https://www.canva.com/design/DAHYqRoXY1I/4l2_8bvNnVlrE-znorBiAQ/edit"),
 ("P2","Visão Geral - Hackathon E+","Páginas 2 e 12: público amplo da PID e recorte DataTerra.","https://drive.google.com/file/d/1UUzoavvxiFGUX2f0HA1PLLpsMTh_fJ0z/view"),
 ("P3","Roteiro de Pitch","Páginas 1-3: problema, solução e promessas a delimitar.","https://drive.google.com/file/d/1zZTft9kB3JJ_807sbROMvNm9I4vOs4i5/view"),
 ("P4","Cases de DataCenters pelo mundo","Páginas 2-3: repetição de texto da Microsoft em Quilicura.","https://drive.google.com/file/d/1F3qqYGMLmZ_TSB7lKZeDuJzpVPNib_Lo/view"),
 ("P5","Bemmover, slide 7","Referência de sequência, atores e ciclos de retorno.","https://www.canva.com/design/DAGxmDztHmM/zmIXqdn-Zizq081G-n5Tlg/edit"),
 ("R1","Prefeitura de Vinhedo | 04/10/2018","Anúncio do início das obras do campus da Ascenty.","https://www.vinhedo.sp.gov.br/portal/noticias/0/3/1344/prefeitura-anuncia-instalacao-do-maior-data-center-da-america-latina-em-vinhedo/tmp/chamados"),
 ("R2","Ascenty | 21/10/2019","Inauguração da primeira unidade em Vinhedo.","https://ascenty.com/blog/news-ascenty/ascenty-inaugura-14-data-center-no-brasil-o-maior-da-america-latina/"),
 ("R3","Ascenty | 30/11/2020","Entrada em operação da segunda unidade do campus.","https://ascenty.com/blog/news-ascenty/ascenty-inicia-a-operacao-do-seu-segundo-data-center-no-seu-mega-campus-em-vinhedo/"),
 ("R4","Prefeitura de Fortaleza | 16/04/2019","Inauguração do AngoNAP na Praia do Futuro.","https://www.fortaleza.ce.gov.br/noticias/prefeito-roberto-claudio-e-governador-camilo-santana-participam-da-inauguracao-do-data-center-da-angola-cables"),
 ("R5","Angola Cables / RNP | WTR-CE 2019","Slide 2: marcos Monet (2017), SACS (2018) e AngoNAP (2019).","https://wtr.rnp.br/pop-ce/sites/default/files/WTR-CE_2019_AngolaCables_Andr%C3%A9Martins.pdf"),
 ("R6","Ibama | Licenciamento ambiental","Procedimentos e competências: confirmar o rito do projeto.","https://www.gov.br/ibama/pt-br/acesso-a-informacao/perguntas-frequentes/licenciamento-ambiental"),
 ("R7","ANA | Outorga de recursos hídricos","Competência federal ou estadual conforme o recurso hídrico.","https://www.gov.br/ana/pt-br/assuntos/gestao-das-aguas/politica-nacional-de-recursos-hidricos/outorga-dos-direitos-de-uso-de-recursos-hidricos"),
]

def journey_one(p):
    p.header("01 / JORNADA DE USO", "Da pergunta à pré-seleção de locais",
             "Fátima define a demanda. A equipe técnica usa o simulador e leva evidências para a decisão.",1,4)
    p.rect(208,177,692,293,"panel_soft","active_line",r=15)
    p.text("ANALISTA NO DATATERRA",224,189,650,12,"accent","PoppinsBold")
    p.text("DEMANDA",48,189,151,12,"muted","PoppinsBold")
    p.text("DECISÃO DA EQUIPE",916,189,318,12,"muted","PoppinsBold")
    x=[48,220,392,564,736,908,1080]; y=233; w=152; h=223
    for i in range(4): p.line([(x[i]+w,y+105),(x[i+1],y+105)],arrow=True)
    p.line([(888,338),(908,338)],arrow=True)
    p.line([(1060,338),(1080,338)],arrow=True)
    p.node(x[0],y,w,h,1,"Alinhe a\nbusca","Defina carga, prazo, regiões e requisitos mínimos.")
    p.node(x[1],y,w,h,2,"Abra o\nsimulador","Abra o mapa e explore UFs, municípios e candidatos.")
    p.node(x[2],y,w,h,3,"Escolha\num ponto","Selecione uma região ou clique no mapa.")
    p.node(x[3],y,w,h,4,"Configure\no cenário","Defina raio, carga de TI, L/kWh e pesos.")
    p.node(x[4],y,w,h,5,"Leia as\nevidências","Leia score local, água, alertas, fontes e Como calculamos.")
    p.text("06",966,239,36,13,"accent","PoppinsBold",align=1)
    c=p.c; c.setFillColor(col("panel")); c.setStrokeColor(col("sage")); c.setLineWidth(1.4)
    q=c.beginPath(); q.moveTo(984,H-264)
    for a,b in [(1060,338),(984,412),(908,338)]:q.lineTo(a,H-b)
    q.close();c.drawPath(q,fill=1,stroke=1)
    p.text("Há base para priorizar este local?",937,307,94,13,"accent","PoppinsBold",maxh=65,align=1)
    p.text("Sim",1050,307,40,11,"accent","PoppinsBold",align=1)
    p.node(x[6],y,w,h,7,"Leve à\ndecisão","Registre opções e pendências. Fátima prioriza os estudos.")
    p.line([(984,412),(984,527),(468,527),(468,456)],"terra",1.8,True)
    p.text("Não / faltam dados",1001,477,225,12,"terra","PoppinsBold")
    p.text("Revise o local, o cenário ou a fonte antes de avançar.",494,489,472,13,"terra")
    p.rect(48,567,1184,91,"panel","line")
    p.text("SAÍDA DA JORNADA",66,581,195,12,"accent","PoppinsBold")
    p.text("Pré-seleção de locais + parâmetros + riscos + próximos estudos.",66,605,705,18,"accent","Montserrat")
    p.text("Compare opções repetindo a análise local e registrando os resultados fora do simulador.",850,581,354,14,"muted",maxh=66)
    p.text("Triagem preliminar. Ranking regional e análise local usam bases diferentes; posição no ranking não valida o imóvel. [M1]",48,664,1180,10.2,"muted",maxh=16)

def journey_two(p):
    p.header("02 / JORNADA ATÉ A IMPLANTAÇÃO", "Da seleção territorial ao datacenter em operação",
             "O DataTerra apoia a triagem; a implantação depende de validação técnica, aprovações e execução externas.",2,4)
    bands=[(48,"A / SELECIONAR","Fátima + analista"),(450,"B / VALIDAR E APROVAR","Engenharia + ESG + jurídico + finanças"),(852,"C / IMPLANTAR","Empreendedor + construtoras + operação")]
    for x,title,who in bands:
        p.rect(x,171,380,392,"panel_soft" if x==48 else "panel","line",r=12)
        p.text(title,x+16,185,348,15,"accent","PoppinsBold")
        p.text(who,x+16,210,348,11.4,"muted")
    coords=[(64,242),(64,350),(64,458),(466,242),(466,350),(466,458),(868,242),(868,350),(868,458)]
    rows=[
      ("Definir requisitos", "Energia, água/refrigeração, latência, terreno, prazo, orçamento e riscos sociais."),
      ("Triar com o DataTerra", "Explorar regiões; analisar ponto e raio; ler score, fontes e limitações."),
      ("Selecionar alternativas", "Equipe registra a pré-seleção e as pendências. Fátima autoriza estudos."),
      ("Comprovar viabilidade", "Visitas e estudos: conexão, água, fibra, terreno, clima e comunidades."),
      ("Aprovar o investimento", "Comitê avalia custos, prazos, riscos e condições de contratação."),
      ("Projetar e autorizar", "Projetos, contratos, licenças e outorgas aplicáveis antes das respectivas atividades."),
      ("Construir e conectar", "Obras, equipamentos e conexões conforme projetos e autorizações."),
      ("Comissionar e liberar", "Testar sistemas e redundância; atender exigências para entrar em operação."),
      ("Operar e monitorar", "Medir energia, água e emissões; cumprir condicionantes e revisar a expansão."),
    ]
    for i,((x,y),(title,body)) in enumerate(zip(coords,rows)):
        p.smallnode(x,y,348,95,i+1,title,body)
    for x in (238,640,1042):
        for y in (337,445): p.line([(x,y),(x,y+13)],arrow=True)
    p.line([(412,505),(439,505),(439,289),(466,289)],arrow=True)
    p.line([(814,505),(841,505),(841,289),(868,289)],arrow=True)
    p.rect(48,582,1184,72,"warning","warning_line")
    p.text("PONTO DE DECISÃO",66,593,250,11.7,"terra","PoppinsBold")
    p.text("Se a validação (4) ou a aprovação (5-6) indicar inviabilidade: revisar alternativas na etapa 2.",66,615,1124,15,"ink",maxh=28)
    p.text("Fluxo ilustrativo: atividades podem ocorrer em paralelo. Órgão competente e exigências variam por local e projeto. [R6, R7]",48,663,1180,10.2,"muted",maxh=16)

def real_cases(p):
    p.header("03 / CASOS INSTALADOS NO BRASIL", "Infraestruturas reais, decisões concretas",
             "Marcos públicos de implantação ajudam a explicar o percurso entre planejamento, obra e operação.",3,4)
    for x in (48,652): p.rect(x,175,580,394,"panel","line")
    p.text("ASCENTY",70,193,500,12,"sage","PoppinsBold")
    p.text("Campus Vinhedo / SP",70,218,520,27,"accent","Montserrat")
    p.text("ANGONAP / ANGOLA CABLES",674,193,500,12,"sage","PoppinsBold")
    p.text("Praia do Futuro / Fortaleza, CE",674,218,520,24,"accent","Montserrat")
    left=[("04/10/2018","Início das obras anunciado pela prefeitura e pela empresa. [R1]"),
          ("21/10/2019","Primeira unidade inaugurada em Vinhedo. [R2]"),
          ("30/11/2020","Segunda unidade do campus entra em operação. [R3]")]
    right=[("2017","Monet conecta Brasil e Estados Unidos na cronologia da Angola Cables. [R5]"),
           ("2018","SACS conecta Angola e Brasil. [R5]"),
           ("16/04/2019","AngoNAP inaugurado na Praia do Futuro, em Fortaleza. [R4]")]
    for x,rows in [(70,left),(674,right)]:
        p.line([(x+7,287),(x+7,426)],"sage",2)
        for i,(date,txt) in enumerate(rows):
            yy=273+i*69; p.circle(x+7,yy+14,5,"sage")
            p.text(date,x+23,yy,129,13,"accent","PoppinsBold")
            p.text(txt,x+159,yy,372,13.2,"muted",maxh=57)
    p.rect(68,474,540,76,"panel_soft")
    p.text("LEITURA PARA A JORNADA / INFERÊNCIA",82,485,510,10.5,"accent","PoppinsBold")
    p.text("Expansão por fases exige reavaliar a infraestrutura e a capacidade de atendimento a cada novo projeto.",82,507,509,13.1,"ink",maxh=40)
    p.rect(672,474,540,76,"panel_soft")
    p.text("LEITURA PARA A JORNADA / INFERÊNCIA",686,485,510,10.5,"accent","PoppinsBold")
    p.text("A conectividade ajuda a formar a lista de alternativas; água, energia e território exigem análise própria.",686,507,509,13.1,"ink",maxh=40)
    p.rect(48,591,1184,64,"panel_soft","active_line")
    p.text("Como usar no pitch",66,605,245,16,"ink","PoppinsBold")
    p.text("Mostre os marcos reais e, em seguida, a etapa de triagem que o DataTerra poderia apoiar em projetos semelhantes.",327,603,878,15,"ink",maxh=45)
    p.text("Não há evidência de uso do DataTerra por essas empresas. Os marcos não reconstituem seus critérios internos nem certificam sustentabilidade.",48,664,1184,10,"muted",maxh=15)

def source_page(p):
    p.header("04 / FONTES E PREMISSAS", "De onde vieram os fluxos e a revisão",
             "Fontes consultadas em 23/10/2026. Os títulos abaixo são links clicáveis no PDF.",4,4)
    for i,(code,title,desc,url) in enumerate(SOURCES):
        column=0 if i<6 else 1; row=i if i<6 else i-6
        x=48+604*column; y=175+row*67
        p.text(code,x,y,35,11,"sage","PoppinsBold")
        p.link(title,url,x+42,y,524,13)
        p.text(desc,x+42,y+23,524,11.4,"muted",maxh=34)
    p.rect(48,588,1184,72,"panel_soft")
    p.text("M1 / ESCOPO DO MVP",65,600,230,12,"accent","PoppinsBold")
    p.text("README.md, docs/manual-dataterra.html e módulos locais no commit 8cd14ed. Fluxos baseados nas funções documentadas; revisão de jornada não é auditoria de exatidão das bases.",310,600,894,12.4,"muted",maxh=51)
    p.text("Persona, papéis e sequência externa são propostas de síntese a validar com o público. Casos reais: somente os marcos explicitamente citados.",48,666,1180,9.8,"muted",maxh=14)

def persona_pitch(p):
    p.header("PERSONA / PROPOSTA PARA O PITCH", "Fátima precisa saber onde aprofundar",
             "Foco inicial sugerido: equipes que planejam a expansão física de data centers no Brasil.",1,3)
    p.rect(48,176,355,426,"panel_soft","active_line")
    p.text("FÁTIMA",72,199,300,33,"ink","Montserrat")
    p.text("Diretora de expansão\ne infraestrutura",72,252,304,22,"ink","PoppinsBold",maxh=67)
    p.text("Operadora de data centers ou grande empresa de TI com projeto de expansão no Brasil.",72,338,304,16,"ink",maxh=95)
    p.text("GATILHO",72,451,300,11.5,"accent_strong","PoppinsBold")
    p.text("Nova demanda de capacidade de TI. É preciso escolher onde investir em estudos.",72,478,303,15,"ink",maxh=70)
    p.text("Persona hipotética, a validar em entrevistas.",72,568,304,10.7,"accent_strong",maxh=17)
    boxes=[(427,176,"OBJETIVO","Pré-selecionar regiões com evidências suficientes para orientar os próximos estudos de implantação."),
           (841,176,"DOR","Dados dispersos e premissas difíceis de comparar. Receio de descobrir restrições apenas após investir em estudos."),
           (427,398,"O QUE PRECISA VER","Energia e conexão, água, conectividade e riscos territoriais, com origem, limites e pendências dos dados."),
           (841,398,"VALOR ESPERADO","Uma decisão preliminar rastreável: alternativas justificadas, lacunas explícitas e próximos passos definidos.")]
    for x,y,title,body in boxes:
        p.rect(x,y,391,204,"panel","line")
        p.text(title,x+21,y+20,350,12,"sage","PoppinsBold")
        p.text(body,x+21,y+55,345,18,"ink","Poppins",maxh=136)
    p.rect(48,620,1184,41,"panel_soft")
    p.text("Analista opera o simulador",66,630,360,13.2,"accent","PoppinsBold")
    p.text("Fátima prioriza os estudos",466,630,360,13.2,"accent","PoppinsBold")
    p.text("Comitê aprova o investimento",856,630,360,13.2,"accent","PoppinsBold")
    p.line([(398,641),(444,641)],arrow=True); p.line([(792,641),(838,641)],arrow=True)
    p.text("R$ 2,5 bilhões não foi mantido como fato. O valor do quadro original só deve reaparecer identificado como cenário fictício ou com fonte. [P1]",48,668,1180,9.6,"muted",maxh=14)

def persona_review(p):
    p.header("REVISÃO / SLIDE 7 DO PITCH", "O quadro já tem direção; faltam papéis e evidências",
             "Diagnóstico: objetivo e desafio estão presentes, mas ainda não formam uma persona completa para orientar o produto.",2,3)
    x=[48,330,657]; widths=[282,327,575]
    p.rect(48,172,1184,37,"active","active_line",r=7)
    for a,w,t in zip(x,widths,["NO QUADRO ATUAL","AVALIAÇÃO","AJUSTE PROPOSTO"]): p.text(t,a+15,182,w-30,11.5,"ink","PoppinsBold")
    rows=[
      ("Expansão para atender IA", "Objetivo e gatilho estão claros.", "Preservar o contexto e tornar a saída concreta: quais locais merecem estudos?"),
      ("Presidência de expansão, infraestrutura e ESG", "Cargo amplo; concentra responsabilidades distintas.", "Usar expansão/infraestrutura como papel focal; mostrar ESG, engenharia e jurídico como parceiros."),
      ("Empresa de TI de grande porte", "Segmento pouco delimitado; usuário operacional ausente.", "Priorizar operadoras/equipes de expansão e incluir analista ou consultoria como usuário do simulador."),
      ("Fundo de R$ 2,5 bilhões", "Não foi apresentada evidência da persona ou da captação.", "Retirar a precisão financeira ou identificá-la como hipótese ilustrativa. Não tratar como cliente validado."),
      ("Viabilidade e incentivos fiscais", "Necessidades reais da decisão, além do escopo do MVP.", "Separar triagem de estudos de engenharia, custos, elegibilidade fiscal e licenciamento, feitos externamente."),
      ("Dores, rotina e sucesso implícitos", "Faltam comportamento, evidências e critério de valor.", "Adicionar dados fragmentados, rotina de comparação, decisão rastreável e métricas a validar com usuários."),
    ]
    for i,row in enumerate(rows):
        yy=209+i*62
        p.rect(48,yy,1184,62,"panel" if i%2==0 else "panel_soft",r=0)
        for j,t in enumerate(row):
            p.text(t,x[j]+15,yy+10,widths[j]-30,12.3,"ink" if j==0 else "muted",font="PoppinsMedium" if j==0 else "Poppins",maxh=51)
    p.rect(48,601,1184,57,"warning","warning_line")
    p.text("AJUSTE VISUAL",65,613,194,12,"terra","PoppinsBold")
    p.text("No slide atual, a foto cobre parte do título e há palavras quebradas. Use título curto, retrato menor e textos alinhados à esquerda.",267,610,940,13.2,"ink",maxh=42)
    p.text("Base da revisão: [P1] quadro original; [P2-P3] contexto e roteiro; [M1] funções atuais do MVP. Links no caderno de jornadas, página 4.",48,666,1184,10,"muted",maxh=15)

def persona_validation(p):
    p.header("PÚBLICO / VALIDAÇÃO", "Quem participa e o que ainda precisamos descobrir",
             "A proposta distingue usuário, patrocinador e decisor; as hipóteses comportamentais precisam de entrevistas.",3,3)
    p.rect(48,174,580,329,"panel","line"); p.rect(652,174,580,329,"panel","line")
    p.text("PAPÉIS NA JORNADA",68,192,540,13,"sage","PoppinsBold")
    roles=[("Usuário principal", "Analista de localização, engenharia ou consultoria: configura e interpreta cenários."),
           ("Patrocinadora / decisora da triagem", "Fátima: define requisitos e prioriza o investimento em estudos."),
           ("Decisor do investimento", "Comitê ou direção: avalia o caso de negócio e aprova a implantação."),
           ("Especialistas e partes interessadas", "ESG, jurídico, concessionárias, órgãos e comunidades: validam condições e impactos.")]
    for i,(a,b) in enumerate(roles):
        yy=224+i*65
        p.text(a,68,yy,536,12.3,"accent","PoppinsBold")
        p.text(b,68,yy+21,536,12.1,"muted",maxh=36)
    p.text("PERGUNTAS PARA VALIDAR",672,192,540,13,"sage","PoppinsBold")
    qs=["Como você selecionou locais no último projeto? Que fontes e planilhas usou?",
        "Quem analisa, quem contrata a ferramenta e quem aprova os estudos?",
        "Quais critérios eliminam um local antes de comparar a pontuação?",
        "Qual evidência gera confiança? Como trata dados ausentes ou desatualizados?",
        "Quanto tempo a triagem leva hoje? Em qual etapa ocorre mais retrabalho?"]
    for i,q in enumerate(qs):
        p.text(str(i+1)+".",672,226+i*51,23,13,"accent","PoppinsBold")
        p.text(q,701,226+i*51,508,12.5,"muted",maxh=39)
    p.rect(48,519,1184,54,"panel_soft")
    p.text("PÚBLICO ADJACENTE",65,531,226,11.5,"accent","PoppinsBold")
    p.text("Gestores públicos, pesquisadores e investidores aparecem no contexto amplo da PID. Validar seus fluxos separadamente antes de tratá-los como a mesma persona. [P2]",301,529,906,12.2,"muted",maxh=38)
    p.text("CORREÇÕES NO MATERIAL DE APOIO",48,588,1184,12,"terra","PoppinsBold")
    p.text("[P4] Quilicura repete texto de Microsoft/Quincy; o bloco de casos malsucedidos está vazio. Usar os casos brasileiros verificados do caderno de jornadas.",48,614,568,11.2,"muted",maxh=49)
    p.text("[P3] Revisar afirmações gerais sobre obrigação de energia renovável, ausência de concorrentes e impacto ambiental. Exigem fonte, escopo e data; não são resultados do MVP.",652,614,580,11.2,"muted",maxh=49)
    p.text("Métricas sugeridas para entrevistas: tempo de triagem, retrabalho e rastreabilidade das decisões. Não são ganhos já medidos ou prometidos.",48,667,1184,9.7,"muted",maxh=14)

def make_pdf(name, pages, title):
    path=PDF/name
    c=canvas.Canvas(str(path),pagesize=(W,H),pageCompression=1)
    c.setTitle(title);c.setAuthor("DataTerra");c.setSubject("Jornadas, casos reais e revisão de persona para o pitch")
    for fn in pages:
        fn(Page(c)); c.showPage()
    c.save()
    return path

journey = make_pdf("dataterra-jornadas-e-casos.pdf",[journey_one,journey_two,real_cases,source_page],"DataTerra - Jornadas e casos instalados no Brasil")
persona = make_pdf("dataterra-persona-e-revisao.pdf",[persona_pitch,persona_review,persona_validation],"DataTerra - Persona proposta e revisão do pitch")

# Textos de apoio são extraídos dos mesmos PDFs para evitar divergência editorial.
for path in (journey, persona):
    d=fitz.open(path)
    content=[]
    for i,page in enumerate(d): content.append(f"PÁGINA {i+1}\n\n"+page.get_text())
    (TEXT/(path.stem+".txt")).write_text("\n\n".join(content),encoding="utf-8")

meta={"data":"2026-10-23","commit_mvp":"8cd14ed","identidade_visual":{"tema":"escuro","marca":"SVG brand-icon e wordmark de index.html","cores":"tokens de styles.css [data-theme=dark]","tipografia":"Montserrat e Poppins"},"fontes":[dict(id=a,titulo=b,apoia=c,url=d) for a,b,c,d in SOURCES],
      "premissas":["Persona hipotética; proposta a validar em entrevistas.","Casos reais não são clientes nem usuários comprovados do DataTerra.","Fluxo de implantação é uma síntese ilustrativa; ritos e competências variam.","Registro e comparação entre análises locais são atividades da equipe, fora do MVP."]}
(TEXT/"fontes-e-premissas.json").write_text(json.dumps(meta,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
(OUT/"LEIA-ME-jornadas.txt").write_text("""DATATERRA | JORNADAS E PERSONA | 23/10/2026

ENTREGAS
1. pdf/dataterra-jornadas-e-casos.pdf (4 páginas): uso do simulador, implantação,
   dois casos brasileiros inaugurados e fontes clicáveis.
2. pdf/dataterra-persona-e-revisao.pdf (3 páginas): quadro proposto para o pitch,
   revisão do slide 7 e hipóteses/perguntas de validação.
3. png/: páginas em 3840 x 2160, formato 16:9, para inserir no Canva ou no pitch.
4. textos/: conteúdo copiável e registro de fontes/premissas.

USO NO PITCH
Use o fluxo de uso para mostrar o que acontece na plataforma. Use o fluxo de
implantação para mostrar onde a triagem entra no projeto real. A página de casos
ilustra marcos históricos; não apresenta essas empresas como clientes.
O quadro de Fátima é uma proposta de substituição, ainda a validar com usuários.

EDIÇÃO E REPRODUÇÃO
O Canva original não foi alterado. PNGs são imagens; os PDFs contêm texto e
vetores. Para editar o texto no Canva, use os arquivos .txt como base.
Fonte da geração: scripts/generate-journey-artifacts.py. Bibliotecas: reportlab,
fonttools, brotli, pillow, pymupdf. Renderizador: Poppler (pdftoppm).
O script usa as fontes Montserrat e Poppins já existentes no repositório.
Tema escuro: cores extraídas de styles.css. Marca vetorial extraída de index.html,
com ícone de camadas e wordmark dataterra. nas mesmas proporções do simulador.
Os PNGs antigos da marca não são usados nestes materiais.

LIMITES
O DataTerra faz triagem preliminar. Engenharia, custos, contratos, capacidade de
conexão, outorgas e licenças dependem de validação externa. Ranking regional e
análise local não são equivalentes. Esta entrega não é uma nova auditoria do
motor de cálculo, nem validação técnica de um empreendimento.
""",encoding="utf-8")

render_targets=[(journey,["01-jornada-de-uso","02-jornada-ate-implantacao","03-casos-reais-brasil","04-fontes"]),
                (persona,["05-persona-para-pitch","06-revisao-persona","07-validacao-publico"])]
renderer=shutil.which("pdftoppm")
for path,names in render_targets:
    if renderer:
        prefix=TMP/path.stem
        subprocess.run([renderer,"-png","-scale-to-x","3840","-scale-to-y","2160",str(path),str(prefix)],check=True,capture_output=True)
        for i,name in enumerate(names,1): shutil.copy2(str(prefix)+f"-{i}.png",PNG/(name+".png"))
    else:
        # Prévia de trabalho; a entrega final deve ser conferida também com Poppler.
        d=fitz.open(path)
        for page,name in zip(d,names): page.get_pixmap(matrix=fitz.Matrix(3,3)).save(PNG/(name+".png"))

with zipfile.ZipFile(OUT/"dataterra-jornadas-persona.zip","w",zipfile.ZIP_DEFLATED) as z:
    for path in [journey,persona,OUT/"LEIA-ME-jornadas.txt",*sorted(PNG.glob("*.png")),*sorted(TEXT.glob("*"))]:
        z.write(path,str(path.relative_to(OUT)))
print(json.dumps({"pdfs":[str(journey),str(persona)],"pngs":7,"renderer":renderer or "pymupdf-preview","zip":str(OUT/"dataterra-jornadas-persona.zip")},ensure_ascii=False))

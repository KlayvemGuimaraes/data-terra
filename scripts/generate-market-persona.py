#!/usr/bin/env python3
"""Persona baseada no mercado e jornada completa do DataTerra.

Gera dois PDFs, texto com fontes, PNGs em alta resolução e pacote de entrega.
O cenário proposto não é atribuído como intenção ou uso real às pessoas citadas.
Dependências: reportlab, fonttools, brotli, pillow, pymupdf; Poppler.
"""
from pathlib import Path
from html import escape
import json
import math
import re
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
from reportlab.lib.pagesizes import A4, A2, landscape
import fitz

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output'
PDF, PNG, TXT = [OUT / name for name in ('pdf', 'png', 'textos')]
TMP = Path(tempfile.gettempdir()) / 'dataterra-mercado-build'
for path in (PDF, PNG, TXT, TMP):
    path.mkdir(parents=True, exist_ok=True)

DATE = '23/10/2026'
REVISION = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, text=True).strip()
css = (ROOT / 'styles.css').read_text()
block = re.search(r'\[data-theme="dark"\]\s*\{([^}]+)\}', css).group(1)
C = dict(re.findall(r'--([\w-]+):\s*(#[\da-fA-F]{6})', block))
C.update(warning='#332e24', warning_line='#504331', active='#2b4131', active_line='#49603e', on_accent='#14231c')
svg = ET.fromstring(re.search(r'<svg class="brand-icon"[\s\S]*?</svg>', (ROOT / 'index.html').read_text()).group(0))
PATHS = [p.attrib['d'] for p in svg if p.tag.endswith('path')]

def font(name, file, weight=None):
    f = FontTool(ROOT / 'assets/fonts' / file)
    f.flavor = None
    if weight is not None and 'fvar' in f:
        f = instantiateVariableFont(f, {'wght': weight}, inplace=False)
    for record in f['name'].names:
        if record.nameID == 6:
            record.string = name.encode(record.getEncoding())
    path = TMP / (name + '.ttf')
    f.save(path)
    pdfmetrics.registerFont(TTFont(name, str(path)))

font('MarketBody', 'poppins-latin-400.woff2')
font('MarketMedium', 'poppins-latin-500.woff2')
font('MarketBold', 'poppins-latin-600.woff2')
font('MarketTitle', 'montserrat-latin-variable.woff2', 650)
font('MarketBrandBold', 'montserrat-latin-variable.woff2', 750)
font('MarketBrandRegular', 'montserrat-latin-variable.woff2', 400)
pdfmetrics.registerFontFamily('MarketBody', normal='MarketBody', bold='MarketBold', italic='MarketBody', boldItalic='MarketBold')

SOURCES = [
    {'id': 1, 'title': 'Ascenty | Liderança executiva', 'short': 'Ascenty: pessoas e cargos',
     'url': 'https://ascenty.com/sobre/ascenty/lideranca/',
     'evidence': 'Marcos Siqueira: VP executivo & CRO, responsável por estratégia de crescimento e expansão. Alberto Lopes: VP de Projetos, Engenharia e Construção.',
     'scope': 'Cargos consultados em 23/10/2026; não comprovam adoção do DataTerra.'},
    {'id': 2, 'title': 'Marcos Siqueira | LinkedIn público', 'short': 'LinkedIn: Marcos Siqueira',
     'url': 'https://br.linkedin.com/in/siqueiramarcos',
     'evidence': 'Perfil profissional público indexado: CRO & Head de Estratégia na Ascenty.',
     'scope': 'Perfil localizado em busca pública; a abertura integral foi bloqueada pelo LinkedIn. O cargo atual foi confirmado na fonte institucional [1].'},
    {'id': 3, 'title': 'Ascenty | Vinhedo, segunda unidade', 'short': 'Ascenty: Vinhedo em operação',
     'url': 'https://ascenty.com/blog/news-ascenty/ascenty-inicia-a-operacao-do-seu-segundo-data-center-no-seu-mega-campus-em-vinhedo/',
     'evidence': 'Notícia de 30/11/2020 sobre a entrada em operação da segunda unidade em Vinhedo; cita Marcos, então VP de Operações.',
     'scope': 'Caso histórico brasileiro; não é um projeto que tenha usado o DataTerra.'},
    {'id': 4, 'title': 'Arup | Engenharia e consultoria para datacenters', 'short': 'Arup: do local à entrega',
     'url': 'https://www.arup.com/en-us/markets/data-centers/',
     'evidence': 'Serviços de seleção de locais, diligência, viabilidade, projeto, engenharia, construção e entrega.',
     'scope': 'Evidência de serviços existentes no mercado. Não comprova contrato com a Ascenty para este cenário.'},
    {'id': 5, 'title': 'Ramboll | Critérios para seleção de local', 'short': 'Ramboll: critérios de localização',
     'url': 'https://www.ramboll.com/en-us/insights/resilient-societies-and-liveability/data-center-site-selection-criteria',
     'evidence': 'Artigo de 09/12/2025: energia, conectividade, água, clima, uso do solo e participação social. Apresenta Andrea H. Merkle como liderança do setor ambiental de datacenters.',
     'scope': 'Referência de consultoria e critérios; exemplos regulatórios internacionais não foram transpostos como regras brasileiras.'},
    {'id': 6, 'title': 'Ibama | Competências no licenciamento', 'short': 'Ibama: órgão e rito aplicáveis',
     'url': 'https://www.gov.br/ibama/pt-br/assuntos/laf/sobre',
     'evidence': 'O órgão competente pode ser federal, estadual ou municipal, segundo o enquadramento.',
     'scope': 'O fluxo não presume rito único, licenciamento federal ou exigências idênticas para todos os datacenters.'},
    {'id': 7, 'title': 'ANA | Outorga de recursos hídricos', 'short': 'ANA: uso da água e outorga',
     'url': 'https://www.gov.br/ana/pt-br/assuntos/gestao-das-aguas/politica-nacional-de-recursos-hidricos/outorga-dos-direitos-de-uso-de-recursos-hidricos',
     'evidence': 'Competência da ANA para águas da União; usos de domínio estadual seguem o órgão estadual.',
     'scope': 'Verificar regularização aplicável à captação, ao fornecimento e ao lançamento previstos no projeto.'},
    {'id': 8, 'title': 'DataTerra | Interface, cálculo e manual locais', 'short': 'DataTerra: funcionalidades do MVP',
     'url': '',
     'evidence': 'index.html; app.js; evaluation-criteria.js; site-analysis.js; docs/manual-dataterra.html.',
     'scope': f'Revisão local {REVISION}, consultada em {DATE}. Simulação é triagem; comparação formal e lista de candidatos são produzidas pela equipe fora da plataforma.'},
]

INTRO = 'Persona de mercado: liderança de expansão de datacenters'
PROFILE = ('A referência principal é Marcos Siqueira, vice-presidente executivo e CRO da Ascenty. '
           'A biografia institucional lhe atribui a estratégia de crescimento, expansão e geração de receita, '
           'com experiência anterior em Operações. Seu perfil profissional público também o identifica com a área de estratégia. [1,2]')
CONTEXT = ('Esta persona representa o patrocinador de uma nova implantação: alguém que precisa transformar '
           'demanda comercial por capacidade de processamento em um local viável para construir e operar. '
           'O problema começa antes da obra: escolher quais áreas merecem investimento em estudos, '
           'sem comprometer capital com um terreno cuja energia, água, conectividade ou situação territorial inviabilizem o projeto.')
SCENARIO = ('No cenário didático proposto, essa liderança avalia uma nova unidade no interior de São Paulo, '
            'com 20 MW de carga de TI e três terrenos a prospectar. A demanda total de energia será dimensionada pela engenharia. '
            'Esses parâmetros são hipóteses para demonstrar a jornada, não um anúncio da Ascenty nem uma intenção atribuída a Marcos.')
USER = ('A liderança, com Engenharia e Compras, contrata uma consultoria de engenharia e meio ambiente. '
        'Quem opera o DataTerra é o engenheiro ambiental ou analista de geoprocessamento dessa equipe. '
        'Ele recebe o escopo, configura a simulação, examina as fontes e compara os candidatos. '
        'A consultoria recomenda; a liderança e o comitê de investimento decidem. Essa divisão é a proposta de uso do produto.')
VALUE = ('A equipe busca energia e prazo de conexão compatíveis, água e resfriamento viáveis, fibra com redundância, '
         'segurança territorial e custo total sustentável. [4,5] O DataTerra apoia a triagem com mapa, score, '
         'indicadores e alertas. A equipe registra fora da plataforma a comparação e as pendências de cada local; '
         'o resultado orienta a diligência, não autoriza a construção. [8]')
SUCCESS = ('Sucesso significa levar à decisão uma seleção curta de locais, com premissas comparáveis, '
           'restrições explícitas e perguntas verificáveis para concessionárias, projetistas e órgãos competentes. '
           'A proposta de valor é reduzir a dispersão da pesquisa inicial; essa redução ainda precisa ser validada com usuários.')
CASE = ('Em 30 de novembro de 2020, a Ascenty anunciou a entrada em operação de sua segunda unidade em Vinhedo (SP). '
        'A notícia cita Marcos Siqueira, então vice-presidente de Operações, comentando a expansão do campus. '
        'O caso conecta a pessoa de referência a uma implantação real no Brasil. [3]')
PEOPLE = ('Outros profissionais ajudam a comprovar os papéis da jornada: Alberto Lopes é apresentado pela Ascenty '
          'como VP de Projetos, Engenharia e Construção [1]; Andrea H. Merkle aparece na Ramboll como '
          'Director, Global E&H Data Centre Sector, ligada à seleção de locais e à diligência ambiental. [5] '
          'Eles são referências de mercado; sua participação no cenário não é presumida.')
NOTE = ('Base documental pública, sem entrevistas. Fatos profissionais e o caso de Vinhedo são verificados; '
        'necessidades, contratação e uso do DataTerra são hipóteses de produto. Não há evidência de que as pessoas '
        'ou empresas citadas utilizem, endossem ou tenham contratado o DataTerra.')

class LogoPen(BasePen):
    def __init__(self, path):
        super().__init__(None)
        self.path = path
    def _moveTo(self, p): self.path.moveTo(*p)
    def _lineTo(self, p): self.path.lineTo(*p)
    def _curveToOne(self, a, b, c): self.path.curveTo(*a, *b, *c)
    def _closePath(self): self.path.close()

class Page:
    def __init__(self, c, size): self.c, (self.w, self.h) = c, size
    def color(self, name): return HexColor(C.get(name, name))
    def rect(self, x, y, w, h, fill='panel', stroke=None, r=10):
        c = self.c
        c.saveState(); c.setFillColor(self.color(fill))
        if stroke: c.setStrokeColor(self.color(stroke)); c.setLineWidth(.75)
        c.roundRect(x, self.h-y-h, w, h, r, fill=1, stroke=bool(stroke)); c.restoreState()
    def text(self, text, x, y, w, size=10.6, leading=None, color='ink', face='MarketBody', markup=False, maxh=None, align=0):
        p = Paragraph(text if markup else escape(text).replace('\n','<br/>'),
                      ParagraphStyle('t', fontName=face, fontSize=size, leading=leading or size*1.46,
                                     textColor=self.color(color), splitLongWords=False, alignment=align))
        _, h = p.wrap(w, self.h)
        if maxh is not None and h > maxh + .05: raise ValueError(f'Overflow {h:.1f}/{maxh}: {text[:100]}')
        if y+h > self.h-12: raise ValueError(f'Page overflow: {text[:100]}')
        p.drawOn(self.c, x, self.h-y-h)
        return h
    def link(self, text, url, x, y, w, size=9.5, **kwargs):
        return self.text(f'<link href="{escape(url,quote=True)}" color="{C["accent"]}">{escape(text)}</link>',
                         x,y,w,size,markup=True,**kwargs)
    def line(self, points, color='sage', width=1.5, arrow=False, dash=False):
        c = self.c
        c.saveState(); c.setStrokeColor(self.color(color)); c.setFillColor(self.color(color)); c.setLineWidth(width)
        if dash: c.setDash(4,3)
        p=c.beginPath(); p.moveTo(points[0][0],self.h-points[0][1])
        for x,y in points[1:]: p.lineTo(x,self.h-y)
        c.drawPath(p)
        if arrow:
            (x,y),(px,py)=points[-1],points[-2]
            a=math.atan2(y-py,x-px)
            verts=[(x,y),(x-6*math.cos(a)+2.5*math.sin(a),y-6*math.sin(a)-2.5*math.cos(a)),
                   (x-6*math.cos(a)-2.5*math.sin(a),y-6*math.sin(a)+2.5*math.cos(a))]
            p=c.beginPath(); p.moveTo(verts[0][0],self.h-verts[0][1])
            for vx,vy in verts[1:]: p.lineTo(vx,self.h-vy)
            p.close();c.setDash();c.drawPath(p,fill=1,stroke=0)
        c.restoreState()
    def brand(self, x, y, scale=.8):
        c=self.c;c.saveState();c.translate(x,self.h-y);c.scale(scale,scale)
        c.saveState();c.scale(25/24,-25/24);c.setStrokeColor(self.color('accent'))
        c.setLineWidth(2);c.setLineCap(1);c.setLineJoin(1)
        for d in PATHS:
            path=c.beginPath();parse_path(d,LogoPen(path));c.drawPath(path)
        c.restoreState();t=c.beginText(34,-23);t.setCharSpace(-1.3)
        for word,face,color in [('data','MarketBrandBold','ink'),('terra','MarketBrandRegular','ink'),('.','MarketBrandBold','terra')]:
            t.setFont(face,28);t.setFillColor(self.color(color));t.textOut(word)
        c.drawText(t);c.restoreState()
    def header(self, kicker, n, total):
        self.rect(0,0,self.w,self.h,'bg',r=0);self.brand(40,25,.72)
        self.text(kicker,280,32,self.w-320,8.5,color='sage',face='MarketMedium',align=2)
        self.line([(40,66),(self.w-40,66)],'line',.6)
        self.line([(40,self.h-34),(self.w-40,self.h-34)],'line',.6)
        self.text(f'DataTerra | Pesquisa de público | {DATE}',40,self.h-26,410,7.3,color='muted')
        self.text(f'{n:02d} / {total:02d}',self.w-89,self.h-26,49,7.3,color='muted',align=2)

def persona():
    path=PDF/'dataterra-persona-de-mercado.pdf'
    c=canvas.Canvas(str(path),pagesize=A4)
    c.setTitle('DataTerra | Persona de mercado: expansão de datacenters')
    c.setAuthor('DataTerra');c.setSubject('Referências públicas e cenário proposto de uso; sem associação comercial presumida.')
    p=Page(c,A4);w=p.w-80
    p.header('PERSONA / BASEADA NO MERCADO',1,2)
    p.text('Quem decide onde\nimplantar um datacenter',40,83,w,25,31,face='MarketTitle')
    p.rect(40,160,w,112,'panel-soft','line',11)
    p.text('REFERÊNCIA REAL',54,172,w-28,8.5,color='sage',face='MarketBold')
    p.text('Marcos Siqueira',54,191,w-28,19,24,face='MarketTitle')
    p.text('VP executivo & CRO da Ascenty. Liderança de crescimento e expansão. [1]',54,220,w-28,10.2,14.5,maxh=30)
    p.link('LinkedIn: br.linkedin.com/in/siqueiramarcos',SOURCES[1]['url'],54,250,w-28,9)
    y=290
    for title,text in [
        ('O contexto da decisão',CONTEXT),
        ('Uma demanda concreta para simular',SCENARIO),
        ('Quem decide e quem usa',USER),
        ('O valor esperado',VALUE),
    ]:
        p.text(title,40,y,w,11.4,16,face='MarketBold',color='accent');y+=22
        h=p.text(text,40,y,w,10.2,14.4);y+=h+16
    assert y<=764, f'Persona página 1: {y}'
    p.text('Cenário didático de adoção. Não descreve um projeto anunciado nem uso real pela Ascenty.',40,778,w,8.1,11.5,color='muted',maxh=24)
    c.showPage()
    p.header('PERSONA / EVIDÊNCIAS E FONTES',2,2)
    p.text('Por que esta persona existe',40,84,w,24,32,face='MarketTitle')
    y=132
    for title,text in [('Um caso brasileiro implantado',CASE),('Papéis que existem no mercado',PEOPLE),('Como reconhecer valor na jornada',SUCCESS)]:
        p.text(title,40,y,w,11.1,16,face='MarketBold',color='accent');y+=20
        h=p.text(text,40,y,w,9.8,14);y+=h+13
    y+=1
    p.rect(40,y,w,66,'warning','warning_line',9)
    p.text(NOTE,51,y+9,w-22,8.8,12.2,color='muted',maxh=50)
    y+=83
    p.text('Fontes públicas e escopo da evidência',40,y,w,11.4,16,face='MarketBold');y+=26
    source_notes=[
        'Biografias e cargos de Marcos Siqueira e Alberto Lopes.',
        'Perfil público indexado; cargo confirmado também na fonte [1].',
        'Notícia de 30/11/2020; Marcos era VP de Operações naquele momento.',
        'Serviços de seleção de local, diligência, projeto e entrega.',
        'Artigo de 09/12/2025; critérios e papel da consultoria ambiental.',
        'Competência e enquadramento do licenciamento no Brasil.',
        'Regularização do uso da água e competência federal/estadual.',
        f'Interface e manual locais; revisão {REVISION}, consulta em {DATE}.',
    ]
    for s,note in zip(SOURCES,source_notes):
        label=f'[{s["id"]}] {s["title"]}'
        if s['url']: p.link(label,s['url'],40,y,w,9.1,leading=12.5)
        else: p.text(label,40,y,w,9.1,12.5,color='accent')
        y+=14
        h=p.text(note,58,y,w-18,8.2,11.2,color='muted');y+=h+6
    assert y<=799, f'Persona página 2: {y}'
    c.save()
    return path

# Os atores são explícitos; as etapas 16-20 são frentes paralelas, não uma sequência.
NODES = [
    ('PERSONA / PATROCINADOR','Marcos Siqueira*','Referência: liderança de expansão da Ascenty. [1,2]',None),
    ('LIDERANÇA + CLIENTES','Define a necessidade','Nova unidade; carga de TI, prazo, mercado e resiliência. [4,5]',None),
    ('LIDERANÇA + FINANÇAS','Autoriza os estudos','Define teto de gastos, metas e critérios de exclusão. [4]',None),
    ('COMPRAS + ENGENHARIA','Contrata consultoria','Engenharia e meio ambiente: escopo, entregáveis e responsáveis. [4,5]',None),
    ('CONSULTORIA','Prepara a busca','Traduz o escopo; prospecta terrenos e alternativas regionais. [4,5]',None),
    ('ANALISTA / DATATERRA','Abre o simulador','Acessa o mapa e lê as premissas em “Como calculamos”. [8]',None),
    ('ANALISTA / DATATERRA','Explora regiões','Filtra UF e município; usa o ranking para orientar a busca. [8]',None),
    ('ANALISTA / DATATERRA','Marca cada candidato','Seleciona um ponto no mapa para a análise local. [8]',None),
    ('ANALISTA / DATATERRA','Configura a simulação','Define raio, carga de TI e consumo de água por kWh de TI. [8]',None),
    ('ANALISTA / DATATERRA','Ajusta os critérios','Define os sete pesos; mantém premissas comparáveis entre locais. [8]',None),
    ('ANALISTA / DATATERRA','Confere a cobertura','Inspeciona camadas, origem, datas, aproximações e falhas. [8]',None),
    ('ANALISTA / DATATERRA','Interpreta o resultado','Lê score local, energia, água, clima, rede e risco territorial. [8]',None),
    ('CONSULTORIA','Compara os candidatos','Repete 08-12; registra evidências e pendências fora do MVP. [8]',None),
    ('CONSULTORIA','Recomenda uma seleção','Entrega poucos locais e um plano de diligências à liderança. [4]',None),
    ('LIDERANÇA + ENGENHARIA','Vale aprofundar?','SIM: iniciar as cinco frentes abaixo.\nNÃO: rever candidatos e premissas.',7),
    ('JURÍDICO + ENGENHARIA','Terreno e riscos físicos','Título, zoneamento, sondagem, acesso, segurança e inundação. [4,5]',None),
    ('ELÉTRICA + CONCESSIONÁRIA','Energia de fato','Valida potência, prazo e custo de conexão, redundância e fornecimento. [4,5]',None),
    ('HÍDRICA + OPERADOR/ÓRGÃO','Água e resfriamento','Valida fontes, balanço, reúso e outorga/regularização aplicável. [5,7]',None),
    ('TELECOM + OPERADORAS','Fibra e desempenho','Confirma atendimento, rotas físicas distintas, latência e contratos. [4,5]',None),
    ('AMBIENTAL + ÓRGÃOS','Ambiente e comunidades','Verifica UC, APP, TI e quilombos; estudos, participação e rito local. [5,6]',None),
    ('CONSULTORIA + ENGENHARIA','Consolida a viabilidade','Reúne as cinco frentes, projeto conceitual, custos e cronograma. [4]',None),
    ('LIDERANÇA + COMITÊ','Local viável?','SIM: seleciona o local.\nNÃO: ajusta a busca ou encerra a proposta.',7),
    ('CONSULTORIA + ÓRGÃOS','Obtém aprovações','Estudos, licenças, outorgas e alvarás aplicáveis à etapa de obra. [6,7]',None),
    ('COMITÊ + JURÍDICO','Libera o investimento','Aprova capital; formaliza terreno, conexão e demais compromissos. [4]',None),
    ('ENGENHARIA + COMPRAS','Detalha e contrata','Projeto executivo, construtora, fornecedores e equipamentos. [4]',None),
    ('GESTÃO DO PROJETO','Pode iniciar a obra?','SIM: libera a construção.\nNÃO: resolve pendências de aprovação.',23),
    ('CONSTRUTORA + ENGENHARIA','Constrói e equipa','Executa obra, instalações e mitigação; fiscaliza segurança e qualidade. [4]',None),
    ('UTILITIES + COMISSIONAMENTO','Conecta e testa','Energiza, ativa fibra e testa falhas, redundância, refrigeração e TI. [1,4]',None),
    ('GESTÃO + ÓRGÃOS + OPERAÇÃO','Pode operar?','SIM: aceite e autorizações aplicáveis.\nNÃO: corrige testes/condicionantes.',28),
    ('OPERAÇÃO','Datacenter em operação','Entrega assistida; monitora serviço, energia, água e condicionantes. [1,4,6]',None),
]

# Sete etapas visuais; NODES mantém o roteiro detalhado como material de apoio.
COMPACT_STEPS = [
    ('GESTOR / ASCENTY', 'Marcos\nSiqueira*', 'Define carga, prazo e\ncritérios de expansão.', 'person'),
    ('GESTOR + COMPRAS', 'Contrata\nconsultoria', 'Reúne engenharia\ne meio ambiente.', 'team'),
    ('CONSULTORIA', 'Analisa no\nDataTerra', 'Seleciona locais, simula\ne interpreta o score.', 'map'),
    ('ESPECIALISTAS', 'Valida\no local', 'Verifica energia, água,\nfibra e território.', 'search'),
    ('GESTÃO + ÓRGÃOS', 'Aprova\no projeto', 'Viabiliza investimento\ne autorizações.', 'document'),
    ('ENGENHARIA', 'Constrói\ne testa', 'Executa a obra, conecta\ne comissiona.', 'build'),
    ('OPERAÇÃO', 'Opera o\ndatacenter', 'Obtém liberação e\nmonitora o desempenho.', 'server'),
]


def compact_icon(p, name, x, y, size=32, color='accent'):
    """Ícones vetoriais simples, com o mesmo traço arredondado da interface."""
    c=p.c;c.saveState();c.translate(x,p.h-y);c.scale(size/24,-size/24)
    c.setStrokeColor(p.color(color));c.setFillColor(p.color(color));c.setLineWidth(1.65)
    c.setLineCap(1);c.setLineJoin(1)
    def line(coords):
        q=c.beginPath();q.moveTo(*coords[0])
        for pt in coords[1:]:q.lineTo(*pt)
        c.drawPath(q)
    if name=='person':
        c.circle(12,7,3.5,fill=0,stroke=1)
        q=c.beginPath();q.moveTo(4,21);q.lineTo(4,18);q.curveTo(4,12,20,12,20,18);q.lineTo(20,21);c.drawPath(q)
    elif name=='team':
        c.circle(9,7,3.2,fill=0,stroke=1)
        q=c.beginPath();q.moveTo(2,21);q.lineTo(2,18);q.curveTo(2,12,16,12,16,18);q.lineTo(16,21);c.drawPath(q)
        q=c.beginPath();q.moveTo(17,4);q.curveTo(21,4,21,10,17,10);c.drawPath(q)
        q=c.beginPath();q.moveTo(19,14);q.curveTo(22,14,23,16,23,18);q.lineTo(23,21);c.drawPath(q)
    elif name=='map':
        line([(2,6),(8,3),(16,6),(22,3),(22,18),(16,21),(8,18),(2,21),(2,6)])
        line([(8,3),(8,18)]);line([(16,6),(16,21)])
        c.circle(16,11,2.2,fill=1,stroke=0)
    elif name=='search':
        c.circle(10,10,6.8,fill=0,stroke=1);line([(15,15),(22,22)])
        line([(7,10),(9.2,12.2),(13,8)])
    elif name=='document':
        line([(6,2),(15,2),(20,7),(20,22),(4,22),(4,2),(6,2)])
        line([(15,2),(15,7),(20,7)]);line([(8,14),(11,17),(16,12)])
    elif name=='build':
        line([(4,22),(4,11),(14,11),(14,22)]);line([(2,22),(22,22)])
        line([(14,6),(21,6),(21,22)]);line([(17,2),(17,6)])
        for xx,yy in ((7,14),(11,14),(7,18),(11,18),(17,10),(17,14),(17,18)):
            line([(xx,yy),(xx+.5,yy)])
    elif name=='server':
        for yy in (2,9,16):
            c.roundRect(3,yy,18,5,1.3,fill=0,stroke=1)
            c.circle(6,yy+2.5,.7,fill=1,stroke=0);line([(15,yy+2.5),(18,yy+2.5)])
    c.restoreState()


def smooth_connector(p, points, color='line', width=1.5, arrow=True):
    """Conector com curva suave para a única volta do fluxo."""
    c=p.c;c.saveState();c.setStrokeColor(p.color(color));c.setLineWidth(width)
    c.setLineCap(1);c.setLineJoin(1)
    x1,y1,x2,y2=points
    q=c.beginPath();q.moveTo(x1,p.h-y1)
    q.lineTo(x1,p.h-y2+13)
    q.curveTo(x1,p.h-y2+3,x1-3,p.h-y2,x1-13,p.h-y2)
    q.lineTo(x2+13,p.h-y2)
    q.curveTo(x2+3,p.h-y2,x2,p.h-y2+3,x2,p.h-y2+13)
    q.lineTo(x2,p.h-y1)
    c.drawPath(q);c.restoreState()
    if arrow:p.line([(x2,y1+8),(x2,y1)],color,width,arrow=True)


def diagram():
    size=(1600,900);W,H=size
    path=PDF/'dataterra-jornada-completa.pdf'
    c=canvas.Canvas(str(path),pagesize=size)
    c.setTitle('DataTerra | Jornada da expansão à operação')
    c.setAuthor('DataTerra');c.setSubject('Sete etapas: liderança, consultoria, triagem, diligência, aprovação, construção e operação.')
    p=Page(c,size);p.rect(0,0,W,H,'bg',r=0);p.brand(64,35,1)
    p.text('JORNADA DO USUÁRIO',W-410,42,346,10.5,color='sage',face='MarketMedium',align=2)
    p.line([(64,90),(W-64,90)],'line',.6)
    p.text('Da expansão à operação.',64,122,1350,42,52,face='MarketTitle')
    p.text('Uma liderança define a demanda. A consultoria usa o DataTerra para orientar a escolha do local.',64,188,1450,16,24,color='muted')

    margin=64;gap=26;bw=(W-2*margin-6*gap)/7;by=332;bh=258
    xs=[margin+i*(bw+gap) for i in range(7)]
    phase_groups=[(0,1,'01 / DEMANDA'),(2,3,'02 / ESCOLHA DO LOCAL'),(4,6,'03 / IMPLANTAÇÃO')]
    for first,last,title in phase_groups:
        x=xs[first];end=xs[last]+bw
        p.text(title,x,266,end-x,10.5,15,color='muted',face='MarketMedium')
        p.line([(x,297),(end,297)],'line',.7)

    for i,(actor,title,body,icon) in enumerate(COMPACT_STEPS):
        x=xs[i];active=i==2
        # O software recebe o único preenchimento de destaque da sequência.
        fill='active' if active else 'panel'
        p.rect(x,by,bw,bh,fill,'accent' if active else 'line',18)
        p.rect(x+20,by+24,52,52,'accent' if active else 'panel-soft',r=14)
        compact_icon(p,icon,x+30,by+34,32,'on_accent' if active else 'accent')
        p.text(f'{i+1:02d}',x+bw-51,by+28,31,13,20,color='accent' if active else 'muted',face='MarketMedium',align=2)
        p.text(actor,x+20,by+101,bw-40,8.8,12,color='accent' if active else 'muted',face='MarketMedium',maxh=13)
        p.text(title,x+20,by+127,bw-40,20.1,26,face='MarketTitle',maxh=53)
        p.text(body,x+20,by+200,bw-40,11.4,17,color='muted',maxh=35)
        if i<6:
            p.line([(x+bw+5,by+56),(xs[i+1]-5,by+56)],'sage',1.35,arrow=True)
    # Apenas uma volta visual: candidato inviável retorna à triagem.
    xfrom=xs[3]+bw/2;xto=xs[2]+bw/2
    smooth_connector(p,(xfrom,by+bh,xto,641),'terra',1.35)
    p.text('Local inviável? Rever a busca.',xs[2],661,2*bw+gap,11.5,17,color='terra',align=1)
    # O destino apresenta a condição de liberação sem sugerir aprovação automática.
    p.text('Estudos, licenças e execução com especialistas',xs[4],620,3*bw+2*gap,11.3,17,color='muted',align=1)

    p.line([(64,724),(W-64,724)],'line',.7)
    p.text('*Referência profissional: Marcos Siqueira, VP executivo & CRO da Ascenty. Caso real: Vinhedo, em operação em 2020. [1-3]',64,744,W-128,11.1,17,color='muted')
    p.text('Cenário proposto, sem uso ou endosso confirmado pela Ascenty. O DataTerra apoia a triagem; não substitui estudos e licenças.',64,768,W-128,11.1,17,color='muted')
    p.text('FONTES',64,814,76,9.4,14,color='muted',face='MarketMedium')
    labels=['Ascenty','LinkedIn','Caso Vinhedo','Arup','Ramboll','Ibama','ANA','MVP DataTerra']
    x=154
    for s,label in zip(SOURCES,labels):
        text=f'[{s["id"]}] {label}'
        width=pdfmetrics.stringWidth(text,'MarketBody',10.3)+8
        if s['url']:p.link(text,s['url'],x,812,width,10.3,leading=15,maxh=16)
        else:p.text(text,x,812,width,10.3,15,color='accent',maxh=16)
        x+=width+27
    p.text('Fontes clicáveis no PDF. Roteiro detalhado e referências completas no material de apoio.',64,853,1100,9.3,14,color='muted')
    p.text('DATATERRA / 2026',W-250,853,186,9.3,14,color='muted',align=2)
    c.save()
    return path

def write_texts():
    sections=[INTRO,'REFERÊNCIA REAL\n'+PROFILE,'CONTEXTO DA DECISÃO\n'+CONTEXT,
              'CENÁRIO DIDÁTICO\n'+SCENARIO,'QUEM DECIDE E QUEM USA\n'+USER,
              'VALOR ESPERADO\n'+VALUE,'CRITÉRIO DE SUCESSO\n'+SUCCESS,
              'CASO REAL BRASILEIRO\n'+CASE,'OUTROS PAPÉIS REAIS\n'+PEOPLE,'LIMITES DA EVIDÊNCIA\n'+NOTE]
    source_text='\n\n'.join(f'[{s["id"]}] {s["title"]}\n{s["url"] or s["evidence"]}\nEvidência: {s["evidence"]}\nLimite: {s["scope"]}' for s in SOURCES)
    persona_path=TXT/'dataterra-persona-de-mercado.txt'
    persona_path.write_text('\n\n'.join(sections)+f'\n\nFONTES - consulta em {DATE}\n\n'+source_text+'\n',encoding='utf-8')
    source_path=TXT/'dataterra-fontes-persona-e-jornada.txt'
    source_path.write_text(f'DataTerra | Fontes e premissas | {DATE}\n\n'+NOTE+'\n\n'+source_text+
                          '\n\nO diagrama sintetiza um fluxo proposto, não o processo interno comprovado da Ascenty. A etapa 04 agrupa diligências especializadas que podem ocorrer em paralelo. '+
                          'O caso de Vinhedo confirma implantação real, sem reconstituir todos os seus contratos e licenças. '+
                          'Os 20 MW de TI e três terrenos são parâmetros didáticos, não dados do caso histórico.\n',encoding='utf-8')
    flow_path=TXT/'dataterra-jornada-completa.txt'
    lines=['DataTerra | Jornada completa | '+DATE,NOTE,'Leitura: 01-15 sequenciais; 16-20 em paralelo; reunir na 21 e seguir até 30.']
    for n,(actor,title,body,back) in enumerate(NODES,1):
        lines.append(f'{n:02d}. {title}\nResponsável: {actor}\n{body}'+(f'\nRetorno: etapa {back:02d}.' if back else ''))
    flow_path.write_text('\n\n'.join(lines)+'\n',encoding='utf-8')
    (TXT/'dataterra-fontes-persona-e-jornada.json').write_text(json.dumps({'consulta':DATE,'revision':REVISION,'nota':NOTE,'sources':SOURCES},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return [persona_path,source_path,flow_path,TXT/'dataterra-fontes-persona-e-jornada.json']

def render(path,prefix,dpi=180):
    subprocess.run(['/opt/homebrew/bin/pdftoppm','-png','-r',str(dpi),str(path),str(PNG/prefix)],check=True,capture_output=True)
    return sorted(PNG.glob(prefix+'-*.png'))

def main():
    import sys
    diagram_only='--diagram-only' in sys.argv
    persona_pdf=PDF/'dataterra-persona-de-mercado.pdf' if diagram_only else persona()
    diagram_pdf=diagram();text_paths=write_texts()
    persona_images=sorted(PNG.glob('persona-mercado-*.png')) if diagram_only else render(persona_pdf,'persona-mercado',180)
    images=persona_images+render(diagram_pdf,'jornada-completa',180)
    # Prévia leve para inspeção; entrega PNG mantém a resolução completa.
    from PIL import Image
    for img in images:
        im=Image.open(img);im.thumbnail((2200,1800));im.save(TMP/(img.stem+'-preview.png'))
    readme=OUT/'LEIA-ME-persona-de-mercado.txt'
    readme.write_text('DATATERRA | PERSONA DE MERCADO E JORNADA COMPLETA\n\n'+
                     '1. Persona: PDF A4 de duas páginas e texto editável.\n'+
                     '2. Jornada: diagrama vetorial 16:9 com sete etapas principais e uma volta à triagem.\n'+
                     '3. PNGs: páginas da persona e diagrama de 4000 x 2250 pixels.\n'+
                     '4. Apoio: roteiro detalhado de 30 etapas e fontes completas em TXT/JSON.\n\n'+
                     'Use esta versão no lugar dos materiais anteriores baseados na persona Fátima.\n'+
                     'O diagrama é um fluxo proposto, com origem e limite da evidência indicados.\n'+
                     'Os PDFs contêm links clicáveis para fontes públicas e o LinkedIn da referência principal.\n'+
                     'O cenário não afirma uso, parceria, entrevista ou contratação do DataTerra por terceiros.\n',encoding='utf-8')
    bundle=OUT/'dataterra-persona-mercado-e-jornada.zip'
    files=[persona_pdf,diagram_pdf,*text_paths,*images,readme]
    with zipfile.ZipFile(bundle,'w',zipfile.ZIP_DEFLATED) as archive:
        for file in files:archive.write(file,file.relative_to(OUT))
    for file in (persona_pdf,diagram_pdf):
        doc=fitz.open(file)
        print(json.dumps({'pdf':str(file),'pages':len(doc),'links':sum(len(p.get_links()) for p in doc),'chars':sum(len(p.get_text()) for p in doc)},ensure_ascii=False))
    print(f'Pacote: {bundle}\nArquivos: {len(files)}\nPreviews: {TMP}')

if __name__=='__main__':main()

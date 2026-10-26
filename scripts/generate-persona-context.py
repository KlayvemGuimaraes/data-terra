#!/usr/bin/env python3
"""Contexto narrativo de Fátima, em texto e PDF A4 com a identidade do MVP.

Dependências: reportlab<5, fonttools, brotli, pymupdf; renderização com Poppler.
Uso: python scripts/generate-persona-context.py
"""
from pathlib import Path
from html import escape
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET

from fontTools.ttLib import TTFont as FontTool
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.svgLib.path import parse_path
from fontTools.pens.basePen import BasePen
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output"
TMP = Path(tempfile.gettempdir()) / "dataterra-persona-context-build"
for d in (OUT/"pdf", OUT/"textos", OUT/"png", TMP): d.mkdir(parents=True, exist_ok=True)

PARAGRAPHS = [
    "Fátima é diretora de expansão e infraestrutura de uma operadora de data centers que planeja ampliar sua presença no Brasil para atender novas demandas de processamento, armazenamento e serviços de inteligência artificial. Sua responsabilidade é transformar essa necessidade de crescimento em uma proposta de implantação, identificando quais regiões merecem investigação e levando alternativas justificadas à direção da empresa.",
    "Ela coordena o trabalho de analistas, engenheiros, profissionais de sustentabilidade e consultores jurídicos e financeiros. Em sua rotina, acompanha estudos, reúne informações de diferentes áreas e organiza recomendações para o comitê de investimento. Fátima define as prioridades e orienta a seleção inicial; a equipe técnica realiza as análises, enquanto a aprovação do investimento cabe à direção ou ao comitê responsável.",
    "Quando surge um projeto de expansão, o primeiro passo é definir suas necessidades: capacidade de TI, prazo, orçamento, regiões de interesse e requisitos de infraestrutura. Fátima precisa considerar energia e conexão elétrica, água para refrigeração, conectividade e condições do território. Também precisa entender possíveis restrições ambientais e impactos sobre as comunidades antes de direcionar recursos para estudos mais detalhados.",
    "Sua principal dificuldade é lidar com dados dispersos, formatos diferentes e informações com níveis distintos de atualização e cobertura. Comparar localidades exige reunir evidências e compreender as limitações de cada fonte. Ela teme avançar com uma alternativa aparentemente promissora e descobrir, mais tarde, uma restrição que gere retrabalho, custos adicionais ou atraso no projeto.",
    "Nesse contexto, o DataTerra apoia a triagem inicial. A partir dos requisitos definidos por Fátima, o analista seleciona um ponto no mapa, configura o raio, a carga de TI, a intensidade de uso de água e os pesos dos critérios. Em seguida, consulta o score local, as camadas, os alertas e as premissas. A equipe repete a análise para outras opções e registra externamente os resultados e as pendências.",
    "Com essas evidências, Fátima prioriza quais locais devem avançar para estudos de engenharia, consultas às concessionárias, análise financeira e avaliação das autorizações aplicáveis. O valor esperado é chegar a uma decisão preliminar mais clara e rastreável, compreendendo por que uma alternativa merece investigação e o que ainda precisa ser confirmado. O score orienta essa priorização; a viabilidade definitiva depende das validações técnicas e regulatórias posteriores."
]
NOTE = "Persona hipotética, construída a partir do pitch e dos materiais do projeto. Contexto e comportamentos propostos devem ser validados em entrevistas com o público-alvo."
ROLE = "Diretora de expansão e infraestrutura de uma operadora de data centers"

text_path = OUT/"textos"/"contexto-persona-fatima.txt"
text_path.write_text("CONTEXTO DA PERSONA | FÁTIMA\n\n"+NOTE+"\n\n"+"\n\n".join(PARAGRAPHS)+"\n",encoding="utf-8")

css = (ROOT/"styles.css").read_text(encoding="utf-8")
block = re.search(r'\[data-theme="dark"\]\s*\{([^}]+)\}',css).group(1)
tokens = dict(re.findall(r'--([\w-]+):\s*(#[\da-fA-F]{6})',block))
html = (ROOT/"index.html").read_text(encoding="utf-8")
svg = ET.fromstring(re.search(r'<svg class="brand-icon"[\s\S]*?</svg>',html).group(0))
paths = [p.attrib["d"] for p in svg if p.tag.endswith("path")]

def font(name, filename, weight=None):
    f=FontTool(ROOT/"assets/fonts"/filename);f.flavor=None
    if weight is not None: f=instantiateVariableFont(f,{"wght":weight},inplace=False)
    for rec in f["name"].names:
        if rec.nameID==6: rec.string=name.encode(rec.getEncoding())
    target=TMP/(name+".ttf");f.save(target)
    pdfmetrics.registerFont(TTFont(name,str(target)))

font("ContextBody","poppins-latin-400.woff2")
font("ContextMedium","poppins-latin-500.woff2")
font("ContextTitle","montserrat-latin-variable.woff2",650)
font("ContextBrandBold","montserrat-latin-variable.woff2",750)
font("ContextBrandRegular","montserrat-latin-variable.woff2",400)

class LogoPen(BasePen):
    def __init__(self,p): super().__init__(None);self.p=p
    def _moveTo(self,a): self.p.moveTo(*a)
    def _lineTo(self,a): self.p.lineTo(*a)
    def _curveToOne(self,a,b,c): self.p.curveTo(*a,*b,*c)
    def _closePath(self): self.p.close()

W,H=A4
pdf_path=OUT/"pdf"/"dataterra-contexto-persona.pdf"
c=canvas.Canvas(str(pdf_path),pagesize=A4,pageCompression=1)
c.setTitle("DataTerra - Contexto da persona Fátima")
c.setAuthor("DataTerra")
c.setSubject("Contexto narrativo, rotina, desafios e uso do simulador por uma persona hipotética")

def color(name): return HexColor(tokens.get(name,name))
def para(txt,x,y,width,size=10.9,leading=16.4,ink="ink",face="ContextBody",markup=False):
    p=Paragraph(txt if markup else escape(txt),ParagraphStyle("context",fontName=face,fontSize=size,leading=leading,textColor=color(ink),splitLongWords=False))
    _,height=p.wrap(width,H)
    p.drawOn(c,x,H-y-height)
    return height

def brand(x,y,scale=.72):
    c.saveState();c.translate(x,H-y);c.scale(scale,scale)
    c.saveState();c.scale(25/24,-25/24)
    c.setStrokeColor(color("accent"));c.setLineWidth(2);c.setLineCap(1);c.setLineJoin(1)
    for d in paths:
        path=c.beginPath();parse_path(d,LogoPen(path));c.drawPath(path)
    c.restoreState()
    t=c.beginText(34,-23);t.setCharSpace(-1.3)
    for word,face,ink in [("data","ContextBrandBold","ink"),("terra","ContextBrandRegular","ink"),(".","ContextBrandBold","terra")]:
        t.setFont(face,28);t.setFillColor(color(ink));t.textOut(word)
    c.drawText(t);c.restoreState()

c.setFillColor(color("bg"));c.rect(0,0,W,H,fill=1,stroke=0)
brand(40,27)
para("PERSONA / CONTEXTO",347,33,W-387,9,13,"sage","ContextMedium")
c.setStrokeColor(color("line"));c.setLineWidth(.7);c.line(40,H-67,W-40,H-67)
para("Fátima",40,83,W-80,30,39,"ink","ContextTitle")
para(ROLE,40,128,W-80,11.2,16.5,"accent","ContextMedium")

y=174
for text in PARAGRAPHS:
    height=para(text,40,y,W-80)
    y+=height+10
assert y<=744, f"Contexto excede área de leitura: {y:.1f}"

note_y=max(y+5,751)
c.setFillColor(color("panel-soft"));c.setStrokeColor(color("line"))
c.roundRect(40,H-note_y-43,W-80,43,8,fill=1,stroke=1)
nh=para(NOTE,51,note_y+8,W-102,8.1,11.7,"muted")
assert nh<=29, "Nota excede caixa"
assert note_y+43<=804, "Nota invade rodapé"
c.setStrokeColor(color("line"));c.line(40,30,W-40,30)
c.setFont("ContextBody",7.4);c.setFillColor(color("muted"))
c.drawString(40,17,"DataTerra | Contexto da persona | 23/10/2026")
c.drawRightString(W-40,17,"01 / 01")
c.save()

subprocess.run(["pdftoppm","-png","-singlefile","-r","220",str(pdf_path),str(OUT/"png"/"08-contexto-persona-fatima")],check=True,capture_output=True)
print(f"PDF: {pdf_path}\nTEXTO: {text_path}\nPalavras: {sum(len(p.split()) for p in PARAGRAPHS)}\nFim do texto: {y:.1f} pt")

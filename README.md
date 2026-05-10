# DataTerra

DataTerra é uma plataforma de inteligência territorial para avaliar o impacto
de um data center em diferentes regiões do Brasil.

A solução ajuda a responder:

```text
Se eu instalar um data center neste local, quais recursos existem ao redor e qual impacto estimado ele pode gerar?
```

## Quando usar

Use a DataTerra na etapa inicial de análise, antes de estudos técnicos completos,
para comparar locais e decidir onde vale investigar com mais profundidade.

Ela é útil para:

- avaliar disponibilidade de energia renovável;
- estimar impacto hídrico de um data center;
- observar infraestrutura de água, esgoto e conectividade;
- comparar regiões candidatas;
- justificar escolhas em uma apresentação técnica.

## Como usar a plataforma

1. Escolha um estado ou município.
2. Selecione uma região candidata ou clique diretamente no mapa.
3. Defina o raio de consumo do data center.
4. Veja os recursos disponíveis no entorno: energia, água, esgoto e fibra.
5. Analise o score, o impacto WUI e as premissas.

Fluxo principal:

```text
Escolho um local -> defino um raio -> vejo recursos -> calculo impacto
```

## O que a tela mostra

- **Mapa:** regiões candidatas, energia renovável agregada, água, esgoto, cabos e raio do data center.
- **Camadas:** controles para ligar/desligar dados no mapa.
- **Critérios:** pesos usados no score de aptidão.
- **WUI:** simulação de consumo e impacto hídrico.
- **Local:** ponto e raio usados para calcular recursos no entorno.
- **Resumo:** score, classificação e indicadores do local selecionado.
- **Premissas:** bases reais, indicadores estimados e limitações.

## Como interpretar o score

O score vai de 0 a 100. Quanto maior, melhor a aptidão preliminar.

- `80-100`: alta aptidão.
- `60-79`: condicionada.
- `0-59`: alto risco.

O score combina energia renovável, infraestrutura elétrica, segurança hídrica,
conectividade e segurança regulatória preliminar.

## Como funciona o impacto hídrico

A plataforma usa uma estimativa WUI inspirada em The Green Grid e WRI Aqueduct.

Entradas principais:

- carga de TI do data center, em MW;
- consumo de água, em L/kWh;
- estresse hídrico da UF.

Leitura:

```text
maior consumo de água + maior estresse hídrico = maior impacto hídrico
```

No impacto WUI, menor é melhor.

## Dados e premissas

Dados reais usados:

- geração renovável da ANEEL;
- registros de água e esgoto;
- geometrias de cabos;
- municípios brasileiros;
- estresse hídrico WRI Aqueduct 4.0.

Indicadores estimados:

- capacidade renovável como sinal inicial de infraestrutura elétrica;
- segurança regulatória como leitura preliminar;
- WUI por UF como estimativa inicial de impacto hídrico.

## Limitações

A DataTerra é uma ferramenta de triagem. Ela não substitui:

- estudo ambiental;
- análise por bacia hidrográfica;
- outorga de captação;
- análise real de conexão elétrica;
- licenciamento;
- parecer técnico final.

## Manual para banca

O manual de uso e apresentação está em:

- `docs/manual-dataterra.html`
- `docs/manual-dataterra.pdf`

## Como rodar

```bash
cd server
npm install
mkdir -p references
curl -L https://raw.githubusercontent.com/kelvins/Municipios-Brasileiros/main/json/municipios.json -o references/municipios.json
npm run ingest
npm start
```

Depois abra:

```text
http://localhost:3000
```

## Deploy na Vercel

O deploy da Vercel usa a interface estática da raiz do projeto e redireciona os
endpoints `/api/*` para arquivos JSON versionados em `data/`.

Antes de subir, valide:

```bash
npm run build
npm test
```

Se o banco local for reingerido, atualize os JSONs usados no deploy:

```bash
npm run export:static-api
```

Na Vercel, use a raiz do repositório como Root Directory. O build command pode
ficar como `npm run build`.

## Testes

```bash
npm test
```

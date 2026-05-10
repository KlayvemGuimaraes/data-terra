# DataTerra

DataTerra é uma plataforma de inteligência territorial para apoiar a escolha
preliminar de locais para data centers no Brasil.

Ela responde, de forma visual:

```text
Se eu instalar um data center neste local, quais recursos existem ao redor e
qual impacto hídrico/territorial ele pode gerar?
```

## Fontes e bases usadas

- **ANEEL SIGA - Empreendimentos de Geração:** base de usinas, fonte,
  capacidade, UF, município e coordenadas. Usada para energia renovável,
  composição energética e polos de infraestrutura elétrica estimada.
  Fonte: https://dadosabertos.aneel.gov.br/dataset/siga-sistema-de-informacoes-de-geracao-da-aneel/resource/2f65a1b0-19b8-4360-8238-b34ab4693d55
- **SNIS/SINISA - Água e Esgoto:** registros de abastecimento de água,
  esgotamento sanitário, prestadores e população atendida. Usada para leitura
  preliminar de segurança hídrica local.
  Fonte: https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/snis
- **WRI Aqueduct 4.0:** referência de estresse hídrico. Usada para estimar o
  impacto WUI por UF.
  Fonte: https://www.wri.org/data/aqueduct-global-maps-40-data
- **The Green Grid - WUI v1:** referência conceitual para Water Usage Impact,
  combinando consumo de água do data center e estresse hídrico local.
  Fonte: https://www.thegreengrid.org/wui-online-scoring-calculator
- **TeleGeography/Submarine Cable Map:** referência para rotas de cabos
  submarinos/fibra usadas como indicador de conectividade.
  Fonte: https://www2.telegeography.com/submarine-cable-faqs-frequently-asked-questions
- **Municípios Brasileiros:** coordenadas municipais usadas para busca,
  autocomplete, referência próxima e geocodificação auxiliar.
  Fonte: https://github.com/kelvins/municipios-brasileiros

## Resumo para apresentação

A DataTerra ajuda a comparar regiões candidatas para data centers considerando
energia renovável, infraestrutura elétrica estimada, disponibilidade hídrica,
água/esgoto, conectividade por fibra e impacto WUI.

O objetivo não é substituir estudos técnicos finais. A plataforma serve como
triagem inicial para responder onde vale investigar com mais profundidade.

Fluxo principal:

```text
Escolho um local -> defino um raio -> vejo recursos -> calculo impacto
```

## Quando usar

Use a DataTerra antes de estudos completos de engenharia, licenciamento,
outorga ou conexão elétrica. Ela é útil para:

- comparar regiões candidatas;
- justificar uma escolha territorial preliminar;
- visualizar recursos disponíveis no entorno;
- explicar impactos e restrições para uma banca avaliadora;
- apoiar decisões iniciais de onde aprofundar estudos.

## Como usar a plataforma

1. Abra o mapa do Brasil.
2. Escolha uma UF, município ou região candidata.
3. Clique no mapa ou use a região selecionada como local do data center.
4. Defina o raio de consumo.
5. Observe energia renovável, água/esgoto, fibra e infraestrutura elétrica
   estimada no entorno.
6. Analise score, WUI, indicadores, ranking e premissas.

## O que a tela mostra

- **Mapa:** regiões candidatas, recursos próximos e raio do data center.
- **Camadas:** energia renovável, infraestrutura elétrica estimada, cabos,
  água e esgoto.
- **Critérios:** pesos usados no score de aptidão territorial.
- **WUI:** simulação de impacto hídrico do data center.
- **Local:** ponto manual no mapa e raio de consumo.
- **Resumo:** score, classificação e indicadores principais.
- **Água:** impacto WUI e leitura hídrica do local.
- **Premissas:** fontes, dados reais, estimativas e limitações.
- **Ranking:** comparação das regiões candidatas.

## Como interpretar o score

O score vai de 0 a 100. Quanto maior, melhor a aptidão preliminar.

- `80-100`: alta aptidão.
- `60-79`: condicionada.
- `0-59`: alto risco.

O score combina:

- energia renovável;
- infraestrutura elétrica estimada;
- segurança hídrica/WUI;
- conectividade e mercado;
- segurança regulatória preliminar.

## Como funciona o impacto hídrico

A plataforma estima WUI com base em:

- carga de TI do data center, em MW;
- consumo de água, em L/kWh;
- estresse hídrico da UF, baseado no WRI Aqueduct.

Leitura:

```text
maior consumo de água + maior estresse hídrico = maior impacto WUI
```

No WUI, menor é melhor.

## O que é dado real e o que é estimado

Dados reais usados:

- usinas renováveis e capacidade outorgada da ANEEL;
- registros de água e esgoto do SNIS;
- rotas de cabos/fibra;
- coordenadas de municípios brasileiros;
- referência de estresse hídrico WRI Aqueduct.

Indicadores estimados:

- **infraestrutura elétrica:** derivada de polos de geração renovável e centros
  de demanda, não de uma base oficial de subestações ou transmissão;
- **linhas de transmissão no mapa:** aproximação visual entre polos elétricos
  estimados;
- **segurança regulatória:** leitura preliminar para compor triagem;
- **WUI por UF:** estimativa territorial, não estudo de bacia hidrográfica.

## Arquitetura resumida

```text
index.html + styles.css + app.js
        |
        | carrega
        v
modelos JS locais: WUI, ranking, energia, busca, análise local
        |
        | consome
        v
/api/* na Vercel -> rewrites para data/*.json
        |
        | origem dos JSONs
        v
SQLite local + scripts de exportação
```

Componentes principais:

- `index.html`: estrutura da interface.
- `styles.css`: layout e identidade visual.
- `app.js`: orquestra mapa, estado da UI, seleção de região e renderizações.
- `site-analysis.js`: cálculo de recursos dentro do raio.
- `wui-model.js`: cálculo de impacto hídrico/WUI.
- `region-options.js`: construção das regiões candidatas.
- `electric-infrastructure.js`: infraestrutura elétrica estimada.
- `energy-grid.js`: agregação visual das usinas renováveis em quadrículas.
- `scripts/export-static-api.js`: exporta o banco local para JSONs estáticos.
- `scripts/verify-static-api.js`: valida se o deploy está pronto para Vercel.

## Como rodar localmente

Instale dependências do servidor:

```bash
cd server
npm install
```

Se precisar reingerir as bases:

```bash
mkdir -p references
curl -L https://raw.githubusercontent.com/kelvins/Municipios-Brasileiros/main/json/municipios.json -o references/municipios.json
npm run ingest
```

Inicie localmente:

```bash
npm start
```

Depois abra:

```text
http://localhost:3000
```

## Deploy na Vercel

O deploy usa a interface estática da raiz do projeto. Os endpoints `/api/*`
são redirecionados para arquivos JSON versionados em `data/` via `vercel.json`.

Antes de subir:

```bash
npm run build
npm test
```

Se o banco local for reingerido, atualize os JSONs usados no deploy:

```bash
npm run export:static-api
```

Configuração esperada na Vercel:

- **Root Directory:** raiz do repositório.
- **Build Command:** `npm run build`.
- **Output Directory:** `.`.

## Testes

```bash
npm test
```

Os testes cobrem:

- modelos de WUI, energia, busca, ranking e análise local;
- contrato visual da interface;
- presença do manual;
- contrato de deploy estático na Vercel;
- consistência dos JSONs usados por `/api/*`.

## Manual para banca

- `docs/manual-dataterra.html`
- `docs/manual-dataterra.pdf`

## Limitações

A DataTerra é uma ferramenta de triagem. Ela não substitui:

- estudo ambiental;
- análise por bacia hidrográfica;
- outorga de captação;
- análise real de conexão elétrica;
- licenciamento;
- parecer técnico final.

## Próximos passos recomendados

- Integrar base oficial de subestações e linhas de transmissão.
- Melhorar granularidade hídrica para bacia ou município, não só UF.
- Separar `app.js` em módulos menores depois da apresentação.
- Adicionar cenários de carga por tipo de data center.
- Criar relatório exportável por local analisado.

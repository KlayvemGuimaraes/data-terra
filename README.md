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

Fontes adicionais da análise territorial local:

| Fonte | Uso no cálculo | Referência da versão |
| --- | --- | --- |
| [ONS](https://dados.ons.org.br/dataset/subestacao) | Distância e tensão da subestação mais próxima | 1.684 instalações válidas, ≥69 kV |
| [ANEEL/SIGEL - ONS](https://sigel.aneel.gov.br/arcgis/rest/services/PORTAL/Transmiss%C3%A3o/MapServer/1) | Distância ao traçado de transmissão | Snapshot de 1.817 geometrias adquirido em 20/10/2026 |
| [MMA/CNUC](https://geoservicos.inde.gov.br/geoserver/MMA/ows?service=WFS&version=2.0.0&request=GetCapabilities) | Interseção com UC, ambiente, diligência e tetos | Polígonos `cnuc_26_07_31`; tabela municipal apenas como reserva |
| [ANA/SNIRH](https://www.snirh.gov.br/arcgis/rest/services/INDE/Camadas/MapServer/47) | Classe da microbacia no ponto | Balanço quantitativo 2020 |
| [NASA POWER](https://power.larc.nasa.gov/docs/services/api/temporal/climatology/) | Temperatura, precipitação e umidade climatológicas | Período informado pela resposta, exibido na interface |

A data de consulta não equivale à atualização da base. Contagens descrevem os
snapshots desta versão e devem ser revistas em uma nova ingestão.

## Resumo para apresentação

A DataTerra ajuda a comparar regiões candidatas para data centers considerando
energia renovável, transmissão e subestações oficiais, água/esgoto, microbacia,
clima, conectividade, unidades de conservação e diligência regulatória.

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
5. Observe os recursos e as novas camadas oficiais no entorno; aguarde os estados
   das quatro consultas territoriais na aba Local.
6. Analise score, WUI, indicadores, ranking e premissas.

## O que a tela mostra

- **Mapa:** regiões candidatas, recursos próximos e raio do data center.
- **Camadas:** energia, cabos, saneamento, subestações ONS, transmissão ANEEL/SIGEL,
  polígonos CNUC, microbacia ANA e referência climática NASA. A infraestrutura
  estimada e a referência municipal ambiental são camadas opcionais de reserva.
- **Critérios:** pesos em recursos/impacto, viabilidade estimada e riscos territoriais.
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
- proximidade da transmissão oficial;
- água, bacia e clima;
- conectividade e mercado;
- diligência regulatória preliminar;
- ambiente;
- distância de subestação ONS.

Para deixar a avaliação mais transparente, a interface separa esses critérios
em três grupos e mostra um subtotal de 0 a 100 para cada um:

- **Recursos e impacto:** energia renovável e água/bacia/clima;
- **Viabilidade estimada:** infraestrutura elétrica, conectividade/mercado e
  diligência regulatória;
- **Riscos territoriais:** ambiente e subestação ONS.

Os subtotais usam os pesos de cada grupo. O total **não é a média simples dos
três grupos**: usa diretamente as sete notas e, na análise local, recebe um
limite preventivo após o arredondamento.

| Critério | Peso padrão |
| --- | ---: |
| Energia renovável (E) | 5 |
| Infraestrutura elétrica (T) | 4 |
| Água, bacia e clima (A) | 5 |
| Conectividade e mercado (C) | 3 |
| Diligência regulatória (L) | 4 |
| Restrições ambientais (U) | 3 |
| Distância de subestação (S) | 3 |

```text
Média = round((5E + 4T + 5A + 3C + 4L + 3U + 3S) / 27)
Score local final = min(média, limite preventivo)
```

Com pesos personalizados, dividir pela soma dos pesos positivos ativos. Peso
zero exclui o critério da média; todos zero resultam em zero. Os tetos continuam
ativos independentemente dos pesos: 39 em UC de proteção integral; 59 em outra
UC; 79 enquanto alguma consulta territorial estiver incompleta; 100 nos demais
casos. Uma interseção conhecida tem precedência sobre a incompletude.

**Exemplo didático:** notas E=100, T=90, A=77, C=96, L=20, U=15 e S=90 dão
1.928/27, arredondado para 71. Se o ponto estiver em proteção integral,
o resultado final é 39 (Alto risco), mesmo com bons indicadores de energia.
Os subtotais desse exemplo são 89, 66 e 53.

O [manual, capítulos 8 a 12](docs/manual-dataterra.html#calculo-score) detalha
cada fórmula, unidade, faixa, arredondamento, reserva para dado ausente e a
reprodução completa desse exemplo. [Versão PDF](docs/manual-dataterra.pdf).

**Ranking versus análise local:** o ranking usa bases municipais e indicadores
preliminares, sem as quatro consultas detalhadas nem seus tetos. A aba Local e
o resumo do ponto usam o cálculo territorial. Por isso, os resultados podem
diferir; uma boa posição no ranking não valida o imóvel.

Todas as notas e cortes são heurísticas do MVP, não notas oficiais, probabilidades
de aprovação ou estimativas de redução de CO₂. No grupo Riscos territoriais,
assim como nos demais, uma nota maior indica condição mais favorável.

## Como funciona o impacto hídrico

A nota de impacto WUI combina intensidade de água (L/kWh) e estresse Aqueduct
da UF. A carga de TI (MW) altera o volume anual, mas não diretamente essa nota.
Na análise local, água combina 30% de WUI/saneamento, 50% de microbacia ANA e
20% de clima NASA. Bacia e clima não alteram automaticamente o consumo anual.

```text
Água anual (ML) = round(L/kWh × MW × 1.000 × 8.760 / 1.000.000)
```

Por exemplo: 50 MW e 1 L/kWh resultam em 438 ML/ano, assumindo operação contínua.

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

Indicadores de triagem:

- No ranking regional, infraestrutura e água ainda usam as bases locais de referência.
- Na simulação local, transmissão oficial ANEEL/SIGEL, microbacia ANA, climatologia NASA e polígonos CNUC alteram o cálculo.
- Os pesos, fórmulas, limites preventivos e regras de diligência são premissas do MVP, documentadas na interface e no manual; não representam aprovação dos órgãos.
- A camada elétrica estimada permanece opcional e desligada inicialmente.

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
/api/* estática -> rewrites para data/*.json
/api/territory -> função Node: CNUC + ANA + NASA + snapshot ANEEL/SIGEL
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
- `evaluation-criteria.js`: catálogo, grupos, pesos e agregação dos critérios.
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

O deploy usa a interface estática da raiz e Node 24. Os endpoints das bases
locais apontam para JSONs em `data/`; `/api/territory` é uma função dinâmica
com timeout de 60 segundos, configurada em `vercel.json`.

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

## Como calculamos

- [Manual HTML: uso e metodologia completa](docs/manual-dataterra.html)
- [Manual PDF para a banca](docs/manual-dataterra.pdf)
- Capítulos 8–12: pesos, fórmulas, limites, exemplo numérico e rastreabilidade.

## Limitações

A DataTerra é uma ferramenta de triagem. Ela não substitui:

- estudo ambiental;
- análise por bacia hidrográfica;
- outorga de captação;
- análise real de conexão elétrica;
- licenciamento;
- parecer técnico final.

## Próximos passos recomendados

- Integrar capacidade disponível de conexão elétrica.
- Atualizar balanços hídricos e incluir séries INMET e riscos físicos.
- Separar `app.js` em módulos menores depois da apresentação.
- Adicionar cenários de carga por tipo de data center.
- Criar relatório exportável por local analisado.

## Critérios territoriais (outubro/2026)

O simulador e o ranking usam sete critérios em três grupos. Os novos pesos padrão são 3 para ambiente e 3 para proximidade ONS. As premissas e faixas completas estão na interface e em `docs/manual-dataterra.html` / `.pdf`.

- `node scripts/ingest-substations.js`: ONS, coordenadas válidas e tensão ≥69 kV.
- `node scripts/ingest-environmental.js [CSV-local]`: CNUC julho/2026, presença municipal de proteção integral; parser CSV com aspas. Falhas preservam a base anterior.
- FUNAI/INCRA não integrados; valores `null` significam desconhecidos. Nunca interpretar silêncio da base como liberação ambiental.
- Atualizar contagens em `data/summary.json` após ingest (ou executar `npm run export:static-api` com o banco local disponível).
- `npm test` e `npm run build` verificam regressões e contrato estático antes do deploy.

A base CNUC municipal é uma reserva aproximada. A análise detalhada usa polígonos CNUC publicados, snapshot de transmissão ANEEL/SIGEL, balanço por microbacia ANA (2020), climatologia NASA POWER e regras federais de diligência. Normas locais específicas e licenciamento definitivo exigem validação externa.

### API territorial

`GET /api/territory?kind=environment|basin|transmission|climate&lat=-23.86&lng=-46.46&radius=30`

- Implementação em `api/territory.js` e `server/territory-service.js`, compartilhada pelo Express e pela função Node do Vercel (60 s). Não requer chave das fontes.
- Parâmetros restritos ao recorte brasileiro e raio de 10–300 km; hosts oficiais fixos, sem URL arbitrária.
- Fontes independentes, timeout de 40 s por consulta, cache de sucessos por 1 h, dados ausentes nunca equivalem a ausência de risco.
- `territorial-model.js` faz interseções, distâncias e regras; `territorial-client.js` descarta respostas antigas e oferece nova tentativa.
- A API estática anterior permanece; `/api/territory` requer servidor ou função Vercel. Abrir apenas com servidor de arquivos não habilita a consulta detalhada.
- `npm test` cobre furos de polígonos, múltiplos polígonos, dados ausentes, limites preventivos, validação da API, cache e concorrência de seleção.
- `node scripts/ingest-transmission.js`: atualiza o snapshot nacional de 1.817 geometrias oficiais, validando contagem e unicidade antes de substituir o arquivo. Transmissão não depende de chamada remota durante a simulação.
- Limites: 400 feições CNUC consultadas; mapa exibe até 30 UCs/40 linhas simplificadas. Avaliação usa os polígonos originais retornados. Geometrias visualmente omitidas por tamanho não invalidam atributos já consultados.

## Identidade visual do simulador

O link “Como calculamos” abre o PDF da metodologia. O botão de tema alterna
entre claro e escuro, inicia conforme o dispositivo e guarda a escolha no navegador.
O PDF mantém fundo claro para leitura e impressão; o tema não altera os cálculos.

O simulador compartilha a paleta e a tipografia da
[nossa landing page](https://github.com/nuvemnove/dataterra-landingpage): verde-floresta
`#174b3c`, marfim `#f8f9f3`, sálvia `#719052` e terracota `#ae603e`.
Montserrat é usada nos títulos e Poppins nos textos; arquivos e licenças ficam
em `assets/fonts/`, sem depender de requisições a um serviço externo de fontes.

O desktop mantém mapa e painéis em uma área de trabalho com rolagem independente.
Em telas pequenas, o mapa aparece primeiro e os painéis são empilhados. Os atalhos
“Escolha o local”, “Defina o raio” e “Avalie o resultado” abrem a seção correspondente.
Foco visível, estado das abas e preferência por movimento reduzido são respeitados.
As cores de classificação do score continuam separadas das cores decorativas.

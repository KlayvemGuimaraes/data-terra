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
- **Água e esgoto — snapshot local atribuído ao SNIS/AE2021:** registros de
  prestadores, serviços e população usados como aproximação de saneamento.
  Não comprova abastecimento do terreno nem integração com edições recentes do SINISA.
  Referência institucional: https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/snis
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
| [ONS](https://dados.ons.org.br/dataset/subestacao) | Distância e tensão da subestação mais próxima | 1.684 registros válidos, ≥69 kV; não necessariamente instalações distintas |
| [ANEEL/SIGEL - ONS](https://sigel.aneel.gov.br/arcgis/rest/services/PORTAL/Transmiss%C3%A3o/MapServer/1) | Distância ao traçado de transmissão | Snapshot de 1.817 geometrias adquirido em 20/10/2026 |
| [MMA/CNUC](https://geoservicos.inde.gov.br/geoserver/MMA/ows?service=WFS&version=2.0.0&request=GetCapabilities) | Interseção com UC, ambiente, diligência e alertas | Polígonos `cnuc_26_07_31`; tabela municipal apenas como reserva |
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
6. Analise os quatro pilares separadamente, o WUI, as fontes e as pendências.

## O que a tela mostra

- **Mapa:** regiões candidatas, recursos próximos e raio do data center.
- **Camadas:** energia, cabos, saneamento, subestações ONS, transmissão ANEEL/SIGEL,
  polígonos CNUC, microbacia ANA e referência climática NASA. A infraestrutura
  estimada e a referência municipal ambiental são camadas opcionais de reserva.
- **Critérios:** pesos usados somente entre critérios do mesmo pilar.
- **WUI:** simulação de impacto hídrico do data center.
- **Local:** ponto manual no mapa, raio e quatro indicadores independentes.
- **Resumo:** estresse hídrico, capacidade energética, conectividade e risco social/territorial.
- **Água:** impacto WUI e leitura hídrica do local.
- **Premissas:** fontes, dados observados, estimativas e limitações.
- **Comparação regional:** candidatos ordenados por um pilar explicitamente selecionado, nunca por média geral.

## Como interpretar os quatro pilares

Cada pilar tem um indicador próprio de 0 a 100. **Quanto maior a nota, mais
favorável a condição segundo as heurísticas do MVP**, inclusive nos pilares
denominados estresse hídrico e risco social/territorial. O impacto WUI é um
indicador separado: nele, menor é melhor.

Não existe pontuação média entre os pilares nem classificação geral de aptidão.
As sete fórmulas individuais de Klayvem foram preservadas e reorganizadas:

| Pilar | Critérios e pesos padrão | Composição do indicador |
| --- | --- | --- |
| Estresse hídrico | Água, bacia e clima (A: 5) | A |
| Capacidade energética | Energia renovável (E: 5), transmissão (T: 4), subestação (S: 3) | round((5E + 4T + 3S) / 12) |
| Conectividade | Conectividade (C: 3) | C |
| Risco social/territorial | Diligência regulatória (L: 4), ambiente (U: 3) | round((4L + 3U) / 7) |

Os pesos atuam **somente dentro do respectivo pilar**. Não tornam um pilar
mais importante que outro e não produzem uma ordenação geral. Em um pilar de
critério único, qualquer peso positivo mantém a mesma nota. Peso zero desativa
o critério; se todos os pesos de um pilar forem zero, ele fica sem avaliação
(`—`), não recebe nota zero.

Interseções com UCs e consultas incompletas continuam gerando alertas e
orientações de diligência. Os antigos tetos da nota global não são transferidos
para os pilares. Uma nota energética favorável não anula um alerta territorial.

**Exemplo didático:** com E=100, T=90, A=77, C=96, L=20, U=15 e S=90,
os resultados independentes são:

| Estresse hídrico | Capacidade energética | Conectividade | Risco social/territorial |
| ---: | ---: | ---: | ---: |
| 77 | 94 | 96 | 18 |

O [manual em inglês](docs/manual-dataterra.html) detalha as fontes, cada fórmula,
unidade, arredondamento e reserva para dados ausentes.
[Versão PDF em inglês](docs/manual-dataterra.pdf).

**Comparação regional versus análise local:** os candidatos regionais usam
bases municipais e indicadores preliminares. A aba Local e o resumo do ponto
usam as consultas territoriais detalhadas. Por isso, os resultados podem diferir;
uma boa posição no pilar escolhido não valida o imóvel.

As notas continuam sendo heurísticas não calibradas, não notas oficiais,
probabilidades de aprovação ou estimativas de redução de CO₂. Não foi
introduzido aprendizado de máquina nem um modelo multicritério validado.

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
- Os pesos internos aos pilares, fórmulas, valores de reserva e regras de diligência são premissas do MVP, documentadas na interface e no manual; não representam aprovação dos órgãos.
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
- `evaluation-criteria.js`: catálogo, quatro pilares e ponderação restrita a cada pilar.
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

O simulador público é [data-terra.vercel.app](https://data-terra.vercel.app/).
O projeto `data-terra` na Vercel está conectado à branch `main` de
[`KlayvemGuimaraes/data-terra`](https://github.com/KlayvemGuimaraes/data-terra).
O repositório da equipe é
[`nuvemnove/dataterra`](https://github.com/nuvemnove/dataterra), configurado como
`origin` neste checkout. Para publicar a mesma revisão nos dois, sincronize seus
históricos sem force-push, execute os testes e envie a branch `main` para ambos.
O push no repositório conectado à Vercel inicia a publicação automaticamente.

Os materiais de apresentação e vídeo em `output/` ficam disponíveis no GitHub;
`.vercelignore` os exclui do pacote do simulador. Capturas intermediárias e caches
locais dos novos materiais são ignorados pelo Git. Depois de publicar, confira o
status `Ready` na Vercel e valide idioma, link da logo, manual e API no domínio público.

## Materiais de apresentação

- [Vídeos: demonstração de uso e animação da marca](output/video/README.txt), com MP4s em Full HD e scripts de produção.
- [Slides 23–26 do pitch](output/imagegen/slides-23-26/production-notes.txt), com PNGs 1920 × 1080, prompts, fontes e premissas.

O assistente de IA dos slides é uma proposta conceitual. Prazos, preços e escopos
comerciais apresentados são hipóteses sujeitas à validação, não capacidades ou
compromissos já garantidos pelo simulador.

## Testes

```bash
npm test
```

Os testes cobrem:

- modelos de WUI, energia, busca, ranking e análise local;
- contrato de deploy estático na Vercel;
- consistência dos JSONs usados por `/api/*`.

## Como calculamos

- [Manual HTML em inglês: uso e metodologia dos quatro pilares](docs/manual-dataterra.html)
- [Manual PDF em inglês para a banca](docs/manual-dataterra.pdf)
- Fontes ativas e futuras, fórmulas preservadas, limites de interpretação e exemplo reproduzível sem média geral.

## Pesquisa técnica das bases

O [levantamento dos quatro pilares](docs/pesquisa-tecnica-quatro-pilares.md)
documenta fontes oficiais, dados disponíveis, lacunas, limites de uso, a
contribuição do BEN 2025 e uma proposta de critérios GIS-MCDA.
O documento distingue consultas verificadas de propostas ainda não integradas;
não altera nem valida os pesos e as notas atuais da aplicação.

A pesquisa registra o levantamento e propostas da sua época; o comportamento
da versão atual, com quatro indicadores independentes, está descrito no manual.

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

O simulador e a comparação regional usam sete critérios organizados nos quatro pilares acima. Os pesos internos padrão são preservados; não há total entre pilares. As premissas completas estão no manual em inglês (`docs/manual-dataterra.html` e `.pdf`).

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
- `npm test` cobre os modelos de análise, geometria, estados das fontes, validação da API, cache e concorrência de seleção.
- `node scripts/ingest-transmission.js`: atualiza o snapshot nacional de 1.817 geometrias oficiais, validando contagem e unicidade antes de substituir o arquivo. Transmissão não depende de chamada remota durante a simulação.
- Limites: 400 feições CNUC consultadas; mapa exibe até 30 UCs/40 linhas simplificadas. Avaliação usa os polígonos originais retornados. Geometrias visualmente omitidas por tamanho não invalidam atributos já consultados.

## Identidade visual do simulador

O link “Como calculamos” abre o PDF em inglês. O botão de tema alterna
entre claro e escuro, inicia conforme o dispositivo e guarda a escolha no navegador.
O PDF mantém fundo claro para leitura e impressão; o tema não altera os cálculos.

O seletor de idioma oferece **PT-BR e English**, com português como padrão e escolha
salva em `localStorage` (`dataterra-language`). A troca atualiza textos, dicas,
resultados, avisos de cobertura, rótulos acessíveis e formatos numéricos sem recarregar
a página. Local, raio, filtros, pesos, carga de TI e valores calculados são preservados.
Nomes geográficos, nomes das instalações e documentos das fontes mantêm o idioma original.
O PDF de metodologia continua em inglês, conforme indicado no nome acessível do link.

A logo abre a [landing page DataTerra](https://dataterra.vercel.app/) em uma nova aba,
usando `?lang=pt` ou `?lang=en` conforme a escolha na plataforma. A animação de entrada
usa o símbolo SVG atual, dura cerca de 1,4 segundo e não depende do carregamento das
APIs. É omitida com `prefers-reduced-motion: reduce` e termina antecipadamente ao
interagir com a página. O mapa carrega em paralelo.

As traduções ficam em `translations.js`, sem serviço externo de tradução. `i18n.js`
traduz o HTML estático uma vez por escolha e expõe `t` para mensagens e `html` para
templates dos renderizadores. Somente textos e atributos acessíveis são traduzidos;
valores internos dos filtros, IDs e parâmetros das APIs permanecem canônicos.
Ao adicionar mensagens, inclua a versão inglesa no catálogo e preserve todos os
placeholders. Valores externos interpolados em HTML devem passar por `escapeText`.
`npm test` verifica persistência, fallback, formatação e integridade dos placeholders.

O simulador compartilha a paleta e a tipografia da
[nossa landing page](https://dataterra.vercel.app/): verde-floresta
`#174b3c`, marfim `#f8f9f3`, sálvia `#719052` e terracota `#ae603e`.
Montserrat é usada nos títulos e Poppins nos textos; arquivos e licenças ficam
em `assets/fonts/`, sem depender de requisições a um serviço externo de fontes.

O desktop mantém mapa e painéis em uma área de trabalho com rolagem independente.
Em telas pequenas, o mapa aparece primeiro e os painéis são empilhados. Os atalhos
“Escolha o local”, “Defina o raio” e “Avalie o resultado” abrem a seção correspondente.
Foco visível, estado das abas e preferência por movimento reduzido são respeitados.
As cores dos indicadores por pilar continuam separadas das cores decorativas.

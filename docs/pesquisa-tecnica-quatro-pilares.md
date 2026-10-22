# Pesquisa técnica: bases e critérios dos quatro pilares do DataTerra

**Data da pesquisa:** 14/10/2026. **Escopo:** Brasil; triagem territorial para data centers, não aprovação de implantação. **Natureza da entrega:** pesquisa documental e consultas amostrais a fontes públicas. Não modifica a aplicação, os snapshots ou o algoritmo de pontuação.

**Navegação:** [decisão](#1-decisão-recomendada) · [estado atual](#2-o-que-já-existe-e-o-que-falta) · [catálogo](#3-catálogo-de-fontes-e-usos) · [contexto governamental](#4-proteção-ambiental-e-discussões-governamentais-recentes) · [critérios](#5-critérios-quantitativos-e-metodologia-proposta) · [prioridades](#6-prioridades-de-evolução) · [evidências](#7-evidências-de-acesso-e-limites-da-verificação) · [custódia](#8-custódia-da-pesquisa-e-aceite).

## 1. Decisão recomendada

O DataTerra deve evoluir de uma comparação de disponibilidade aparente de recursos para uma **triagem com evidências, restrições explícitas e incerteza visível**. Os quatro pilares de informação continuam úteis, mas os cinco critérios atuais da interface não constituem uma metodologia validada de localização.

A recomendação é usar **GIS-MCDA**: análise geográfica, verificação de impedimentos aplicáveis, matriz de indicadores mensuráveis, funções de valor justificadas, ponderação documentada e análise de sensibilidade. Uma fonte oficial melhora a proveniência da entrada; não torna automaticamente oficial ou correto o score calculado pelo DataTerra.

Neste documento:

- **Observado:** código, documento ou resposta efetivamente consultado; o nível da verificação é informado.
- **Documentado:** informação descrita pelo produtor; não significa que o arquivo inteiro foi baixado ou validado.
- **Proposta:** decisão metodológica sugerida para o DataTerra, ainda não calibrada nem implementada.
- **Não verificado:** limite do levantamento; não deve virar dado preenchido por aproximação.

Uma consulta bem-sucedida comprova acesso naquele momento, não disponibilidade contínua, cobertura nacional completa ou precisão cadastral. Datas de publicação, referência dos dados, atualização do registro e coleta são conceitos diferentes.

## 2. O que já existe e o que falta

### 2.1 Inventário e proveniência

Os números abaixo são os do levantamento fornecido pela equipe, **não uma nova contagem ou auditoria dos arquivos**.

| Entrada atual | Conteúdo e localização | Lacuna que afeta a interpretação |
| --- | --- | --- |
| Energia: 2.800 registros | Usinas renováveis, capacidade, proprietário, município/UF e coordenadas; `data/energy.json`, `server/aneel-energy.js` | Potência cadastrada não é energia produzida nem capacidade disponível para uma nova carga. A atualidade do snapshot não está demonstrada. |
| Água/esgoto: 1.995 registros, 1.980 combinações município/UF | Prestador, serviço, campo de população e coordenadas; `data/water.json`; ingestão de `Planilha_Pesquisa_Simplificada_AE2021.xls` | Não mede disponibilidade hídrica, regularidade, vazão outorgável ou estresse da bacia. O nome AE2021 não autoriza chamar o conteúdo de SINISA atualizado. |
| Cabos: 706 rotas | Nome, proprietários, ano informado, comprimento e geometria; `data/cables.json`, a partir de `all_cables.json` na raiz | Rota cadastrada, especialmente submarina, não equivale a fibra terrestre contratável no terreno. Não comprova capacidade, latência, acesso comercial ou redundância. |
| Municípios: 5.571 registros | Nome, UF e ponto de referência; `data/municipalities.json`, origem declarada `kelvins/Municipios-Brasileiros` | Falta uma ligação controlada com códigos, limites e versões territoriais oficiais do IBGE. Ponto municipal não representa terreno, área municipal ou instalação. |
| Resumo | `data/summary.json` | É uma agregação da aplicação, não um novo conjunto oficial independente. |

**Ressalva ao diagnóstico de ingestão exclusivamente manual:** `server/aneel-energy.js:1-31` contém consulta HTTP paginada ao Datastore da ANEEL. O normalizador seleciona renováveis em operação e converte potência outorgada de kW para MW (`:34-68`). Isso não comprova que a rotina foi executada recentemente ou que os JSONs publicados foram atualizados. O consumo da versão estática continua baseado em `data/*.json`, conforme o README e os rewrites da Vercel.

Os registros de saneamento recebem coordenadas associadas ao município; não devem ser apresentados como pontos físicos de captação, estações de tratamento ou disponibilidade de água no terreno. Também é necessário resolver duplicidade por prestador/serviço antes de somar população.

**Materiais de apresentação:** não foram localizados `DATATERRA.pptx`, outro PPT/PPTX ou URL do Canva no repositório examinado. As anotações exclusivas desses materiais não foram verificadas. A pesquisa parte do briefing, do código e da documentação disponível, incluindo o [README](../README.md) e a [defesa de viabilidade](viabilidade-tecnica-data-terra.txt).

### 2.2 Quatro pilares, cinco critérios e dois cálculos

A média ponderada padrão é arredondada:

```text
score = round((5 × renováveis + 4 × rede + 5 × água
             + 3 × conectividade + 4 × regulatório) / 21)
```

Os pesos são configuráveis. **A mesma média não significa a mesma definição dos componentes:**

| Critério | Ranking de regiões | Análise de ponto e raio | Consequência |
| --- | --- | --- | --- |
| Renováveis | Transformação da capacidade municipal, com alternativa estadual; candidatos inferidos por energia têm regras próprias | Capacidade nominal no raio dividida pela carga de TI, limitada a 100 | Não demonstra suprimento firme, contrato renovável ou correspondência horária entre geração e consumo. |
| Rede elétrica | Outra transformação da capacidade de geração | `70% renováveis + 30% conectividade` | Reutiliza outros critérios, sem medir capacidade real da rede; há risco de dupla contagem. |
| Água | O componente regional é substituído pela aptidão WUI na interface | `65% aptidão WUI + 35% presença de serviços` | Os resultados não representam o mesmo indicador. |
| Conectividade | Distância aos cabos; há substitutos por população ou valor fixo quando falta informação | Distância e bônus por quantidade de cabos; valor substituto quando não há resultado válido | Ausência de informação pode produzir nota, sem evidência de atendimento. |
| Regulatório | Heurística de serviços de saneamento ou valor fixo em candidatos de energia | 76 com registro de saneamento; 58 sem registro | Não consulta licença, zoneamento, direito territorial ou restrição ambiental. |

Evidências: `app.js:15-21,431-459`; `region-options.js:241-263,391-425`; `site-analysis.js:366-400`. A camada visual de “subestações” e “transmissão” também é sintetizada por `electric-infrastructure.js`, separadamente do componente `grid`; o README já a identifica como estimativa.

O modelo hídrico atual é explicitamente uma estimativa **inspirada** no WUI (`wui-model.js:91-119`). A carga de TI altera o volume anual calculado, mas não o `impactScore`; UF desconhecida recebe estresse zero com rótulo “Sem dado Aqueduct” (`:67-78`). Na evolução proposta, dado desconhecido não deve ser convertido em baixo estresse. Não foi demonstrada equivalência com a implementação oficial da métrica The Green Grid.

Os intervalos atuais 80–100, 60–79 e 0–59 são convenções do produto, não classes legais, probabilidades de sucesso ou classificações certificadas. Esta pesquisa não os recalibra.

## 3. Catálogo de fontes e usos

O catálogo lista dados relevantes para a decisão, não reproduz todos os campos de cada produtor. Nomes entre crases são campos efetivamente observados quando isso é explicitado; as demais listas descrevem conteúdo documental. Mapear uma fonte não significa integrá-la: a situação atual da aplicação é a descrita na seção 2, e esta pesquisa não acrescentou novas bases ao seu funcionamento.

### 3.1 Referência geográfica e população

#### G1 — IBGE: Localidades e Malhas

- **Fontes oficiais:** [API de Localidades](https://servicodados.ibge.gov.br/api/docs/localidades) e [API de Malhas v3](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3).
- **Dados observados:** Localidades retorna `id`, `nome`, UF, microrregião/mesorregião e regiões imediata/intermediária. A malha municipal retorna geometria e `codarea`; seus metadados incluem `centroide`, `regiao-limitrofe` e área com unidade.
- **Acesso e escala:** REST JSON; malha em GeoJSON ou TopoJSON, com parâmetros `periodo` e `qualidade`. Fixar a edição; omitir o período seleciona a versão mais recente segundo a documentação, prejudicando reprodutibilidade.
- **Verificação:** cadastro de São Paulo, código `3550308`, e malha GeoJSON/metadata com `periodo=2022` retornaram dados. A tentativa de metadados com `periodo=2024` retornou HTTP 500; isso não prova inexistência da edição em outros canais. A geometria de qualidade mínima foi usada somente para verificar acesso, não para análise de terreno.
- **Por que é útil:** permite junções por identificador oficial e operações de pertencimento territorial, substituindo dependência exclusiva de nome/UF. Preservar o código como identificador, controlar mudanças territoriais e compatibilizar o ano de cada base.
- **Limite:** nem centroide nem limite municipal são limite de propriedade. Uma API cadastral não contém automaticamente população atual, zoneamento ou infraestrutura.

#### G2 — IBGE: Censo 2022, setores e localidades

- **Fonte oficial:** [Tabelas e publicações do Censo 2022](https://censo2022.ibge.gov.br/panorama/downloads.html).
- **Dados documentados:** agregados por setores censitários, população e domicílios, características de abastecimento/esgotamento, malha de setores, localidades indígenas e quilombolas; resultados também organizados para unidades de conservação. O catálogo distingue resultados do universo, da amostra e preliminares.
- **Referência e acesso:** referência censitária 2022; divulgações em datas posteriores, por tabelas, publicações e produtos geográficos. O catálogo registra agregados e malha de setores em 14/11/2024; foram verificadas as páginas de divulgação, não os arquivos e dicionários completos.
- **Dicionário complementar consultado:** [Nota metodológica nº 6](https://www.ibge.gov.br/biblioteca/visualizacao/livros/liv102136.pdf): `CD_SETOR` (15 dígitos), `CD_MUN`, `CD_UF`, situação/tipo de setor; `V0001` pessoas e `V0002` domicílios. São campos documentados, não uma amostra de planilha baixada. O [diretório público](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Setor_xlsx/) já lista arquivo básico revisado em maio/2026; isso não altera o ano censitário. Supressão por confidencialidade, indisponível e não aplicável devem ser preservados.
- **Por que é útil:** identificar população potencialmente afetada, serviços essenciais e desigualdade de acesso à água; organizar diligência socioambiental. Usar código de setor e edição compatível para juntar tabela e malha; consultar o dicionário antes de escolher variáveis.
- **Limite:** não transformar presença de população indígena, quilombola ou vulnerável em uma penalidade automática. A análise é de impactos e direitos, não da população como “risco”. Localidade censitária não substitui perímetro jurídico da FUNAI/INCRA. Indicadores da amostra não podem ser atribuídos a qualquer setor sem suporte da divulgação.

### 3.2 Capacidade energética e infraestrutura elétrica

#### E1 — ANEEL: SIGA, empreendimentos de geração

- **Fontes:** [catálogo oficial](https://dadosabertos.aneel.gov.br/dataset/siga-sistema-de-informacoes-de-geracao-da-aneel), [metadados CKAN](https://dadosabertos.aneel.gov.br/api/3/action/package_show?id=siga-sistema-de-informacoes-de-geracao-da-aneel) e [dicionário](https://dadosabertos.aneel.gov.br/dataset/6d90b77c-c5f5-4d81-bdec-7bc619494bb9/resource/25722a60-194d-4234-ab3b-b71354078402/download/dm-siga-sistema-de-informacoes-de-geracao-da-aneel.pdf).
- **Dados observados:** `CodCEG`, `NomEmpreendimento`, `SigUFPrincipal`, `SigTipoGeracao`, `DscFaseUsina`, combustível/origem, `MdaPotenciaOutorgadaKw`, `MdaPotenciaFiscalizadaKw`, `MdaGarantiaFisicaKw`, coordenadas, sub-bacia, proprietário e datas de operação/vigência/geração do conjunto. Grafias literais relevantes: `DscMuninicpios` e `DscPropriRegimePariticipacao`.
- **Acesso/tempo:** Datastore CKAN, CSV diário e mensal; catálogo declara ODbL. A [consulta de uma linha](https://dadosabertos.aneel.gov.br/api/3/action/datastore_search?resource_id=2f65a1b0-19b8-4360-8238-b34ab4693d55&limit=1) respondeu HTTP 200, `success=true`, total 25.045. Esse universo inclui diferentes fases/fontes e não deve ser comparado diretamente aos 2.800 registros selecionados no protótipo.
- **Utilidade:** rastrear usinas por CEG, fase, fonte e capacidade; distinguir cadastro de geração de infraestrutura de rede.
- **Limites:** campos de domínio vieram como texto, inclusive números com vírgula. Coordenadas são centroides aproximados; datum não confirmado no dicionário. Filtrar fase além de potência fiscalizada. Garantia física, potência outorgada e capacidade de conexão não são intercambiáveis; o esquema consultado não possui código IBGE municipal dedicado.

#### E2 — ANEEL/SIGEL: geometria de transmissão e subestações

- **Fonte:** [serviço ArcGIS de transmissão](http://sigel.aneel.gov.br/arcgis/rest/services/PORTAL/Transmiss%C3%A3o/MapServer?f=pjson), publicado pela ANEEL e descrito como base oriunda do ONS. **O HTTP deste link foi usado somente em diagnóstico; HTTPS falhou na consulta.**
- **Camadas verificadas:** [1 — linhas](http://sigel.aneel.gov.br/arcgis/rest/services/PORTAL/Transmiss%C3%A3o/MapServer/1?f=pjson), polilinhas; [3 — subestações](http://sigel.aneel.gov.br/arcgis/rest/services/PORTAL/Transmiss%C3%A3o/MapServer/3?f=pjson), pontos. IDs 0 e 2 são grupos; 5 é camada separada de sistemas isolados.
- **Campos observados:** `OID`, `Name`, `FolderPath`, `SymbolID`, `Snippet`, `PopupInfo`, geometria; linhas também têm `Shape_Length`. Tensão, agente e “capacidade” aparecem em texto/HTML, **não em campos elétricos tipados**. Não foi demonstrado campo confiável de fase/operação.
- **Escala/tempo:** serviço declara SIRGAS 2000/EPSG:4674; `Shape_Length` em graus, não km. Escala de aquisição, precisão e atualização dos ativos não foram confirmadas. Criação do metadado em 2023 não é data-base certificada.
- **Utilidade:** substituir ligações artificiais por feições oficiais, após controle de qualidade e conciliação cadastral com ONS. A amostra de uma linha repetia coordenadas; revisar geometria antes de medir comprimentos.
- **Limites operacionais:** consulta espacial de subestações respondeu por HTTP, com `PORTAL` maiúsculo. Não recomendar desativar validação TLS, downgrade permanente ou conteúdo HTTP no frontend HTTPS. Proximidade e “MW” do popup não são capacidade remanescente nem faixa de servidão.

#### E3 — ONS: Subestações da Rede de Operação

- **Fontes:** [catálogo](https://dados.ons.org.br/dataset/subestacao), [CSV](https://ons-aws-prod-opendata.s3.amazonaws.com/dataset/subestacao/SUBESTACAO.csv) e [dicionário](https://ons-aws-prod-opendata.s3.amazonaws.com/dataset/subestacao/DicionarioDados_Subestacao_Rede_de_Operacao.pdf). O ONS é fonte primária operacional do setor, não autarquia governamental.
- **Campos observados:** `id_subsistema`, `nom_subsistema`, `id_estado`, `nom_estado`, `nom_agente_principal`, `id_subestacao`, `nom_subestacao`, `val_niveltensao`, `id_estacao`, `num_barra`, `val_latitude`, `val_longitude`. Tensão em kV.
- **Acesso/cobertura:** CSV com separador `;`; catálogo também oferece Parquet/XLSX, não baixados. Subestações em operação da Rede Básica + Complementar, tensão base ≥69 kV; atualização declarada diária, sem histórico de snapshots.
- **Verificação:** 1.692 linhas, 919 IDs distintos de subestação; nove linhas sem latitude ou longitude. Repetições por tensão/estação/barramento não são necessariamente duplicatas erradas, mas não podem ser contadas como instalações físicas distintas.
- **Utilidade:** candidatos reais de conexão, tensão e agente; ligação aos estudos por barramento, quando houver correspondência válida.
- **Limites:** datum/acurácia não confirmados no dicionário. Foi observada combinação UF/coordenada suspeita, não corrigida por suposição. Não contém capacidade livre, disponibilidade de bay, redundância, prazo ou preço de conexão. A cobertura não representa toda a distribuição.

#### E4 — ONS: Linhas de Transmissão da Rede de Operação

- **Fontes:** [catálogo](https://dados.ons.org.br/dataset/linha-transmissao), [CSV](https://ons-aws-prod-opendata.s3.amazonaws.com/dataset/linha_transmissao/LINHA_TRANSMISSAO.csv) e [dicionário](https://ons-aws-prod-opendata.s3.amazonaws.com/dataset/linha_transmissao/DicionarioDados_Linha_Transmissao.pdf).
- **Dados observados:** 37 campos; subsistemas/UF e subestações dos terminais, `cod_equipamento`, `nom_linhadetransmissao`, proprietário, tipo de rede/linha, `val_niveltensao_kv`, `val_comprimento`, barras DE/PARA, resistência/reatância/shunt, capacidades operativas e datas `dat_entradaoperacao`, `dat_desativacao`, `dat_prevista`.
- **Unidades/cobertura:** tensão em kV, comprimento em km; capacidades operativas de longa/curta duração contratadas no CPST em **ampere**, não MW livres. Catálogo descreve linhas ≥230 kV, atualização diária e ausência de série histórica de snapshots.
- **Verificação:** CSV recuperado com 2.341 registros; 473 possuem data de desativação. A existência de `dat_prevista` não identifica sozinha empreendimento futuro.
- **Utilidade:** estado cadastral, agente, tensão, eventos e conexões lógicas para conciliar com geometrias.
- **Limites:** **não há traçado, coordenadas ou WKT no CSV**. Reta entre terminais não é linha física. Filtrar eventos pela data de avaliação; auditar a correspondência com SIGEL, que não expõe `cod_equipamento` tipado. Não somar registros históricos como rede operacional atual.

#### E5 — ONS/EPE: capacidade remanescente e processo de acesso

- **Fontes:** [acesso à transmissão](https://www.ons.org.br/paginas/energia-no-futuro/transmissao/acesso) e [NT-ONS DPL 0083/2026, revisão 00, 31/08/2026](https://www.ons.org.br/AcervoDigitalDocumentosEPublicacoes/NT-ONS%20DPL%200083-2026-PNAST.pdf), lida.
- **Dados disponíveis:** barramentos candidatos, UF, tensão, limites de capacidade remanescente em MW por barramento/subárea/área, anos, obras e fatores limitantes, no contexto da **1ª Temporada de Acesso de 2026/PNAST**, base PAR/PEL 2026, ciclo 2027–2031.
- **Utilidade:** acrescenta evidência de estudo elétrico, superior à inferência por proximidade. Portanto, não é correto afirmar que inexiste qualquer informação pública de capacidade remanescente.
- **Limites:** PDF condicionado à temporada e às suas premissas; não API universal por terreno. Limites de área/subárea podem ser compartilhados e não somáveis. Resultados não reservam capacidade ao usuário do DataTerra, nem dispensam processo de acesso, estudos do empreendimento e contrato. Não houve acesso autenticado ao SGAcesso.

#### E6 — ANEEL: BDGD/SIG-R, complemento para distribuição

- **Fonte:** [Base de Dados Geográfica da Distribuidora](https://dadosabertos.aneel.gov.br/dataset/base-de-dados-geografica-da-distribuidora-bdgd).
- **Conteúdo documentado:** entidades geográficas e elétricas padronizadas por distribuidora, em Geodatabase, conforme Manual BDGD e Módulo 10 do PRODIST; catálogo anuncia atualização anual.
- **Utilidade:** analisar hipóteses de atendimento pela distribuição, não cobertas integralmente pelo ONS.
- **Verificação/limite:** página e links localizados; nenhum GDB de concessionária foi aberto. Campos literais, CRS e qualidade por distribuidora não estão verificados. Não escolher o regime de conexão apenas pela tensão ou distância no mapa.

#### E7 — EPE: Balanço Energético Nacional 2025

**Decisão: incluir como contexto energético, não como camada de conexão.** A [edição BEN 2025](https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/balanco-energetico-nacional-2025) tem referência **2024**. A [EPE também confirmou BEN 2026/ano-base 2025](https://www.epe.gov.br/pt/imprensa/noticias/epe-publica-o-relatorio-final-do-balanco-energetico-nacional-2026); a edição posterior não substitui silenciosamente a solicitada.

| Produto e dados identificados | Utilidade para o DataTerra |
| --- | --- |
| [Relatório final](https://www.epe.gov.br/sites-pt/publicacoes-dados-abertos/publicacoes/PublicacoesArquivos/publicacao-885/topico-771/Relat%C3%B3rio%20Final_BEN%202025.pdf), tabela 2.30: produção, importação/exportação, perdas e consumo setorial de eletricidade | Distinguir energia gerada, oferta e consumo, em GWh, de potência em MW. |
| Tabelas 5.3 e 5.5/5.5a/5.5b: fontes de geração, autoprodução, parcela não injetada e MMGD | Evitar interpretar toda geração cadastrada como energia entregue à rede. |
| Tabelas 8.1.c/8.1.e e 8.4/8.4.b; Anexo I: produção/geração por UF e capacidade instalada | Contexto estadual e comparação agregada do inventário, não disponibilidade do lote. |
| [Síntese 2025](https://www.epe.gov.br/sites-pt/publicacoes-dados-abertos/publicacoes/PublicacoesArquivos/publicacao-885/topico-767/BEN_S%C3%ADntese_2025_PT.pdf): matriz e emissões | Contextualizar renovabilidade e carbono; média nacional não é fator marginal/horário local. |
| [Matriz ab2024.xlsx](https://www.epe.gov.br/sites-pt/publicacoes-dados-abertos/publicacoes/PublicacoesArquivos/publicacao-885/topico-766/Matriz%20ab2024.xlsx), aberto; anexos históricos IX/X listados na edição | Planilha de fluxos, fontes, setores e unidades; históricos 1970–2024 localizados, não baixados integralmente. |

Não há geometria de rede/terreno nem categoria autônoma de data centers identificada nas tabelas consultadas. O XLSX tem cabeçalhos multinível e unidades distintas: exige transformação documentada, não importação ingênua. A síntese informa 88,2% de renovabilidade elétrica; o texto da p. 12 do relatório final recuperado informa 88,0%. Não reconciliamos oficialmente a divergência: preservar produto, página e denominador; não usar esse percentual como score local. Os termos do relatório exigem citação e restringem reprodução comercial integral.

### 3.3 Conectividade

#### C1 — Anatel: Rede de Transporte / backhaul

- **Fontes:** [painel oficial](https://informacoes.anatel.gov.br/paineis/infraestrutura/rede-de-transporte) e [ZIP do menu Dados Brutos](https://www.anatel.gov.br/dadosabertos/paineis_de_dados/infraestrutura/mapeamento_rede_transporte.zip), efetivamente baixado e aberto.
- **Conteúdo observado:** CSVs municipais/localidades de 2021, municipal longo 2023–2025, evolução municipal e `enlaces_fibra_2025.gpkg`. O CSV longo contém `Ano`, `Município`, `UF`, `Código IBGE`, `Prestadora`, `CNPJ`, `Meio Transporte` (`Fibra`, `Rádio`, `Cabo Metálico`).
- **Geometria:** GeoPackage com `fid`, `geom`, `Ano`, `NO_PRESTADORA`, `NU_CNPJ`, `IBGE_A/B`, `LAT_A/B`, `LON_A/B`. Estrutura GIS declara EPSG:4674; XML auxiliar declara 4326: conflito a resolver com o produtor, não corrigir silenciosamente.
- **Temporalidade/cobertura:** 23.582 enlaces de referência 2025 observados. O pacote teve modificação HTTP em março/2026, não referência 2026. Coleta mudou em 2023; a evolução consultada não tem coluna 2022.
- **Utilidade:** presença declarada de transporte, meios e fornecedores por município/ano; contatos para diligência comercial.
- **Limite decisivo:** a Anatel informa que as linhas ligam sedes municipais e **não representam o traçado físico**. Não medir distância do lote a essas linhas, nem inferir redundância de dutos. Nenhum WFS de rotas físicas foi verificado; o acesso comprovado é o ZIP. Ausência de declaração não demonstra ausência de fibra.

#### C2 — IX.br/NIC.br: localidades e PIX, complemento não governamental

- **Fontes primárias setoriais:** [localidades atuais](https://ix.br/localidades/atuais), [adesão/PIX de São Paulo](https://ix.br/adesao/sp/) e [natureza institucional do NIC.br](https://nic.br/quem-somos/).
- **Conteúdo observado:** localidade, nome do PIX, instituição, endereço, contatos e condições/restrições de adesão. Página de São Paulo indicava atualização em 23/07/2026.
- **Acesso/geometria:** HTML consultado; não foi validada API GIS ou coordenada predial certificada. Geocodificação de endereço seria dado derivado, a conferir.
- **Utilidade:** identificar ecossistema de interconexão e destinos para cotar backhaul.
- **Limites:** há restrições e indisponibilidades específicas de PIX; proximidade não garante porta, contratação, latência ou acesso físico. IX.br não é inventário completo de POPs/data centers, nem base governamental. Os cabos submarinos atuais continuam sendo outra categoria de infraestrutura, não equivalente ao backhaul terrestre.

### 3.4 Estresse hídrico, abastecimento e clima

#### A1 — ANA/SNIRH: disponibilidade, balanço e usos consuntivos

**Fontes:** [ArcGIS REST INDE/Camadas](https://www.snirh.gov.br/arcgis/rest/services/INDE/Camadas/MapServer?f=pjson), [metadado oficial de disponibilidade](https://metadados.snirh.gov.br/geonetwork/srv/api/records/7ac42372-3605-44a4-bae4-4dee7af1a2f8/formatters/xml), [Nota Técnica 75/2020](https://metadados.snirh.gov.br/files/7ac42372-3605-44a4-bae4-4dee7af1a2f8/NT75_2020.pdf) e [metadados dos usos consuntivos](https://metadados.snirh.gov.br/geonetwork/srv/api/records/5146c9ec-5589-4af1-bd64-d34848f484fd/formatters/xml).

| Camada verificada | Dados observados | Uso |
| --- | --- | --- |
| [101 — disponibilidade superficial](https://www.snirh.gov.br/arcgis/rest/services/INDE/Camadas/MapServer/101?f=pjson), polilinhas | `COBACIA`, `NMRIO`, `DSVERSAO`, `NUAREAMONT`, `DQ95JAN`…`DQ95DEZ`, `DQANO`, `DEDOMINIAL`, `FQANUAL`, `FQSAZONAL`; vazões em m³/s | Contexto de oferta de referência por trecho. |
| [47 — balanço quantitativo 2020](https://www.snirh.gov.br/arcgis/rest/services/INDE/Camadas/MapServer/47?f=pjson), polígonos | `COTRECHO`, `COBACIA`, `UGRH`, `DISP_Q95`, `DEM_RET20`, `DEM_ACM`, `BAL_PERC`, `CLASSE` | Comprometimento estimado do recurso. |
| [49 — balanço 2040 com mudanças climáticas](https://www.snirh.gov.br/arcgis/rest/services/INDE/Camadas/MapServer/49?f=pjson) | Campos de balanço, com `DEM_RET40MC`; amostra por ID recuperada | Cenário de planejamento, não observação futura. |
| [162 — retirada por microbacia 2020](https://www.snirh.gov.br/arcgis/rest/services/INDE/Camadas/MapServer/162?f=pjson), polígonos | `AA_REF`, `COBACIA`, `COTRECHO`, demandas setoriais e `VZTOTM3S` | Usos concorrentes e composição da demanda. |
| [166 — retirada municipal 2020](https://www.snirh.gov.br/arcgis/rest/services/INDE/Camadas/MapServer/166?f=pjson), polígonos | `ANO`, `CDMUN`, `NMMUN`, UF/região, demandas setoriais e `VZTOTM3S` | Contexto municipal associado ao IBGE. |

Consultas retornaram feições em SIRGAS 2000/EPSG:4674. As referências temáticas acima não são datas de medição em 2026; o catálogo de usos também documenta estimativas 1931–2021 e projeções até 2040.

**Restrição de escala essencial:** a disponibilidade BHO2017 5K tem escala equivalente **1:250.000** e o produtor contraindica aplicação local, inclusive municípios e pequenas bacias. “5K” refere-se à drenagem acima de 5 km², **não** a escala 1:5.000. Usar como panorama/triagem contextual; estudos locais são necessários para avaliar um lote.

**Semântica e qualidade:** Q95 é referência hidrológica, não outorga ou garantia futura. A NT75 permite repetir a vazão anual nos meses sem estimativas sazonais e documenta sentinelas, inclusive `-999` e substituições numéricas de vazão nula; não tratá-los como medições. A amostra 101 tinha os 12 valores iguais e fonte sazonal nula. O XML contém extensão temporal invertida, não adotada como período válido. Retirada, retorno e consumo diferem; não somar demanda estimada com todas as outorgas nem duplicar recortes municipais/hidrográficos.

#### A2 — ANA: Atlas Água 2021, captações e segurança do abastecimento

- **Fontes:** camadas [9 — subterrâneas](https://www.snirh.gov.br/arcgis/rest/services/INDE/Camadas/MapServer/9?f=pjson), [10 — superficiais](https://www.snirh.gov.br/arcgis/rest/services/INDE/Camadas/MapServer/10?f=pjson) e [11 — ISH-U municipal](https://www.snirh.gov.br/arcgis/rest/services/INDE/Camadas/MapServer/11?f=pjson).
- **Dados observados:** sistemas/captações, `cd_ibge`, `nm_municip`, `nm_massa_d`, `nm_captaca`, `tp_captaca`, `tp_estrutu`, `cpt_vz_max`, `cpt_vz_med`, `status_man`, tratamento e vulnerabilidade quantitativa/qualitativa; camada municipal com ISH-U e links de croquis.
- **Acesso/escala:** multipontos de captação e polígonos municipais em EPSG:4674; referência Atlas 2021. Amostras obtidas por IDs; paginação comum retornou erro interno 400 mesmo com HTTP 200.
- **Utilidade:** identificar manancial efetivo, sistema que atende o município e competição pelo abastecimento, em vez de escolher automaticamente o rio mais próximo.
- **Limites:** unidades de alguns campos de vazão não foram confirmadas na sondagem e não foram convertidas. Captação ou ISH-U favorável não demonstra vazão industrial excedente, autorização de uso ou atendimento ao terreno.

#### A3 — Ministério das Cidades: SINISA 2025, referência 2024

- **Fontes:** [resultados oficiais](https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/resultados-sinisa/resultados-sinisa-2025), [ZIP de referência 2024](https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/resultados-sinisa/SINISA_Resultados_Ref2024.zip) e [glossário de indicadores de água](https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/resultados-sinisa/GlossriodeIndicadores_GUA_2024.pdf).
- **Conteúdo:** módulos de água, esgoto, gestão municipal, resíduos e águas pluviais. A verificação detalhada foi da planilha municipal de indicadores de **água**, não dos cinco módulos.
- **Campos observados:** `cod_IBGE`, município/UF, prestador/natureza/abrangência; atendimento `IAG0001–0003` (%), hidrometração `IAG1003` (%), consumo `IAG2006/2007` (L/hab/dia), perdas `IAG2013` (%) e `IAG2015` (L/ligação/dia), energia `IAG2023` (kWh/m³), duração de paralisações/interrupções `IAG3004/3005` (h/evento), intermitência `IAG3007` (%).
- **Acesso/tempo:** ZIP/XLSX aberto, 5.144 códigos municipais distintos na planilha; referência 2024 e retificação interna de 25/05/2026. Não foi verificada API pública estável.
- **Utilidade:** substituir mera presença de serviço por indicadores de atendimento, eficiência e confiabilidade.
- **Limites:** “Não calculado”, branco e zero diferem; não limitar automaticamente todo indicador percentual a 100 sem ler sua fórmula. São indicadores municipais/de prestador, não contrato de fornecimento ao endereço; não misturar razões sem denominadores.

#### A4 — ANA: HidroWebService

- **Fontes:** [manual público, versão 20/02/2026](https://www.gov.br/ana/pt-br/assuntos/monitoramento-e-eventos-criticos/monitoramento-hidrologico/orientacoes-manuais/manuais/manual-hidrowebservice_publica.pdf) e [OpenAPI](https://www.ana.gov.br/hidrowebservice/api-docs/Vers%C3%A3o%20-%20v1.0.3984.2).
- **Campos documentados:** estação, localização/altitude, área de drenagem, operador e períodos; `Data_Hora_Medicao`, `Chuva_Adotada` (mm), `Cota_Adotada` (cm), `Vazao_Adotada` (m³/s), atualização e status de qualidade.
- **Acesso:** requer solicitação de autorização, credenciais e token; **nenhuma série autenticada foi consultada**. `Municipio_Codigo` é descrito como código hidro, não presumidamente código IBGE.
- **Utilidade:** sazonalidade, extremos, duração de estiagens e robustez das vazões de referência.
- **Limites:** escolher estações por representatividade hidrológica, não apenas distância. Cota não vira vazão sem relação apropriada; registrar lacunas, consistência, curvas-chave e janela temporal.

#### A5 — ANA: Monitor de Secas

- **Fontes:** [apresentação oficial](https://www.gov.br/ana/pt-br/assuntos/monitoramento-e-eventos-criticos/eventos-criticos/monitor-de-secas), [dados SIG](https://monitordesecas.ana.gov.br/dados-sig) e [classes](https://monitordesecas.ana.gov.br/tabela-de-classificacao).
- **Dados/acesso observados:** [ZIP de agosto/2026](https://ana-monitor-secas-files.s3.sa-east-1.amazonaws.com/uploads/mapas/agosto2026.zip) aberto; polígonos WGS84, campos DBF `uf_codigo` e `Valor`, além de arquivos de impactos. S0–S4 representam seca fraca a excepcional; curto/longo prazo são dimensões de impacto.
- **Utilidade proposta:** fração da bacia em cada classe, meses com S2 ou superior e persistência, em janela fixa.
- **Limites:** seca é relativa à região/época, não vazão outorgável. O pacote amostrado tinha `si→0`, `s0→1`, `s1→2`, `s2→3`: não interpretar `Valor=0` como S0. Distinguir sem seca, sem cobertura e sem dado; uma edição não demonstra risco estrutural baixo.

#### A6 — SGB: SIAGAS, águas subterrâneas

- **Fontes:** [apresentação](https://sgb.gov.br/saiba-mais-sistema-de-informacoes-de-aguas-subterraneas-siagas), [sistema](https://siagasweb.sgb.gov.br/) e [registro amostral 2200065040](https://siagasweb.sgb.gov.br/layout/relatorio_impressao.php?ponto=2200065040).
- **Conteúdo observado:** localização, natureza e uso do poço; formulário com profundidade, aquífero, níveis estático/dinâmico, vazão, transmissividade e análise química, vários campos vazios na amostra.
- **Utilidade:** caracterização hidrogeológica e identificação de lacunas para estudo local.
- **Acesso/limite:** consulta de registro HTML; nenhuma API nacional em lote foi validada. Datum/fuso e qualidade devem ser confirmados por registro. Densidade de poços ou teste isolado não demonstra extração sustentável; recarga, interferência, qualidade e autorização estadual precisam de avaliação própria.

#### A7 — ANA e órgãos estaduais: outorgas

- **Fonte:** [outorgas emitidas pela ANA](https://www.gov.br/ana/pt-br/regulacao/principais-servicos/outorgas-emitidas).
- **Acesso observado:** CSV vinculado retornou HTTP 200 com **zero bytes**; serviço ArcGIS localizado a partir da configuração do mapa retornou erro interno. **Nenhuma lista de registros ou esquema literal foi validada por essas vias.**
- **Informação a obter e conferir:** ato/processo, titular, finalidade, corpo hídrico/ponto, vazão e regime autorizado, vigência, situação e condicionantes. Esta lista é requisito de coleta, não afirmação de campos recuperados.
- **Utilidade:** verificar direitos de uso existentes e condições do projeto.
- **Limites:** autorização não mede retirada real nem disponibilidade remanescente. Tratar revisões/revogações e domínio da água; o conjunto federal não cobre automaticamente autorizações estaduais ou águas subterrâneas. Exige fontes e interlocução do órgão gestor competente.

#### A8 — INMET: BDMEP e históricos de estações

- **Fontes:** [serviço BDMEP](https://portal.inmet.gov.br/servicos/bdmep-dados-historicos), [interface](https://bdmep.inmet.gov.br/) e [históricos anuais](https://portal.inmet.gov.br/dadoshistoricos).
- **Conteúdo documentado:** séries meteorológicas de estações convencionais/automáticas, com opções de período e variáveis. Para o DataTerra interessam temperatura, umidade, precipitação, identificação/localização da estação e qualidade temporal.
- **Acesso observado:** formulário por solicitação/e-mail e pacotes anuais de automáticas localizados; nenhum CSV solicitado ou ZIP climático baixado. O pacote 2026 estava descrito como até 30/09/2026.
- **Utilidade:** refrigeração, extremos de calor e coincidência calor–estiagem.
- **Limites:** ainda não há esquema literal validado nesta pesquisa. Selecionar estação por representatividade, relevo/altitude e ambiente urbano; média climatológica não substitui condição de dimensionamento. Refrigeração com menor água no local pode aumentar energia e impactos a montante.

### 3.5 Risco social/territorial: direitos, conservação e perigos físicos

O nome do pilar é mantido para ligação com o briefing, mas a avaliação deve separar **impactos socioambientais, direitos/condicionantes territoriais e exposição a perigos físicos**. Povos e comunidades não são o perigo a ser pontuado.

#### T1 — FUNAI: terras indígenas, áreas em estudo e atos

- **Fontes:** [geoprocessamento e mapas](https://www.gov.br/funai/pt-br/atuacao/terras-indigenas/geoprocessamento-e-mapas), [GeoServer FUNAI](https://www.gov.br/funai/pt-br/atuacao/terras-indigenas/geoprocessamento-e-mapas/geoserver-funai) e [etapas de regularização](https://sii.funai.gov.br/funai_sii/informacoes_indigenas/visao/visao_terras_indigenas.wsp).
- **Conteúdo documentado:** polígonos `Funai:tis_poligonais`, pontos `Funai:tis_pontos`, camadas de portarias e aldeias; identidade, localização, etapa, atos/datas. Distinguir em estudo, delimitada, declarada, homologada e regularizada; reservas indígenas são modalidade distinta, não uma etapa obrigatória dessa sequência.
- **Acesso:** WFS e arquivos vetoriais/tabulares publicados; atualização declarada mensal. [DescribeFeatureType](https://geoserver.funai.gov.br/geoserver/Funai/ows?service=WFS&version=2.0.0&request=DescribeFeatureType&typeNames=Funai:tis_poligonais) falhou por cadeia TLS; a tentativa por HTTP redirecionou e também falhou. Não houve bypass de certificado.
- **Verificação/limites:** nomes literais dos atributos, CRS, escala e amostra de geometrias não foram recuperados. A data da página não atesta atualização de cada terra.
- **Utilidade:** avaliar sobreposição, impactos e atos, inclusive fases anteriores à homologação. Ponto de área em estudo não delimita território; ausência de polígono não demonstra ausência de direitos. Não criar limite jurídico por buffer de aldeia e minimizar exposição desnecessária de localização sensível.

#### T2 — MMA/CNUC: unidades de conservação

- **Fontes:** [recurso oficial CNUC](https://dados.mma.gov.br/dataset/unidadesdeconservacao/resource/b1f7a269-a0b2-4a81-9ac5-108905e74a00) e [WFS MMA/INDE](https://geoservicos.inde.gov.br/geoserver/MMA/ows?service=wfs&version=2.0.0&request=GetCapabilities).
- **Camada exercitada:** `MMA:cnuc_26_07_31`, título julho/2026 atualizado, EPSG:4674; 3.406 feições no serviço, com geometria MultiPolygon amostrada. Não equivale a uma certificação de completude das áreas protegidas.
- **Campos observados:** `cd_cnuc`, `nome_uc`, `cria_ano`, `cria_ato`, `pl_manejo`, `quali_pol`, áreas, esfera, UF/município, gestor, grupo, categoria, biomas, `situacao`, `limite` e geometria. Área e data podem vir como texto.
- **Utilidade:** identificar categoria, ato, gestor e qualidade do limite, para analisar a compatibilidade territorial.
- **Limites:** dados são fornecidos por gestores e o cadastro não entrega automaticamente zoneamento ou regras de cada plano. A camada consultada tinha apenas `limite='uc'`: **não contém as zonas de amortecimento**. Escala/precisão uniforme não confirmada. Uma página MMA exigiu login, mas o WFS público respondeu; não confundir bloqueio do portal com indisponibilidade de todo dado.

#### T3 — ICMBio e gestores: zonas de amortecimento e planos de manejo

- **Fontes:** [dados geoespaciais ICMBio](https://www.gov.br/icmbio/pt-br/dados-icmbio/dados_geoespaciais), [WFS INDE](https://geoservicos.inde.gov.br/geoserver/ICMBio/ows?service=wfs&version=2.0.0&request=GetCapabilities), [exemplo de limites/ZA da REBIO Augusto Ruschi](https://www.gov.br/icmbio/pt-br/assuntos/unidade-de-conservacao/unidades-de-biomas/mata-atlantica/lista-de-ucs/rebio-de-augusto-ruschi/limites-georeferenciados).
- **Disponível/documentado:** limites federais, arquivos por unidade, geometria de ZA quando publicada, ato e plano. O catálogo WFS anunciou limites federais de agosto/2026; a página da REBIO oferece downloads separados de UC e ZA.
- **Verificação:** catálogo e página lidos; arquivos de ZA e seus schemas não foram abertos. Não foi identificada uma base nacional única de ZA no catálogo examinado; isso não prova que não existam outras publicações.
- **Utilidade:** usar delimitação e normas reais, não círculo uniforme.
- **Limites legais:** [SNUC, arts. 25–28](https://legis.senado.leg.br/norma/551861/publicacao/15716150), prevê ZA com exceções para APA/RPPN e regras por unidade. Uso sustentável não significa permissão geral; proteção integral, APA e RPPN não são categorias intercambiáveis. Obter atos/plano atuais do gestor e fontes estaduais/municipais quando pertinentes.

#### T4 — INCRA: territórios quilombolas e regularização

- **Fontes:** [página de territórios quilombolas](https://www.gov.br/incra/pt-br/assuntos/governanca-fundiaria/quilombolas), [Acervo Fundiário](https://acervofundiario.incra.gov.br/acervo/acv.php) e [acompanhamento de processos](https://www.gov.br/incra/pt-br/assuntos/governanca-fundiaria/quilombolas/andamento_dos_processos_quilombolas-08_06_2026.pdf/@@display-file/file).
- **Dados documentais observados:** processo, comunidade, município, área, famílias, editais/retificações de RTID, portaria, decreto e título. Esses são cabeçalhos do PDF, não schema GIS confirmado.
- **Acesso:** Acervo documenta downloads/WMS/WFS, mas redirecionou para autenticação gov.br. Não foi validado WFS quilombola anônimo nem amostra geométrica. Documentação pública de processos foi lida, sem extração tabular automática confiável.
- **Utilidade:** relacionar sobreposição potencial a estágio, atos e titulação parcial/total.
- **Limites:** o documento cobre processos do INCRA no seu recorte declarado, não todo direito territorial ou título emitido por outros entes. Certificação de comunidade, RTID, portaria e título diferem; falta de título ou geometria não significa ausência de direito. Obter informações autorizadas e considerar órgãos fundiários competentes.

#### T5 — SGB/CPRM: suscetibilidade e setores de risco

- **Fontes:** [cartas por estado](https://www.sgb.gov.br/pt/produtos-por-estado-cartografia-de-suscetibilidade), [nota técnica de suscetibilidade](https://rigeo.sgb.gov.br/bitstream/doc/16588/1/NT-Carta_Suscetibilidade.pdf) e [serviço de setorização de risco](https://geoportal.sgb.gov.br/server/rest/services/gestaoterritorial/risco/FeatureServer/0?f=pjson).
- **Suscetibilidade:** predisposição do terreno, com classes/processos em cartas de referência 1:25.000. [Canoas/RS, edição 2025-11](https://rigeo.sgb.gov.br/handle/doc/25739), é exemplo de PDF/SIG por município; pacote vetorial não baixado. Conferir CRS, edição e cobertura de cada produto.
- **Risco — campos observados:** `uf`, `munic`, `cd_geocmu`, `num_setor`, `data_setor`, tipologias, COBRADE, `grau_vulne`, `grau_risco`, edifícios/domicílios/pessoas, descrição/intervenções e geometria.
- **Acesso observado:** ArcGIS retornou 17.918 setores e uma geometria real; referência de origem EPSG:4674, com extensão de serviço também publicada em Web Mercator.
- **Utilidade:** cruzar projeto/corredores com processos e setores mapeados; orientar estudos locais.
- **Limites:** suscetibilidade não é probabilidade de ocorrência; setor de risco inclui ocupação/vulnerabilidade datadas. O serviço destaca alto/muito alto; fora dos polígonos **não significa baixo risco**. Não fornece por si cota de cheia, período de retorno ou segurança de fundação.

#### T6 — MIDR/SEDEC: Atlas Digital de Desastres / S2ID

- **Fontes:** [institucional](https://atlasdigital.mdr.gov.br/paginas/institucional.xhtml), [downloads](https://atlasdigital.mdr.gov.br/paginas/downloads.xhtml) e [CSV consolidado 1991–2025, versão 1.1 de 06/08/2026](https://atlasdigital.mdr.gov.br/arquivos/2026/BD_Atlas_1991_2025_v1.1_2026.08.06_Consolidado.csv).
- **Campos observados:** entre 70 colunas, protocolo, código IBGE, município/UF, datas do evento e registro, COBRADE/tipologia, status, mortos, feridos, desabrigados/desalojados, afetados e danos/prejuízos.
- **Acesso:** arquivo tabular; leitura parcial HTTP 206 do cabeçalho e duas linhas após expiração da tentativa integral. Não foi analisado todo o arquivo. Referência municipal, não manchas de inundação.
- **Utilidade:** frequência de eventos e anos afetados por tipologia em janela comum, como histórico contextual.
- **Limites:** mudanças de notificação/classificação, duplicidade, renovação de registros de seca e lacunas. Evento registrado não é necessariamente reconhecimento federal. Não calcular distância ao desastre a partir do centroide municipal nem converter contagem em probabilidade anual do lote.

#### T7 — IBAMA: embargos e decisões

- **Fontes:** [catálogo de termos de embargo](https://dadosabertos.ibama.gov.br/dataset/fiscalizacao-termo-de-embargo), [CSV de coordenadas](https://stibamadadosabertosprd.blob.core.windows.net/dados-abertos/dados/TERMOS_DE_EMBARGO/TERMO_EMBARGO_COORDENADAS/termo_de_embargo_coordenadas.csv) e [consulta oficial](https://www.gov.br/ibama/pt-br/servicos/consultas/autuacoes-e-embargos/areas-embargadas).
- **Campos observados:** `SEQ_TAD`, `NUM_TAD`, identificadores de polígono/ponto, nome/área, `ORDEM`, `LONGITUDE`, `LATITUDE`, `WKT`, `ULTIMA_ATUALIZACAO_RELATORIO`. O catálogo publica ainda termos e decisões de suspensão/desembargo/restabelecimento, não amostrados.
- **Acesso/tempo:** cabeçalho e linhas lidos; atualização interna amostrada em 14/10/2026. A data do catálogo não substitui a do relatório.
- **Utilidade:** diligência sobre restrição ambiental vinculada ao ato e à sua situação atual.
- **Limites:** a amostra continha WKT `POINT` e ordem de vértices vazia. Não ligar pontos arbitrariamente para inventar polígono; CRS/acurácia não confirmados. Embargo histórico não prova impedimento vigente, ponto próximo não prova interseção, e ausência no IBAMA não afasta atos estaduais/municipais/ICMBio.

#### T8 — INPE: PRODES e DETER

- **Fontes:** [acesso TerraBrasilis](https://terrabrasilis.dpi.inpe.br/acesso-aos-dados/), [WFS](https://terrabrasilis.dpi.inpe.br/geoserver/ows?service=WFS&version=2.0.0&request=GetCapabilities) e [finalidade/limites do DETER](https://www.gov.br/inpe/pt-br/area-conhecimento/unidade-amazonia/projetos-e-pesquisas/deter).
- **Dados observados:** PRODES Mata Atlântica, camada `prodes-mata-atlantica-nb:yearly_deforestation`, com classe, UF, ano/imagem, área, cena, sensor/satélite, fonte e MultiPolygon. DETER Amazônia, `deter-amz:deter_amz`, com classe, `view_date`, `publish_month`, município/código, sensor/satélite, áreas e geometria. Metadados anunciam EPSG:4674.
- **Utilidade:** histórico de supressão e alertas para diligência e pressão cumulativa.
- **Temporalidade/limites:** PRODES é anual, DETER é alerta para fiscalização, não taxa mensal oficial. Biomas/produtos têm anos, resolução e cobertura distintos; nuvens e detecção importam. Não somar os dois como danos independentes nem interpretar alerta como ilegalidade comprovada.
- **Acesso:** schemas e feições recuperados. O tutorial DETER antigo referia camada/campo que retornou 400; usar descoberta atual de schema, não nomes presumidos. Não houve auditoria nacional nem extração integral.

#### T9 — INPE: Programa Queimadas

- **Fontes:** [dados abertos](https://data.inpe.br/queimadas/portal/pages/secao_downloads/dados-abertos/) e [diretório de focos](https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/10min/).
- **Disponível:** focos em CSV/KML, área queimada em TIFF/SHP e produtos de risco de fogo. Foi lido um CSV curto de 11/10/2026 com campos `lat,lon,satelite,data`; os demais produtos não foram amostrados.
- **Utilidade:** exposição contextual de instalações, acessos e rede a fogo/fumaça.
- **Limites:** foco não é incêndio independente nem perímetro queimado; controlar satélite, janela e duplicações. Não foi confirmado CRS específico do CSV. Risco de fogo do ambiente não substitui análise de incêndio da edificação; fumaça exige vento/dispersão, não apenas raio.

#### T10 — Município/estado: zoneamento e outras restrições locais

- **Exemplo oficial:** [GeoSampa, Prefeitura de São Paulo](https://geosampa.prefeitura.sp.gov.br/). A consulta encontrou desafio de verificação de visitante; não foram validados WFS, schema ou geometria.
- **Informação a obter, como requisito de diligência:** zoneamento, plano diretor, uso permitido/condicionado, proteção de mananciais, patrimônio, servidões e atos aplicáveis ao campus e às obras associadas.
- **Utilidade:** verificar uso efetivo e parâmetros locais que uma base federal não resolve.
- **Limites:** não há schema municipal uniforme verificado nesta pesquisa. Proximidade a área industrial não demonstra permissão. Mapas, cadastro fundiário, APP/reserva legal e passivos exigem confirmação específica; este catálogo não pretende esgotar todas as restrições de um imóvel.

## 4. Proteção ambiental e discussões governamentais recentes

Esta seção identifica instrumentos e preocupações que orientam a coleta. Não substitui análise jurídica, não faz inventário de todas as decisões judiciais e não afirma que uma proposta seja regra vigente.

### 4.1 REDATA: água, energia e transparência

A [Lei 15.504, de 15/09/2026](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/l15504.htm) instituiu o regime por alterações na Lei 11.196/2005. A [tramitação do PL 278/2026](https://www25.senado.leg.br/web/atividade/materias/-/materia/172786) confirma a transformação em lei; não descrever o status atual apenas pela expiração da MP anterior.

O art. 11-B prevê, para habilitação ao regime, compromissos de sustentabilidade, suprimento integral por contratos/autoprodução de fontes renováveis **ou de baixa emissão**, conforme regulamento, e **WUE ≤0,05 L/kWh, com aferição anual**. Prevê relatório público de sustentabilidade e a possibilidade de repositório consolidado pelo Executivo. A lei entrou em vigor na publicação, mas esta pesquisa não verificou regulamentação operacional completa, habilitações ou API desse repositório.

**Implicação proposta:** registrar consumo absoluto e sazonal, origem da água, energia de TI/total, contratos e fronteiras do indicador. Esse limite é de habilitação ao REDATA, **não limiar universal de licença ou viabilidade de todo data center**. WUE anual baixo não demonstra disponibilidade local ou ausência de impacto cumulativo; WUE não é WUI.

### 4.2 Licenciamento: situação territorial, influência e atos atuais

O [texto consolidado da Lei 15.190/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15190.htm), consultado, inclui promulgação de partes vetadas em dezembro/2025 e alterações posteriores. Não usar notícia da sanção original como retrato único do texto vigente.

Os arts. 43–44 e anexo distinguem hipóteses, tipologias, área de influência e **distâncias procedimentais**. Logo, seria incorreto afirmar que não existe distância legal alguma; igualmente incorreto seria transformar essas distâncias em afastamento universal ou em “fora do raio = aprovado”. O campus e sua linha/adutora de acesso podem exigir enquadramentos diferentes.

**Implicação proposta:** guardar ato/versão, autoridade, tipologia, área diretamente afetada (ADA), área de influência direta (AID), estudos, condicionantes e situação dos direitos. As demais licenças/outorgas continuam distintas. A [Convenção 169, consolidada no Decreto 10.088/2019, Anexo LXXII](http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/decreto/d10088.htm#anexo72), e as [referências de consulta do MPF](https://www.mpf.mp.br/atuacao/ccr6/documentos-e-publicacoes/protocolos-de-consulta/protocolo-de-consulta-previa-dos-povos-indigenas) exigem atenção à consulta e aos representantes pertinentes; não presumir sua dispensa por uma distância ou substituí-la automaticamente por audiência pública geral.

### 4.3 CONAMA/MMA: proposta de salvaguardas para data centers

O [processo 02000.006148/2026-21](https://conama.mma.gov.br/?id=2709&option=com_sisconama&view=processo) estava marcado como ativo. Foram lidas a [minuta de moção](https://conama.mma.gov.br/index.php?option=com_sisconama&task=documento.download&id=27275) e a [Nota Informativa 563/2026-MMA](https://conama.mma.gov.br/index.php?id=27276&option=com_sisconama&task=documento.download), de maio/2026.

A proposta veio de representação da sociedade civil, com apoio de Idec/LAPIN; a nota ministerial examina seu encaminhamento à pauta, **não estabelece uma resolução final**. Os documentos discutem água/energia, emissões, impactos cumulativos, conflitos territoriais, participação, ruído, resíduos e licenciamento. Não foi comprovada aprovação final das salvaguardas naquele processo.

**Implicação proposta:** levantar vizinhança sensível, outros consumidores/captações, geradores de emergência, ruído, resíduos e participação. São lacunas que as bases atuais não medem. Não converter sugestões de exclusão da minuta em proibições nacionais.

### 4.4 Adaptação climática e dependências de infraestrutura

A [Lei 14.904/2024](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14904.htm) estabelece diretrizes de adaptação, incluindo vulnerabilidade, exposição, água, energia, comunicações e infraestrutura crítica. O [estudo divulgado pela ANA em 31/01/2024](https://www.gov.br/ana/pt-br/assuntos/noticias-e-eventos/noticias/ana-lanca-estudo-sobre-impactos-da-mudanca-climatica-nos-recursos-hidricos-das-diferentes-regioes-do-brasil) explicita diferenças regionais e cenários de disponibilidade; não fundamenta um fator uniforme de redução para todo município.

**Implicação proposta:** separar histórico e cenários futuros no horizonte de vida útil, calor extremo, estiagem, inundação e dependências comuns das rotas de energia/telecom/água. Cartas estáticas e eventos passados ajudam, mas não certificam resiliência futura. Não foi atestada a versão final mais recente de todos os planos federais de adaptação.

## 5. Critérios quantitativos e metodologia proposta

### 5.1 O que as referências realmente sustentam

| Referência | Uso defensável | O que não autoriza |
| --- | --- | --- |
| [Multi-criteria analysis: a manual, governo britânico, 2009](https://www.gov.uk/government/publications/multi-criteria-analysis-manual-for-making-government-policy); [PDF](https://assets.publishing.service.gov.uk/media/5a790545e5274a2acd18b975/1132618.pdf) | Capítulos 5–6: matriz de desempenho, funções de valor, ponderação, exame de dependências e sensibilidade. Seção 6.2.10: pesos devem considerar a mudança entre extremos da escala (*swing weighting*), não apenas “importância” abstrata. | Um conjunto universal de pesos para data centers. O próprio manual discute limitações do AHP, inclusive inversão de ranking, no apêndice 5. |
| [Hussain et al., Land, 2026, DOI 10.3390/land15030516](https://doi.org/10.3390/land15030516) | Precedente de GIS-MCDA para triagem regional no Reino Unido: restrições espaciais, AHP e combinação linear, em resolução de 1 km, conforme resumo consultado. | Transferir pesos, impedimentos ou raios britânicos para o Brasil; validar terrenos a 1 km. Há [correção de figuras publicada em 29/05/2026](https://doi.org/10.3390/land15060934). O texto integral da editora retornou 403; foram acessados os registros/resumos via DOI/Crossref, não auditados os cálculos do artigo. |
| [ANSI/TIA-942, página pública da TIA](https://tiaonline.org/products-and-services/tia942certification/ansi-tia-942-standard/) | Referência setorial para levantamento de requisitos de localização, elétrica, telecomunicações, segurança e redundância; a página descreve a revisão C. | Declarar conformidade, certificação ou distâncias normativas sem consultar o texto aplicável e avaliar o projeto. A página pública não substitui a norma completa. |
| [The Green Grid: WUI v1 / WP95](https://www.thegreengrid.org/resources/library-and-tools/wp95-water-usage-impact-wui-metric) e [calculadora pública](https://www.thegreengrid.org/wui-online-scoring-calculator) | Relacionar consumo de água e estresse hídrico; distinguir eficiência de consumo e impacto territorial. A [divulgação do ITI de 03/11/2025](https://www.itic.org/news-events/news-releases/the-green-grid-releases-new-tool-to-help-data-centers-advance-water-efficiency) descreve o uso na escolha de local e refrigeração. | Afirmar equivalência do WUI do aplicativo ou converter WUE diretamente em risco. O WP95 exige login para download; a página da calculadora foi consultada, mas não houve comparação funcional de resultados. |

GIS-MCDA é uma família de métodos, não uma certificação equivalente ao CVSS. A analogia com CVSS é útil para exigir critérios explícitos e rastreáveis, não para importar suas fórmulas ou classes de severidade.

### 5.2 Separar restrição, desempenho e qualidade da evidência

**Proposta de estados de decisão, independentes da nota:**

1. **Impedimento comprovado:** norma/ato vigente e aplicável ao local e projeto impede a alternativa. Excluir da comparação de aptidão, registrando a fundamentação. Benefícios em outros pilares não compensam o impedimento.
2. **Diligência necessária:** há interseção, conflito potencial, necessidade de consulta ou avaliação técnica não resolvida. Não emitir indicação de aprovação nem transformar a pendência em bônus ou nota neutra.
3. **Informação insuficiente:** cobertura, atualidade ou precisão não permitem avaliar um requisito crítico. Não tratar área não mapeada como área sem risco.
4. **Sem impedimento identificado nas fontes consultadas:** permite continuar a triagem, mas não significa autorização, licença ou conexão assegurada.

Registrar simultaneamente a situação de cada restrição; um rótulo resumido não deve esconder outras pendências. Separar ainda indicadores de desempenho e indicadores de qualidade/cobertura, sem compensar direitos ou segurança com “boa confiança” em outro dado.

### 5.3 Geometria e proximidade: medidas reproduzíveis

A unidade preferida é o **polígono do terreno e das intervenções associadas**, incluindo acesso, conexão elétrica, fibra e captação. Enquanto houver apenas um ponto, informar que área de sobreposição, efeitos do acesso e viabilidade fundiária não foram avaliados. Não aplicar ao centroide municipal conclusões próprias de um terreno.

Para terreno `S` e conjunto de feições `G`, calcular:

- `interseção = intersects(S, união(G))`: inclui contato de limites; área nula não elimina a necessidade de examinar contato ou incerteza posicional.
- `sobreposição_% = 100 × área(S ∩ união(G)) / área(S)`: somente para terreno com área válida. A união evita contar duas vezes polígonos sobrepostos da mesma avaliação.
- `distância_km = distância mínima(S, G)`: usar distância à geometria, não ao centroide da feição. É zero em interseção; por isso a distância sozinha não distingue interior, contato e sobreposição parcial.
- `cobertura`: informar se a base mapeia efetivamente aquela região, com qual data, resolução e estágio cadastral.

Preservar o CRS original; transformar de modo documentado. Para cálculos nacionais, usar distância/área geodésica ou projeção adequada à operação; para análises locais, um sistema métrico apropriado, como SIRGAS 2000/UTM na zona correta. Não medir quilômetros em graus ou adotar Web Mercator como referência de área. Em WFS, conferir versão, CRS e ordem dos eixos.

**Faixas exploratórias propostas, não normativas:** testar vizinhanças de **1, 5 e 10 km** para listar feições e verificar sensibilidade do resultado. São raios de busca/diligência, não afastamentos obrigatórios, notas de segurança ou zona de “risco zero” além de 10 km. Primeiro verificar interseção, zona de amortecimento e área de influência efetivamente aplicáveis. Regras legais ou técnicas específicas prevalecem sobre esses raios. Impactos a jusante, aquíferos, corredores ecológicos e comunidades afetadas podem ultrapassar qualquer vizinhança circular.

Se houver estimativa confiável de erro posicional, apresentar intervalo da distância. Se esse intervalo atravessar um limiar de decisão, classificar a proximidade como indeterminada e exigir base melhor; não esconder o problema com casas decimais.

### 5.4 Matriz de indicadores candidatos

Todas as medidas desta tabela são **propostas para implementação e validação**, não capacidades já disponíveis na aplicação.

| Categoria | Medida quantitativa | Aplicação e cautela |
| --- | --- | --- |
| Subestações e transmissão | Menor distância em km a instalações com situação/tensão compatíveis; quantidade de pontos candidatos; distância e interseção dos corredores de conexão | Priorizar estudos de conexão e estimativa de extensão de obras. Linha próxima não é ponto de conexão; quantidade de instalações não prova independência elétrica. |
| Capacidade de atendimento | MW de carga solicitada; MW admitidos pelo estudo aplicável; prazo e condicionantes | Comparar somente cenários e barramentos compatíveis. Potência de transformador, potência de geração e capacidade remanescente são variáveis diferentes. |
| Energia e emissões | MWh/ano, perfil horário, participação renovável no suprimento e emissões conforme fator/método escolhido | BEN fornece contexto agregado; contrato e operação precisam de evidência própria. Não somar MW a MWh, nem inferir energia renovável consumida pela distância de uma usina. |
| Pressão hídrica | Indicador oficial de balanço; demanda e disponibilidade em unidades/recortes compatíveis, por período; frequência de meses críticos | Avaliar competição pelo recurso e sazonalidade na bacia de captação. Se construir uma razão demanda/disponibilidade, explicitar metodologia, reserva ambiental, consumo versus retirada e tratamento de denominador nulo. |
| Consumo do empreendimento | m³/dia e m³/ano; intensidade em L/kWh com denominador definido; consumo versus retirada; água potável/reúso; consumo de pico | Comparar tecnologias de refrigeração e compatibilidade com atendimento/outorga. Energia de TI e energia total da instalação não são denominadores intercambiáveis. |
| Segurança do abastecimento | Continuidade, perdas, volumes e atendimento do prestador, segundo o dicionário SINISA | Informar fragilidade operacional e necessidade de contrato de fornecimento. Atendimento residencial municipal não demonstra excedente industrial. |
| Conectividade | Presença de transporte em fibra, prestadoras declarantes por município, km até PIX ou ponto de entrega confirmado; latência medida; rotas fisicamente independentes comprovadas | Separar cobertura municipal de atendimento ao terreno. Duas empresas podem compartilhar a mesma vala; contagem de operadores não prova redundância. |
| Direitos territoriais e conservação | Interseção, área sobreposta em %, distância em km, categoria/fase e ato vigente; interseção de intervenções associadas | Encaminhar análise de direitos, consulta e compatibilidade legal. Não reduzir todas as categorias a uma penalidade de distância. |
| Inundação e movimentos de massa | Percentual do terreno em cada classe mapeada; distância a setores; eventos por tipo e janela temporal | Suscetibilidade, perigo, exposição e risco não são sinônimos. Contagem de desastres registrados não é probabilidade anual; zero registros não significa segurança. |
| Desmatamento, fogo e embargo | Interseção com embargo vigente; área de supressão observada na janela; frequência de focos com sensor/janela explícitos | Apoiar diligência ambiental. Alerta de satélite não é prova automática de ilegalidade nem demarcação precisa de dano no terreno. |
| População afetada | Pessoas/domicílios em área de influência, serviços essenciais e indicadores de acesso à água | Planejar medidas de proteção e participação. Evitar interpolação uniforme da população em setores extensos e penalização de grupos sociais. |

### 5.5 Normalização e pesos

**Proposta recomendada:** começar com funções transparentes e *swing weighting*, apoiados no manual britânico, e usar AHP somente se a equipe justificar a escolha, registrar as comparações e examinar consistência e sensibilidade. Não há fundamento nesta pesquisa para substituir 5/4/5/3/4 por outro conjunto arbitrário de “pesos científicos”.

Para um critério em que menor é melhor, uma função linear candidata é:

```text
u(x) = 100 × clip((b − x) / (b − a), 0, 1), com b > a
```

`a` é o desempenho associado a 100 e `b` o associado a zero. Para um benefício crescente, usar `100 × clip((x − a)/(b − a), 0, 1)`. A forma linear é uma opção, não uma hipótese universal. Limiares legais entram como restrições, não como extremos compensáveis dessa escala.

Os extremos precisam vir de requisitos do projeto, custos de conexão, estudos técnicos ou elicitação documentada com especialistas e partes afetadas. Evitar extremos definidos apenas pelo melhor/pior município da amostra: adicionar um candidato mudaria a escala de todos. Não atribuir zero ou 100 com base em ausência de dado.

Somente entre alternativas comparáveis e com critérios adequados:

```text
S = soma(w_j × u_j), com w_j ≥ 0 e soma(w_j) = 1
```

Antes disso, eliminar dupla contagem e avaliar independência de preferências. No modelo atual, geração reaparece em “rede”, e saneamento reaparece em “regulatório”; usar rótulos diferentes não cria evidências independentes. Dividir pesos entre os quatro pilares e seus subcritérios evita que um pilar receba mais peso apenas por ter mais indicadores.

### 5.6 Dados ausentes, sensibilidade e validação

Não renormalizar silenciosamente os pesos só entre os indicadores disponíveis: isso pode premiar o candidato menos conhecido. **Proposta:** bloquear conclusão em requisito crítico desconhecido e, para indicadores compensáveis, mostrar cobertura ponderada e um intervalo conservador:

```text
cobertura = soma dos pesos dos indicadores conhecidos
S_inferior = soma(w_j × u_j conhecidos)
S_superior = S_inferior + 100 × soma dos pesos desconhecidos
```

Esse intervalo representa limites de informação, não intervalo estatístico de confiança. Um critério desconhecido pode assumir de zero a 100; o limite inferior não o declara medido como zero.

**Exercício aritmético executado, inteiramente sintético:** com pesos `(0,30; 0,30; 0,20; 0,20)`, candidato A com notas `(80; 60; desconhecida; 90)` tem cobertura de 80% e intervalo `[60; 80]`. Candidato B com `(75; 70; 60; 75)` tem nota 70,5. Não há informação suficiente para declarar A melhor ou pior que B. Esses pesos/notas não são recomendação para o DataTerra nem avaliação de locais reais.

Plano de validação proposto:

1. Fixar finalidade, carga de TI, demanda total, refrigeração, horizonte de entrada em operação e unidade geográfica antes de comparar alternativas.
2. Registrar requisitos, escalas e pesos em oficina com engenharia elétrica, recursos hídricos, telecomunicações, licenciamento e representantes pertinentes às áreas afetadas. Preservar divergências e autoria dos julgamentos.
3. Variar, como ensaio inicial, cada peso em ±20% e renormalizar os demais proporcionalmente; testar também conjuntos de pesos dos participantes, sem fingir probabilidades para preferências.
4. Comparar períodos secos/úmidos, cenários de demanda, datas das bases, precisão geométrica e raios exploratórios. Reportar reversões de ranking e a frequência de presença no grupo prioritário **nos cenários ensaiados**, não uma probabilidade de viabilidade.
5. Confrontar candidatos diversos com estudos de acesso, fornecimento de água, operadoras, documentos territoriais e análise local. Separar casos usados para calibrar de casos usados para avaliar. Registrar falsos positivos e falsos negativos de restrições.
6. Somente depois definir classes comunicáveis. Não reutilizar “crítico/alto/médio/baixo” do CVSS nem interpretar nota 80 como 80% de chance de aprovação.

## 6. Prioridades de evolução

As etapas abaixo são recomendação de trabalho futuro; nenhuma ingestão ou mudança de score foi executada nesta pesquisa.

| Ordem | Entrega | Critério para considerar concluída |
| --- | --- | --- |
| P0 — Identidade e proveniência | Código IBGE, identificador da fonte, versão, referência temporal, coleta e qualidade por registro/camada | Toda medida permite voltar ao dado original; ausentes continuam ausentes. |
| P0 — Transmissão e restrições | Substituir infraestrutura sintetizada por cadastro oficial; acrescentar direitos territoriais, conservação, embargos e cobertura de riscos | Mapa distingue real/planejado e restrição/pendência; não mantém estimativa visual com aparência de cadastro oficial. |
| P0 — Água e conectividade adequadas à escala | Bacia/trecho de captação, SINISA e transporte Anatel; PIX como complemento | Não chamar presença municipal de vazão disponível ou distância física à fibra. |
| P1 — Metodologia única e auditável | Formalizar diferenças entre ranking regional e avaliação de terreno; indicadores, restrições, funções de valor e pesos versionados | Mesma entrada e mesma versão reproduzem a decisão; cada componente tem unidade, origem e justificativa. |
| P1 — Contexto e cenários | BEN, sazonalidade, clima, desastre, pressão ambiental e demanda do projeto | Contexto nacional não vira falsa precisão local; cenários secos/críticos não ficam escondidos na média anual. |
| P1 — Validação externa | Aplicar a casos com evidência técnica independente e revisar sensibilidade | Relatar onde o método acerta, erra ou não consegue concluir; não apenas demonstrar que o código calcula uma nota. |

### Contrato mínimo de dados recomendado

Para cada recurso: produtor, URL de catálogo, URL/identificador da versão baixada, licença/condições de reutilização, data de coleta UTC, período de referência, atualização declarada, checksum do arquivo bruto, versão do esquema e transformação aplicada. Para cada feição: ID original, geometria/CRS, precisão ou escala, situação/fase, unidades, códigos territoriais e distinção entre nulo, zero e não aplicável.

Preferir API/CKAN, ArcGIS REST, WFS ou arquivo oficial versionável a scraping de tela. WMS serve principalmente para visualização; não fornece por si só uma base vetorial analítica. Descobrir camadas e campos pelos metadados, respeitar limites, paginação e termos de uso; não fixar IDs por suposição. Preservar o bruto e publicar manifesto associado ao snapshot. Caso o serviço falhe, manter o último dado válido identificado com sua data, sem apresentá-lo como atualizado.

Revisão operacional proposta: verificar catálogos e atos antes de cada avaliação relevante e antes da apresentação final; para séries e arquivos anuais, procurar nova edição sem misturar anos silenciosamente. A frequência de coleta deve seguir a atualização real de cada produtor, não um agendamento único que sugira atualização diária de dados anuais.

## 7. Evidências de acesso e limites da verificação

### 7.1 IBGE e referências metodológicas

Foram executadas consultas HTTP de leitura, sem credenciais, ao cadastro e à malha municipal. Exemplos reproduzíveis:

```bash
curl --fail --get 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios/3550308'

curl --fail --get 'https://servicodados.ibge.gov.br/api/v3/malhas/municipios/3550308' \
  --data-urlencode 'periodo=2022' \
  --data-urlencode 'qualidade=minima' \
  --data-urlencode 'formato=application/vnd.geo+json'

curl --fail --get 'https://servicodados.ibge.gov.br/api/v3/malhas/municipios/3550308/metadados' \
  --data-urlencode 'periodo=2022'
```

Resultados observados: `id=3550308`, nome São Paulo; `FeatureCollection` com uma feição `Polygon` e `codarea="3550308"`; metadados com centroide e área de 1.521,202 km². Esses exemplos verificam identidade e acesso, não qualidade para projeto local. As consultas foram feitas pelas ferramentas de leitura da pesquisa; os comandos `curl` acima são a forma equivalente de reprodução, não um log de execução de shell.

Também foram lidos o manual britânico, páginas públicas TIA/TGG e registros DOI/Crossref. A aritmética do exemplo de informação incompleta foi executada em Python, resultando em `[60,0; 80,0]`, cobertura `0,8` e nota B `70,5`. Isso verifica a ilustração, não valida o método de localização.

O corpo das páginas MDPI e WRI consultadas retornou 403. A consulta IBGE de metadados com período 2024 retornou 500, enquanto a edição 2022 respondeu. Não houve contorno de autenticação, auditoria integral dos catálogos ou demonstração de que os serviços são apropriados para consulta direta pelo navegador da aplicação; CORS, quotas e disponibilidade operacional exigem avaliação na implementação.

### 7.2 Energia e conectividade: consultas e arquivos exercitados

| Operação realizada | Resultado observado | Alcance da evidência |
| --- | --- | --- |
| SIGA Datastore, `limit=1` | HTTP 200, `success=true`, total 25.045; amostra em operação, `DatGeracaoConjuntoDados=2026-10-14` | Acesso e campos; não auditoria nacional nem atualização do snapshot DataTerra. |
| SIGEL `/3/query`, envelope regional, duas feições | HTTP 200 por HTTP; SALTO (`OID=60`) e ITATIBA (`OID=75`), geometria pontual e `exceededTransferLimit=true` | Consulta espacial limitada, não universo da área ou folga elétrica. |
| ONS `SUBESTACAO.csv` / `LINHA_TRANSMISSAO.csv` | HTTP 200; 1.692/2.341 linhas; cabeçalhos e exemplos analisados; `Last-Modified` em 14/10/2026 | Integridade de acesso e estrutura; não 1.692 subestações físicas nem 2.341 linhas ativas. |
| Anatel ZIP | HTTP 200; cinco membros; CSVs abertos e GeoPackage consultado via SQLite, 23.582 feições | Transporte declarado, não traçado físico. |
| BEN 2025 | PDFs final/síntese lidos; matriz XLSX HTTP 200 e aberta | Conteúdo tabular/documental; não geosserviço. |
| ONS capacidade, BDGD e IX.br | Nota técnica lida; catálogo BDGD e páginas PIX consultados | Não houve download de GDB, acesso SGAcesso ou consulta de disponibilidade comercial. |

Consulta diagnóstica SIGEL reproduzível, equivalente à executada com cliente HTTP:

```bash
curl --fail --get 'http://sigel.aneel.gov.br/arcgis/rest/services/PORTAL/Transmiss%C3%A3o/MapServer/3/query' \
  --data-urlencode 'f=pjson' \
  --data-urlencode 'where=1=1' \
  --data-urlencode 'geometry=-47.3,-23.2,-46.9,-22.7' \
  --data-urlencode 'geometryType=esriGeometryEnvelope' \
  --data-urlencode 'inSR=4326' \
  --data-urlencode 'spatialRel=esriSpatialRelIntersects' \
  --data-urlencode 'outFields=OID,Name,PopupInfo' \
  --data-urlencode 'returnGeometry=true' \
  --data-urlencode 'outSR=4326' \
  --data-urlencode 'resultRecordCount=2' \
  --data-urlencode 'orderByFields=OID'
```

Não usar o HTTP acima como recomendação de transporte de produção. HTTPS falhou na sessão; `portal` minúsculo também produziu erro de serviço. Os metadados SIGEL anunciam limite de 1.000 e paginação; não houve coleta integral. Qualquer ingestão deve verificar erros no corpo, `exceededTransferLimit`, páginas e atualização, além do status HTTP.

### 7.3 Água: consultas e arquivos exercitados

| Operação realizada | Resultado observado |
| --- | --- |
| ANA camadas 101, 47, 162 e 166: metadata, contagem e amostra | HTTP 200; contagens 50.722, 401.275, 403.757 e 5.570, respectivamente. As diferentes contagens não autorizam junção 1:1. |
| ANA 49, cenário climático | Consulta genérica retornou 504; consulta por `objectIds=1` recuperou atributos do cenário. |
| ANA Atlas 9/10/11 | Amostras por IDs recuperadas; tentativa de paginação devolveu erro ArcGIS 400 dentro de HTTP 200. |
| SINISA ZIP/XLSX | HTTP 200; planilha municipal retificada, 5.144 códigos distintos; cabeçalhos, unidades e notas lidos. |
| Monitor de Secas agosto/2026 | ZIP HTTP 200; SHP/DBF/PRJ inspecionados. |
| SIAGAS | Registro amostral lido, incluindo distinção entre campo existente e não preenchido. |
| Outorgas ANA | CSV vazio e erro interno no serviço associado; não considerado acesso bem-sucedido a dados. |
| HidroWebService / INMET | Documentação/interface consultadas; sem séries autenticadas ou solicitadas por e-mail. |

Exemplo equivalente de consulta de uma feição de disponibilidade:

```bash
curl --fail --get 'https://www.snirh.gov.br/arcgis/rest/services/INDE/Camadas/MapServer/101/query' \
  --data-urlencode 'where=1=1' \
  --data-urlencode 'outFields=*' \
  --data-urlencode 'returnGeometry=true' \
  --data-urlencode 'resultRecordCount=1' \
  --data-urlencode 'outSR=4326' \
  --data-urlencode 'f=pjson'
```

A amostra recuperada foi Rio Oiapoque, `COBACIA=39611`, com `DQANO=109.5944` e valores mensais repetidos. Serve para observar o esquema e a limitação sazonal, **não para afirmar vazão disponível ao DataTerra**. O parâmetro de uma feição funciona nessa camada, mas não pode ser generalizado às camadas Atlas sem consultar suas capacidades.

### 7.4 Território e ambiente: consultas e arquivos exercitados

| Operação realizada | Resultado observado | Limite |
| --- | --- | --- |
| CNUC WFS: capabilities, schema, hits e feição | Camada julho/2026; 3.406 feições; amostra APA Serra da Mantiqueira, `cd_cnuc=0000.00.0011`, uso sustentável, plano de manejo indicado | Contagem de feições, não completude jurídica; seleção de atributos sem geometria não significa geometria ausente. |
| ICMBio WFS | Catálogo HTTP 200, incluindo limites federais de agosto/2026 | Não houve carga de feições ou download de ZA. |
| SGB setorização | 17.918 setores; amostra Polygon de Tramandaí/RS, tipologia inundação, risco muito alto | Um setor datado, não classificação de toda cidade nem cenário de inundação do lote. |
| Atlas/S2ID | HTTP 206, bytes 0–16.383 de arquivo de 86.134.318 bytes; 70 colunas | Somente cabeçalho e duas linhas analisadas; não contar todo o histórico a partir da amostra. |
| IBAMA coordenadas | Cabeçalho/linhas recuperados, HEAD 200; data interna 14/10/2026 | Não validada situação vigente nem reconstruídos polígonos. |
| PRODES/DETER | Capabilities/schemas e MultiPolygon de cada produto recuperados | Amostras históricas; não inferir ano corrente de todo catálogo ou completude sob nuvens. |
| INPE Queimadas | CSV pequeno com oito linhas de focos | Não equivale a oito incêndios distintos. |
| FUNAI | Falha de certificado, inclusive cliente com validação TLS | Nenhuma geometria/schema recuperado; não recomendar ignorar TLS. |
| INCRA | Acervo redirecionou para login gov.br; PDF de processos lido | Geosserviço anônimo e arquivo vetorial não validados. |
| GeoSampa | Desafio de visitante | Não foi exercitado WFS de zoneamento. |

As duas consultas abaixo foram também executadas via `curl` no fechamento da pesquisa: ambas retornaram HTTP 200 e `FeatureCollection` com uma feição, confirmando os parâmetros documentados.

```bash
curl --fail --get 'https://geoservicos.inde.gov.br/geoserver/MMA/ows' \
  --data-urlencode 'service=WFS' \
  --data-urlencode 'version=2.0.0' \
  --data-urlencode 'request=GetFeature' \
  --data-urlencode 'typeNames=MMA:cnuc_26_07_31' \
  --data-urlencode 'count=1' \
  --data-urlencode 'propertyName=cd_cnuc,nome_uc,grupo,categoria,situacao,pl_manejo,quali_pol' \
  --data-urlencode 'outputFormat=application/json'

curl --fail --get 'https://geoportal.sgb.gov.br/server/rest/services/gestaoterritorial/risco/FeatureServer/0/query' \
  --data-urlencode 'where=1=1' \
  --data-urlencode 'outFields=objectid,uf,munic,cd_geocmu,num_setor,data_setor,tipolo_g1,grau_risco' \
  --data-urlencode 'returnGeometry=true' \
  --data-urlencode 'outSR=4326' \
  --data-urlencode 'resultRecordCount=1' \
  --data-urlencode 'f=geojson'
```

São exemplos de leitura limitada; o primeiro seleciona atributos e intencionalmente não pede geometria. O segundo pode indicar `exceededTransferLimit` por retornar somente uma feição. IDs de camada, schemas e resultados devem ser redescobertos/verificados antes de uma carga de produção.

## 8. Custódia da pesquisa e aceite

Este registro é o material de referência técnica para a pré-finalização. **Não foi informado um responsável humano nominal; a pesquisa assistida por IA não deve inventar uma designação nem assumir continuidade de uma pessoa na equipe.** A coordenação do DataTerra deve registrar o ponto focal e a forma de contato no instrumento de gestão do projeto. Esse é o requisito organizacional que não pode ser comprovado apenas com um arquivo.

Atribuições propostas para esse ponto focal:

- explicar o conteúdo, a escala e as limitações de cada fonte;
- manter os links, versões, datas e evidências de acesso;
- distinguir fonte oficial, fonte setorial e métrica calculada pelo DataTerra;
- encaminhar dúvidas de conexão, outorga, direitos territoriais e licenciamento aos responsáveis competentes;
- controlar alterações de pesos/regras e registrar quem as aprovou;
- apresentar à banca o que é observado, proposto, inferido e não conhecido, sem prometer viabilidade do empreendimento.

Canais institucionais publicados para encaminhamento, **sem contato realizado nesta pesquisa**: ONS `relacionamento.agentes@ons.org.br` (catálogos E3/E4); ANA `hidro@ana.gov.br` (manual A4); INCRA `quilombolas@incra.gov.br` (página T4); ICMBio `comite.geo@icmbio.gov.br` (página T3). Esses canais não são responsáveis designados pelo DataTerra nem substituem profissionais/gestores competentes.

O catálogo e a metodologia atendem à parte documental da pesquisa: fontes, conteúdo disponível, utilidade, limitações e critérios propostos. O registro de consultas permite repetir verificações pontuais. Permanecem fora do alcance desta entrega a auditoria dos slides não fornecidos, uma designação nominal de pessoa, ingestão de produção, calibração dos pesos e parecer de viabilidade de terrenos específicos. Esses limites não devem ser confundidos com bases já integradas ou critérios já validados.

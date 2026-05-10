# DataTerra

Protótipo de inteligência territorial para avaliar regiões candidatas a data
centers de IA no Brasil. A aplicação cruza dados públicos reais com proxies
de triagem para comparar energia renovável, água, conectividade, risco e
condições iniciais de implantação.

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

Observação: a ingestão depende de `server/references/municipios.json`, usado
para geocodificar os municípios. Esse arquivo é gerado a partir de referência
externa e fica fora do Git por tamanho/atualização.

## O que o MVP demonstra

- Mapa do Brasil com hotspots de aptidão.
- Score territorial ponderável pelo usuário.
- Camadas de energia renovável, cabos, saneamento e risco hídrico/socioambiental preliminar.
- Ranking de regiões candidatas.
- Simulação WUI para estimar impacto hídrico de data centers.
- Recomendações e condicionantes para triagem de investimento/licenciamento.

## Fontes e limites

Dados reais integrados:

- Empreendimentos de geração renovável da ANEEL.
- Registros municipais de água/esgoto da planilha de saneamento usada no projeto.
- Geometrias de cabos em `all_cables.json`.
- Estresse hídrico estadual baseado no WRI Aqueduct 4.0.

Proxies declarados:

- O score territorial é uma triagem preliminar, não um parecer técnico final.
- Energia e infraestrutura elétrica usam capacidade renovável municipal/estadual
  como sinal inicial.
- Conectividade e mercado ainda usam população como proxy até integrar rotas
  terrestres de fibra e subestações.
- O WUI é um proxy inspirado em The Green Grid WUI combinado com WRI Aqueduct
  por UF; não substitui análise por bacia hidrográfica, outorga, captação,
  disponibilidade local ou licenciamento.

## Testes

```bash
cd server
npm test
```

Também é possível rodar diretamente da raiz:

```bash
node --test test/*.test.js
```

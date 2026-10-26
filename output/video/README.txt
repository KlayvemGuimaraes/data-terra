DataTerra — vídeos de demonstração

Arquivos finais
- dataterra-01-demonstracao.mp4: 10 segundos; busca de Barueri, ajuste do raio e leitura dos quatro pilares.
- dataterra-02-brasil-na-marca.mp4: 16 segundos; uso da interface, fechamento da aba ilustrada e transição da bandeira do Brasil para a marca DataTerra.
- Os JPGs correspondentes são capas de pré-visualização.

Formato: 1920 x 1080, H.264, 30 fps, sem áudio.

A interface exibida é a aplicação real. O cursor, os destaques, a moldura do navegador e a animação final foram preparados para a demonstração. Respostas reais das fontes são reaproveitadas durante a gravação para reduzir o tempo de espera; resultados não foram inventados. Disponibilidade das fontes e valores podem mudar em novas gravações.

Reprodução da produção (opcional; não faz parte do build da plataforma)
Requisitos: Node.js, Playwright com Chromium, ffmpeg e ffprobe no PATH.
1. Disponibilize o pacote playwright no ambiente Node e seu Chromium. Para um Chromium existente, defina DATATERRA_CHROMIUM_PATH com o caminho do executável.
2. Na raiz do repositório, execute: node output/video/source/capture.cjs --record
3. Execute: node output/video/source/export.cjs

O script inicia um servidor local temporário e consulta as fontes oficiais usadas pela API territorial. O diretório captures/ é criado automaticamente, guarda tomadas e respostas intermediárias e permanece fora do Git. Os arquivos finais e os scripts de produção são versionados. Os materiais em output/ não fazem parte do simulador publicado na Vercel.

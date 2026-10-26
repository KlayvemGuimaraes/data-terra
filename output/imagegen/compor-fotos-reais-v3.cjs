const fs = require('node:fs');
const path = require('node:path');
const sharp = require('/Users/klayvemguimaraeslealdasilva/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = '/Users/klayvemguimaraeslealdasilva/Desktop/dataterra/output/imagegen';
const base = '/Users/klayvemguimaraeslealdasilva/.codex/generated_images/01a16b42-ba30-77f0-ba2e-50943b4613a9/exec-3c3d69c2-583e-4102-bf44-8e3201559a14.png';
const photos = path.join(root, 'fontes-reais-riscos');
async function photographicCrop(file, width, height, radius = 0) {
  let data = await sharp(path.join(photos, file))
    .rotate()
    .resize(width, height, {fit:'cover', position:'centre', kernel:'lanczos3'})
    .ensureAlpha()
    .png().toBuffer();
  if (radius) {
    const mask = Buffer.from('<svg width="'+width+'" height="'+height+'"><rect width="'+width+'" height="'+height+'" rx="'+radius+'" fill="white"/></svg>');
    data = await sharp(data).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
  }
  return data;
}
(async () => {
  const meta = await sharp(base).metadata();
  if(meta.width!==1672 || meta.height!==941) throw new Error('Unexpected layout dimensions: '+meta.width+'x'+meta.height);
  const sidebar = await photographicCrop('scala-tambore-sgrutb04.png',608,852);
  const water = await photographicCrop('agua-morris-ben-gray-ajc.jpg',318,363,18);
  const campus = await photographicCrop('scala-tambore-sgrutb08.png',325,363,20);
  const protest = await photographicCrop('anace-faixa-iago-barreto-soares.jpg',334,363,21);
  const native = await sharp(base).composite([
    {input:sidebar,left:0,top:0},
    {input:water,left:629,top:343},
    {input:campus,left:969,top:343},
    {input:protest,left:1311,top:343}
  ]).png().toBuffer();
  const output = path.join(root,'dataterra-slide-riscos-selecao-v3.png');
  await sharp(native).resize(1920,1080,{fit:'fill',kernel:'lanczos3'}).png().toFile(output);
  const out = await sharp(output).metadata();
  console.log(JSON.stringify({output,width:out.width,height:out.height,format:out.format,realPhotographs:4}));
})().catch(e=>{console.error(e);process.exitCode=1;});


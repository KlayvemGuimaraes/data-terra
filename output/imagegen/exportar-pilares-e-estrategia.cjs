const path = require('node:path');
const sharp = require('/Users/klayvemguimaraeslealdasilva/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const generated = '/Users/klayvemguimaraeslealdasilva/.codex/generated_images/01a16b42-ba30-77f0-ba2e-50943b4613a9';
(async () => {
  const pillars = path.join(__dirname, 'dataterra-slide-quatro-pilares.png');
  await sharp(path.join(generated, 'exec-cbf6bc3a-86e9-4250-9f84-17dd83271264.png')).resize(1920,1080,{fit:'fill'}).png().toFile(pillars);
  // Replace the complete generated screenshot band with actual application pixels.
  // The generated composition placed its hard split at approximately x=707/1672.
  const screenshot = await sharp(path.join(__dirname,'dataterra-captura-plataforma-vertical.png')).resize(812,1080,{fit:'cover',position:'top'}).png().toBuffer();
  const layout = await sharp(path.join(generated,'exec-f7ac5339-35c7-4b3f-928c-d578f978d6d5.png')).resize(1920,1080,{fit:'fill'}).png().toBuffer();
  const strategy = path.join(__dirname, 'dataterra-slide-estrategia-territorial.png');
  await sharp(layout).composite([{input:screenshot,top:0,left:0}]).png().toFile(strategy);
  for(const file of [pillars,strategy]) {
    const {width,height,format} = await sharp(file).metadata();
    console.log(JSON.stringify({file,width,height,format}));
    if(width !== 1920 || height !== 1080 || format !== 'png') throw new Error('Unexpected export format');
  }
})().catch(error=>{ console.error(error); process.exitCode=1; });

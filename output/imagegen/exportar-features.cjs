const path = require('node:path');
const sharp = require('/Users/klayvemguimaraeslealdasilva/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const generated = '/Users/klayvemguimaraeslealdasilva/.codex/generated_images/01a16b42-ba30-77f0-ba2e-50943b4613a9';
const jobs = [
  {layout:'exec-4bfd3f71-3202-4132-aaaf-7c18f3f63250.png',screenshot:'dataterra-captura-requisitos.png',output:'dataterra-slide-requisitos-personalizados.png'},
  {layout:'exec-c8136e84-9c4b-40b1-891b-85980698ec22.png',screenshot:'dataterra-captura-avaliacao.png',output:'dataterra-slide-avaliacao-quatro-pilares.png'}
];
(async () => {
  for (const job of jobs) {
    const layout = await sharp(path.join(generated,job.layout)).resize(1920,1080,{fit:'fill'}).png().toBuffer();
    // Replace all generated interface content with the actual capture, preserving its aspect ratio.
    const capture = await sharp(path.join(__dirname,job.screenshot)).resize(814,1080,{fit:'cover',position:'top'}).png().toBuffer();
    const output = path.join(__dirname,job.output);
    await sharp(layout).composite([{input:capture,top:0,left:0}]).png().toFile(output);
    const {width,height,format} = await sharp(output).metadata();
    if(width!==1920 || height!==1080 || format!=='png') throw new Error('Unexpected output dimensions');
    console.log(JSON.stringify({file:output,width,height,format}));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});

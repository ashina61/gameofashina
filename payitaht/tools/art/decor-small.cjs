/** half-size.py: alpha-preserving resampling and complete small-file decode. */
const sharp=require('sharp')
async function main(){
 if(process.argv[2]==='--check'){
  const input=sharp(process.argv[3]),m=await input.metadata()
  if(Math.max(m.width,m.height)!==Number(process.argv[4])||!m.hasAlpha)throw new Error('Invalid decor size/alpha')
  await input.raw().toBuffer()
 }else await sharp(process.argv[2]).resize({width:Number(process.argv[4]),height:Number(process.argv[4]),fit:'inside'}).webp({quality:82,alphaQuality:80,effort:6}).toFile(process.argv[3])
}
main().catch(e=>{console.error(e);process.exitCode=1})

/** Package the user-selected Ottoman barracks. Preserve the generated alpha and aspect ratio. */
const fs=require('node:fs'),path=require('node:path'),nodeCrypto=require('node:crypto'),sharp=require('sharp')
const root=path.resolve(__dirname,'../..')
async function main(){
 const source=process.argv[2]
 if(!source)throw Error('Usage: node tools/art/prepare-approved-barracks.cjs CUTOUT.png')
 const meta=await sharp(source).metadata()
 if(!meta.hasAlpha)throw Error('The cutout must have real alpha')
 const out=path.join(root,'public/images/game/buildings/parcel-v3')
 fs.mkdirSync(out,{recursive:true})
 for(const [suffix,width,quality] of [['',960,82],['-sm',480,80]]){
  const target=path.join(out,'kisla'+suffix+'.webp')
  await sharp(source).resize({width,withoutEnlargement:true}).webp({quality,alphaQuality:100,effort:4}).toFile(target)
  console.log(path.relative(root,target),fs.statSync(target).size)
 }
 const record={generator:'built-in imagegen',approvedPreviewLibraryId:'libfile_06f2cf234e508191ac46f8850e89786d',sourceSha256:nodeCrypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),sourceWidth:meta.width,sourceHeight:meta.height,full:'kisla.webp',small:'kisla-sm.webp',scope:'Single barracks derived from the user-selected design; lower wings and towers adapted to the fixed parcel. No other buildings or growth stages redrawn.'}
 fs.writeFileSync(path.join(root,'docs/approved-barracks-provenance.json'),JSON.stringify(record,null,2)+'\n')
}
main().catch(error=>{console.error(error);process.exitCode=1})

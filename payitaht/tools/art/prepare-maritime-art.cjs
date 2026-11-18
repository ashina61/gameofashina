/** Preserve original alpha and proportions of the two coastal building orientations. */
const fs=require('node:fs'),path=require('node:path'),nodeCrypto=require('node:crypto'),sharp=require('sharp')
const root=path.resolve(__dirname,'../..')
async function main(){
 const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'))
 const directory='public/images/game/buildings/parcel-v9'
 fs.mkdirSync(path.join(root,directory),{recursive:true})
 const records={}
 for(const id of ['liman','liman-duz','tersane','tersane-duz']){
  const {source,prompt}=input[id],meta=await sharp(source).metadata()
  if(!meta.hasAlpha)throw Error(`${id}: missing original alpha`)
  for(const [suffix,width,quality] of [['',960,84],['-sm',480,80]]){
   await sharp(source).resize({width,withoutEnlargement:true}).webp({quality,alphaQuality:100,effort:6})
    .toFile(path.join(root,directory,`${id}${suffix}.webp`))
  }
  records[id]={generator:'built-in imagegen',source:path.basename(source),sha256:nodeCrypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),prompt,
   full:`${directory}/${id}.webp`,small:`${directory}/${id}-sm.webp`}
 }
 fs.writeFileSync(path.join(root,'docs/maritime-art-provenance.json'),JSON.stringify(records,null,2)+'\n')
 console.log('Packaged four coastal sprites in full/phone sizes; preserved source alpha.')
}
main().catch(error=>{console.error(error);process.exitCode=1})

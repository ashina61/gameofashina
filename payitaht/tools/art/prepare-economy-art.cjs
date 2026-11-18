/** Package the two reviewed, groundless economy sprites without recolouring or warping. */
const fs=require('node:fs'),path=require('node:path'),nodeCrypto=require('node:crypto'),sharp=require('sharp')
const root=path.resolve(__dirname,'../..')
async function main(){
 const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'))
 const directory='public/images/game/buildings/parcel-v8'
 fs.mkdirSync(path.join(root,directory),{recursive:true})
 const records={}
 for(const id of ['ambar','kereste']){
  const {source,prompt}=input[id]
  const meta=await sharp(source).metadata()
  if(!meta.hasAlpha)throw Error(`${id}: missing transparent background`)
  for(const [suffix,width,quality] of [['',960,84],['-sm',480,80]]){
   await sharp(source).resize({width,withoutEnlargement:true}).webp({quality,alphaQuality:100,effort:6})
    .toFile(path.join(root,directory,`${id}${suffix}.webp`))
  }
  records[id]={generator:'built-in imagegen',source:path.basename(source),sha256:nodeCrypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),prompt,
   full:`${directory}/${id}.webp`,small:`${directory}/${id}-sm.webp`}
 }
 fs.writeFileSync(path.join(root,'docs/economy-art-provenance.json'),JSON.stringify(records,null,2)+'\n')
 console.log('Packaged Ambar and Kereste Ocağı with original alpha; prompts and hashes recorded.')
}
main().catch(error=>{console.error(error);process.exitCode=1})

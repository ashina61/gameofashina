/** Package imagegen alpha sprites without changing geometry, colour, or transparency. */
const fs=require('node:fs'),path=require('node:path'),nodeCrypto=require('node:crypto'),sharp=require('sharp')
const root=path.resolve(__dirname,'../..'),out=path.join(root,'public/images/game/buildings/parcel-v2')
async function main(){
 const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'))
 fs.mkdirSync(out,{recursive:true})
 const provenanceFile=path.join(root,'docs/parcel-v2-provenance.json')
 const provenance=fs.existsSync(provenanceFile)?JSON.parse(fs.readFileSync(provenanceFile,'utf8')):{}
 const queue=Object.entries(input)
 await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{while(queue.length){
  const [id,source]=queue.shift()
  if(!/^[a-z_]+(?:-duz)?$/.test(id))throw Error('Invalid building ID')
  const sourceHash=nodeCrypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')
  if(provenance[id]?.sha256===sourceHash&&['','-sm'].every(suffix=>fs.existsSync(path.join(out,id+suffix+'.webp')))){console.log(id+' unchanged');continue}
  const meta=await sharp(source).metadata();if(!meta.hasAlpha)throw Error(id+' must have alpha')
  for(const [suffix,width,quality] of [['',960,82],['-sm',480,78]]){
   await sharp(source).resize({width,withoutEnlargement:true}).webp({quality,alphaQuality:100,effort:6}).toFile(path.join(out,id+suffix+'.webp'))
  }
  provenance[id]={generator:'built-in imagegen',sha256:sourceHash,full:`${id}.webp`,small:`${id}-sm.webp`}
  console.log(id)
 }}))
 fs.writeFileSync(provenanceFile,JSON.stringify(provenance,null,2)+'\n')
}
main().catch(e=>{console.error(e);process.exitCode=1})

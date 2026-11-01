/** Package the imagegen sources listed as {buildingId:absolutePath} on stdin. */
const fs=require('node:fs'),path=require('node:path'),nodeCrypto=require('node:crypto'),sharp=require('sharp')
const root=path.resolve(__dirname,'../..')
async function main(){
 const inputs=JSON.parse(fs.readFileSync(0,'utf8')),out=path.join(root,'public/images/game/buildings/parcel-v5')
 fs.mkdirSync(out,{recursive:true})
 const provenance={}
 for(const [id,source]of Object.entries(inputs)){
  if(!['divan','medrese','carsi','depo','bagci','elcilik'].includes(id))throw Error('Unknown revision ID: '+id)
  if(!(await sharp(source).metadata()).hasAlpha)throw Error(id+': missing alpha')
  for(const [suffix,width]of [['',960],['-sm',480]])await sharp(source).resize({width}).webp({quality:suffix?82:88,alphaQuality:100,effort:6}).toFile(path.join(out,id+suffix+'.webp'))
  provenance[id]={generator:'built-in imagegen',sha256:nodeCrypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')}
 }
 fs.writeFileSync(path.join(root,'docs/readable-buildings-provenance.json'),JSON.stringify(provenance,null,2)+'\n')
}
main().catch(e=>{console.error(e);process.exitCode=1})

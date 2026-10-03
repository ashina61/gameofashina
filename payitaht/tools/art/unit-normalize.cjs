/** Selected ImageGen sources -> 512 px alpha WebP within the phone budget. */
const fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp')
async function main(){
 const records=JSON.parse(await fs.readFile(process.argv[2],'utf8'))
 const catalog=await fs.readFile('lib/game/core/data.ts','utf8')
 const out='public/images/game/units',encoding=[]
 const previous=JSON.parse(await fs.readFile('visual-review/G6/encoding.json','utf8').catch(()=>'[]'))
 await fs.mkdir(out,{recursive:true})
 for(const r of records){
  if(!r.path||!/^[a-z_]+$/.test(r.id))throw Error('Invalid selected source')
  const branch=catalog.match(new RegExp(`\\b${r.id}: \\{[^\\n]*branch: '([^']+)'`))?.[1]
  if(!branch)throw Error('Unknown unit '+r.id)
  // 12 ships *40 KB +17 land figures *25 KB =905 KB; G5 +G6 <=15,000,000 bytes.
  const maxBytes=branch==='deniz'?40000:25000
  const cached=previous.find(p=>p.id===r.id&&p.source===path.basename(r.path)&&p.bytes<=maxBytes)
  if(cached&&(await fs.stat(path.join(out,r.id+'.webp')).catch(()=>null))?.size===cached.bytes){encoding.push({...cached,maxBytes});continue}
  let saved=false
  for(const [quality,alphaQuality]of[[82,100],[82,80],[82,60],[82,40],[82,20],[76,20],[70,20],[64,20],[58,20],[50,20],[42,20]]){
   const b=await sharp(r.path).trim().resize(464,464,{fit:'contain',background:'#00000000'})
    .extend({top:24,bottom:24,left:24,right:24,background:'#00000000'})
    .webp({quality,alphaQuality,effort:6}).toBuffer()
   if(b.length<=maxBytes){await fs.writeFile(path.join(out,r.id+'.webp'),b);encoding.push({id:r.id,source:path.basename(r.path),quality,alphaQuality,maxBytes,bytes:b.length});saved=true;break}
  }
  if(!saved)throw Error(`${r.id}: ${maxBytes} byte allowance exceeded`)
 }
 await fs.mkdir('visual-review/G6',{recursive:true})
 await fs.writeFile('visual-review/G6/encoding.json',JSON.stringify(encoding,null,2))
 console.log(`Normalized ${records.length} units`)
}
main().catch(e=>{console.error(e);process.exitCode=1})

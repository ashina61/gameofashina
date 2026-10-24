/** Package the accepted terrain and two-storey cutout without changing geometry. */
const fs=require('node:fs'),path=require('node:path'),nodeCrypto=require('node:crypto'),sharp=require('sharp')
async function main(){
 const [terrain,building]=process.argv.slice(2)
 if(!terrain||!building)throw Error('Usage: prepare-cohesive-city.cjs TERRAIN.png BARRACKS.png')
 const meta=await sharp(terrain).metadata()
 if(meta.width!==1586||meta.height!==992)throw Error('Terrain must preserve calibrated 1586x992 geometry')
 const out='public/images/game/buildings/parcel-v4';fs.mkdirSync(out,{recursive:true})
 await sharp(terrain).removeAlpha().webp({quality:94,effort:4}).toFile('public/images/game/terrain/painted-town-v1/city.webp')
 if(!(await sharp(building).metadata()).hasAlpha)throw Error('Barracks requires real alpha')
 for(const [suffix,width,quality] of [['',960,82],['-sm',480,80]])await sharp(building).resize({width,withoutEnlargement:true}).webp({quality,alphaQuality:100,effort:4}).toFile(path.join(out,`kisla${suffix}.webp`))
 const hash=file=>nodeCrypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
 fs.writeFileSync('docs/cohesive-city-provenance.json',JSON.stringify({generator:'built-in imagegen',terrainSha256:hash(terrain),barracksSha256:hash(building),terrainDimensions:[1586,992],scope:'Accepted full-map repaint and two-storey barracks only. Other building art and all saved slots unchanged.'},null,2)+'\n')
}
main().catch(error=>{console.error(error);process.exitCode=1})

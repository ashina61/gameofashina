import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { BUILDING_IDS } from '../engine'
import { MASTER_BUILDING_ART, MASTER_BUILDING_CUTOUTS, masterBuildingImage } from './master-building-art'
import { MASTER_PLOTS, masterArtFrame, masterBuildingPlot, parcelContains } from './master-projection'

test('parcel modules cover their ground; architecture cutouts preserve proportions and stay inside every parcel', async () => {
  const ids=BUILDING_IDS.filter(id=>id!=='surlar')
  assert.equal(ids.length,36)
  for(const id of ids){
    assert.ok(MASTER_BUILDING_ART.has(id))
    for(const suffix of ['', '-sm']){
      const {data,info}=await sharp(`public${masterBuildingImage(id, 1, undefined, suffix ? 'sm' : 'full')}`).ensureAlpha().raw().toBuffer({resolveWithObject:true})
      if(MASTER_BUILDING_CUTOUTS.has(id)){
        let transparent=0,visible=0
        for(let i=3;i<data.length;i+=info.channels){if(data[i]===0)transparent++;else visible++}
        assert.ok(transparent>data.length/info.channels*0.1, `${id}: city ground must show through`)
        assert.ok(visible>0, `${id}: missing architecture`)
        for(const plot of MASTER_PLOTS){
          const p=masterBuildingPlot(plot), art=masterArtFrame(p,info.width,info.height,false)
          assert.ok(Math.abs(art.width/art.height-info.width/info.height)<1e-8, `${id}: distorted architecture`)
          for(const x of [art.left,art.right])for(const y of [art.top,art.bottom])assert.ok(parcelContains(p.polygon,{x,y}), `${id}: outside parcel`)
        }
        continue
      }
      for(let i=3;i<data.length;i+=info.channels)if(data[i]!==255)assert.fail(`${id}${suffix}: transparent parcel pixel`)
      for(const p of MASTER_PLOTS)for(const levelGrowth of [0.9,0.93,0.97,1]){
        const art=masterArtFrame(p,info.width,info.height,true,levelGrowth)
        assert.equal(art.width,p.width);assert.equal(art.height,p.height)
      }
    }
  }
})

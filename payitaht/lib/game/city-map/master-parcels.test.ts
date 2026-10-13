import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { BUILDING_IDS } from '../engine'
import { MASTER_BUILDING_ART } from './master-building-art'
import { MASTER_PLOTS, masterArtFrame } from './master-projection'

test('every completed building module covers every parcel without transparent gaps at any level', async () => {
  const ids=BUILDING_IDS.filter(id=>id!=='surlar')
  assert.equal(ids.length,36)
  for(const id of ids){
    assert.ok(MASTER_BUILDING_ART.has(id))
    for(const suffix of ['', '-sm']){
      const {data,info}=await sharp(`public/images/game/buildings/master-v4/${id}${suffix}.webp`).ensureAlpha().raw().toBuffer({resolveWithObject:true})
      for(let i=3;i<data.length;i+=info.channels)if(data[i]!==255)assert.fail(`${id}${suffix}: transparent parcel pixel`)
      for(const p of MASTER_PLOTS)for(const levelGrowth of [0.9,0.93,0.97,1]){
        const art=masterArtFrame(p,info.width,info.height,true,levelGrowth)
        assert.equal(art.width,p.width);assert.equal(art.height,p.height)
      }
    }
  }
})

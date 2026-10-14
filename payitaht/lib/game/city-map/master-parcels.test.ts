import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { BUILDING_IDS } from '../engine'
import { MASTER_BUILDING_ART, MASTER_BUILDING_CUTOUTS, masterBuildingImage } from './master-building-art'
import { MASTER_PLOTS, masterArtFrame, masterBuildingPlot, parcelContains } from './master-projection'
import { masterCutoutFrame, masterCutoutOutline } from './master-cutout'

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
        const outline=masterCutoutOutline(id,info.width,info.height)
        assert.ok(outline, `${id}: missing visible-pixel contour`)
        const rows: Array<{x:number;y:number}>=[]
        for(let y=0;y<info.height;y++){
          let left=info.width,right=-1
          for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*info.channels+3]){left=Math.min(left,x);right=x}
          if(right>=0)for(const x of [left,right+1])for(const edgeY of [y,y+1])rows.push({x:x/info.width,y:edgeY/info.height})
        }
        for(const plot of MASTER_PLOTS)for(const flip of [false,true]){
          const p=masterBuildingPlot(plot), art=masterCutoutFrame(p,info.width,info.height,outline,flip)
          assert.ok(Math.abs(art.width/art.height-info.width/info.height)<1e-8, `${id}: distorted architecture`)
          for(const q of rows)assert.ok(parcelContains(p.polygon,{x:art.left+(flip?1-q.x:q.x)*art.width,y:art.top+q.y*art.height}), `${id}: visible pixel outside parcel ${plot.index}`)
          assert.ok(Math.abs(Math.max(...art.polygon.map(q=>q.y))-(Math.max(...p.polygon.map(q=>q.y))-1.5))<1e-7, `${id}: entrance detached from front kerb`)
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

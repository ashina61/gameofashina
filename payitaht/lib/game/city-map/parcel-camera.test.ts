import test from 'node:test'
import assert from 'node:assert/strict'
import { parcelCameraViewport, parcelCityZoom } from './parcel-camera'
import { PARCEL_WORLD, PARCEL_PLOTS } from './parcel-city'

// Reproduce the camera's bounds clamp, then check what a player actually sees.
// Previously full-canvas coverZoom won over townZoom on portrait phones.
test('town hall and its complete parcel stay inside the measured HUD band on phones and rotation',()=>{
  const hall=PARCEL_PLOTS[0]
  for(const [w,h,top,bottom] of [[360,780,240,696],[390,844,250,758],[430,932,260,845],[844,390,118,324]]){
    const v=parcelCameraViewport(w,h,top,bottom)
    const z=parcelCityZoom(v.width,v.height,PARCEL_WORLD,hall.center.y)
    const centre=Math.max(v.height/(2*z),Math.min(PARCEL_WORLD.h-v.height/(2*z),hall.center.y))
    const screen=(y:number)=>v.y+v.height/2+(y-centre)*z
    assert.ok(screen(hall.center.y-hall.height/2)>top+20,`${w}: roof under HUD`)
    assert.ok(screen(hall.center.y+hall.height/2)<bottom-20,`${w}: base under nav`)
    assert.ok(Math.abs(screen(hall.center.y)-(top+bottom)/2)<1,`${w}: civic centre drifts`)
    assert.ok(v.width/z>=1000,`${w}: adjacent parcels must remain visible`)
    assert.ok(v.width/z<=PARCEL_WORLD.w&&v.height/z<=PARCEL_WORLD.h)
  }
})

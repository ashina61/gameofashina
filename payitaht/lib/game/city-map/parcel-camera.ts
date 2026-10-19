/** Visible city band in canvas pixels. HUD geometry is measured, never modified. */
export function parcelCameraViewport(width:number,height:number,top=height*.13,bottom=height*.85){
  const y=Math.max(0,Math.min(height-1,top))
  const end=Math.min(height,Math.max(y+1,bottom))
  return {x:0,y,width:Math.max(1,width),height:end-y}
}

/** Frame the civic centre with adjacent parcels; fit bounds without forcing it under the HUD. */
export function parcelCityZoom(width:number,height:number,world:{w:number;h:number},focusY:number){
  const cover=Math.max(width/world.w,height/world.h)
  // Enough vertical space on both sides of the focus to avoid the camera bounds
  // silently moving the town hall away from the middle of the visible band.
  const headroom=Math.max(1,Math.min(focusY,world.h-focusY))
  return Math.max(cover,width/1800,height/(2*headroom)*1.03)
}

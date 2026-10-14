'use client'

import { useEffect,useRef,useState,type CSSProperties } from 'react'
import type { FoundationScene } from './foundation-scene'
import { FOUNDATION_NAMES,type FoundationBuilding } from '@/lib/game/city-map/foundation-grid'
import { asset } from '@/lib/asset'

const control:CSSProperties={minWidth:44,minHeight:44,border:'1px solid #a47e45',borderRadius:12,background:'#403020',color:'#f4e5c8',padding:'9px 12px',fontSize:14,cursor:'pointer'}
export function FoundationView(){
  const holder=useRef<HTMLDivElement>(null),view=useRef<FoundationScene|null>(null)
  const [selected,setSelected]=useState<FoundationBuilding|null>(null),[status,setStatus]=useState('Şehir hazırlanıyor…'),[ready,setReady]=useState(false)
  useEffect(()=>{
    let disposed=false,game:import('phaser').Game|null=null,observer:ResizeObserver|null=null
    void(async()=>{
      const [Phaser,{FoundationScene}]=await Promise.all([import('phaser'),import('./foundation-scene')])
      if(disposed||!holder.current)return
      const scene=new FoundationScene(),dpr=Math.min(2,window.devicePixelRatio||1),box=holder.current.getBoundingClientRect()
      scene.onSelect=setSelected;scene.onStatus=setStatus;scene.onReady=()=>setReady(true);view.current=scene
      Object.assign(window,{__foundation:scene})
      game=new Phaser.Game({type:Phaser.AUTO,parent:holder.current,scale:{mode:Phaser.Scale.NONE,width:Math.round(box.width*dpr),height:Math.round(box.height*dpr),zoom:1/dpr},render:{antialias:true,roundPixels:false},input:{windowEvents:false},banner:false,audio:{noAudio:true},scene:[scene]})
      observer=new ResizeObserver(entries=>{const r=entries[0]?.contentRect;if(r&&r.width>0&&r.height>0){game?.scale.resize(Math.round(r.width*dpr),Math.round(r.height*dpr))}});observer.observe(holder.current)
    })()
    return()=>{disposed=true;observer?.disconnect();view.current=null;game?.destroy(true);delete (window as unknown as {__foundation?:FoundationScene}).__foundation}
  },[])
  return <main style={{position:'fixed',inset:0,background:'#1f322c',color:'#f4e5c8',fontFamily:'Georgia,serif',display:'flex',flexDirection:'column'}}>
    <header style={{background:'linear-gradient(#513d28,#2d231a)',borderBottom:'2px solid #a47e45',padding:'12px 16px',boxShadow:'0 4px 18px #0005',zIndex:2}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><div><h1 style={{fontSize:22,margin:0}}>Yeni şehir</h1><p style={{margin:'3px 0 0',fontSize:13,color:'#d7c4a4'}}>Belediye · Kışla · Medrese</p></div><a href={asset('/')} style={{...control,textDecoration:'none',display:'grid',placeItems:'center'}}>Oyuna dön</a></div>
      <nav aria-label="Yapılar" style={{display:'flex',gap:8,marginTop:12}}>{(Object.keys(FOUNDATION_NAMES) as FoundationBuilding[]).map(id=><button key={id} disabled={!ready} style={{...control,flex:1,background:selected===id?'#76582d':'#403020'}} onClick={()=>view.current?.select(id)}>{FOUNDATION_NAMES[id]}</button>)}</nav>
    </header>
    <div ref={holder} style={{flex:1,minHeight:0,position:'relative',touchAction:'none',overflow:'hidden'}} aria-label="Yeni izometrik şehir önizlemesi" />
    <footer style={{padding:'10px 12px',background:'#2d231a',borderTop:'2px solid #a47e45',zIndex:2}}>
      <p role="status" style={{margin:'0 0 8px',fontSize:14,lineHeight:1.4,minHeight:20}}>{status}</p>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        <button style={control} aria-label="Yakınlaştır" onClick={()=>view.current?.zoomBy(1.25)}>+</button><button style={control} aria-label="Uzaklaştır" onClick={()=>view.current?.zoomBy(0.8)}>−</button>
        <button style={control} onClick={()=>view.current?.focusPilot()}>Merkez</button><button style={control} onClick={()=>view.current?.overview()}>Genel</button><button style={control} onClick={()=>view.current?.toggleGuides()}>Arsalar</button>
        {selected&&selected!=='divan'&&<button style={{...control,background:'#76582d'}} onClick={()=>view.current?.moveSelected()}>Taşı</button>}
        <button style={control} onClick={()=>view.current?.reset()}>Sıfırla</button>
      </div>
    </footer>
  </main>
}

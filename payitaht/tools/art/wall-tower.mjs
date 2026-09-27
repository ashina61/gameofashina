/** Code-native Ottoman watchtower. Run: node tools/art/wall-tower.mjs
 * Same tall silhouette and bottom anchor as the original tower texture.
 * Only the illustration changes; defence, placement and hit areas are untouched.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const parts = []
const add = s => parts.push(s)
add(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="760" viewBox="0 0 240 760">
<defs>
 <linearGradient id="stone"><stop stop-color="#a48b65"/><stop offset=".23" stop-color="#e2cfa8"/><stop offset=".48" stop-color="#cbb78f"/><stop offset=".82" stop-color="#ac956e"/><stop offset="1" stop-color="#857556"/></linearGradient>
 <linearGradient id="roof"><stop stop-color="#883e29"/><stop offset=".27" stop-color="#cb734d"/><stop offset=".58" stop-color="#ad5638"/><stop offset="1" stop-color="#6e3829"/></linearGradient>
 <linearGradient id="recess"><stop stop-color="#282c25"/><stop offset="1" stop-color="#5b4b34"/></linearGradient>
 <clipPath id="body"><path d="M36 266 Q120 295 204 266 V706 C204 755 36 755 36 706Z"/></clipPath>
</defs>
<!-- Footing and cylindrical lime-stone drum. -->
<ellipse cx="120" cy="726" rx="103" ry="30" fill="#34442b" opacity=".19"/>
<path d="M25 699Q120 666 215 699V719C215 760 25 760 25 719Z" fill="url(#stone)" stroke="#85704f" stroke-width="2"/>
<ellipse cx="120" cy="699" rx="95" ry="28" fill="#d8c49d"/>
<path d="M36 266Q120 295 204 266V706C204 755 36 755 36 706Z" fill="url(#stone)" stroke="#8c7756" stroke-width="2"/>
<g clip-path="url(#body)">`)
// Curved bed joints follow the cylinder, with alternate perpends.
for(let row=0;row<16;row++){
 const y=280+row*28
 add(`<path d="M30 ${y}Q120 ${y+36} 210 ${y}" fill="none" stroke="#715e43" stroke-opacity=".38" stroke-width="1.6"/><path d="M30 ${y+2}Q120 ${y+38} 210 ${y+2}" fill="none" stroke="#f4e4c3" stroke-opacity=".48" stroke-width="1"/>`)
 for(let col=0;col<5;col++){
  const x=39+col*37+(row%2)*18, dip=18*(1-((x-120)/90)**2)
  add(`<path d="M${x} ${y+dip}v28" stroke="#806d4f" stroke-opacity=".4" stroke-width="1.4"/>`)
 }
 if(row%3===0)add(`<path d="M64 ${y+12}l12 2m78 8 9-1" stroke="#f2dfb9" opacity=".3" stroke-width="2"/>`)
}
add(`</g>
<!-- Chamfered string courses and narrow splayed arrow loops. -->`)
for(const y of [429,660])add(`<path d="M34 ${y}Q120 ${y+34} 206 ${y}v8Q120 ${y+43} 34 ${y+8}Z" fill="url(#stone)" stroke="#806b4c" stroke-width="1.5"/><path d="M35 ${y}Q120 ${y+33} 205 ${y}" fill="none" stroke="#f0dfbd" stroke-width="2"/>`)
for(const [x,y] of [[80,334],[164,348],[122,522]]){
 add(`<path d="M${x-9} ${y+53}v-43q9-19 18 0v43Z" fill="#e9d7b0" stroke="#9b805a" stroke-width="2"/><path d="M${x-3} ${y+47}v-36q3-9 6 0v36Z" fill="url(#recess)"/><path d="M${x-3} ${y+37}h6" stroke="#1f281f" stroke-width="3"/>`)
}
add(`<!-- Corbelled gallery, open crenels, tiled conical roof. -->
<path d="M36 261Q120 292 204 261L221 226Q120 258 19 226Z" fill="url(#stone)" stroke="#8b7757" stroke-width="2"/>`)
for(let i=0;i<9;i++){
 const x=25+i*22,y=241+19*Math.sin(i/8*Math.PI)
 add(`<path d="M${x} ${y}v17l7 7v-22Z" fill="#7b694b" opacity=".7"/><path d="M${x} ${y}h8v17h-5Z" fill="#d7c299"/>`)
}
add(`<ellipse cx="120" cy="222" rx="104" ry="31" fill="#756b50" stroke="#dccba5" stroke-width="7"/>
<path d="M28 219Q120 190 212 219L120 36Z" fill="url(#roof)" stroke="#6c4931" stroke-width="2"/>`)
for(let i=1;i<8;i++){
 const t=i/8,y=36+183*t,rx=92*t
 add(`<path d="M${120-rx} ${y}Q120 ${y+27*t} ${120+rx} ${y}" fill="none" stroke="#703d2c" stroke-opacity=".55" stroke-width="1.8"/><path d="M${121-rx} ${y-1}Q120 ${y+27*t-1} ${119+rx} ${y-1}" fill="none" stroke="#e29a67" stroke-opacity=".35" stroke-width="1"/>`)
}
for(const x of [55,88,126,162,194])add(`<path d="M120 38L${x} ${220-((x-120)/92)**2*4}" stroke="#683e2e" stroke-opacity=".35" stroke-width="1.4"/>`)
// Front merlons with a lit cap and dark side face.
for(let i=0;i<9;i++){
 const x=17+i*23,y=215+27*Math.sin(i/8*Math.PI)
 add(`<path d="M${x} ${y}l10-5 11 5-10 6Z" fill="#f0dfb9" stroke="#95805e" stroke-width="1"/><path d="M${x} ${y}l11 6v25l-11-6Z" fill="#d0bb93" stroke="#95805e" stroke-width="1"/><path d="M${x+11} ${y+6}l10-6v25l-10 6Z" fill="#9d8965" stroke="#806d50" stroke-width="1"/>`)
}
add(`<path d="M120 38V19" stroke="#806036" stroke-width="5"/><circle cx="120" cy="15" r="7" fill="#c7a354" stroke="#796139" stroke-width="2"/><circle cx="118" cy="13" r="2" fill="#f6dda0"/>
</svg>`)
writeFileSync(fileURLToPath(new URL('../../public/images/game/walls/tower-round.svg',import.meta.url)),parts.join('\n'))

import * as Phaser from 'phaser'
import { CityScene } from './phaser-city'
import { MASTER_MAP, MASTER_WORLD, MASTER_DEFENSE_PATH, MASTER_TOWER_SIZE, masterCameraBounds, MASTER_TERRAIN_TILES, MASTER_PLOTS, masterPlot, masterArtFrame, type MasterPlot } from '@/lib/game/city-map/master-projection'
import { BUILDINGS, BUILDING_IDS, activeJob, plotOpen, type BuildingId, type Game } from '@/lib/game/engine'
import { asset, buildingArtKey } from '@/lib/asset'
import { MASTER_BUILDING_ART, masterBuildingImage } from '@/lib/game/city-map/master-building-art'
import { visualSignature } from '@/lib/game/city-render'
import { PEACEFUL_CITY, siegeAppearanceKey, type SiegeAppearance } from '@/lib/game/siege-appearance'
import { FlagField, SmokeField } from './city-life'
import { SkyLayer } from './city-sky'
import { cityArtSize, isTap, stageGrowth, FLAG_POLE_BUILDINGS } from './city/shared'

/** Painted master map: runtime projection only. Engine, tile map and saves are unchanged. */
export class MasterCityScene extends CityScene {
  masterWalkers: Array<{ image: Phaser.GameObjects.Image; points: Phaser.Math.Vector2[]; progress: number; speed: number }> = []
  masterShips: Phaser.GameObjects.Image[] = []
  masterSea: Phaser.GameObjects.Image | null = null
  masterBoundsZoom = 0
  masterBoundsHeight = 0
  masterBoundsWidth = 0
  masterHudInset = 0
  preload() {
    this.load.image(MASTER_MAP.key, asset(MASTER_MAP.path))
    this.load.image('master-open-sea', asset('/images/game/terrain/master-open-sea-v1.webp'))
    for (const tile of MASTER_TERRAIN_TILES) this.load.image(tile.key, asset(tile.path))
    for (const id of BUILDING_IDS) {
      const level = this.state.buildings[id]
      if (!BUILDINGS[id].art || level <= 0 || id === 'surlar') continue
      const facing = id === 'liman' || id === 'tersane' ? this.state.coastFacing[id] : undefined
      this.load.image(buildingArtKey(id, level, facing), masterBuildingImage(id, level, facing, cityArtSize()))
    }
    this.load.image('b_site', asset('/images/game/buildings/site.webp'))
    this.load.image('b_scaffold', asset('/images/game/buildings/scaffold.webp'))
    for (const key of ['ship-a', 'ship-b', 'fishing']) this.load.image(`s_${key}`, asset(`/images/game/ships/${key}.webp`))
    this.load.image('master-citizen', asset('/images/game/ui/people/citizen-figure.webp'))
    for (const tier of [1, 2, 3]) for (const part of ['segment', 'tower', 'gate']) {
      this.load.image(`w_${part}-${tier}`, asset(`/images/game/walls/${part}-${tier}.webp`))
    }
  }
  ensureBuildingTexture(id: BuildingId, level: number) {
    if (!BUILDINGS[id].art || level <= 0 || id === 'surlar') return
    const facing = id === 'liman' || id === 'tersane' ? this.state.coastFacing[id] : undefined
    const key = buildingArtKey(id, level, facing)
    if (this.textures.exists(key) || this.loadingBuildingTextures.has(key)) return
    this.loadingBuildingTextures.add(key)
    this.load.image(key, masterBuildingImage(id, level, facing, cityArtSize()))
    this.load.once(`filecomplete-image-${key}`, () => {
      this.loadingBuildingTextures.delete(key)
      if (!this.built) return
      this.signature = ''
      this.redraw()
    })
    if (!this.load.isLoading()) this.load.start()
  }
  create() {
    this.cameras.main.setBackgroundColor('#086183')
    const s = MASTER_MAP.scale
    // Keep the painting's aspect ratio and continue only the open sea southward.
    const wr = this.worldRect()
    this.add.rectangle(wr.x + wr.w / 2, wr.y + wr.h / 2, wr.w, wr.h, 0x086183).setDepth(-1002)
    // One open-water painting: no strips, mirrored structures or repeated wave tiles.
    // Blend only the last 32 source pixels of open water, below all land/plots.
    const overlap = 96
    const seaHeight = wr.h - MASTER_MAP.height * s + overlap
    const water = this.textures.get('master-open-sea').getSourceImage() as HTMLImageElement
    const sea = this.textures.createCanvas('master-open-sea-blended', water.width, water.height)!
    sea.context.drawImage(water, 0, 0)
    sea.context.globalCompositeOperation = 'destination-in'
    const fade = sea.context.createLinearGradient(0, 0, 0, overlap / seaHeight * water.height)
    fade.addColorStop(0, 'rgba(255,255,255,0)')
    fade.addColorStop(1, 'rgba(255,255,255,1)')
    sea.context.fillStyle = fade
    sea.context.fillRect(0, 0, water.width, water.height)
    sea.refresh()
    this.masterSea = this.add.image(0, MASTER_MAP.height * s - overlap, 'master-open-sea-blended')
      .setOrigin(0).setDisplaySize(wr.w, seaHeight).setTint(0x409ebb).setDepth(-998)
    this.add.image(0, 0, MASTER_MAP.key, '__BASE').setOrigin(0).setDisplaySize(MASTER_MAP.width * s, MASTER_MAP.height * s).setDepth(-1000)
    for (const tile of MASTER_TERRAIN_TILES) {
      if (!this.textures.exists(tile.key)) continue
      const detail = this.add.image(tile.x * s, tile.y * s, tile.key).setOrigin(0)
        .setDisplaySize(tile.width * s, tile.height * s).setDepth(-999)
      // Feather only internal texture joins over the unchanged master painting.
      // Parcel geometry and building textures are never masked or cropped.
      const maskKey = `${tile.key}-join-mask`
      const mask = this.textures.createCanvas(maskKey, tile.width * 2, tile.height * 2)!
      const ctx = mask.context, w = mask.width, h = mask.height, feather = 32
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'destination-in'
      for (const [startX,startY,endX,endY] of [
        ...(tile.x > 0 ? [[0,0,feather,0]] : []),
        ...(tile.x + tile.width < MASTER_MAP.width ? [[w,0,w-feather,0]] : []),
        ...(tile.y > 0 ? [[0,0,0,feather]] : []),
        ...(tile.y + tile.height < MASTER_MAP.height ? [[0,h,0,h-feather]] : []),
      ]) {
        const fade = ctx.createLinearGradient(startX,startY,endX,endY)
        fade.addColorStop(0,'rgba(255,255,255,0)'); fade.addColorStop(1,'rgba(255,255,255,1)')
        ctx.fillStyle = fade; ctx.fillRect(0,0,w,h)
      }
      mask.refresh()
      const maskImage = this.make.image({x: tile.x*s, y: tile.y*s, key: maskKey, add: false})
        .setOrigin(0).setDisplaySize(tile.width*s,tile.height*s)
      if (this.game.renderer.type === Phaser.WEBGL) detail.setMask(maskImage.createBitmapMask())
      else {
        const blended = this.textures.createCanvas(`${tile.key}-blended`,w,h)!
        blended.context.drawImage(this.textures.get(tile.key).getSourceImage() as HTMLImageElement,0,0,w,h)
        blended.context.globalCompositeOperation='destination-in'
        blended.context.drawImage(mask.canvas,0,0)
        blended.refresh();detail.setTexture(blended.key)
        this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.textures.remove(blended.key))
      }
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { detail.clearMask(true); maskImage.destroy(); this.textures.remove(maskKey) })
    }
    this.flagField = new FlagField(this)
    this.flagField.setLook(this.sceneBanner())
    this.smoke = new SmokeField(this)
    this.sky = new SkyLayer(this, wr)
    this.built = true
    this.maxZoom = 1.5
    this.setupCamera()
    this.installCamera()
    this.addMasterLife()
    this.redraw()
    const cleanup = () => {
      this.built = false
      const target = Phaser.GameObjects.Graphics.TargetCamera
      if (target.scene === this) {
        target.destroy()
        Object.assign(Phaser.GameObjects.Graphics, { TargetCamera: new Phaser.Cameras.Scene2D.BaseCamera(0, 0, 0, 0) })
      }
      delete document.documentElement.dataset.cityReady
      delete document.documentElement.dataset.masterMap
    }
    this.events.once('shutdown', cleanup)
    this.events.once('destroy', cleanup)
    this.events$.onReady?.()
  }
  worldRect() { return MASTER_WORLD }
  townRect() { return { x: 600, y: 320, w: 3630, h: 1850 } }
  coverZoom() { return super.coverZoom() }
  townZoom() { return this.scale.width / (this.townRect().w * 1.05) }
  setCityView() {
    const hall = MASTER_PLOTS[0].center
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.cityZoom, this.minZoom, this.maxZoom))
    this.centerInBand(hall.x, hall.y + 650)
    this.velocity = { x: 0, y: 0 }
  }
  setOverview() {
    this.cameras.main.setZoom(this.minZoom)
    this.centerInBand(MASTER_MAP.width * 1.5, MASTER_MAP.height * 1.5)
  }
  focusHarbour() {
    if (!this.built) return
    const plots = [masterPlot(this.state.placement.liman), masterPlot(this.state.placement.tersane)].filter((p): p is MasterPlot => !!p)
    const p = plots.length ? plots : [MASTER_PLOTS[25], MASTER_PLOTS[26], MASTER_PLOTS[27]]
    const left = Math.min(...p.map(v => v.center.x - v.width / 2))
    const right = Math.max(...p.map(v => v.center.x + v.width / 2))
    this.cameras.main.setZoom(Math.min(this.maxZoom, Math.max(this.minZoom, this.scale.width * 0.88 / (right - left))))
    this.centerInBand((left + right) / 2, p.reduce((sum, v) => sum + v.center.y, 0) / p.length)
    this.velocity = { x: 0, y: 0 }
  }
  sync(game: Game, showLabels: boolean, placing: boolean, moving: BuildingId | null = null, movePlot: number | null = null, siege: SiegeAppearance = PEACEFUL_CITY) {
    this.state = game
    this.showLabels = showLabels
    this.placing = placing
    this.moving = moving
    this.movePlot = movePlot
    this.siege = siege
    if (!this.built) return
    const next = `${visualSignature(game)}|${showLabels}|${placing}|${moving}|${movePlot}|${siegeAppearanceKey(siege)}`
    if (this.signature !== next) this.redraw()
  }
  updateMoveTarget(pointer: Phaser.Input.Pointer) {
    const eligible = this.eligibleMovePlots()
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const target = MASTER_PLOTS.filter(p => eligible.has(p.index)).sort((a, b) =>
      Math.hypot(a.center.x - point.x, a.center.y - point.y) - Math.hypot(b.center.x - point.x, b.center.y - point.y))[0]
    if (target && target.index !== this.movePlot) {
      this.movePlot = target.index
      this.redraw()
      this.events$.onMovePlot(target.index)
    }
  }
  redraw() {
    this.signature = `${visualSignature(this.state)}|${this.showLabels}|${this.placing}|${this.moving}|${this.movePlot}|${siegeAppearanceKey(this.siege)}`
    for (const piece of this.pieces) piece.destroy()
    this.pieces = []
    this.labelOf.clear()
    this.flagField?.removeGroup('pieces')
    this.smoke?.removeGroup('pieces')
    this.sky?.removeGroup('pieces')
    this.flagField?.setLook(this.sceneBanner())
    this.flagField?.setLevel(this.state.buildings.divan)
    const occupied = new Map<number, BuildingId>()
    for (const id of BUILDING_IDS) {
      const at = id === this.moving && this.movePlot !== null ? this.movePlot : this.state.placement[id]
      if (at != null && id !== 'surlar') occupied.set(at, id)
    }
    const running = activeJob(this.state)?.id
    const eligible = this.eligibleMovePlots()
    for (const p of MASTER_PLOTS) {
      const id = occupied.get(p.index)
      if (id) this.drawMasterBuilding(id, p, running === id)
      else if (plotOpen(this.state, p.index)) this.drawMasterPlot(p)
      if (this.moving && eligible.has(p.index)) this.plotFrame(p, p.index === this.movePlot ? 0x85c46f : 0xe8ce93)
    }
    this.drawMasterDefense()
    this.drawMasterSiege()
    for (const ship of this.masterShips) ship.setVisible(!this.siege.blockade)
    this.markReady()
  }
  plotFrame(p: MasterPlot, color: number) {
    const g = this.add.graphics().setDepth(1e5)
    g.fillStyle(color, 0.12).fillRoundedRect(p.center.x - p.width / 2, p.center.y - p.height / 2, p.width, p.height, 12)
    g.lineStyle(4, color, 0.9).strokeRoundedRect(p.center.x - p.width / 2, p.center.y - p.height / 2, p.width, p.height, 12)
    this.pieces.push(g)
  }
  drawMasterPlot(p: MasterPlot) {
    if (this.placing) this.plotFrame(p, 0xe8ce93)
    const hit = this.add.rectangle(p.center.x, p.center.y, p.width, p.height, 0xffffff, 0).setDepth(p.center.y).setInteractive({ useHandCursor: true })
    hit.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (isTap(pointer) && !this.moving && !this.pinchStart) this.events$.onPlot(p.index)
    })
    this.pieces.push(hit)
  }
  drawMasterBuilding(id: BuildingId, p: MasterPlot, active: boolean) {
    const level = this.state.buildings[id]
    const facing = id === 'liman' || id === 'tersane' ? this.state.coastFacing[id] : undefined
    const key = level > 0 ? buildingArtKey(id, level, facing) : 'b_site'
    if (level > 0 && !this.textures.exists(key)) { this.ensureBuildingTexture(id, level); return }
    if (!this.textures.exists(key)) return
    const complete = level > 0 && MASTER_BUILDING_ART.has(id)
    const source = this.textures.get(key).getSourceImage() as HTMLImageElement
    const frame = masterArtFrame(p, source.width, source.height, complete, stageGrowth(level))
    const { width, height, bottom: y } = frame
    const flip = facing ? facing === 'right' : this.state.flips.includes(id)
    let image: Phaser.GameObjects.Image | Phaser.GameObjects.Mesh
    if (complete && this.game.renderer.type === Phaser.WEBGL) {
      const vertices = p.polygon.flatMap(q => [q.x - p.center.x, p.center.y - q.y])
      const uv = flip ? [1,0, 0,0, 0,1, 1,1] : [0,0, 1,0, 1,1, 0,1]
      const mesh = this.add.mesh(p.center.x, p.center.y, key, undefined, vertices, uv, [0,1,2, 0,2,3])
      mesh.setSize(width, height).setOrtho(width, height)
      mesh.hideCCW = false
      image = mesh
    } else if (complete) {
      image = this.canvasParcel(p, key, flip)
    } else {
      image = this.add.image(p.center.x, p.center.y, key).setDisplaySize(width, height).setFlipX(flip)
    }
    image.setDepth(p.center.y + 1)
    image.setData('masterPlot', p.index).setData('masterArt', id).setData('masterRole', 'art').setData('masterComplete', complete)
    this.pieces.push(image)
    const shadow = this.add.ellipse(p.center.x + p.width * 0.025, p.center.y + p.height * 0.12, width * 0.7, p.height * 0.18, 0x352716, 0.12).setDepth(p.center.y - 1)
    shadow.setData('masterPlot', p.index).setData('masterRole', 'shadow')
    this.pieces.push(shadow)
    const hit = this.add.rectangle(p.center.x, p.center.y, p.width * 0.98, p.height * 0.98, 0xffffff, 0)
      .setDepth(p.center.y + 2).setInteractive({ useHandCursor: true })
    hit.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!isTap(pointer) || this.moving || this.pinchStart) return
      // Keep the whole parcel covered during tap feedback.
      this.tweens.killTweensOf(image)
      if (image instanceof Phaser.GameObjects.Image) image.setDisplaySize(width, height)
      image.setTint(0xffedce)
      this.time.delayedCall(110, () => { if (image.active) image.clearTint() })
      this.events$.onBuilding(id)
    })
    this.pieces.push(hit)
    if (FLAG_POLE_BUILDINGS.has(id)) {
      const x = p.center.x - p.width * 0.35, fy = p.center.y - p.height * 0.30
      const pole = this.add.rectangle(x, fy + p.height * 0.14, 4, p.height * 0.28, 0x815c34).setDepth(p.center.y + 3)
      pole.setData('masterPlot', p.index).setData('masterRole', 'pole')
      this.pieces.push(pole)
      this.flagField?.add({ x, y: fy, w: p.width * 0.11, h: p.height * 0.15, depth: p.center.y + 4, dir: 1 }, 'pieces')
    }
    if (this.showLabels || active) {
      const label = this.makePaintedLabel(p.center.x, y + 18, level, BUILDINGS[id].name, 1e6 + p.center.y)
      this.labelOf.set(id, label)
      this.pieces.push(label)
    }
    if (p.slot.zone === 'sehir') this.sky?.addLight(p.center.x, y - height * 0.28, 'pieces')
    const job = activeJob(this.state)
    if (active && job) {
      const sc = this.add.image(p.center.x, p.center.y, 'b_scaffold').setOrigin(0.5).setDepth(p.center.y + 5)
      const scaffold = masterArtFrame(p, sc.width, sc.height, false)
      sc.setDisplaySize(scaffold.width, scaffold.height)
      sc.setData('masterPlot', p.index).setData('masterRole', 'scaffold')
      this.pieces.push(sc, this.makeTimer(p.center.x, y + 75, job.start, job.end, 1e6 + p.center.y + 1))
    }
  }
  /** Canvas fallback maps the same whole texture; it never cuts a roof to fit. */
  canvasParcel(p: MasterPlot, key: string, flip: boolean) {
    const textureKey = `${key}-parcel-${p.index}-${Number(flip)}`
    if (!this.textures.exists(textureKey)) {
      const source = this.textures.get(key).getSourceImage() as HTMLImageElement
      const canvas = this.textures.createCanvas(textureKey, Math.ceil(p.width * 2), Math.ceil(p.height * 2))!
      const ctx = canvas.context
      const target = p.polygon.map(q => ({x: (q.x-p.center.x+p.width/2)*2, y: (q.y-p.center.y+p.height/2)*2}))
      const uv = [[0,0],[1,0],[1,1],[0,1]].map(([u,v]) => ({x: (flip ? 1-u : u)*source.width, y: v*source.height}))
      for (const indices of [[0,1,2],[0,2,3]]) {
        const [a,b,c]=indices.map(i=>uv[i]),[d,e,f]=indices.map(i=>target[i])
        const den=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y)
        const ax=((e.x-d.x)*(c.y-a.y)-(f.x-d.x)*(b.y-a.y))/den
        const bx=((f.x-d.x)*(b.x-a.x)-(e.x-d.x)*(c.x-a.x))/den
        const ay=((e.y-d.y)*(c.y-a.y)-(f.y-d.y)*(b.y-a.y))/den
        const by=((f.y-d.y)*(b.x-a.x)-(e.y-d.y)*(c.x-a.x))/den
        ctx.save();ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(e.x,e.y);ctx.lineTo(f.x,f.y);ctx.closePath();ctx.clip()
        ctx.setTransform(ax,ay,bx,by,d.x-ax*a.x-bx*a.y,d.y-ay*a.x-by*a.y)
        ctx.drawImage(source,0,0);ctx.restore()
      }
      canvas.refresh()
      this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.textures.remove(textureKey))
    }
    return this.add.image(p.center.x,p.center.y,textureKey).setDisplaySize(p.width,p.height).setData('masterPolygon',p.polygon)
  }
  drawMasterDefense() {
    // The upper earthen embankment in the supplied painting is the defense
    // site. Wall art follows that embankment, never the old Tiled octagon.
    const level = this.state.buildings.surlar
    const s = MASTER_MAP.scale
    const points = MASTER_DEFENSE_PATH
    if (level > 0) {
      const tier = level >= 8 ? 3 : level >= 4 ? 2 : 1
      for (let i = 0; i < points.length - 1; i++) {
        const [ax, ay] = points[i], [bx, by] = points[i + 1]
        const count = Math.ceil(Math.hypot(bx - ax, by - ay) / 64)
        for (let j = 0; j < count; j++) {
          const t = (j + 0.5) / count
          const wall = this.add.image((ax + (bx - ax) * t) * s, (ay + (by - ay) * t) * s, `w_segment-${tier}`).setOrigin(0.5, 0.73).setDepth(50)
          const span = Math.hypot(bx - ax, by - ay) * s / count * 1.18
          wall.setScale(span / wall.width)
          // The painted segment's baseline already slopes upward by 17°.
          wall.setAngle(17 + Phaser.Math.RadToDeg(Math.atan2(by - ay, bx - ax)))
          wall.setData('masterRole', 'defense')
          this.pieces.push(wall)
        }
      }
      for (const i of [0, 2, 5, 7]) {
        const tower = this.add.image(points[i][0] * s, points[i][1] * s, `w_tower-${tier}`).setOrigin(0.5, 1).setDepth(51)
        tower.setScale(MASTER_TOWER_SIZE * s / tower.width)
        tower.setData('masterRole', 'defense')
        this.pieces.push(tower)
      }
    }
    const hit = this.add.rectangle(760 * s, 54 * s, 730 * s, 60 * s, 0xffffff, 0).setDepth(55).setInteractive({ useHandCursor: true })
    hit.on('pointerup', (p: Phaser.Input.Pointer) => { if (isTap(p) && !this.moving) this.events$.onBuilding('surlar') })
    this.pieces.push(hit)
  }
  drawMasterSiege() {
    if (this.siege.occupation) {
      const p = MASTER_PLOTS[0]
      this.smoke?.addSource(p.center.x + p.width * 0.36, p.center.y, 'pieces', 0.8, 0x504736)
    }
    if (this.siege.blockade || this.raidWanted) {
      for (const x of [570, 905, 1200]) {
        const ship = this.add.image(x * 3, 860 * 3, 's_ship-b').setOrigin(0.5, 0.8).setDepth(2700).setTint(0xcc9990)
        ship.setScale(115 * 3 / ship.width)
        this.pieces.push(ship)
      }
    }
  }
  addMasterLife() {
    for (const [i, x] of [470, 855, 1130].entries()) {
      const ship = this.add.image(x * 3, (870 + i * 27) * 3, i === 2 ? 's_fishing' : 's_ship-a').setDepth(2700)
      ship.setScale((i === 2 ? 65 : 95) * 3 / ship.width)
      this.tweens.add({ targets: ship, y: ship.y + 10, angle: 1.5, duration: 2600 + i * 350, yoyo: true, repeat: -1 })
      this.masterShips.push(ship)
    }
    // These paths follow the measured horizontal streets and the harbor
    // promenade. No citizen crosses an empty plot or the central hall.
    const paths = [[[270,296], [1240,296]], [[240,518], [1260,518]], [[235,768], [1260,768]], [[738,296], [738,768]]]
    for (let i = 0; i < 10; i++) {
      const points = paths[i % paths.length].map(([x, y]) => new Phaser.Math.Vector2(x * 3, y * 3))
      const image = this.add.image(0, 0, 'master-citizen').setOrigin(0.5, 1).setDisplaySize(12, 29)
      this.masterWalkers.push({ image, points, progress: i / 10, speed: 0.012 + i * 0.001 })
    }
  }
  setRaidAlert(on: boolean) {
    if (this.raidWanted === on) return
    this.raidWanted = on
    if (this.built) this.redraw()
  }
  fxSail() {
    if (!this.built) return
    const ship = this.add.image(730 * 3, 850 * 3, 's_ship-a').setDepth(2800)
    ship.setScale(100 * 3 / ship.width)
    this.tweens.add({ targets: ship, y: 1040 * 3, alpha: 0, duration: 3200, onComplete: () => ship.destroy() })
  }
  fxMarch() {
    if (!this.built) return
    for (let i = 0; i < 5; i++) {
      const figure = this.add.image((660 - i * 12) * 3, 557 * 3, 'master-citizen').setOrigin(0.5, 1).setDisplaySize(14, 32).setDepth(1700)
      this.tweens.add({ targets: figure, x: 1220 * 3, duration: 4200 + i * 100, onComplete: () => figure.destroy() })
    }
  }
  update(_time: number, delta: number) {
    const cam = this.cameras.main
    if (this.masterBoundsWidth !== this.scale.width || this.masterBoundsHeight !== this.scale.height) {
      const canvas = this.game.canvas.getBoundingClientRect()
      const hud = document.querySelector('.ika-top')?.getBoundingClientRect()
      // The HUD is clipped around its lower ornament. Keep the map behind
      // the solid 90% of its height, rather than exposing a blue margin below it.
      const coveredBottom = hud ? hud.top + hud.height * 0.9 : canvas.top
      this.masterHudInset = Math.max(0, Math.min(1, (coveredBottom - canvas.top) / Math.max(1, canvas.height))) * this.scale.height
    }
    if (this.masterBoundsZoom !== cam.zoom || this.masterBoundsHeight !== this.scale.height || this.masterBoundsWidth !== this.scale.width) {
      const bounds = masterCameraBounds(this.masterHudInset, cam.zoom)
      cam.setBounds(bounds.x, bounds.y, bounds.w, bounds.h)
      this.masterBoundsZoom = cam.zoom
      this.masterBoundsHeight = this.scale.height
      this.masterBoundsWidth = this.scale.width
    }
    super.update(_time, delta)
    const dt = Math.min(delta, 100) / 1000
    for (const walker of this.masterWalkers) {
      walker.progress = (walker.progress + walker.speed * dt) % 2
      const t = walker.progress <= 1 ? walker.progress : 2 - walker.progress
      const [a, b] = walker.points
      walker.image.setPosition(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t).setDepth(walker.image.y)
      walker.image.setFlipX(walker.progress > 1)
    }
    if (localStorage.getItem('payitaht-qa') === '1') {
      const camera = this.cameras.main
      document.documentElement.dataset.masterCamera = JSON.stringify({ viewX: camera.worldView.x, viewY: camera.worldView.y, zoom: camera.zoom,
        visibleTop: camera.worldView.y + this.masterHudInset / camera.zoom,
        seaTexture: this.masterSea?.texture.key,
        seaTiled: this.children.list.some(p => p instanceof Phaser.GameObjects.TileSprite && p.texture.key.startsWith('master-water')),
        forestExtension: this.textures.exists('master-forest-extension') })
    }
  }
  markReady() {
    if (!this.built || this.load.isLoading() || this.loadingBuildingTextures.size) return
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
      document.documentElement.dataset.cityReady = String(++this.readyCount)
      document.documentElement.dataset.masterMap = '20261013'
      if (localStorage.getItem('payitaht-qa') === '1') {
        const defense = this.pieces.filter(part => part instanceof Phaser.GameObjects.Image && part.getData('masterRole') === 'defense')
          .map(part => {
            const b = (part as Phaser.GameObjects.Image).getBounds()
            return { outside: b.left < 0 || b.top < 0 || b.right > MASTER_WORLD.w || b.bottom > MASTER_WORLD.h,
              overlaps: MASTER_PLOTS.filter(p => b.left < p.center.x + p.width / 2 && b.right > p.center.x - p.width / 2
                && b.top < p.center.y + p.height / 2 && b.bottom > p.center.y - p.height / 2).map(p => p.index) }
          })
        document.documentElement.dataset.masterDefense = JSON.stringify(defense)
        const measured = this.pieces.flatMap(part => {
          if (!(part instanceof Phaser.GameObjects.Image || part instanceof Phaser.GameObjects.Mesh || part instanceof Phaser.GameObjects.Rectangle || part instanceof Phaser.GameObjects.Ellipse)) return []
          const index = part.getData('masterPlot') as number | undefined
          const p = masterPlot(index)
          if (!p) return []
          const polygon = part instanceof Phaser.GameObjects.Mesh
            ? [...new Map(part.vertices.map(v => [`${v.vx},${v.vy}`, {x: part.x + v.vx, y: part.y + v.vy}])).values()] : (part.getData('masterPolygon') as Array<{x:number;y:number}> | undefined) || []
          const b = part instanceof Phaser.GameObjects.Mesh
            ? new Phaser.Geom.Rectangle(Math.min(...polygon.map(q=>q.x)), Math.min(...polygon.map(q=>q.y)), Math.max(...polygon.map(q=>q.x))-Math.min(...polygon.map(q=>q.x)), Math.max(...polygon.map(q=>q.y))-Math.min(...polygon.map(q=>q.y)))
            : part.getBounds()
          const outside = b.left < p.center.x - p.width / 2 - 0.01 || b.right > p.center.x + p.width / 2 + 0.01
            || b.top < p.center.y - p.height / 2 - 0.01 || b.bottom > p.center.y + p.height / 2 + 0.01
          return [{ index, role: part.getData('masterRole'), id: part.getData('masterArt'), outside,
            complete: !!part.getData('masterComplete'), polygon, plotPolygon: p.polygon, fullyCovers: polygon.length === 4 && p.polygon.every(q => polygon.some(v => Math.hypot(v.x-q.x, v.y-q.y) < 0.1)),
            x: part.x, y: part.y, width: b.width, height: b.height, plotWidth: p.width, plotHeight: p.height }]
        })
        document.documentElement.dataset.masterContainment = JSON.stringify({ measured, violations: measured.filter(p => p.outside) })
      }
    })
  }
}

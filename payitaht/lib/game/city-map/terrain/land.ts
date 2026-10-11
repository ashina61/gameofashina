import { asset } from '@/lib/asset'
import { HALL_SLOT_ID, slotById, TILE } from '../index'
import * as Phaser from 'phaser'

const PAINTED_CITY_KEY = 'city_l1_painted'
const PAINTED_CITY_URL = asset('/images/game/terrain/city-l1.webp')
const SOURCE_W = 1536
const SOURCE_H = 1024
// Onaylı master görselde belediye/Topkapı tabanının merkezi.
const HALL_ART_X = 768
const HALL_ART_Y = 390

type ReadyScene = Phaser.Scene & { markReady?: () => void }

function mountPaintedCityBase(scene: Phaser.Scene) {
  const mount = () => {
    if (!scene.sys.isActive() || scene.children.getByName('city-painted-l1')) return
    const hall = slotById(HALL_SLOT_ID)?.screen
    if (!hall || !scene.textures.exists(PAINTED_CITY_KEY)) return

    // Master resmi viewport'a değil dünya koordinatlarına bağlarız. Origin'i
    // görseldeki belediye merkezine koyduğumuz için slot koordinatlarıyla aynı
    // referans noktasını kullanır; pan/zoom sırasında kayma olmaz.
    const width = TILE.w * 30
    const height = width * (SOURCE_H / SOURCE_W)
    scene.add.image(hall.x, hall.y, PAINTED_CITY_KEY)
      .setName('city-painted-l1')
      .setOrigin(HALL_ART_X / SOURCE_W, HALL_ART_Y / SOURCE_H)
      // Eski prosedürel zemin/yol/dekorun üstünde, canlı bina/sur katmanının altında.
      .setDepth(-650)
      .setDisplaySize(width, height)
  }

  const markReadyAfterLoad = () => {
    mount()
    // create() sırasında geç yüklenen şehir tabanı QA hazır sinyalini yutmasın.
    scene.time.delayedCall(0, () => (scene as ReadyScene).markReady?.())
  }

  if (scene.textures.exists(PAINTED_CITY_KEY)) {
    mount()
    return
  }

  scene.load.image(PAINTED_CITY_KEY, PAINTED_CITY_URL)
  scene.load.once(Phaser.Loader.Events.COMPLETE, markReadyAfterLoad)
  if (!scene.load.isLoading()) scene.load.start()
}

export function drawLand({ scene }: { V: (x: number, y: number) => Phaser.Math.Vector2; scene: Phaser.Scene; shoreY: (x: number) => number; stamp: (key: string, wx: number, wy: number, tw: number, depth: number, oy?: number, alpha?: number, tint?: number | undefined) => Phaser.GameObjects.Image | null; wr: { x: number; y: number; w: number; h: number; } }) {
  // L1'in görünür arazi/yol/parsel dili artık tek onaylı master görseldir.
  // Ekonomi, hitbox, bina sprite'ları, liman/korsan/sur inşası runtime kalır.
  mountPaintedCityBase(scene)
}

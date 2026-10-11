import { CityV3Scene } from './city-v3-scene'

/**
 * Yalnız prototip ekranı için cihaz kadrajı.
 * Geniş ekranda tüm şehri, portrede ise okunabilir CITY VIEW'i açar.
 * Canlı Phaser sahnesine veya şehir motoruna bağlı değildir.
 */
export class CityV3ResponsiveScene extends CityV3Scene {
  create() {
    super.create()
    if (this.scale.height > this.scale.width * 1.15) this.setCityView()
  }
}

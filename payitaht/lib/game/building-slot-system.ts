/**
 * BİNA-SLOT SİSTEMİ.
 *
 * Saf, çerçeveden bağımsız (Phaser/React bilmez) bir yerleşim yöneticisi.
 * Slotlar city-map'ten gelir; bu sınıf yalnızca "hangi bina hangi slotta"
 * eşlemesini tutar ve geçerli hamleleri uygular.
 *
 * TEMEL KURAL: bütün normal city slotları birebir aynı footprint'te olduğu
 * için, bir bina herhangi bir BOŞ city slotuna taşınabilir; küçük/orta/büyük
 * ayrımı YOKTUR. Slot tipi (city/coast/defense) uyumu çağıran tarafça
 * getEmptySlots(type) ile süzülür; taşıma da tip uyumunu doğrular.
 */
import { SLOTS, slotById, type CitySlot, type SlotType } from './city-map'

export type Placement = Record<string, string> // buildingId -> slotId

export class BuildingSlotSystem {
  private slots: Map<string, CitySlot>
  private byBuilding = new Map<string, string>() // buildingId -> slotId
  private bySlot = new Map<string, string>()      // slotId -> buildingId

  constructor(slots: CitySlot[] = SLOTS, initial: Placement = {}) {
    this.slots = new Map(slots.map(s => [s.id, s]))
    for (const [buildingId, slotId] of Object.entries(initial)) {
      if (this.slots.has(slotId) && !this.bySlot.has(slotId)) {
        this.byBuilding.set(buildingId, slotId)
        this.bySlot.set(slotId, buildingId)
      }
    }
  }

  /** Bütün slotlar (opsiyonel tip süzgeci). */
  getSlots(type?: SlotType): CitySlot[] {
    const all = [...this.slots.values()]
    return type ? all.filter(s => s.type === type) : all
  }

  /** Boş slotlar (üzerinde bina olmayanlar), opsiyonel tip süzgeciyle. */
  getEmptySlots(type?: SlotType): CitySlot[] {
    return this.getSlots(type).filter(s => !this.bySlot.has(s.id))
  }

  /** Bir binanın oturduğu slot (yoksa null). */
  slotOf(buildingId: string): CitySlot | null {
    const id = this.byBuilding.get(buildingId)
    return id ? this.slots.get(id) ?? null : null
  }

  /** Bir slottaki bina (yoksa null). */
  buildingAt(slotId: string): string | null {
    return this.bySlot.get(slotId) ?? null
  }

  isEmpty(slotId: string): boolean {
    return this.slots.has(slotId) && !this.bySlot.has(slotId)
  }

  /**
   * Bir binayı bir slota yerleştirir. Slot geçersizse ya da başka bir binayla
   * doluysa BAŞARISIZ (false). Bina zaten başka slottaysa oradan alınır.
   */
  placeBuilding(buildingId: string, slotId: string): boolean {
    const slot = this.slots.get(slotId)
    if (!slot) return false
    const occupant = this.bySlot.get(slotId)
    if (occupant && occupant !== buildingId) return false
    this.detach(buildingId)
    this.byBuilding.set(buildingId, slotId)
    this.bySlot.set(slotId, buildingId)
    return true
  }

  /**
   * Kurulu bir binayı BOŞ bir slota taşır. Bina kurulu değilse, hedef slot
   * geçersizse, doluysa ya da TİP UYUMSUZSA başarısız.
   */
  moveBuilding(buildingId: string, newSlotId: string): boolean {
    const from = this.slotOf(buildingId)
    if (!from) return false
    if (from.id === newSlotId) return true
    const to = this.slots.get(newSlotId)
    if (!to) return false
    if (to.type !== from.type) return false
    if (this.bySlot.has(newSlotId)) return false
    return this.placeBuilding(buildingId, newSlotId)
  }

  /** Binayı slotundan kaldırır (haritadan siler). */
  removeBuilding(buildingId: string): boolean {
    if (!this.byBuilding.has(buildingId)) return false
    this.detach(buildingId)
    return true
  }

  /**
   * İki slottaki binaları yer değiştirir. Slotlar aynı TİPTE olmalı; biri ya
   * da ikisi boş olabilir (o zaman basit taşımaya dönüşür). Geçersiz slot →
   * başarısız.
   */
  swapBuildings(slotA: string, slotB: string): boolean {
    const a = this.slots.get(slotA), b = this.slots.get(slotB)
    if (!a || !b) return false
    if (a.type !== b.type) return false
    if (slotA === slotB) return true
    const ba = this.bySlot.get(slotA) ?? null
    const bb = this.bySlot.get(slotB) ?? null
    // Önce ikisini de çöz, sonra çapraz bağla.
    if (ba) this.detach(ba)
    if (bb) this.detach(bb)
    if (ba) { this.byBuilding.set(ba, slotB); this.bySlot.set(slotB, ba) }
    if (bb) { this.byBuilding.set(bb, slotA); this.bySlot.set(slotA, bb) }
    return true
  }

  /** Anlık yerleşim (buildingId -> slotId). */
  toJSON(): Placement {
    return Object.fromEntries(this.byBuilding)
  }

  private detach(buildingId: string) {
    const slotId = this.byBuilding.get(buildingId)
    if (slotId) { this.bySlot.delete(slotId); this.byBuilding.delete(buildingId) }
  }
}

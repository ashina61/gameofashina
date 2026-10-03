import { type Zone } from '../layout'
import { type BuildingId, type Game, type ResearchBranch, type ResearchId, type Resources } from './types'

/**
 * Yapi katalogu.
 *
 * `art` alani, o yapinin BOYALI GORSELI olup olmadigini soyler. Yeni bir yapi
 * once kurallariyla eklenir, gorseli sonra gelir; bu alan olmasaydi eksik
 * dosya haritada kirik resim olarak gorunurdu. Gorsel gelince tek yapilacak
 * sey bu bayragi cevirmektir.
 */
export type BuildingDef = {
  name: string; category: string; description: string
  /** 1. seviyenin temel maliyeti; ustu 1,65 katlanarak artar. */
  base: number
  /** Boyali gorseli var mi? Yoksa harita onu tas kaide olarak cizer. */
  art: boolean
  /**
   * Hangi bolgeye kurulur. Verilmezse sehir izgarasi.
   *
   * 'sur' ozeldir: ARSA KAPLAMAZ, sehrin cevresine orulur. Surlari bir
   * arsaya oturtmak hem gorsel olarak yanlis olurdu hem de oyuncuya
   * "savunma mi yoksa uretim mi" diye sahte bir secim dayatirdi.
   */
  zone?: Zone | 'sur'
  /** Kurulmadan once gereken yapi ve seviyesi. */
  needs?: { id: BuildingId; level: number }
  /** Kurulmadan once gereken araştırma (Ikariam'daki gibi binalar araştırmayla açılır). */
  tech?: ResearchId
  /** Yalnızca başkentte (Saray) ya da yalnızca kolonide (Valilik) kurulur. */
  only?: 'capital' | 'colony'
}

/**
 * YAPI KATALOGU - yeni bina eklemenin TEK yeri.
 *
 * Bir satir yeterlidir: isim, maliyet, varsa on kosul ve bolge. Arsa
 * koordinati, baslangic seviyesi, kayit gocu ve haritadaki cizim bu
 * satirdan turer; hicbirini elle yazmak gerekmez.
 */
export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  divan: { name: 'Divanhane', category: 'YÖNETİM', description: 'Şehrinin kalbi. Yeni yapıları ve daha yüksek bina seviyelerini açar.', base: 100, art: true },
  konut: { name: 'Konaklar', category: 'HALK VE EKONOMİ', description: 'Yeni ailelere yuva, şehrine gelir. Her seviyede nüfus ve akçe üretimi artar.', base: 70, art: true },
  kereste: { name: 'Kereste Ocağı', category: 'ÜRETİM', description: 'Ormanların bereketini şehrine taşır. Her seviyede dakikada 120 kereste üretir.', base: 60, art: true },
  tas: { name: 'Taş Ocağı', category: 'ÜRETİM', description: 'Ustalarının ihtiyacı olan sağlam taş. Her seviyede dakikada 90 taş üretir.', base: 70, art: true },
  ambar: { name: 'Ambar', category: 'DEPOLAMA', description: 'Emeğini güvenle sakla. Her seviye tüm kaynakların kapasitesine 1.500 ekler.', base: 90, art: true },
  medrese: { name: 'Medrese', category: 'BİLİM', description: 'Gelecek, bilgiyle kurulur. İlim üretir ve kalıcı bonuslar veren araştırmaları açar.', base: 120, art: true, needs: { id: 'divan', level: 2 } },
  carsi: { name: 'Çarşı', category: 'TİCARET', description: 'Esnafın sesi, şehrin bereketi. Çalışan her esnaf hazineye akçe taşır.', base: 110, art: true },
  hamam: { name: 'Hamam', category: 'HALKIN HUZURU', description: 'Halkın huzuru, şehrin gücüdür. Her seviye şehrin geçindirebileceği nüfusu artırır.', base: 130, art: true },
  saray: { name: 'Saray', category: 'YÖNETİM', description: 'Hükmünü uzağa taşır. Yalnızca başkentte kurulur; seviyesi kaç koloni kurabileceğini belirler ve kolonilerdeki yolsuzluğu azaltır.', base: 320, art: true, needs: { id: 'divan', level: 3 }, only: 'capital' },
  elcilik: { name: 'Elçilik', category: 'YÖNETİM', description: 'Komşularınla konuşmanın kapısı. Diplomasi danışmanını ve ittifak defterini açar.', base: 200, art: true, needs: { id: 'divan', level: 2 } },
  kisla: { name: 'Kışla', category: 'ASKERÎ', description: 'Halkından asker yetiştirir. Her eğitilen vatandaş üretimden düşer — ordunun bedeli budur.', base: 180, art: true, needs: { id: 'divan', level: 2 } },
  surlar: { name: 'Surlar', category: 'ASKERÎ', description: 'Şehrin taş kalkanı. Her seviye savunmaya asker gerektirmeyen güç ekler. Arsa kaplamaz — şehrin çevresine örülür.', base: 150, art: true, zone: 'sur', needs: { id: 'kisla', level: 1 } },
  liman: { name: 'Ticaret Limanı', category: 'LİMAN', description: 'Denizin kapısı. Ticaret kapasitesi verir; ortak ticaret filosu için gemi buradan satın alınır.', base: 160, art: true, zone: 'liman', needs: { id: 'divan', level: 2 } },
  tersane: { name: 'Tersane', category: 'LİMAN', description: 'Savaş gemilerinin doğduğu yer. Kadırga ve kalyon buradan denize iner. Şehirde değil, denizin kenarındaki iskeleye kurulur.', base: 240, art: true, zone: 'liman', needs: { id: 'liman', level: 1 } },
  /*
   * IKARIAM KARSILIKLARI. Ikariam'daki Meyhane/Müze huzuru, Marangoz/Mimar
   * maliyeti, Ormancı/Taşçı üretimi, Atölye ordunun gücünü artırır. Etkiler
   * seviye başına sabittir ve aşağıdaki BUILDING_EFFECTS'ten tek yerden okunur.
   */
  kahvehane: { name: 'Kahvehane', category: 'HALKIN HUZURU', description: 'Halk şerbet ve üzüm ikramıyla gönül eğlendirir. Her seviye huzuru 20 artırır; ambarda üzüm varsa dakikada 3 üzüm ikram edilir ve seviye başına +35 huzur daha gelir.', base: 90, art: true, needs: { id: 'divan', level: 2 } },
  cami: { name: 'Cami', category: 'HALKIN HUZURU', description: 'Şehrin manevi merkezi. Her seviye huzuru 35 artırır ve ilim üretimine %2 katkı verir.', base: 180, art: true, needs: { id: 'divan', level: 3 } },
  muze: { name: 'Müze', category: 'HALKIN HUZURU', description: 'Eserlerin sergilendiği kültür yapısı. Her seviye huzuru 40 artırır.', base: 210, art: true, needs: { id: 'medrese', level: 2 } },
  marangoz: { name: 'Marangozhane', category: 'MALİYET', description: 'Kerestenin ustaca işlenmesi. Her seviye bina yapımındaki kereste maliyetini %1 azaltır.', base: 110, art: true, needs: { id: 'kereste', level: 2 } },
  mimar: { name: 'Mimarbaşı Odası', category: 'MALİYET', description: 'Hassas plan, az taş. Her seviye bina yapımındaki taş maliyetini %1 azaltır.', base: 130, art: true, needs: { id: 'tas', level: 2 } },
  ormanci: { name: 'Ormancı Evi', category: 'ÜRETİM', description: 'Fidanlık ve bakım. Her seviye kereste üretimini %2 artırır.', base: 100, art: true, needs: { id: 'kereste', level: 3 } },
  tasci: { name: 'Taşçı Ustası', category: 'ÜRETİM', description: 'Usta taşçıların atölyesi. Her seviye taş ve (mermer adasında) mermer üretimini %2 artırır.', base: 110, art: true, needs: { id: 'tas', level: 3 } },
  bagci: { name: 'Bağcı Evi', category: 'ÜRETİM', description: 'Bağların bakımı. Her seviye adadan çıkan üzümü %2 artırır.', base: 100, art: true, tech: 'bagcilik' },
  simyahane: { name: 'Simyahane', category: 'ÜRETİM', description: 'Kükürdü arıtan simyacılar. Her seviye kükürt üretimini %2 artırır.', base: 120, art: true, tech: 'simya' },
  camci: { name: 'Camcı Atölyesi', category: 'ÜRETİM', description: 'Kristali işleyen ustalar. Her seviye kristal üretimini %2 artırır.', base: 120, art: true, tech: 'camcilik' },
  mahzen: { name: 'Şıra Mahzeni', category: 'MALİYET', description: 'Üzüm soğuk mahzende saklanır. Her seviye Kahvehane\'nin üzüm tüketimini %1 azaltır.', base: 110, art: true, tech: 'bagcilik' },
  gozlukcu: { name: 'Gözlükçü', category: 'MALİYET', description: 'Hassas mercekler, az fire. Her seviye kristal maliyetini %1 azaltır.', base: 130, art: true, tech: 'optik' },
  barutane: { name: 'Barut Deneme Alanı', category: 'MALİYET', description: 'Barut karışımları denenir. Her seviye birliklerin kükürt maliyetini %1 azaltır.', base: 140, art: true, tech: 'barut' },
  depo: { name: 'Depo', category: 'DEPOLAMA', description: 'Ambarın yetmediği yerde. Her seviye her kaynağın saklama kapasitesine 2.500 ekler.', base: 150, art: true, tech: 'ambar_teknigi' },
  ticaret_merkezi: { name: 'Ticaret Merkezi', category: 'TİCARET', description: 'Tüccarların buluştuğu han. Her seviye tüccar partisini 200 artırır, alış fiyatını düşürür, satış fiyatını yükseltir.', base: 170, art: true, tech: 'ticaret', needs: { id: 'carsi', level: 3 } },
  harita_arsivi: { name: 'Harita Arşivi', category: 'LİMAN', description: 'Deniz haritaları ve portolanlar. Her seviye nakliye ve sefer yolculuğunu %2 kısaltır.', base: 180, art: true, tech: 'haritacilik' },
  korsan_kalesi: { name: 'Korsan Kalesi', category: 'LİMAN', description: 'Deniz akıncılarının üssü. Tüccar kervanlarına korsan seferi açar; her seviye yağma ganimetini %10 artırır. Limandaki deniz arsasına kurulur.', base: 260, art: true, zone: 'liman', needs: { id: 'tersane', level: 2 } },
  tekke: { name: 'Ahi Tekkesi', category: 'YÖNETİM', description: 'Esnaf loncalarının buluştuğu tekke. Himmet biriktirir; himmeti loncalara adayıp himayene aldığın loncaların bereketinden yararlanırsın (Ikariam\'daki atölye ve esnaf bonuslarının Osmanlı hâli).', base: 210, art: true, needs: { id: 'cami', level: 3 } },
  mabet: { name: 'Ongun Mabedi', category: 'YÖNETİM', description: 'Kadim Türk tanrılarının açık hava mabedi: balbal taşları, ongun direği, kutsal ateş. Lütuf biriktirir; hami tanrın sürekli lütuf verir, kudretini çağırabilirsin (Ikariam\'daki tanrılar).', base: 230, art: true, needs: { id: 'divan', level: 4 } },
  karagoz: { name: 'Karagöz Perdesi', category: 'HALKIN HUZURU', description: 'Kahvehanenin yanında gölge oyunu perdesi. Karagöz ile Hacivat sahneye çıkar: her gösteri 12 saat boyunca üretimi, huzuru ya da tanrıların lütfunu artırır (Ikariam\'daki tiyatronun karşılığı).', base: 160, art: true, needs: { id: 'kahvehane', level: 2 } },
  kara_pazar: { name: 'Kara Pazar', category: 'TİCARET', description: 'Gizli takas: herhangi bir malı başka bir mala çevirir. Seviye yükseldikçe oran iyileşir ve parti büyür.', base: 190, art: true, needs: { id: 'carsi', level: 2 } },
  siginak: { name: 'Gizli Sığınak', category: 'YÖNETİM', description: 'Casusların gizlendiği yer. Her seviye 2 casus yeri ve %3 casusluk başarısı ekler; şehre sızan yabancı casusları yakalar.', base: 170, art: true, tech: 'casusluk', needs: { id: 'elcilik', level: 1 } },
  valilik: { name: 'Valilik', category: 'YÖNETİM', description: 'Kolonide Saray\'ın yerini tutar. Her seviye kolonideki yolsuzluğu azaltır; yalnızca kolonilerde kurulur.', base: 260, art: true, only: 'colony' },
  tophane: { name: 'Tophane', category: 'ASKERÎ', description: 'Top dökümü ve silah atölyesi. Her seviye bütün birliklerin saldırı ve savunmasını %2 artırır.', base: 220, art: true, needs: { id: 'kisla', level: 2 } },
}

/** Ikariam binalarının seviye başına etkileri (tek kaynak). */
export const BUILDING_EFFECTS = {
  kahvehaneContentment: 20, kahvehaneWineBonus: 35, kahvehaneWine: 3,
  camiContentment: 35, camiKnowledge: 0.02,
  muzeContentment: 40,
  marangozWood: 0.01, mimarStone: 0.01,
  ormanciWood: 0.02, tasciStone: 0.02,
  tophanePower: 0.02,
  korsanLoot: 0.1,
  siginakSpies: 2, siginakSpySuccess: 0.03,
  bagciWine: 0.02, simyaSulfur: 0.02, camciCrystal: 0.02, mahzenWine: 0.01,
  gozlukcuCrystal: 0.01, barutaneSulfur: 0.01, depoStorage: 2500, harita: 0.02,
  merchantLimit: 200, merchantBuyStep: 0.25, merchantSellStep: 0.15,
  divanHousing: 20, sarayGold: 0.03,
  /** Kışla/Tersane/Liman/Elçilik: kendi birliklerinin eğitimi seviye başına %3 hızlanır (en fazla %45). */
  drillSpeed: 0.03, drillSpeedCap: 0.45,
  /** Elçilik: seviye başına 2 casus yeri ve %5 casusluk başarısı. */
  elcilikSpies: 2, elcilikSpySuccess: 0.05,
} as const

/*
 * ASKERLER VE GEMILER.
 *
 * Tasarimin tek onemli karari: ASKER HALKTAN CIKAR. Bir birligin `pop`
 * degeri, o birlik var oldugu surece SEHIRDEN eksilen vatandas sayisidir -
 * yani ordu kurmak dogrudan uretimi dusurur ve Hamam (huzur) birden
 * degerlenir. Ayri bir "asker sayaci" tutmak bu bagi koparirdi.
 *
 * Egitim BOSTAKI halktan alinir; calisan isci asla sessizce askere gitmez.
 * Oyuncu once Halk panelinden adam bosaltir, sonra Kisla'ya gelir. Bu, bir
 * ekranin baska bir ekrani nicin etkiledigini gorunur kilar.
 */
export const UNIT_IDS = ['yeniceri', 'okcu', 'sipahi', 'topcu', 'kadirga', 'kalyon', 'nakliye', 'casus',
  'mizrakci', 'azap', 'sapanci', 'tufekci', 'kocbasi', 'mancinik', 'asci', 'hekim', 'ates_gemisi', 'mancinik_gemisi',
  'deli', 'humbaraci', 'karamursel', 'humbara_gemisi', 'ikmal_gemisi',
  // Hava birlikleri ve Ikariam'ın kalan gemileri (dönem karşılıklarıyla).
  'hezarfen', 'lagari', 'zenberek_gemisi', 'dalgic_gemisi', 'buharli_koc', 'balon_gemisi'] as const
export type UnitId = typeof UNIT_IDS[number]
export type Army = Record<UnitId, number>
/**
 * Birliğin savaş alanındaki yeri (Ikariam'daki savaş sırası):
 * front = ön cephe, flank = kanat, range = uzak menzil, artillery = kuşatma,
 * bomber = hava (bombardıman), fighter = hava savunması (yalnız havadakine vurur),
 * support = aşçı/hekim, spy = casus, transport = nakliye.
 */
export type UnitRole = 'front' | 'flank' | 'range' | 'artillery' | 'bomber' | 'fighter' | 'support' | 'spy' | 'transport'
export type Unit = {
  name: string; branch: 'kara' | 'deniz'
  role: UnitRole
  /** Bu birligi yetistiren yapi. */
  home: BuildingId
  /** O yapinin gerekli en dusuk seviyesi. */
  level: number
  /** Gereken araştırma (varsa). */
  tech?: ResearchId
  description: string
  /** Birlik basina sehirden dusen vatandas. */
  pop: number
  cost: Resources
  attack: number; defense: number
  /** Tek bir birliğin can puanı (savaşta ölmeden önce emdiği hasar). */
  hp: number
  /** Dakikalık akçe bakım gideri (Ikariam'da birlikler maaş alır). */
  upkeep: number
  /** Tek bir birligin egitim suresi, saniye. */
  seconds: number
  /** Nakliyenin tasidigi mal; digerlerinde 0. */
  cargo: number
}
const R = (gold: number, wood: number, stone = 0): Resources => ({ gold, wood, stone, knowledge: 0 })
export const UNITS: Record<UnitId, Unit> = {
  // ÖN CEPHE
  mizrakci: { name: 'Mızrakçı', branch: 'kara', role: 'front', home: 'kisla', level: 1, description: 'Ucuz ve sağlam. Ön safı tutar, saldırısı zayıftır.', pop: 1, cost: R(40, 30), attack: 6, defense: 12, hp: 40, upkeep: 0.5, seconds: 8, cargo: 0 },
  yeniceri: { name: 'Yeniçeri', branch: 'kara', role: 'front', home: 'kisla', level: 1, description: 'Ordunun belkemiği. Hem vurur hem dayanır.', pop: 1, cost: R(80, 20), attack: 12, defense: 10, hp: 56, upkeep: 1, seconds: 12, cargo: 0 },
  // KANAT
  azap: { name: 'Azap', branch: 'kara', role: 'flank', home: 'kisla', level: 2, description: 'Kılıçlı hafif piyade. Kanattan dalar, okçuları biçer.', pop: 1, cost: R(90, 40), attack: 18, defense: 8, hp: 44, upkeep: 1, seconds: 14, cargo: 0 },
  sipahi: { name: 'Sipahi', branch: 'kara', role: 'flank', home: 'kisla', level: 2, description: 'Atlı akıncı. Hızlıdır, ilk darbeyi o indirir.', pop: 2, cost: R(180, 40), attack: 28, defense: 14, hp: 80, upkeep: 2, seconds: 20, cargo: 0 },
  // UZAK MENZİL
  sapanci: { name: 'Sapancı', branch: 'kara', role: 'range', home: 'kisla', level: 1, description: 'Taş atan ucuz nişancı. Kalabalıkla etkilidir.', pop: 1, cost: R(30, 25), attack: 8, defense: 3, hp: 24, upkeep: 0.5, seconds: 8, cargo: 0 },
  okcu: { name: 'Okçu', branch: 'kara', role: 'range', home: 'kisla', level: 1, description: 'Uzaktan vurur, yakında erir. Yeniçerinin arkasında durur.', pop: 1, cost: R(60, 45), attack: 16, defense: 4, hp: 30, upkeep: 1, seconds: 12, cargo: 0 },
  tufekci: { name: 'Tüfekçi', branch: 'kara', role: 'range', home: 'kisla', level: 4, tech: 'barut', description: 'Barutlu tüfekle en ağır nişancı. Kükürt ister.', pop: 1, cost: R(160, 60), attack: 36, defense: 6, hp: 36, upkeep: 3, seconds: 26, cargo: 0 },
  // KUŞATMA
  kocbasi: { name: 'Koçbaşı', branch: 'kara', role: 'artillery', home: 'kisla', level: 3, tech: 'muhendislik', description: 'Sur kapısını kırar; askere karşı zayıftır.', pop: 3, cost: R(220, 260, 40), attack: 30, defense: 10, hp: 160, upkeep: 3, seconds: 30, cargo: 0 },
  mancinik: { name: 'Mancınık', branch: 'kara', role: 'artillery', home: 'kisla', level: 5, tech: 'kusatma', description: 'Uzaktan taş fırlatır; suru ve safları dağıtır.', pop: 4, cost: R(300, 400, 120), attack: 55, defense: 8, hp: 140, upkeep: 4, seconds: 40, cargo: 0 },
  topcu: { name: 'Topçu', branch: 'kara', role: 'artillery', home: 'kisla', level: 3, description: 'Sur yıkar. Yavaştır ve korunmaya muhtaçtır.', pop: 3, cost: R(320, 140, 90), attack: 65, defense: 6, hp: 120, upkeep: 5, seconds: 34, cargo: 0 },
  deli: { name: 'Deli', branch: 'kara', role: 'front', home: 'kisla', level: 5, tech: 'seref', description: 'Zırhlı, gözü kara ağır piyade. Ön safın en sağlam duvarı.', pop: 2, cost: R(260, 90, 40), attack: 30, defense: 28, hp: 140, upkeep: 3, seconds: 30, cargo: 0 },
  humbaraci: { name: 'Humbaracı', branch: 'kara', role: 'artillery', home: 'kisla', level: 6, tech: 'kus_ucusu', description: 'Humbara (el bombası) atar; surun üstünden safları vurur.', pop: 2, cost: R(380, 120, 60), attack: 70, defense: 4, hp: 60, upkeep: 5, seconds: 40, cargo: 0 },
  // DESTEK
  asci: { name: 'Aşçı', branch: 'kara', role: 'support', home: 'kisla', level: 2, tech: 'askeri_lojistik', description: 'Ordunun moralini yüksek tutar; kazan kaynarsa asker kaçmaz.', pop: 1, cost: R(120, 60), attack: 0, defense: 2, hp: 30, upkeep: 2, seconds: 20, cargo: 0 },
  hekim: { name: 'Hekim', branch: 'kara', role: 'support', home: 'kisla', level: 4, tech: 'tip', description: 'Savaştan sonra yaralıların bir kısmını hayata döndürür.', pop: 1, cost: R(240, 40), attack: 0, defense: 2, hp: 30, upkeep: 3, seconds: 30, cargo: 0 },
  // DENİZ
  kadirga: { name: 'Kadırga', branch: 'deniz', role: 'front', home: 'tersane', level: 1, description: 'Hafif savaş gemisi. Kürekle döner, dar sularda üstündür.', pop: 12, cost: R(600, 420), attack: 45, defense: 35, hp: 420, upkeep: 4, seconds: 45, cargo: 0 },
  ates_gemisi: { name: 'Ateş Gemisi', branch: 'deniz', role: 'range', home: 'tersane', level: 2, tech: 'rum_atesi', description: 'Rum ateşi püskürtür; düşman filosunu tutuşturur.', pop: 10, cost: R(700, 480, 60), attack: 70, defense: 20, hp: 300, upkeep: 5, seconds: 55, cargo: 0 },
  mancinik_gemisi: { name: 'Mancınık Gemisi', branch: 'deniz', role: 'artillery', home: 'tersane', level: 4, tech: 'deniz_topculugu', description: 'Güvertesindeki mancınıkla kıyı surlarını döver.', pop: 14, cost: R(900, 700, 160), attack: 90, defense: 30, hp: 380, upkeep: 6, seconds: 65, cargo: 0 },
  karamursel: { name: 'Karamürsel', branch: 'deniz', role: 'fighter', home: 'tersane', level: 2, tech: 'hafif_tekne', description: 'Hızlı ve ucuz tekne; filonun hava savunması. Düşman balonlarını avlar, hava yoksa kanatlara dalar.', pop: 6, cost: R(380, 300), attack: 40, defense: 15, hp: 220, upkeep: 2, seconds: 30, cargo: 0 },
  humbara_gemisi: { name: 'Humbara Gemisi', branch: 'deniz', role: 'artillery', home: 'tersane', level: 6, tech: 'havan', description: 'Havanlı ağır gemi. Kıyı surlarını ve filoları uzaktan döver.', pop: 16, cost: R(1200, 900, 200), attack: 140, defense: 25, hp: 420, upkeep: 8, seconds: 80, cargo: 0 },
  ikmal_gemisi: { name: 'İkmal Gemisi', branch: 'deniz', role: 'support', home: 'tersane', level: 4, tech: 'ikmal', description: 'Filonun erzakını ve cerrahlarını taşır: moral düşmez, batan gemilerin tayfası kurtarılır.', pop: 10, cost: R(600, 500, 40), attack: 0, defense: 20, hp: 400, upkeep: 3, seconds: 50, cargo: 0 },
  kalyon: { name: 'Kalyon', branch: 'deniz', role: 'front', home: 'tersane', level: 2, description: 'Ağır kalyon. Yavaş ama denizde son sözü söyler.', pop: 25, cost: R(1400, 950, 120), attack: 120, defense: 95, hp: 900, upkeep: 8, seconds: 75, cargo: 0 },
  hezarfen: { name: 'Hezarfen', branch: 'kara', role: 'fighter', home: 'kisla', level: 7, tech: 'kanat', description: 'Kanat takıp süzülen avcı. Düşmanın havadaki birliklerini düşürür; hava yoksa kanatlara dalar.', pop: 1, cost: R(260, 120, 20), attack: 40, defense: 6, hp: 40, upkeep: 3, seconds: 34, cargo: 0 },
  lagari: { name: 'Lagari Roketçisi', branch: 'kara', role: 'bomber', home: 'kisla', level: 8, tech: 'roket', description: 'Barutlu roketle havadan vurur; surun üstünden safları döver. Ona yalnızca Hezarfen yetişir.', pop: 2, cost: R(420, 160, 80), attack: 90, defense: 4, hp: 70, upkeep: 5, seconds: 45, cargo: 0 },
  zenberek_gemisi: { name: 'Zenberek Gemisi', branch: 'deniz', role: 'range', home: 'tersane', level: 3, tech: 'zenberek', description: 'Güvertesinde dev zenberek (arbalet) taşır; uzaktan ucuz ve sürekli atış.', pop: 8, cost: R(520, 420, 20), attack: 40, defense: 18, hp: 260, upkeep: 3, seconds: 42, cargo: 0 },
  dalgic_gemisi: { name: 'Dalgıç Gemisi', branch: 'deniz', role: 'front', home: 'tersane', level: 6, tech: 'dalgic', description: 'Suyun altından yaklaşan gemi: vurulması zordur, gövdelere ağır darbe indirir.', pop: 12, cost: R(900, 520, 140), attack: 75, defense: 40, hp: 380, upkeep: 6, seconds: 70, cargo: 0 },
  buharli_koc: { name: 'Buharlı Koç', branch: 'deniz', role: 'front', home: 'tersane', level: 8, tech: 'buhar', description: 'Buharla yürüyen demir burunlu dev gemi. Denizin en ağır ön cephesi.', pop: 20, cost: R(1800, 1100, 300), attack: 150, defense: 110, hp: 1000, upkeep: 10, seconds: 95, cargo: 0 },
  balon_gemisi: { name: 'Balon Gemisi', branch: 'deniz', role: 'bomber', home: 'tersane', level: 8, tech: 'roket', description: 'Güvertesinden roketli balonlar kaldırır; düşman filosunu havadan döver. Ona yalnızca Karamürsel yetişir.', pop: 14, cost: R(1100, 800, 200), attack: 110, defense: 20, hp: 360, upkeep: 7, seconds: 80, cargo: 0 },
  casus: { name: 'Casus', branch: 'kara', role: 'spy', home: 'elcilik', level: 1, description: 'Elçilikte yetişir. Komşu yerleşimlerin askerini, surunu ve hazinesini gözetler; savaşmaz.', pop: 1, cost: R(140, 0), attack: 0, defense: 0, hp: 10, upkeep: 0.5, seconds: 25, cargo: 0 },
  nakliye: { name: 'Nakliye', branch: 'deniz', role: 'transport', home: 'liman', level: 1, description: 'Asker ve mal taşır. Ticaretin ve seferin ayağıdır.', pop: 8, cost: R(450, 340), attack: 0, defense: 18, hp: 200, upkeep: 1, seconds: 40, cargo: 500 },
}
export const RESEARCH: Record<ResearchId, { branch: ResearchBranch; name: string; description: string; cost: number; duration: number; required: number; needs?: ResearchId }> = {
  // EKONOMİ
  tools: { branch: 'ekonomi', name: 'Usta Elleri', description: 'Akçe, kereste, taş ve ilim üretimi kalıcı olarak %20 artar.', cost: 30, duration: 30, required: 1 },
  storage: { branch: 'ekonomi', name: 'Ambar Nizamı', description: 'Tüm kaynakların depolama kapasitesi kalıcı olarak %25 artar.', cost: 50, duration: 40, required: 1 },
  ticaret: { branch: 'ekonomi', name: 'Ticaret Yolları', description: 'Ticaret Limanı kapasitesi kalıcı olarak %30 artar; Ticaret Merkezi açılır.', cost: 110, duration: 55, required: 3, needs: 'storage' },
  makara: { branch: 'ekonomi', name: 'Makara Düzeni', description: 'Yeni bina yükseltmelerinin kereste ve taş maliyeti %2 azalır.', cost: 24, duration: 25, required: 1 },
  geometri: { branch: 'ekonomi', name: 'Hendese', description: 'Yeni bina yükseltmelerinin kereste ve taş maliyeti ek %4 azalır.', cost: 180, duration: 55, required: 3, needs: 'makara' },
  su_terazisi: { branch: 'ekonomi', name: 'Su Terazisi', description: 'Yeni bina yükseltmelerinin kereste ve taş maliyeti ek %8 azalır.', cost: 900, duration: 105, required: 5, needs: 'geometri' },
  ormancilik: { branch: 'ekonomi', name: 'Ormancılık', description: 'Kereste Ocağı üretimi %15 artar.', cost: 130, duration: 55, required: 2, needs: 'tools' },
  tascilik: { branch: 'ekonomi', name: 'Taş İşçiliği', description: 'Taş Ocağı üretimi %15 artar.', cost: 200, duration: 65, required: 3, needs: 'ormancilik' },
  kent_planlama: { branch: 'ekonomi', name: 'Şehir Planlaması', description: 'Şehir nüfus barınma kapasitesi 40 artar.', cost: 420, duration: 85, required: 4, needs: 'storage' },
  ambar_teknigi: { branch: 'ekonomi', name: 'Geniş Ambarlar', description: 'Kaynak saklama kapasitesi ek %15 artar; Depo açılır.', cost: 480, duration: 95, required: 4, needs: 'storage' },
  // BİLİM
  architecture: { branch: 'bilim', name: 'Mimarın Sırrı', description: 'Yeni inşaat ve eğitim %25 daha hızlı tamamlanır.', cost: 80, duration: 45, required: 2 },
  alimler: { branch: 'bilim', name: 'Âlimler Meclisi', description: 'İlim üretimi kalıcı olarak %30 artar.', cost: 130, duration: 55, required: 3 },
  kagit: { branch: 'bilim', name: 'Kâğıt', description: 'Medrese ilim üretimi %2 artar.', cost: 30, duration: 28, required: 1 },
  murekkep: { branch: 'bilim', name: 'Mürekkep', description: 'Medrese ilim üretimi ek %4 artar.', cost: 250, duration: 65, required: 3, needs: 'kagit' },
  mekanik_kalem: { branch: 'bilim', name: 'Mekanik Kalem', description: 'Medrese ilim üretimi ek %8 artar.', cost: 800, duration: 105, required: 5, needs: 'murekkep' },
  // ASKERÎ
  celik: { branch: 'askeri', name: 'Çelik Tavı', description: 'Kara birliklerinin saldırısı %15 artar.', cost: 100, duration: 50, required: 2 },
  istihkam: { branch: 'askeri', name: 'İstihkâm', description: 'Surların savunması %30 artar.', cost: 150, duration: 60, required: 3, needs: 'celik' },
  talim: { branch: 'askeri', name: 'Talim Nizamı', description: 'Kara ve deniz birliklerinin eğitim süresi %10 kısalır.', cost: 115, duration: 48, required: 2 },
  zirh: { branch: 'askeri', name: 'Zırh Ustalığı', description: 'Kara birliklerinin savunması %10 artar.', cost: 300, duration: 75, required: 4, needs: 'celik' },
  barut: { branch: 'askeri', name: 'Barut Ustalığı', description: 'Topçuların saldırısı %15 artar; Tüfekçi ve Barut Deneme Alanı açılır.', cost: 490, duration: 90, required: 5, needs: 'celik' },
  askeri_lojistik: { branch: 'askeri', name: 'Askerî Lojistik', description: 'Yeni asker eğitiminde akçe ve kereste maliyeti %10 azalır; Aşçı yetiştirilebilir.', cost: 320, duration: 80, required: 4, needs: 'talim' },
  // DENİZCİLİK
  pusula: { branch: 'denizcilik', name: 'Pusula', description: 'Nakliye gemilerinin kargosu %50 artar.', cost: 90, duration: 50, required: 2 },
  yelken: { branch: 'denizcilik', name: 'Yelken Ustalığı', description: 'Deniz birliklerinin saldırısı %15 artar.', cost: 140, duration: 60, required: 3, needs: 'pusula' },
  haritacilik: { branch: 'denizcilik', name: 'Haritacılık', description: 'Şehirler arası nakliye süresi %15 azalır; Harita Arşivi açılır.', cost: 200, duration: 60, required: 3, needs: 'pusula' },
  yukleme: { branch: 'denizcilik', name: 'Liman Yükleme Usulleri', description: 'Nakliye kapasitesi ek %20 artar.', cost: 380, duration: 75, required: 4, needs: 'ticaret' },
  bagcilik: { branch: 'ekonomi', name: 'Bağcılık', description: 'Bağcı Evi ve Şıra Mahzeni kurulabilir.', cost: 160, duration: 50, required: 2, needs: 'tools' },
  simya: { branch: 'bilim', name: 'Simya', description: 'Simyahane kurulabilir.', cost: 260, duration: 60, required: 3, needs: 'alimler' },
  camcilik: { branch: 'bilim', name: 'Cam Ustalığı', description: 'Camcı Atölyesi kurulabilir.', cost: 220, duration: 55, required: 3, needs: 'kagit' },
  optik: { branch: 'bilim', name: 'Optik', description: 'Gözlükçü kurulabilir.', cost: 420, duration: 80, required: 4, needs: 'camcilik' },
  tip: { branch: 'bilim', name: 'Tıp', description: 'Hekim yetiştirilebilir: savaştan sonra yaralıları kurtarır.', cost: 360, duration: 75, required: 4, needs: 'alimler' },
  muhendislik: { branch: 'askeri', name: 'Askerî Mühendislik', description: 'Koçbaşı yapılabilir.', cost: 180, duration: 55, required: 2, needs: 'celik' },
  kusatma: { branch: 'askeri', name: 'Kuşatma Sanatı', description: 'Mancınık yapılabilir.', cost: 340, duration: 75, required: 3, needs: 'muhendislik' },
  rum_atesi: { branch: 'denizcilik', name: 'Rum Ateşi', description: 'Ateş Gemisi yapılabilir.', cost: 300, duration: 70, required: 3, needs: 'yelken' },
  deniz_topculugu: { branch: 'denizcilik', name: 'Deniz Topçuluğu', description: 'Mancınık Gemisi yapılabilir.', cost: 450, duration: 90, required: 4, needs: 'rum_atesi' },
  // EKONOMİ (devam)
  koruma: { branch: 'ekonomi', name: 'Koruma Usulü', description: 'Ambar yağmaya karşı her malın %35\'ini korur (önce %20).', cost: 140, duration: 45, required: 2, needs: 'storage' },
  zenginlik: { branch: 'ekonomi', name: 'Zenginlik', description: 'Ada madeninin lüks üretimi %10 artar.', cost: 220, duration: 55, required: 3, needs: 'tools' },
  tatil: { branch: 'ekonomi', name: 'Bayram Tatili', description: 'Şehirlerde huzur 25 artar.', cost: 260, duration: 60, required: 3 },
  mutfak: { branch: 'ekonomi', name: 'Saray Mutfağı', description: 'Kahvehane\'nin üzüm tüketimi %10 azalır, üzümlü ikramın huzuru %20 artar.', cost: 300, duration: 65, required: 3, needs: 'bagcilik' },
  yardim_eli: { branch: 'ekonomi', name: 'İmece', description: 'Ada madeni ve ormanı %25 daha çok işçi alır.', cost: 360, duration: 70, required: 4, needs: 'zenginlik' },
  yasama: { branch: 'ekonomi', name: 'Kanunnâme', description: 'Kolonilerdeki yolsuzluk %25 azalır.', cost: 520, duration: 85, required: 5, needs: 'tatil' },
  burokrasi: { branch: 'ekonomi', name: 'Bürokrasi', description: 'Her şehirde aynı anda bir sefer daha (sefer hakkı +1).', cost: 700, duration: 95, required: 6, needs: 'yasama' },
  utopya: { branch: 'ekonomi', name: 'Erdemli Şehir', description: 'Başkentte huzur 200 artar.', cost: 2400, duration: 150, required: 10, needs: 'burokrasi' },
  // BİLİM (devam)
  kuyu: { branch: 'bilim', name: 'Kuyu Kazımı', description: 'Başkentte huzur ve barınma 50 artar.', cost: 60, duration: 30, required: 1 },
  casusluk: { branch: 'bilim', name: 'Casusluk', description: 'Casusların başarısı %10 artar; Gizli Sığınak kurulabilir.', cost: 150, duration: 45, required: 2 },
  devlet: { branch: 'bilim', name: 'Devlet Nizamı', description: 'Divanhane\'de yönetim biçimi seçilebilir.', cost: 400, duration: 75, required: 4, needs: 'kagit' },
  kultur: { branch: 'bilim', name: 'Kültür Alışverişi', description: 'Müze\'nin huzur katkısı %50 artar; yabancı hükümdarlarla kültür anlaşması yapılabilir.', cost: 480, duration: 80, required: 5, needs: 'devlet' },
  anatomi: { branch: 'bilim', name: 'Teşrih', description: 'Hekimler savaştan sonra iki kat asker kurtarır.', cost: 520, duration: 85, required: 5, needs: 'tip' },
  deney: { branch: 'bilim', name: 'Deneyler', description: 'Medrese\'de kristal ilime çevrilebilir (100 kristal → 150 ilim).', cost: 600, duration: 90, required: 6, needs: 'optik' },
  din: { branch: 'bilim', name: 'Devlet Dini', description: 'İmamların topladığı inanç %50 artar; harika mucizeden sonra üçte bir kısa dinlenir.', cost: 700, duration: 95, required: 6, needs: 'devlet' },
  kus_ucusu: { branch: 'bilim', name: 'Kuş Uçuşu', description: 'Humbaracı yetiştirilebilir: surların üstünden bomba atar.', cost: 900, duration: 110, required: 7, needs: 'deney' },
  matbaa: { branch: 'bilim', name: 'Matbaa', description: 'İlim üretimi %10 artar.', cost: 1400, duration: 130, required: 8, needs: 'mekanik_kalem' },
  // ASKERÎ (devam)
  kuru_havuz: { branch: 'askeri', name: 'Kuru Havuz', description: 'Gemi yapımı %20 hızlanır.', cost: 200, duration: 55, required: 2 },
  meslek_ordusu: { branch: 'askeri', name: 'Kapıkulu Nizamı', description: 'Birliklerin bakım gideri %15 azalır.', cost: 420, duration: 80, required: 4, needs: 'talim' },
  seref: { branch: 'askeri', name: 'Şeref Kanunu', description: 'Ordunun morali savaşta %20 daha yavaş düşer; Deliler yetiştirilebilir.', cost: 380, duration: 75, required: 4, needs: 'zirh' },
  balistik: { branch: 'askeri', name: 'Balistik', description: 'Kuşatma birliklerinin saldırısı %15 artar.', cost: 560, duration: 90, required: 5, needs: 'kusatma' },
  top_dokum: { branch: 'askeri', name: 'Top Dökümü', description: 'Topçu ve Humbaracı birliklerinin kükürt maliyeti %25 azalır.', cost: 820, duration: 105, required: 6, needs: 'barut' },
  // DENİZCİLİK (devam)
  guverte: { branch: 'denizcilik', name: 'Güverte Topları', description: 'Deniz birliklerinin saldırısı ek %10 artar.', cost: 260, duration: 60, required: 3, needs: 'yelken' },
  korsanlik: { branch: 'denizcilik', name: 'Korsanlık', description: 'Korsan seferlerinin ganimeti %20 artar.', cost: 300, duration: 65, required: 3 },
  genisleme: { branch: 'denizcilik', name: 'Genişleme', description: 'Yeni koloni için Saray bir seviye daha az yeter.', cost: 420, duration: 80, required: 4, needs: 'pusula' },
  zift: { branch: 'denizcilik', name: 'Zift', description: 'Gemilerin bakım gideri %25 azalır.', cost: 340, duration: 70, required: 3 },
  yabanci_kultur: { branch: 'denizcilik', name: 'Yabancı Kültürler', description: 'Ticaret Limanı\'nda yükleme iki kat hızlanır.', cost: 380, duration: 75, required: 4, needs: 'haritacilik' },
  hafif_tekne: { branch: 'denizcilik', name: 'Hafif Tekneler', description: 'Karamürsel yapılabilir: hızlı ve ucuz kanat gemisi.', cost: 220, duration: 55, required: 2, needs: 'yelken' },
  ikmal: { branch: 'denizcilik', name: 'İkmal Gemileri', description: 'İkmal Gemisi yapılabilir: filonun moralini korur, yaralıları taşır.', cost: 500, duration: 90, required: 5, needs: 'zift' },
  havan: { branch: 'denizcilik', name: 'Havan Donanımı', description: 'Humbara Gemisi yapılabilir: en ağır deniz kuşatması.', cost: 900, duration: 115, required: 7, needs: 'deniz_topculugu' },
  kanat: { branch: 'bilim', name: 'Hezarfen Kanatları', description: 'Hezarfen yetiştirilebilir: düşmanın hava birliklerini avlar.', cost: 1100, duration: 120, required: 7, needs: 'kus_ucusu' },
  roket: { branch: 'bilim', name: 'Lagari Roketi', description: 'Lagari Roketçisi ve Balon Gemisi yapılabilir: havadan bombardıman.', cost: 1500, duration: 135, required: 8, needs: 'kanat' },
  zenberek: { branch: 'denizcilik', name: 'Zenberek Ustalığı', description: 'Zenberek Gemisi yapılabilir: uzaktan atış yapan ucuz gemi.', cost: 240, duration: 55, required: 3, needs: 'yelken' },
  dalgic: { branch: 'denizcilik', name: 'Dalgıç Gemisi', description: 'Dalgıç Gemisi yapılabilir: suyun altından saldırır, vurulması zordur.', cost: 850, duration: 110, required: 6, needs: 'gemi_govdesi' },
  buhar: { branch: 'denizcilik', name: 'Buhar Makinesi', description: 'Buharlı Koç yapılabilir: denizin en ağır gemisi.', cost: 1700, duration: 140, required: 8, needs: 'dalgic' },
  // MİTOLOJİ
  ongun_toresi: { branch: 'mitoloji', name: 'Ongun Töresi', description: 'Ongun Mabedi\'nde lütuf %20 hızlı birikir.', cost: 220, duration: 60, required: 2 },
  balbal: { branch: 'mitoloji', name: 'Balbal Taşları', description: 'Mabedin lütuf tavanı %50 artar.', cost: 320, duration: 70, required: 3, needs: 'ongun_toresi' },
  destan: { branch: 'mitoloji', name: 'Destanlar', description: 'Karagöz Perdesi\'ndeki gösteriler 12 yerine 18 saat sürer.', cost: 380, duration: 75, required: 3, needs: 'ongun_toresi' },
  kam_ayini: { branch: 'mitoloji', name: 'Kam Ayinleri', description: 'Kudretten sonra tanrı 4 değil 3 saat dinlenir.', cost: 480, duration: 90, required: 4, needs: 'balbal' },
  tore: { branch: 'mitoloji', name: 'Töre', description: 'Hami tanrıyı değiştirme beklemesi 6 saatten 3 saate iner.', cost: 520, duration: 90, required: 4, needs: 'balbal' },
  gok_kutu: { branch: 'mitoloji', name: 'Gök Kutu', description: 'Hami tanrının lütfü 2 derece artar ve en fazla 25. dereceye çıkar.', cost: 900, duration: 120, required: 6, needs: 'kam_ayini' },
  gemi_govdesi: { branch: 'denizcilik', name: 'Sağlam Gövdeler', description: 'Deniz birliklerinin savunması %12 artar.', cost: 490, duration: 95, required: 5, needs: 'yelken' },
}
/**
 * BAŞLANGIÇ EĞİTİMİ (Ikariam'ın adım adım öğretici görevleri): her adım
 * oyunun bir sistemini tanıtır; "Hedefe git" doğru binayı ya da paneli açar.
 * İlk sekiz adım "ilk 10 dakika" yoludur (V2 Faz 5.1): sur temeli, ilk işçi,
 * ilk araştırma ve ilk sefer; rehber her adımda basılacak tek düğmeyi
 * parlatır (components/game/guide-spot.tsx). first-ten.test.ts bu yolu
 * baştan sona oynar.
 */
export const GUIDED_STEPS = 8
export type ObjectiveGo = BuildingId | 'research' | 'people' | 'island' | 'army'
export const OBJECTIVES: { id: string; title: string; description: string; reward: number; go: ObjectiveGo; done: (g: Game) => boolean }[] = [
  { id: 'first-upgrade', title: 'Şehrinin temellerini güçlendir', description: 'Divanhaneyi 2. seviyeye yükselt.', reward: 150, go: 'divan', done: g => g.buildings.divan >= 2 },
  { id: 'first-academy', title: 'Bilginin kapılarını aç', description: 'Boş arsaya bir Medrese inşa et.', reward: 200, go: 'medrese', done: g => g.buildings.medrese >= 1 },
  { id: 'first-worker', title: 'İlk işçi', description: 'Medresede bir âlimi işe koş: âlimler ilim üretir.', reward: 150, go: 'medrese', done: g => g.workers.medrese >= 1 },
  { id: 'first-research', title: 'Yeni bir çağın başlangıcı', description: 'İlk araştırmanı tamamla.', reward: 300, go: 'research', done: g => g.research.length > 0 },
  { id: 'barracks', title: 'Sancağı kaldır', description: 'Bir Kışla kur.', reward: 350, go: 'kisla', done: g => g.buildings.kisla >= 1 },
  { id: 'walls', title: 'Sur temeli', description: 'Surların temelini at (1. seviye): şehir taş kalkanını alır.', reward: 400, go: 'surlar', done: g => g.buildings.surlar >= 1 },
  { id: 'troops', title: 'İlk bölük', description: 'Kışlada beş asker yetiştir.', reward: 400, go: 'army', done: g => UNIT_IDS.reduce((s, id) => s + (UNITS[id].branch === 'kara' && UNITS[id].role !== 'spy' ? g.army[id] : 0), 0) >= 5 },
  { id: 'first-raid', title: 'İlk sefer', description: 'Adandaki köye bir yağma seferi gönder.', reward: 500, go: 'island', done: g => (g.stats.raids ?? 0) >= 1 },
  { id: 'scholars', title: 'Âlimleri işe koş', description: 'Medresede en az iki âlim çalıştır (Halk paneli).', reward: 250, go: 'people', done: g => g.workers.medrese >= 2 },
  { id: 'homes', title: 'Yeni haneler', description: 'Konakları 3. seviyeye yükselt: nüfus tavanı artar.', reward: 300, go: 'konut', done: g => g.buildings.konut >= 3 },
  { id: 'warehouse', title: 'Ambarı genişlet', description: 'Ambarı 2. seviyeye yükselt: daha çok mal saklarsın.', reward: 300, go: 'ambar', done: g => g.buildings.ambar >= 2 },
  { id: 'coffee', title: 'Huzur kahvede başlar', description: 'Bir Kahvehane kur: halkın huzuru artar.', reward: 350, go: 'kahvehane', done: g => g.buildings.kahvehane >= 1 },
  { id: 'mine', title: 'Adanın madeni', description: 'Ada madenine en az beş işçi gönder.', reward: 400, go: 'island', done: g => g.mine.miners >= 5 },
  { id: 'harbour', title: 'Denize açılan kapı', description: 'Ticaret Limanı kur.', reward: 500, go: 'liman', done: g => g.buildings.liman >= 1 },
  { id: 'mosque', title: 'Şehrin kubbesi', description: 'Bir Cami kur: huzur ve ilim getirir.', reward: 600, go: 'cami', done: g => g.buildings.cami >= 1 },
  { id: 'divan5', title: 'Sancakbeyliği', description: 'Divanhaneyi 5. seviyeye yükselt. (Acemi koruması biter; korsanlara hazır ol.)', reward: 800, go: 'divan', done: g => g.buildings.divan >= 5 },
  { id: 'embassy', title: 'Elçiler ve casuslar', description: 'Bir Elçilik kur.', reward: 600, go: 'elcilik', done: g => g.buildings.elcilik >= 1 },
  { id: 'research5', title: 'Medresenin şöhreti', description: 'Beş araştırma tamamla.', reward: 800, go: 'research', done: g => g.research.length >= 5 },
  { id: 'tekke', title: 'Loncaların himayesi', description: 'Ahi Tekkesi kur ve bir loncayı himayene al.', reward: 1000, go: 'tekke', done: g => g.buildings.tekke >= 1 && (g.guilds?.patrons.length ?? 0) > 0 },
  { id: 'mabet', title: 'Kadim tanrılar', description: 'Ongun Mabedi kur ve bir hami tanrı seç.', reward: 1200, go: 'mabet', done: g => g.buildings.mabet >= 1 && !!g.gods?.patron },
  { id: 'divan8', title: 'Payitahtın yolu', description: 'Divanhaneyi 8. seviyeye yükselt.', reward: 1500, go: 'divan', done: g => g.buildings.divan >= 8 },
]

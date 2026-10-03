/**
 * TERİMLER SÖZLÜĞÜ (V2 Faz 5.10) — ekrandaki her oyun terimine bir cümlelik
 * açıklama. Bina etkileri, savaş meydanı sıraları, birlik görevleri ve
 * hazine satırları buradan ⓘ açıklamasını alır. `glossary.test.ts` bütün
 * bina etiketlerini motorun kendisinden toplar ve açıklamasız terim
 * kalmadığını denetler; yeni bir etiket eklenince sözlüğe de yazılmalı.
 */
import type { FieldRow } from './battle'
import type { UnitRole } from './engine'

/** Savaş meydanının sıraları (savaş ekranı ve meydan kartı). */
export const FIELD_ROW_NAMES: Record<FieldRow, string> = {
  front: 'Ön cephe', flank: 'Kanatlar', range: 'Uzak menzil', artillery: 'Kuşatma', air: 'Hava', fighter: 'Hava savunması',
}
/** Birliğin görevi (birlik kartındaki küçük etiket). */
export const ROLE_NAMES: Record<UnitRole, string> = {
  front: 'ön cephe', flank: 'kanat', range: 'uzak menzil', artillery: 'kuşatma', bomber: 'hava', fighter: 'hava savunması', support: 'destek', spy: 'casus', transport: 'nakliye',
}
/** Divanhane'nin hazine kutusundaki satırlar. */
export const TREASURY_TERMS = ['Vergi ve esnaf', 'Âlim maaşları', 'Ordu bakımı', 'Net gelir', 'Yolsuzluk', 'Sefer hakkı'] as const

const ENTRIES: Record<string, string> = {
  // Divanhane, Saray, Elçilik
  'Diğer binaların çıkabileceği seviye': 'Hiçbir yapı Divanhane\'nin bir üstüne çıkamaz. Şehri büyütmek için önce Divanhane yükselir.',
  'Divanhane\'de oturan halk': 'Divanhane konut gibi de çalışır: her seviye birkaç ailenin daha şehre sığmasını sağlar.',
  'Koloni hakkı': 'Başkentteki Saray kaç yeni şehir kurabileceğini belirler. Her koloni bir seviye ister.',
  'Akçe geliri': 'Bütün akçe gelirine eklenen yüzde. Vergi ve esnaf kazancı birlikte artar.',
  'Casus yeri': 'Elçilikte aynı anda barınabilen casus sayısı. Görevdekiler de buna dahildir.',
  'Casusluk başarısı': 'Casusun görevden yakalanmadan dönme şansına eklenen yüzde.',
  'Casus eğitimi': 'Casusların ne kadar hızlı yetiştiği. Yüzde ne kadar yüksekse bekleme o kadar kısa.',
  'Yabancı casus yakalama': 'Şehrine sızan rakip casusları yakalama şansı. Yakalanan casus görevini yapamaz.',
  // Konut, Hamam, Kahvehane, huzur
  'Barınma': 'Şehrin en fazla kaç kişiyi barındırabileceği. Nüfus bunun üstüne çıkamaz.',
  'Halkın vergisi': 'Evlerde oturan halkın dakikada ödediği akçe.',
  'Huzur': 'Halkın memnuniyeti. Nüfus, barınma ile huzurdan küçük olanına doğru büyür; huzur düşerse halk şehri terk eder.',
  'Kahve ikramıyla': 'Kahvehanede kahve ikram edilirse gelen ek huzur. İkram kahve tüketir.',
  'Kahvehane kahve tüketimi': 'Kahve Kileri\'nin Kahvehane\'nin kahve harcamasını ne kadar azalttığı.',
  'Kahve tüketimi': 'Kahvehane\'nin ikram için her dakika harcadığı kahve.',
  'Kültür gösterisi huzuru': 'Karagöz Perdesi\'nde oynanan bir gösterinin şehre kattığı geçici huzur.',
  'Gösteri süresi': 'Bir gösterinin etkisinin ne kadar sürdüğü.',
  'Perdenin dinlenmesi': 'Bir gösteriden sonra perdenin yeni gösteri için beklediği süre.',
  'Tanrısal gösterim lütfu': 'Tanrısal gösterim oynanınca Ongun Mabedi\'ne hemen eklenen lütuf.',
  // Çarşı, Ambar, ticaret
  'Esnaf yeri': 'Çarşıda çalışabilen esnaf sayısı. Esnaf akçe kazandırır.',
  'Tam kadroda akçe': 'Bütün yerler doluyken çalışanların dakikada ürettiği akçe.',
  'Tüccar partisi': 'Tüccardan bir seferde alıp satabileceğin en çok lüks mal.',
  'Alış / satış fiyatı': 'Tüccardan lüks mal alırken ödediğin ve satarken aldığın akçe.',
  'Kaynak başına ambar': 'Her kaynaktan saklanabilen en çok miktar. Ambar dolunca üretim boşa gider.',
  'Çevrimdışı üretim': 'Oyunu kapattığında üretimin kaç saat sürdüğü. Daha uzun ayrılıklar sayılmaz; Ambar bu süreyi uzatır.',
  'Ek saklama': 'Depo\'nun her kaynak için ambara eklediği yer.',
  'Ticaret kapasitesi': 'Limandan bir seferde gönderebileceğin en çok mal.',
  'Nakliye eğitimi': 'Ticaret gemisi ve nakliye birliklerinin ne kadar hızlı hazırlandığı.',
  'Nakliye ve sefer yolu': 'Nakliye ve seferlerin yol süresinin ne kadar kısaldığı.',
  'Takas oranı': 'Kara Pazar\'da kaç birim verip bir birim aldığın. Oran ne kadar küçükse o kadar iyi.',
  'Takas partisi': 'Kara Pazar\'da bir seferde takas edebileceğin en çok mal.',
  // Üretim
  'Oduncu yeri': 'Kereste ocağında çalışabilen oduncu sayısı.',
  'Tam kadroda kereste': 'Bütün oduncu yerleri doluyken dakikadaki kereste.',
  'Taşçı yeri': 'Taş ocağında çalışabilen taşçı sayısı.',
  'Tam kadroda taş': 'Bütün taşçı yerleri doluyken dakikadaki taş.',
  'Âlim yeri': 'Medresede çalışabilen âlim sayısı. Âlimler ilim üretir ve maaş alır.',
  'Tam kadroda ilim': 'Bütün âlim yerleri doluyken dakikadaki ilim. İlim araştırmaya harcanır.',
  'Kereste üretimi': 'Bu atölyenin kereste üretimine eklediği yüzde.',
  'Taş ve mermer üretimi': 'Bu atölyenin taş ve mermer üretimine eklediği yüzde.',
  'Kahve üretimi': 'Bu atölyenin kahve üretimine eklediği yüzde.',
  'Kristal üretimi': 'Bu atölyenin kristal üretimine eklediği yüzde.',
  'Kükürt üretimi': 'Bu atölyenin kükürt üretimine eklediği yüzde.',
  'İlim üretimi': 'Bu yapının ilim üretimine eklediği yüzde.',
  'Kereste maliyeti': 'Bütün inşaatlarda kerestenin ne kadar ucuzladığı.',
  'Taş ve mermer maliyeti': 'Bütün inşaatlarda taş ve mermerin ne kadar ucuzladığı.',
  'Kristal maliyeti': 'Bütün inşaatlarda kristalin ne kadar ucuzladığı.',
  'Birliklerin kükürt maliyeti': 'Asker ve gemi eğitirken harcanan kükürdün ne kadar azaldığı.',
  // Ordu
  'Eğitim hızı': 'Askerlerin ne kadar hızlı yetiştiği. Yüzde ne kadar yüksekse bekleme o kadar kısa.',
  'Gemi yapım hızı': 'Savaş gemilerinin ne kadar hızlı yapıldığı.',
  'Eğitilebilen': 'Bu seviyede eğitilebilen birlik türü sayısı ve yeni açılanlar.',
  'Yapılabilen': 'Bu seviyede yapılabilen gemi türü sayısı ve yeni açılanlar.',
  'Sur savunması': 'Surların savaşta düşmana dayandığı güç. Kuşatma birlikleri bu sayıyı düşürür.',
  'Birlik saldırı ve savunması': 'Bütün birliklerin saldırı ve savunmasına eklenen yüzde.',
  'Korsan seferi': 'Korsan Kalesi kurulunca denizde korsan seferine çıkabilirsin.',
  'Yağma ganimeti': 'Bir yağmada taşınabilen ganimete eklenen yüzde.',
  // Valilik, lonca, tanrılar
  'Bu şehirde yolsuzluk': 'Kolonide üretimin yolda kaybolan payı. Valilik büyüdükçe azalır; başkentte yolsuzluk yoktur.',
  'Yolsuzluksuz koloni sayısı': 'Valilik seviyesi kadar koloni yolsuzluk görmez.',
  'Himaye edilen lonca': 'Aynı anda etki eden lonca sayısı. Yalnız himaye ettiğin loncaların bonusu işler.',
  'Himmet': 'Tekke\'nin dakikada biriktirdiği himmet ve en çok ne kadar birikeceği. Himmeti bir loncaya adarsın, loncanın derecesi yükselir.',
  'Hami tanrının lütfü': 'Hami seçtiğin tanrının sürekli bonusunun derecesi. Mabet büyüdükçe artar.',
  'Lütuf': 'Ongun Mabedi\'nin dakikada biriktirdiği lütuf. Hami tanrının kudretini çağırmak lütuf harcar.',
  // Savaş meydanı
  'Ön cephe': 'Düşmanla ilk çarpışan sıra. Ön cephe boşalırsa kanat ve nişancılar öne çıkar.',
  'Kanatlar': 'Yandan dolanıp düşmanın arkasındaki uzak menzil ve kuşatma birliklerine vuran sıra.',
  'Uzak menzil': 'Okçu ve tüfekçilerin sırası. Cephaneleri biterse susarlar.',
  'Kuşatma': 'Top ve mancınıkların sırası. Surlara ağır vurur.',
  'Hava': 'Uçan birliklerin sırası. Surun üstünden vurur.',
  'Hava savunması': 'Havadaki birliklere vurabilen tek sıra. Bombardımanı bunlar durdurur.',
  'Kanat': 'Yandan dolanıp düşmanın arkasındaki birliklere vurur.',
  'Destek': 'Savaşmaz; aşçı ve hekim gibi orduyu besler ya da iyileştirir.',
  'Casus': 'Savaşa girmez; Elçilikten gizli görevlere gider.',
  'Nakliye': 'Savaşa girmez; asker ve mal taşır.',
  // Hazine
  'Vergi ve esnaf': 'Halkın vergisi ile çarşıdaki esnafın dakikada getirdiği akçe.',
  'Âlim maaşları': 'Medresede çalışan âlimlere her dakika ödenen akçe.',
  'Ordu bakımı': 'Askerlerin ve gemilerin her dakika istediği akçe.',
  'Net gelir': 'Bütün gelirden maaş ve bakım düşüldükten sonra hazineye kalan akçe.',
  'Yolsuzluk': 'Kolonide üretimin yolda kaybolan payı. Valilik azaltır; başkentte yoktur.',
  'Sefer hakkı': 'Aynı anda yola çıkabilen sefer sayısı. Divanhane büyüdükçe artar.',
}

const key = (label: string) => label.trim().toLocaleLowerCase('tr')
const TABLE = new Map(Object.entries(ENTRIES).map(([k, v]) => [key(k), v]))

/** Terimin açıklaması; sözlükte yoksa undefined. */
export function explain(label: string): string | undefined {
  return TABLE.get(key(label))
}
export const GLOSSARY_SIZE = TABLE.size

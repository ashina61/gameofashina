import type { CapacitorConfig } from '@capacitor/cli'

/*
 * ANDROID PAKETİ (Capacitor)
 *
 * Oyun zaten tamamen istemcide çalışan statik bir site; Capacitor bu siteyi
 * (out/) bir Android WebView'ına gömer. Sunucu yok, ağ yok: kayıt cihazın
 * yerel depolamasında durur. APK GitHub Actions'ta derlenir
 * (.github/workflows/android.yml), çünkü Android SDK orada hazır gelir.
 */
const config: CapacitorConfig = {
  appId: 'com.ashina.payitaht',
  appName: 'Payitaht Adaları',
  webDir: 'out',
  backgroundColor: '#102b29',
  android: { allowMixedContent: false },
}

export default config

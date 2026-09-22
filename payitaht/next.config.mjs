/*
 * STATIK DISA AKTARIM (STATIC_EXPORT=1)
 *
 * Oyun tamamen istemci tarafinda calisir, dolayisiyla sunucusuz bir klasor
 * olarak yayinlanabilir. Bu mod yalnizca ONIZLEME icindir ve normal
 * `next build` ciktisini DEGISTIRMEZ: gercek dagitimda guvenlik basliklari
 * korunur, cunku headers() bir sunucu ister ve statik disa aktarimda
 * calismaz (bkz. next/dist/docs/01-app/02-guides/static-exports.md).
 *
 * assetPrefix './' varliklari GORECELI yola baglar; kok-goreli '/_next/...'
 * yollari, uygulamanin alt bir dizinden servis edildigi onizlemelerde 404
 * verirdi.
 */
const staticExport = process.env.STATIC_EXPORT === '1'
/*
 * ALT YOL (BASE PATH) — sabit bir alt adreste yayin ( or. GitHub Pages).
 *
 * NEXT_BASE_PATH verildiginde uygulama o alt yolda yasar: hem yonlendirme
 * hem /_next varliklari '<base>/...' olur. Boylece ayni Pages sitesinde kok
 * uygulama '/' ve oyun '<base>/' birlikte durur. Gorsel varliklar (asset())
 * ayrica NEXT_PUBLIC_ASSET_BASE ile ayni tabana baglanir.
 */
const basePath = process.env.NEXT_BASE_PATH || ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(staticExport
    ? {
        output: 'export',
        trailingSlash: false,
        /*
         * basePath verildiyse: /_next otomatik olarak '<base>/_next' olur
         * (assetPrefix'e gerek yok). Verilmediyse eski goreli davranis: './'
         * (alt cizgi sorunu olan barindiricilar icin NEXT_ASSET_PREFIX).
         */
        ...(basePath
          ? { basePath }
          : { assetPrefix: process.env.NEXT_ASSET_PREFIX ?? './' }),
      }
    : {}),
  /*
   * Gelistirme sunucusuna LAN'dan ya da baska bir kaynaktan gelen istekler.
   *
   * Next 16, Origin basligi tasiyan gelistirme isteklerini varsayilan olarak
   * 403 ile reddeder. Telefondan test ederken (bilgisayarin LAN adresi) ya
   * da otomatik tarayici olcumlerinde butun /_next/static parcalari 403
   * doner ve uygulama ACILIS EKRANINDA TAKILI KALIR - konsolda tek ipucu
   * "403 Forbidden" satirlaridir.
   */
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.0.0/16', '10.0.0.0/8'],
  ...(staticExport ? {} : { async headers() {
    return [
      { source: '/:path*', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ] },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
    ]
  } }),
  images: {
    unoptimized: true,
  },
}

export default nextConfig

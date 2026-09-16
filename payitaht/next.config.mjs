/** @type {import('next').NextConfig} */
const nextConfig = {
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
  async headers() {
    return [
      { source: '/:path*', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ] },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
    ]
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig

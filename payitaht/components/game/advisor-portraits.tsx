/**
 * DANIŞMAN PORTRELERİ — Ikariam'ın dört danışmanının (şehir, ordu, araştırma,
 * diplomasi) Osmanlı karşılıkları, düz vektör çizim: Vezir, Serasker, Âlim, Elçi.
 * Her biri 100x100 bir madalyon içine çizilir; renkler oyunun kahverengi /
 * parşömen diliyle uyumludur.
 */
export type AdvisorId = 'city' | 'army' | 'research' | 'diplo'

const SKIN = '#e2b487', SKIN_SHADE = '#c98f5f', BEARD = '#3b2a1c', GREY = '#d9d2c3'

function Face({ beard = BEARD, long = false }: { beard?: string; long?: boolean }) {
  return <>
    <ellipse cx="50" cy="56" rx="15" ry="18" fill={SKIN} />
    <ellipse cx="36" cy="56" rx="3" ry="5" fill={SKIN_SHADE} />
    <ellipse cx="64" cy="56" rx="3" ry="5" fill={SKIN_SHADE} />
    <path d="M43 52 q3 -2 6 0 M51 52 q3 -2 6 0" stroke="#3a2412" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path d="M50 55 l-2 6 h3" stroke={SKIN_SHADE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    {long
      ? <path d={`M35 60 q2 22 15 30 q13 -8 15 -30 q-4 6 -15 8 q-11 -2 -15 -8z`} fill={beard} />
      : <path d="M37 62 q3 14 13 17 q10 -3 13 -17 q-4 5 -13 6 q-9 -1 -13 -6z" fill={beard} />}
    <path d="M42 64 q8 -4 16 0 q-8 3 -16 0z" fill={beard} />
  </>
}

export function AdvisorPortrait({ id, size = 44 }: { id: AdvisorId; size?: number }) {
  return <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className="advisor-portrait">
    <defs>
      <radialGradient id={`bg-${id}`} cx="50%" cy="38%" r="65%">
        <stop offset="0" stopColor={id === 'army' ? '#8a3a24' : id === 'research' ? '#2f5a44' : id === 'diplo' ? '#2c4a6e' : '#6a3f1b'} />
        <stop offset="1" stopColor="#2a170a" />
      </radialGradient>
      <clipPath id={`clip-${id}`}><circle cx="50" cy="50" r="46" /></clipPath>
    </defs>
    <circle cx="50" cy="50" r="48" fill={`url(#bg-${id})`} stroke="#e2bd78" strokeWidth="4" />
    <g clipPath={`url(#clip-${id})`}>
      {id === 'city' && <>
        {/* VEZİR: kırmızı kaftan, kürklü yaka, büyük beyaz kallavi kavuk */}
        <path d="M14 100 q6 -26 36 -28 q30 2 36 28z" fill="#9a2a1f" />
        <path d="M30 80 q20 10 40 0 l-4 20 h-32z" fill="#e8d8b0" />
        <Face />
        <ellipse cx="50" cy="34" rx="26" ry="17" fill="#f6f1e4" stroke="#cfc6b0" strokeWidth="1.5" />
        <path d="M27 32 q23 -10 46 0 M29 38 q21 -8 42 0" stroke="#d7cdb6" strokeWidth="1.5" fill="none" />
        <rect x="45" y="13" width="10" height="10" rx="2" fill="#b83a2c" />
        <circle cx="50" cy="30" r="3.2" fill="#e2bd78" />
      </>}
      {id === 'army' && <>
        {/* SERASKER: zırh, miğfer, sorguç */}
        <path d="M12 100 q8 -28 38 -28 q30 0 38 28z" fill="#6b6e72" />
        <path d="M24 86 q26 -10 52 0" stroke="#9aa0a6" strokeWidth="3" fill="none" />
        <Face />
        <path d="M31 44 q19 -34 38 0 z" fill="#a4a9ae" stroke="#5f6468" strokeWidth="1.5" />
        <rect x="29" y="42" width="42" height="6" rx="2" fill="#c9a24e" />
        <rect x="48.5" y="46" width="3" height="12" fill="#8b9096" />
        <path d="M50 12 q-10 -8 -4 -14 q8 4 4 14z" fill="#d9442e" />
        <circle cx="50" cy="14" r="3" fill="#e2bd78" />
      </>}
      {id === 'research' && <>
        {/* ÂLİM: yeşil cübbe, uzun ak sakal, yeşil sarıklı uzun kavuk, kitap */}
        <path d="M14 100 q6 -26 36 -28 q30 2 36 28z" fill="#2f6b4c" />
        <Face beard={GREY} long />
        <path d="M34 42 q16 -38 32 0 z" fill="#f6f1e4" stroke="#cfc6b0" strokeWidth="1.5" />
        <path d="M31 42 q19 -10 38 0 q-19 8 -38 0z" fill="#3c8a5c" />
        <rect x="58" y="80" width="22" height="16" rx="2" fill="#7a3b1c" stroke="#e2bd78" strokeWidth="1.5" transform="rotate(-12 69 88)" />
      </>}
      {id === 'diplo' && <>
        {/* ELÇİ: lacivert redingot, kırmızı fes, rulo mektup */}
        <path d="M14 100 q6 -26 36 -28 q30 2 36 28z" fill="#243f66" />
        <path d="M44 74 l6 14 l6 -14" fill="#f2ead6" />
        <Face />
        <path d="M36 42 l4 -18 h20 l4 18z" fill="#b8271f" />
        <path d="M58 25 q8 4 6 14" stroke="#1e1a17" strokeWidth="2" fill="none" />
        <rect x="16" y="78" width="24" height="7" rx="3.5" fill="#efe2c0" stroke="#b08d57" strokeWidth="1.2" transform="rotate(-20 28 81)" />
      </>}
    </g>
  </svg>
}

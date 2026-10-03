'use client'

/** Oyuna dönüşte "yokluğunda olanlar" kartı: kısa, görsel, tek dokunuşla kapanır. */
import { awayLength, type AwaySummary } from '@/lib/game/away'
import { AkceArt, IlimArt, KeresteArt } from './resource-art'

export function AwaySummaryCard({ summary, onClose, onReports }: { summary: AwaySummary; onClose: () => void; onReports: () => void }) {
  const s = summary
  const quiet = !s.built.length && !s.researched.length && !s.trained.length && !s.reports.length && !s.news.length
  return <div className="away" role="dialog" aria-modal="true" aria-labelledby="away-title" onClick={onClose}>
    <section className="away-card" onClick={e => e.stopPropagation()}>
      <span className="eyebrow">HOŞ GELDİN, HÜKÜMDAR</span>
      <h3 id="away-title">{awayLength(s.minutes)} yoktun</h3>
      {(s.gained.gold + s.gained.wood + s.gained.knowledge) > 0 && <div className="away-gains" aria-label="Biriken kaynaklar">
        <span><AkceArt /><b>+{s.gained.gold.toLocaleString('tr-TR')}</b></span>
        <span><KeresteArt /><b>+{s.gained.wood.toLocaleString('tr-TR')}</b></span>
        <span><IlimArt /><b>+{s.gained.knowledge.toLocaleString('tr-TR')}</b></span>
      </div>}
      {s.cappedHours && <p className="away-full">Üretim {s.cappedHours} saat sonra durdu: oyun kapalıyken kaynaklar en çok bu kadar birikir. Ambar'ın her seviyesi bir saat ekler (en çok 24).</p>}
      {s.full && <p className="away-full">Ambarın dolu: yokluğunda üretimin bir kısmı boşa gitti. Ambar ve Depo'yu büyütmek daha çok biriktirir.</p>}
      {s.built.length > 0 && <div className="away-block"><strong>Ustalar bitirdi</strong><ul>{s.built.map(t => <li key={t}>{t}</li>)}</ul></div>}
      {s.researched.length > 0 && <div className="away-block"><strong>Âlimler keşfetti</strong><ul>{s.researched.map(t => <li key={t}>{t}</li>)}</ul></div>}
      {s.trained.length > 0 && <div className="away-block"><strong>Talimden çıkanlar</strong><ul><li>{s.trained.join(', ')}</li></ul></div>}
      {s.reports.length > 0 && <div className="away-block"><strong>Raporlar</strong><ul>{s.reports.map((r, i) => <li key={i} className={r.success ? 'report-win' : 'report-loss'}>{r.title}</li>)}</ul></div>}
      {s.news.length > 0 && <div className="away-block"><strong>Dünyadan haberler</strong><ul>{s.news.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
      {quiet && <p className="away-quiet">Şehrin sakin geçti; ambarlar doldu, kimse kapını çalmadı.</p>}
      <div className="away-actions">
        {s.reports.length > 0 && <button type="button" className="ovl-btn is-ghost" onClick={onReports}>Raporlara bak</button>}
        <button type="button" className="ovl-btn" onClick={onClose}>Şehre dön</button>
      </div>
    </section>
  </div>
}

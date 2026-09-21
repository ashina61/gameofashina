'use client'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="game-loading" style={{ minHeight: '100dvh', padding: 24, textAlign: 'center' }}>
    <h1>Şehrine dönelim.</h1>
    <p>Bir şeyler ters gitti. Kaydını silmeden yeniden deneyebilirsin.</p>
    <button className="city-objective" style={{ maxWidth: 240, justifyContent: 'center' }} onClick={reset}>Yeniden dene</button>
  </main>
}

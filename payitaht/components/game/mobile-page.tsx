import type { ReactNode } from 'react'

/** The main decision stays visible; explanatory material is a separate layer. */
export function PageDetails({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return <details className={`mobile-details ${className}`}><summary>{title}</summary><div className="mobile-details-body">{children}</div></details>
}

export function PageSheet({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  return <section className="mobile-sheet"><header><h2>{title}</h2>{detail && <p>{detail}</p>}</header>{children}</section>
}

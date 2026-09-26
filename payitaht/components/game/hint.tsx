/**
 * İPUCU: uzun açıklamalar sayfayı yazı duvarına çevirmesin diye kapalı durur;
 * "Nasıl işler?" düğmesine dokununca açılır.
 */
import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

export function Hint({ children, label = 'Nasıl işler?' }: { children: ReactNode; label?: string }) {
  return <details className="hint">
    <summary><Info aria-hidden="true" />{label}</summary>
    <p>{children}</p>
  </details>
}

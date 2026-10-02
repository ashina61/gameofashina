'use client'

/**
 * OYUN DÜĞMESİ (V2 Faz 1.2) — bütün oyun ekranlarının tek düğmesi.
 *
 *   birincil (default)  altın yüz, mürekkep yazı: sayfadaki asıl eylem
 *   ikincil  (outline)  parşömen yüz
 *   sessiz   (ghost)    zeminsiz, yalnız yazı
 *   tehlike  (destructive) al yüz
 *
 * Bombeli yüz ve alt kenar gölgesi; basınca 2 px çöker. Boyları ne olursa
 * olsun parmak alanı en az 44 px (layout-qa kuralı). shadcn Button ile aynı
 * prop'ları alır (variant, size), böylece yer değiştirmek tek satırdır.
 */
import type { ButtonHTMLAttributes, PointerEvent } from 'react'
import { cn } from '@/lib/utils'
import { tapFeel } from '@/lib/sfx'

export type GameButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
export type GameButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'
export type GameButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: GameButtonVariant | null; size?: GameButtonSize | null }

const TONE: Record<GameButtonVariant, string> = {
  default: 'gbtn-gold', outline: 'gbtn-parch', secondary: 'gbtn-parch', ghost: 'gbtn-ghost', destructive: 'gbtn-red', link: 'gbtn-ghost',
}

export function GameButton({ variant, size, className, type = 'button', onPointerDown, ...props }: GameButtonProps) {
  const v = variant ?? 'default', s = size ?? 'default'
  return <button type={type} data-slot="button" data-variant={v} data-size={s}
    className={cn('gbtn', TONE[v], s.startsWith('icon') ? 'gbtn-icon' : `gbtn-${s}`, className)}
    onPointerDown={(e: PointerEvent<HTMLButtonElement>) => { if (!props.disabled) tapFeel(); onPointerDown?.(e) }}
    {...props} />
}

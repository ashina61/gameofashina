import { HALL_SLOT_ID, ROAD_GRAPH } from './index'

export function edgeKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/**
 * Divanhane'den verilen hedef slotlara deterministik BFS ağacı çıkarır.
 * Phaser bağımlılığı yoktur; render ve test katmanı bunu ortak kullanır.
 */
export function roadEdgeKeysForTargets(targets: Iterable<string>): Set<string> {
  const adj = new Map<string, { to: string; key: string }[]>()
  const add = (from: string, to: string) => {
    const arr = adj.get(from) ?? []
    arr.push({ to, key: edgeKey(from, to) })
    adj.set(from, arr)
  }

  for (const e of ROAD_GRAPH.edges) {
    add(e.from, e.to)
    add(e.to, e.from)
  }

  const parent = new Map<string, { node: string; key: string }>()
  const seen = new Set<string>([HALL_SLOT_ID])
  const queue = [HALL_SLOT_ID]

  for (let qi = 0; qi < queue.length; qi++) {
    const node = queue[qi]
    for (const next of adj.get(node) ?? []) {
      if (seen.has(next.to)) continue
      seen.add(next.to)
      parent.set(next.to, { node, key: next.key })
      queue.push(next.to)
    }
  }

  const keys = new Set<string>()
  for (const target of targets) {
    if (target === HALL_SLOT_ID) continue
    let node = target
    const guard = new Set<string>()
    while (node !== HALL_SLOT_ID && !guard.has(node)) {
      guard.add(node)
      const p = parent.get(node)
      if (!p) break
      keys.add(p.key)
      node = p.node
    }
  }
  return keys
}

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { wallArtTransform } from './wall-art'

test('painted wall base meets both foundation endpoints at every slope and tier', () => {
  for (const tier of [1, 2, 3]) for (const dy of [-64, -0.5, 0, 0.5, 64]) {
    const m = wallArtTransform(tier, 48, dy, 88)
    const [lx, ly, rx, ry] = [[40, 312, 376, 183], [33, 323, 376, 201], [39, 318, 376, 209]][tier - 1]
    const points = m.flip ? [[384 - rx, ry], [384 - lx, ly]] : [[lx, ly], [rx, ry]]
    points.forEach(([x, y], i) => {
      assert.ok(Math.abs(m.a * x + m.tx - i * 48) < 1e-8)
      assert.ok(Math.abs(m.b * x + m.d * y + m.ty - i * dy) < 1e-8)
      assert.ok(Math.abs((m.b * x + m.d * (y - 20) + m.ty) - (i * dy - 20 * m.d)) < 1e-8)
    })
    assert.ok(Number.isFinite(m.d) && m.d > 0)
  }
})

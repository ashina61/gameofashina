import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAZA } from '../index'
import { decorGroundViolation, decorGroundRadius, HOUSE_ART_WIDTH } from './decor-clearance'

test('road clearance includes the prop footprint even when its anchor is outside the lane', () => {
  const x = PLAZA.screen.x + PLAZA.rx * 4, y = PLAZA.screen.y
  const lanes = [{ points: [{ x: x - 200, y }, { x: x + 200, y }], halfWidth: 30, kind: 'avenue' }]
  assert.equal(decorGroundViolation(x, y + 50, 60, lanes), 'road')
  assert.equal(decorGroundViolation(x, y + 80, 60, lanes), null)
})
test('quay bends and endpoints remain clear, including object radius', () => {
  const x = PLAZA.screen.x + PLAZA.rx * 4, y = PLAZA.screen.y
  const lanes = [{ points: [{ x, y }, { x: x + 100, y: y + 100 }, { x: x + 100, y: y + 300 }], halfWidth: 30, kind: 'quay' }]
  assert.equal(decorGroundViolation(x + 140, y + 210, 25, lanes), 'quay')
  assert.equal(decorGroundViolation(x + 170, y + 210, 25, lanes), null)
  assert.equal(decorGroundViolation(x - 10, y - 10, 25, lanes), 'quay')
})
test('plaza rim rejects props outside the centre but overlapping its stone', () => {
  assert.equal(decorGroundViolation(PLAZA.screen.x + PLAZA.rx + 20, PLAZA.screen.y, 50, []), 'plaza')
  assert.equal(decorGroundViolation(PLAZA.screen.x + PLAZA.rx + 90, PLAZA.screen.y, 50, []), null)
  assert.ok(decorGroundRadius('d_stone-bench', HOUSE_ART_WIDTH / 4) > decorGroundRadius('d_cypress', HOUSE_ART_WIDTH / 4))
})

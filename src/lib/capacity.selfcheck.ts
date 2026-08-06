import assert from 'node:assert'
import { assignLanes, computeLoad, weekHours } from './capacity.ts'
import type { Allocation, Resource } from './types.ts'

// RN01: inicio_A <= fim_B && fim_A >= inicio_B => overlap => different lanes.
const overlapping: Allocation[] = [
  { id: 'a', resourceId: 'r', projectId: 'p1', startDate: '2026-08-01', endDate: '2026-08-10', weeklyHours: 20 },
  { id: 'b', resourceId: 'r', projectId: 'p2', startDate: '2026-08-05', endDate: '2026-08-15', weeklyHours: 20 },
]
const lanes = assignLanes(overlapping)
assert.notStrictEqual(lanes.get('a'), lanes.get('b'), 'overlapping allocations must use different lanes')

// Touching on the boundary day counts as overlap (RN01 uses <=/>=, not strict).
const touching: Allocation[] = [
  { id: 'a', resourceId: 'r', projectId: 'p1', startDate: '2026-08-01', endDate: '2026-08-10', weeklyHours: 20 },
  { id: 'b', resourceId: 'r', projectId: 'p2', startDate: '2026-08-10', endDate: '2026-08-15', weeklyHours: 20 },
]
const touchingLanes = assignLanes(touching)
assert.notStrictEqual(touchingLanes.get('a'), touchingLanes.get('b'), 'boundary-touching allocations must overlap')

// Non-overlapping allocations can share a lane.
const sequential: Allocation[] = [
  { id: 'a', resourceId: 'r', projectId: 'p1', startDate: '2026-08-01', endDate: '2026-08-09', weeklyHours: 20 },
  { id: 'b', resourceId: 'r', projectId: 'p2', startDate: '2026-08-10', endDate: '2026-08-15', weeklyHours: 20 },
]
const sequentialLanes = assignLanes(sequential)
assert.strictEqual(sequentialLanes.get('a'), sequentialLanes.get('b'), 'non-overlapping allocations should reuse a lane')

// RN02: overallocation = sum of weeklyHours for a resource/period > jornada_padrao_semanal.
const resource: Resource = { id: 'r', name: 'Test', weeklyCapacityHours: 40 }
const week = new Date(2026, 7, 3) // Monday of the week containing the overlap above
assert.strictEqual(weekHours(overlapping, week), 40, 'week sum should add both overlapping allocations')
assert.ok(weekHours(overlapping, week) <= resource.weeklyCapacityHours, 'sanity: 40 == 40 is not yet overallocated')

const overallocating: Allocation[] = [
  ...overlapping,
  { id: 'c', resourceId: 'r', projectId: 'p3', startDate: '2026-08-06', endDate: '2026-08-07', weeklyHours: 10 },
]
assert.ok(weekHours(overallocating, week) > resource.weeklyCapacityHours, 'RN02: sum must exceed capacity')

// RN05: RF13's red band must fire from the exact same threshold RN02 uses (no second criterion).
const weeks = [week]
const bandAtCapacity = computeLoad(resource, overlapping, weeks)
assert.strictEqual(bandAtCapacity.band, 'near-limit', 'exactly at capacity is near-limit, not overallocated')
const bandOverCapacity = computeLoad(resource, overallocating, weeks)
assert.strictEqual(bandOverCapacity.band, 'overallocated', 'RN05: over capacity must flip the band to overallocated')

console.log('capacity.selfcheck: all assertions passed')

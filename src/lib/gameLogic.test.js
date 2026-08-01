import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPartyTargets,
  getAccuracy,
  isHistoricalEntry,
  isCorrectDrop,
  pickEntry,
  updateScore,
} from './gameLogic.js'

const parties = [
  { id: 'SPD', label: 'SPD' },
  { id: 'CDU/CSU', label: 'CDU/CSU' },
  { id: 'FDP', label: 'FDP' },
  { id: 'GRUENE', label: 'Gruene' },
]

const entries = [
  { id: '1', partyId: 'SPD', birthYear: 1920, terms: [1] },
  { id: '2', partyId: 'CDU/CSU', birthYear: 1980, terms: [21] },
  { id: '3', partyId: 'FDP', birthYear: 1990, terms: [21] },
]

describe('gameLogic', () => {
  it('picks from unused entries first', () => {
    const entry = pickEntry(entries, ['1', '2'], () => 0, { historicalChance: 0 })
    assert.equal(entry.id, '3')
  })

  it('falls back to all entries when every entry was used', () => {
    const entry = pickEntry(entries, ['1', '2', '3'], () => 0, { historicalChance: 0 })
    assert.equal(entry.id, '1')
  })

  it('can weight rounds toward historical politicians', () => {
    const entry = pickEntry(entries, [], () => 0, { historicalChance: 1 })
    assert.equal(entry.id, '1')
  })

  it('caps large party pools when picking a round', () => {
    const skewedEntries = [
      { id: 'cdu-1', partyId: 'CDU/CSU', birthYear: 1980, terms: [21] },
      { id: 'cdu-2', partyId: 'CDU/CSU', birthYear: 1980, terms: [21] },
      { id: 'cdu-3', partyId: 'CDU/CSU', birthYear: 1980, terms: [21] },
      { id: 'cdu-4', partyId: 'CDU/CSU', birthYear: 1980, terms: [21] },
      { id: 'spd-1', partyId: 'SPD', birthYear: 1980, terms: [21] },
    ]

    const entry = pickEntry(skewedEntries, [], () => 0.7, {
      historicalChance: 0,
      partySampleCap: 2,
    })

    assert.equal(entry.partyId, 'SPD')
  })

  it('builds party targets with the correct answer and no duplicates', () => {
    const targets = buildPartyTargets(entries[0], parties, 3, () => 0.3, entries)
    assert.equal(targets.length, 3)
    assert.ok(targets.some((party) => party.id === 'SPD'))
    assert.equal(new Set(targets.map((party) => party.id)).size, targets.length)
  })

  it('detects historical entries by early term or birth year', () => {
    assert.equal(isHistoricalEntry(entries[0]), true)
    assert.equal(isHistoricalEntry(entries[1]), false)
    assert.equal(isHistoricalEntry({ id: '4', partyId: 'SPD', birthYear: 1940, terms: [18] }), true)
  })

  it('checks drops against the current entry party', () => {
    assert.equal(isCorrectDrop(entries[0], 'SPD'), true)
    assert.equal(isCorrectDrop(entries[1], 'CDU/CSU'), true)
    assert.equal(isCorrectDrop(entries[0], 'CDU/CSU'), false)
  })

  it('updates score and streak', () => {
    const first = updateScore({ correct: 0, total: 0, streak: 0 }, true)
    assert.deepEqual(first, { correct: 1, total: 1, streak: 1 })
    assert.deepEqual(updateScore(first, false), { correct: 1, total: 2, streak: 0 })
  })

  it('calculates rounded accuracy', () => {
    assert.equal(getAccuracy({ correct: 0, total: 0, streak: 0 }), 0)
    assert.equal(getAccuracy({ correct: 2, total: 3, streak: 2 }), 67)
  })
})

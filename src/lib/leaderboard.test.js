import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  LEADERBOARD_LIMIT,
  PLAYER_NAME_MAX_LENGTH,
  addLeaderboardEntry,
  loadLeaderboard,
  normalizePlayerName,
  rankLeaderboard,
  saveLeaderboard,
} from './leaderboard.js'

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

describe('leaderboard', () => {
  it('normalizes names and limits their length', () => {
    assert.equal(normalizePlayerName('  Max   Musterperson  '), 'Max Musterpers')
    assert.equal(normalizePlayerName(''), 'Anonym')
    assert.equal(Array.from(normalizePlayerName('abcdefghijklmnopqrst')).length, PLAYER_NAME_MAX_LENGTH)
  })

  it('sorts by score and keeps only the top 20', () => {
    const entries = Array.from({ length: 25 }, (_, index) => ({
      id: String(index),
      name: `P${index}`,
      score: index,
      createdAt: `2026-08-01T12:${String(index).padStart(2, '0')}:00.000Z`,
    }))

    const ranked = rankLeaderboard(entries)

    assert.equal(ranked.length, LEADERBOARD_LIMIT)
    assert.equal(ranked[0].score, 24)
    assert.equal(ranked.at(-1).score, 5)
  })

  it('saves and loads ranked entries from storage', () => {
    const storage = createStorage()
    const entries = addLeaderboardEntry([], {
      name: 'Leona',
      score: 7,
      createdAt: '2026-08-01T12:00:00.000Z',
    })

    saveLeaderboard(entries, storage)
    assert.equal(loadLeaderboard(storage)[0].name, 'Leona')
    assert.equal(loadLeaderboard(storage)[0].score, 7)
  })
})

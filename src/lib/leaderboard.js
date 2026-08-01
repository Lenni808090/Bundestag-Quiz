export const LEADERBOARD_LIMIT = 20
export const PLAYER_NAME_MAX_LENGTH = 14
export const LEADERBOARD_STORAGE_KEY = 'bundestag-parteien-quiz.knockout-leaderboard.v1'

export function normalizePlayerName(value) {
  const compactName = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  const limitedName = Array.from(compactName).slice(0, PLAYER_NAME_MAX_LENGTH).join('')
  return limitedName || 'Anonym'
}

export function rankLeaderboard(entries) {
  return entries
    .map((entry) => ({
      id: entry.id ?? cryptoRandomId(),
      name: normalizePlayerName(entry.name),
      score: Math.max(0, Number.parseInt(entry.score, 10) || 0),
      createdAt: entry.createdAt ?? new Date().toISOString(),
    }))
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score
      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    })
    .slice(0, LEADERBOARD_LIMIT)
}

export function addLeaderboardEntry(entries, entry) {
  return rankLeaderboard([
    ...entries,
    {
      id: cryptoRandomId(),
      name: entry.name,
      score: entry.score,
      createdAt: entry.createdAt ?? new Date().toISOString(),
    },
  ])
}

export function loadLeaderboard(storage = getDefaultStorage()) {
  if (!storage) return []

  try {
    const rawEntries = storage.getItem(LEADERBOARD_STORAGE_KEY)
    if (!rawEntries) return []
    const parsedEntries = JSON.parse(rawEntries)
    return Array.isArray(parsedEntries) ? rankLeaderboard(parsedEntries) : []
  } catch {
    return []
  }
}

export function saveLeaderboard(entries, storage = getDefaultStorage()) {
  if (!storage) return
  storage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(rankLeaderboard(entries)))
}

function getDefaultStorage() {
  return typeof window === 'undefined' ? null : window.localStorage
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const ROUND_TARGET_COUNT = 6
const DEFAULT_HISTORICAL_CHANCE = 0.7

export function pickEntry(
  entries,
  usedIds = [],
  random = Math.random,
  { historicalChance = DEFAULT_HISTORICAL_CHANCE } = {},
) {
  const used = new Set(usedIds)
  const remaining = entries.filter((entry) => !used.has(entry.id))
  const basePool = remaining.length > 0 ? remaining : entries
  const historicalPool = basePool.filter(isHistoricalEntry)
  const pool =
    historicalPool.length > 0 && random() < historicalChance ? historicalPool : basePool
  return pool[Math.floor(random() * pool.length)]
}

export function buildPartyTargets(
  entry,
  allParties,
  count = ROUND_TARGET_COUNT,
  random = Math.random,
  allEntries = [],
) {
  const correctParty = allParties.find((party) => party.id === entry.partyId)
  if (!correctParty) {
    throw new Error(`Missing party metadata for ${entry.partyId}`)
  }

  const eraPartyIds = getEraPartyIds(entry, allEntries)
  const candidateParties =
    eraPartyIds.size >= count
      ? allParties.filter((party) => eraPartyIds.has(party.id))
      : allParties

  const distractors = candidateParties
    .filter((party) => party.id !== entry.partyId)
    .map((party) => ({ party, sort: random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, Math.max(0, count - 1))
    .map(({ party }) => party)

  return shuffle([correctParty, ...distractors], random)
}

export function isCorrectDrop(entry, partyId) {
  return entry.partyId === partyId
}

export function updateScore(score, correct) {
  return {
    correct: score.correct + (correct ? 1 : 0),
    total: score.total + 1,
    streak: correct ? score.streak + 1 : 0,
  }
}

export function getAccuracy(score) {
  if (score.total === 0) return 0
  return Math.round((score.correct / score.total) * 100)
}

export function isHistoricalEntry(entry) {
  const firstTerm = getFirstTerm(entry)
  return firstTerm <= 14 || (entry.birthYear && entry.birthYear < 1950)
}

function getEraPartyIds(entry, allEntries) {
  if (!allEntries.length) return new Set()

  const firstTerm = getFirstTerm(entry)
  if (!Number.isFinite(firstTerm)) return new Set()

  return new Set(
    allEntries
      .filter((candidate) => {
        const candidateFirstTerm = getFirstTerm(candidate)
        return Math.abs(candidateFirstTerm - firstTerm) <= 3
      })
      .map((candidate) => candidate.partyId),
  )
}

function getFirstTerm(entry) {
  const terms = entry.terms?.filter(Number.isFinite) ?? []
  return terms.length ? Math.min(...terms) : Infinity
}

function shuffle(items, random) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

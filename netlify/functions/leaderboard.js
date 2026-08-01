import { getStore } from '@netlify/blobs'
import { addLeaderboardEntry, rankLeaderboard } from '../../src/lib/leaderboard.js'

const STORE_NAME = 'bundestag-quiz-leaderboard'
const LEADERBOARD_KEY = 'knockout-top-20'

const responseHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: responseHeaders })
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  try {
    const store = getStore({ name: STORE_NAME, consistency: 'strong' })
    const entries = await readLeaderboard(store)

    if (request.method === 'GET') {
      return jsonResponse(200, { entries })
    }

    const body = await request.json().catch(() => ({}))
    const score = Number.parseInt(body.score, 10)

    if (!Number.isFinite(score) || score < 0 || score > 10000) {
      return jsonResponse(400, { error: 'Invalid score' })
    }

    const nextEntries = addLeaderboardEntry(entries, {
      name: body.name,
      score,
    })

    await store.setJSON(LEADERBOARD_KEY, nextEntries)

    return jsonResponse(200, { entries: nextEntries })
  } catch (error) {
    return jsonResponse(500, {
      error: 'Leaderboard unavailable',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

async function readLeaderboard(store) {
  const entries = await store.get(LEADERBOARD_KEY, {
    type: 'json',
    consistency: 'strong',
  })
  return Array.isArray(entries) ? rankLeaderboard(entries) : []
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  })
}

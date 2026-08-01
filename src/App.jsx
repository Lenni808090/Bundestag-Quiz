import { useCallback, useEffect, useMemo, useState } from 'react'
import politiciansData from './data/politicians.json'
import {
  buildPartyTargets,
  getAccuracy,
  isCorrectDrop,
  pickEntry,
  updateScore,
} from './lib/gameLogic'
import {
  PLAYER_NAME_MAX_LENGTH,
  addLeaderboardEntry,
  loadLeaderboard,
  saveLeaderboard,
} from './lib/leaderboard'
import './App.css'

function createRound(usedIds = []) {
  const entry = pickEntry(politiciansData.entries, usedIds)
  return {
    entry,
    targets: buildPartyTargets(
      entry,
      politiciansData.parties,
      undefined,
      Math.random,
      politiciansData.entries,
    ),
  }
}

function getNextUsedIds(usedIds, entryId) {
  return usedIds.length + 1 >= politiciansData.entries.length ? [] : [...usedIds, entryId]
}

const initialScore = { correct: 0, total: 0, streak: 0 }
const LEADERBOARD_ENDPOINT = '/.netlify/functions/leaderboard'
const gameModes = [
  {
    id: 'endless',
    label: 'Endlos',
    kicker: 'Freies Spiel',
    summary: 'Runden ohne Ende, Fehler setzen nur die Serie zurück.',
  },
  {
    id: 'knockout',
    label: 'K.o.-Serie',
    kicker: 'Punkte-Modus',
    summary: 'Jeder richtige Tipp zählt, der erste Fehler beendet den Lauf.',
  },
]

function App() {
  const [screen, setScreen] = useState('menu')
  const [mode, setMode] = useState(null)
  const [score, setScore] = useState(initialScore)
  const [leaderboard, setLeaderboard] = useState(() => loadLeaderboard())
  const [leaderboardState, setLeaderboardState] = useState('loading')
  const [playerName, setPlayerName] = useState('')
  const [scoreSaved, setScoreSaved] = useState(false)
  const [isSavingScore, setIsSavingScore] = useState(false)
  const [usedIds, setUsedIds] = useState([])
  const [round, setRound] = useState(() => createRound())
  const [result, setResult] = useState(null)
  const [loadedImageUrl, setLoadedImageUrl] = useState(null)

  const correctParty = useMemo(
    () => politiciansData.parties.find((party) => party.id === round.entry.partyId),
    [round.entry.partyId],
  )

  const answered = Boolean(result)
  const isKnockout = mode === 'knockout'
  const knockoutEnded = isKnockout && result && !result.correct
  const imageLoading = loadedImageUrl !== round.entry.imageUrl
  const activeMode = gameModes.find((gameMode) => gameMode.id === mode)
  const chamberTargets = useMemo(
    () => [...round.targets].sort((a, b) => (a.seatOrder ?? 70) - (b.seatOrder ?? 70)),
    [round.targets],
  )

  useEffect(() => {
    let active = true

    async function refreshLeaderboard() {
      try {
        const entries = await requestGlobalLeaderboard()
        if (!active) return
        setLeaderboard(entries)
        saveLeaderboard(entries)
        setLeaderboardState('global')
      } catch {
        if (!active) return
        setLeaderboard(loadLeaderboard())
        setLeaderboardState('local')
      }
    }

    refreshLeaderboard()

    return () => {
      active = false
    }
  }, [])

  const startGame = useCallback((nextMode) => {
    const nextRoundState = createRound()
    setScreen('game')
    setMode(nextMode)
    setScore(initialScore)
    setUsedIds([])
    setRound(nextRoundState)
    setResult(null)
    setLoadedImageUrl(null)
    setPlayerName('')
    setScoreSaved(false)
    setIsSavingScore(false)
  }, [])

  const nextRound = useCallback(() => {
    const nextUsedIds = getNextUsedIds(usedIds, round.entry.id)
    setUsedIds(nextUsedIds)
    setRound(createRound(nextUsedIds))
    setResult(null)
    setLoadedImageUrl(null)
  }, [round.entry.id, usedIds])

  useEffect(() => {
    if (!isKnockout || !result?.correct) return undefined

    const timeoutId = window.setTimeout(() => {
      nextRound()
    }, 700)

    return () => window.clearTimeout(timeoutId)
  }, [isKnockout, nextRound, result?.correct])

  function returnToMenu() {
    setScreen('menu')
    setMode(null)
    setResult(null)
    setPlayerName('')
    setScoreSaved(false)
    setIsSavingScore(false)
  }

  function restartGame() {
    startGame(mode ?? 'endless')
  }

  function submitAnswer(partyId) {
    if (answered || !partyId) return
    const correct = isCorrectDrop(round.entry, partyId)
    setScore((currentScore) => updateScore(currentScore, correct))
    setResult({
      partyId,
      correct,
    })
  }

  async function handleSaveScore(event) {
    event.preventDefault()
    if (!knockoutEnded || scoreSaved || isSavingScore) return

    const fallbackEntries = addLeaderboardEntry(leaderboard, {
      name: playerName,
      score: score.correct,
    })

    setIsSavingScore(true)
    try {
      const entries = await saveGlobalLeaderboardEntry(playerName, score.correct)
      setLeaderboard(entries)
      saveLeaderboard(entries)
      setLeaderboardState('global')
    } catch {
      setLeaderboard(fallbackEntries)
      saveLeaderboard(fallbackEntries)
      setLeaderboardState('local')
    } finally {
      setScoreSaved(true)
      setIsSavingScore(false)
    }
  }

  function handlePartyKeyDown(event, partyId) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      submitAnswer(partyId)
    }
  }

  function handleImageError() {
    nextRound()
  }

  if (screen === 'menu') {
    return (
      <main className="app-shell menu-shell">
        <header className="menu-header">
          <p className="eyebrow">Bundestag seit 1949</p>
          <h1>Bundestag-Parteien-Quiz</h1>
        </header>

        <section className="main-menu" aria-label="Hauptmenü">
          <div className="mode-list">
            {gameModes.map((gameMode) => (
              <article key={gameMode.id} className="mode-card">
                <p className="mode-kicker">{gameMode.kicker}</p>
                <h2>{gameMode.label}</h2>
                <p>{gameMode.summary}</p>
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => startGame(gameMode.id)}
                >
                  Starten
                </button>
              </article>
            ))}
          </div>

          <section className="leaderboard-panel" aria-labelledby="leaderboard-title">
            <div className="leaderboard-head">
              <p className="eyebrow">K.o.-Serie</p>
              <h2 id="leaderboard-title">Top 20</h2>
              <span className={`leaderboard-status is-${leaderboardState}`}>
                {leaderboardState === 'global'
                  ? 'Global'
                  : leaderboardState === 'loading'
                    ? 'Lädt'
                    : 'Lokal'}
              </span>
            </div>
            {leaderboard.length > 0 ? (
              <ol className="leaderboard-list">
                {leaderboard.map((entry, index) => (
                  <li key={entry.id}>
                    <span className="leaderboard-rank">{index + 1}</span>
                    <span className="leaderboard-name">{entry.name}</span>
                    <strong>{entry.score}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="leaderboard-empty">Noch keine Einträge.</p>
            )}
          </section>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{activeMode?.label ?? 'Spiel'}</p>
          <h1>Bundestag-Parteien-Quiz</h1>
        </div>
        <dl className="scoreboard" aria-label="Spielstand">
          <div>
            <dt>{isKnockout ? 'Punkte' : 'Richtig'}</dt>
            <dd>
              {score.correct}/{score.total}
            </dd>
          </div>
          <div>
            <dt>Serie</dt>
            <dd>{score.streak}</dd>
          </div>
          <div>
            <dt>Quote</dt>
            <dd>{getAccuracy(score)}%</dd>
          </div>
        </dl>
        {!isKnockout && (
          <button type="button" className="secondary-action topbar-action" onClick={returnToMenu}>
            Zum Menü
          </button>
        )}
      </header>

      <section className="game-board" aria-live="polite">
        <div className="portrait-area">
          <div className={`portrait-card ${imageLoading ? 'is-loading' : ''}`}>
            <img
              key={round.entry.id}
              src={round.entry.imageUrl}
              alt={`Porträt von ${round.entry.name}`}
              draggable="false"
              onLoad={() => setLoadedImageUrl(round.entry.imageUrl)}
              onError={handleImageError}
            />
            {imageLoading && <span className="image-loader">Bild lädt...</span>}
            <div className="portrait-caption">
              <strong>{round.entry.name}</strong>
              <span>
                {round.entry.birthYear ? `geb. ${round.entry.birthYear}` : 'MdB'}
                {round.entry.terms.length > 0 ? `, WP ${round.entry.terms.join(', ')}` : ''}
              </span>
            </div>
          </div>

          {result && (
            <div className={`feedback ${result.correct ? 'is-correct' : 'is-wrong'}`}>
              <strong>
                {result.correct
                  ? isKnockout
                    ? 'Richtig. Weiter gehts.'
                    : 'Richtig.'
                  : knockoutEnded
                    ? `Ende. ${score.correct} Punkte.`
                    : 'Nicht ganz.'}
              </strong>
              <span>
                {round.entry.name} gehört zu {correctParty?.label ?? round.entry.partyRaw}
                {correctParty?.fullName ? ` (${correctParty.fullName})` : ''}.
              </span>
              {!isKnockout && (
                <div className="feedback-actions">
                  <button type="button" className="primary-action" onClick={nextRound}>
                    Nächste Runde
                  </button>
                </div>
              )}
            </div>
          )}

          {knockoutEnded && (
            <form className="game-over-panel" onSubmit={handleSaveScore}>
              <label htmlFor="player-name">Name für Top 20</label>
              <div className="score-form-row">
                <input
                  id="player-name"
                  type="text"
                  value={playerName}
                  maxLength={PLAYER_NAME_MAX_LENGTH}
                  onChange={(event) => setPlayerName(event.target.value)}
                  placeholder="Name"
                  disabled={scoreSaved || isSavingScore}
                />
                <button
                  type="submit"
                  className="primary-action"
                  disabled={scoreSaved || isSavingScore}
                >
                  {isSavingScore ? 'Speichert' : scoreSaved ? 'Gespeichert' : 'Speichern'}
                </button>
              </div>
              <span className="name-counter">
                {Array.from(playerName).length}/{PLAYER_NAME_MAX_LENGTH}
              </span>
              <div className="game-over-actions">
                <button type="button" className="secondary-action" onClick={restartGame}>
                  Neu starten
                </button>
                <button type="button" className="secondary-action" onClick={returnToMenu}>
                  Zum Menü
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="plenary-area" aria-label="Parteien im Plenarsaal">
          <div className="presidium" aria-hidden="true">
            Präsidium
          </div>
          <div className="lectern" aria-hidden="true">
            Rednerpult
          </div>
          <div className="party-hemicycle">
            {chamberTargets.map((party, index) => {
              const wasChosen = result?.partyId === party.id
              const isCorrect = result && party.id === round.entry.partyId
              return (
                <button
                  key={party.id}
                  type="button"
                  className={`party-target party-seat-${index} ${
                    wasChosen ? 'was-chosen' : ''
                  } ${isCorrect ? 'is-answer' : ''}`}
                  style={{ '--party-color': party.color }}
                  onClick={() => submitAnswer(party.id)}
                  onKeyDown={(event) => handlePartyKeyDown(event, party.id)}
                  disabled={answered}
                >
                  <span className="party-swatch" aria-hidden="true" />
                  <span className="party-copy">
                    <span className="party-label">{party.label}</span>
                    <span className="party-full-name"> ({party.fullName ?? party.label})</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="action-row">
        <p>
          Daten: Deutscher Bundestag, Stand {politiciansData.sources.bundestagSnapshot}.
          Bilder: {round.entry.imageAttribution}.{' '}
          <a href={round.entry.imageSourceUrl} target="_blank" rel="noreferrer">
            Quelle
          </a>
        </p>
        {isKnockout && !knockoutEnded && (
          <div className="actions">
            <button type="button" className="secondary-action" onClick={returnToMenu}>
              Zum Menü
            </button>
            <button type="button" className="secondary-action" onClick={restartGame}>
              Neu starten
            </button>
          </div>
        )}
      </footer>
    </main>
  )
}

export default App

async function requestGlobalLeaderboard() {
  const response = await fetch(LEADERBOARD_ENDPOINT, {
    headers: { accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Leaderboard request failed: ${response.status}`)
  }
  const body = await response.json()
  return Array.isArray(body.entries) ? body.entries : []
}

async function saveGlobalLeaderboardEntry(name, score) {
  const response = await fetch(LEADERBOARD_ENDPOINT, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ name, score }),
  })
  if (!response.ok) {
    throw new Error(`Leaderboard save failed: ${response.status}`)
  }
  const body = await response.json()
  return Array.isArray(body.entries) ? body.entries : []
}

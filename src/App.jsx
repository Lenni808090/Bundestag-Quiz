import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import politiciansData from './data/politicians.json'
import {
  buildPartyTargets,
  getAccuracy,
  isCorrectDrop,
  pickEntry,
  updateScore,
} from './lib/gameLogic'
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
const gameModes = [
  { id: 'endless', label: 'Endlos' },
  { id: 'knockout', label: 'K.o.-Serie' },
]

function App() {
  const [mode, setMode] = useState('endless')
  const [score, setScore] = useState(initialScore)
  const [bestKnockoutScore, setBestKnockoutScore] = useState(0)
  const [usedIds, setUsedIds] = useState([])
  const [round, setRound] = useState(() => createRound())
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState(false)
  const [drag, setDrag] = useState(null)
  const [loadedImageUrl, setLoadedImageUrl] = useState(null)
  const targetRefs = useRef(new Map())
  const portraitRef = useRef(null)

  const correctParty = useMemo(
    () => politiciansData.parties.find((party) => party.id === round.entry.partyId),
    [round.entry.partyId],
  )

  const answered = Boolean(result)
  const isKnockout = mode === 'knockout'
  const knockoutEnded = isKnockout && result && !result.correct
  const imageLoading = loadedImageUrl !== round.entry.imageUrl
  const chamberTargets = useMemo(
    () => [...round.targets].sort((a, b) => (a.seatOrder ?? 70) - (b.seatOrder ?? 70)),
    [round.targets],
  )

  const nextRound = useCallback(() => {
    const nextUsedIds = getNextUsedIds(usedIds, round.entry.id)
    setUsedIds(nextUsedIds)
    setRound(createRound(nextUsedIds))
    setResult(null)
    setSelected(false)
    setDrag(null)
    portraitRef.current?.focus()
  }, [round.entry.id, usedIds])

  useEffect(() => {
    if (!isKnockout || !result?.correct) return undefined

    const timeoutId = window.setTimeout(() => {
      nextRound()
    }, 700)

    return () => window.clearTimeout(timeoutId)
  }, [isKnockout, nextRound, result?.correct])

  function registerTarget(id, node) {
    if (node) {
      targetRefs.current.set(id, node)
    } else {
      targetRefs.current.delete(id)
    }
  }

  function findTargetAt(clientX, clientY) {
    for (const [partyId, node] of targetRefs.current) {
      const rect = node.getBoundingClientRect()
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return partyId
      }
    }
    return null
  }

  function submitAnswer(partyId) {
    if (answered || !partyId) return
    const correct = isCorrectDrop(round.entry, partyId)
    setScore((currentScore) => {
      const nextScore = updateScore(currentScore, correct)
      if (mode === 'knockout') {
        setBestKnockoutScore((bestScore) => Math.max(bestScore, nextScore.correct))
      }
      return nextScore
    })
    setResult({
      partyId,
      correct,
    })
    setSelected(false)
  }

  function resetGame() {
    const nextRoundState = createRound()
    setScore(initialScore)
    setUsedIds([])
    setRound(nextRoundState)
    setResult(null)
    setSelected(false)
    setDrag(null)
  }

  function changeMode(nextMode) {
    if (nextMode === mode) return
    setMode(nextMode)
    setScore(initialScore)
    setUsedIds([])
    setRound(createRound())
    setResult(null)
    setSelected(false)
    setDrag(null)
  }

  function handlePointerDown(event) {
    if (answered) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelected(true)
    setDrag({
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      overId: null,
    })
  }

  function handlePointerMove(event) {
    if (!drag || drag.pointerId !== event.pointerId || answered) return
    setDrag((currentDrag) => ({
      ...currentDrag,
      x: event.clientX,
      y: event.clientY,
      overId: findTargetAt(event.clientX, event.clientY),
    }))
  }

  function handlePointerUp(event) {
    if (!drag || drag.pointerId !== event.pointerId) return
    submitAnswer(findTargetAt(event.clientX, event.clientY))
    setDrag(null)
  }

  function handlePortraitKeyDown(event) {
    if (answered) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setSelected((value) => !value)
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Bundestag seit 1949</p>
          <h1>Bundestag-Parteien-Quiz</h1>
        </div>
        <div className="mode-switch" role="group" aria-label="Spielmodus">
          {gameModes.map((gameMode) => (
            <button
              key={gameMode.id}
              type="button"
              className={mode === gameMode.id ? 'is-active' : ''}
              onClick={() => changeMode(gameMode.id)}
            >
              {gameMode.label}
            </button>
          ))}
        </div>
        <dl className="scoreboard" aria-label="Spielstand">
          <div>
            <dt>{isKnockout ? 'Punkte' : 'Richtig'}</dt>
            <dd>
              {score.correct}/{score.total}
            </dd>
          </div>
          <div>
            <dt>{isKnockout ? 'Bestwert' : 'Serie'}</dt>
            <dd>{isKnockout ? bestKnockoutScore : score.streak}</dd>
          </div>
          <div>
            <dt>Quote</dt>
            <dd>{getAccuracy(score)}%</dd>
          </div>
        </dl>
      </header>

      <section className="game-board" aria-live="polite">
        <div className="portrait-area">
          <div
            ref={portraitRef}
            className={`portrait-card ${selected ? 'is-selected' : ''} ${
              drag ? 'is-dragging' : ''
            } ${imageLoading ? 'is-loading' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={`${round.entry.name} auswählen`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => setDrag(null)}
            onLostPointerCapture={() => setDrag(null)}
            onKeyDown={handlePortraitKeyDown}
          >
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
            </div>
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
              const isDropTarget = drag?.overId === party.id
              const wasChosen = result?.partyId === party.id
              const isCorrect = result && party.id === round.entry.partyId
              return (
                <button
                  key={party.id}
                  ref={(node) => registerTarget(party.id, node)}
                  type="button"
                  className={`party-target party-seat-${index} ${isDropTarget ? 'is-over' : ''} ${
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
        <div className="actions">
          <button type="button" className="secondary-action" onClick={resetGame}>
            Neu starten
          </button>
          <button
            type="button"
            className="primary-action"
            onClick={knockoutEnded ? resetGame : nextRound}
            disabled={isKnockout && !knockoutEnded}
          >
            {knockoutEnded ? 'Neue K.o.-Serie' : 'Nächste Runde'}
          </button>
        </div>
      </footer>

      {drag && (
        <div
          className="drag-preview"
          style={{
            left: `${drag.x}px`,
            top: `${drag.y}px`,
          }}
          aria-hidden="true"
        >
          <img src={round.entry.imageUrl} alt="" draggable="false" />
        </div>
      )}
    </main>
  )
}

export default App

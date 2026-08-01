import { useMemo, useRef, useState } from 'react'
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

const initialScore = { correct: 0, total: 0, streak: 0 }

function App() {
  const [score, setScore] = useState(initialScore)
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
  const imageLoading = loadedImageUrl !== round.entry.imageUrl
  const chamberTargets = useMemo(
    () => [...round.targets].sort((a, b) => (a.seatOrder ?? 70) - (b.seatOrder ?? 70)),
    [round.targets],
  )

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
    setScore((currentScore) => updateScore(currentScore, correct))
    setResult({
      partyId,
      correct,
    })
    setSelected(false)
  }

  function nextRound() {
    const nextUsedIds =
      usedIds.length + 1 >= politiciansData.entries.length ? [] : [...usedIds, round.entry.id]
    setUsedIds(nextUsedIds)
    setRound(createRound(nextUsedIds))
    setResult(null)
    setSelected(false)
    setDrag(null)
    portraitRef.current?.focus()
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
        <dl className="scoreboard" aria-label="Spielstand">
          <div>
            <dt>Richtig</dt>
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
              <strong>{result.correct ? 'Richtig.' : 'Nicht ganz.'}</strong>
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
                  onClick={() => {
                    if (selected) submitAnswer(party.id)
                  }}
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
          <button type="button" className="primary-action" onClick={nextRound}>
            Nächste Runde
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

import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const BUNDESTAG_XML_ZIP =
  'https://www.bundestag.de/resource/blob/472878/MdB-Stammdaten.zip'
const BUNDESTAG_PORTRAIT_ENDPOINT =
  'https://www.bundestag.de/ajax/filterlist/de/abgeordnete/Abgeordnete/1040594-1040594'
const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql'
const ABGEORDNETENWATCH_API = 'https://www.abgeordnetenwatch.de/api/v2'
const ABGEORDNETENWATCH_RANGE_END = 1000

const youthOrganizationSources = [
  {
    id: 'jusos',
    organization: 'Jusos',
    partyId: 'SPD',
    partyRaw: 'SPD',
    wikidataId: 'Q690370',
    partyWikidataIds: ['Q49768'],
    url: 'https://jusos.de/wer-wir-sind/bundesvorstand/',
    currentBoardNames: [
      'Philipp Türmer',
      'Marco Albers',
      'Johanna Börgermann',
      'Matthias Bock',
      'Steven Commey-Bortsie',
      'Kirsti Elle',
      'Mareike Engel',
      'Antonia Miersch',
      'Johanna Seidel',
      'Laura Wanninger',
      'Gidion Zieten',
      'Paula Schmedding',
      'Rachid Khenissi',
      'Azra Preisler',
      'Tim Siebeneicher',
      'Yagmur Topçu',
      'Yağmur Topçu',
      'Lucy Eggert',
      'Anna Kasparyan',
    ],
  },
  {
    id: 'julis',
    organization: 'Junge Liberale',
    partyId: 'FDP',
    partyRaw: 'FDP',
    wikidataId: 'Q449361',
    partyWikidataIds: ['Q13124'],
    url: 'https://www.fdp.de/bundeskonferenz-der-julis-von-abschied-zu-aufbruch',
    currentBoardNames: [
      'Finn Flebbe',
      'Franziska Brandmann',
      'Pascal Schejnoha',
      'Julia Hehl',
      'Jelger Tosch',
      'Laurent Putzier',
    ],
  },
  {
    id: 'junge-union',
    organization: 'Junge Union',
    partyId: 'CDU/CSU',
    partyRaw: 'CDU/CSU',
    wikidataId: 'Q497594',
    partyWikidataIds: ['Q49762', 'Q49763'],
    url: 'https://www.junge-union.de/ueber-uns/bundesvorstand/',
    currentBoardNames: [
      'Johannes Winkel',
      'Nicola Gehringer',
      'Franziska Lammert',
      'Pascal Reddig',
      'Ann-Cathrin Simon',
      'Clara von Nathusius',
      'Annamarie Bauer',
      'Sarah Beckhoff',
      'Fabian Beine',
      'Stefanie Franzl',
      'Philipp Geib',
      'Cornelius Golembiewski',
      'Martin Hauner',
      'Julian Herrmann',
      'André Hess',
      'Marc-Philipp Janson',
      'Simon Mai',
      'Ludwig Schnur',
      'Marcel Tillmann',
      'Moritz Übermuth',
      'Finn Wandhoff',
      'Charlotte Warken-Luxenburger',
    ],
  },
  {
    id: 'gruene-jugend',
    organization: 'Grüne Jugend',
    partyId: 'GRUENE',
    partyRaw: 'Bündnis 90/Die Grünen',
    wikidataId: 'Q255509',
    partyWikidataIds: ['Q49766'],
    url: 'https://gruene-jugend.de/bundesvorstand/',
    currentBoardNames: [
      'Henriette Held',
      'Luis Bobga',
      'Annika Randzio',
      'Jonathan Morsch',
      'Katharina Müller',
      'Stina Reichardt',
      'Laetitia Wendt',
      'Moritz Frings',
      'Tammo Westphal',
      'Melsa Yildirim',
    ],
  },
  {
    id: 'linksjugend-solid',
    organization: "Linksjugend ['solid]",
    partyId: 'LINKE',
    partyRaw: 'Die Linke',
    wikidataId: 'Q11514',
    partyWikidataIds: ['Q49764'],
    url: 'https://www.linksjugend-solid.de/verband/bundessprecherinnenrat/',
    currentBoardNames: [
      'Maria Lara Moubarak',
      'Selina Pfister',
      'Yannic Schalk',
      'Limes Schäfer',
    ],
  },
]

const partyMeta = {
  KPD: {
    label: 'KPD',
    fullName: 'Kommunistische Partei Deutschlands',
    color: '#8b0000',
    seatOrder: 4,
  },
  BSW: {
    label: 'BSW',
    fullName: 'Bündnis Sahra Wagenknecht - Vernunft und Gerechtigkeit',
    color: '#7a1b2d',
    seatOrder: 8,
  },
  LINKE: {
    label: 'LINKE',
    fullName: 'Die Linke',
    color: '#be3075',
    seatOrder: 12,
  },
  GRUENE: {
    label: 'GRÜNE',
    fullName: 'Bündnis 90/Die Grünen',
    color: '#46962b',
    seatOrder: 24,
  },
  SSW: {
    label: 'SSW',
    fullName: 'Südschleswigscher Wählerverband',
    color: '#1f78b4',
    seatOrder: 28,
  },
  SPD: {
    label: 'SPD',
    fullName: 'Sozialdemokratische Partei Deutschlands',
    color: '#e3000f',
    seatOrder: 32,
  },
  FDP: {
    label: 'FDP',
    fullName: 'Freie Demokratische Partei',
    color: '#c8a600',
    seatOrder: 46,
  },
  VOLT: {
    label: 'Volt',
    fullName: 'Volt Deutschland',
    color: '#502379',
    seatOrder: 48,
  },
  PIRATEN: {
    label: 'PIRATEN',
    fullName: 'Piratenpartei Deutschland',
    color: '#ff8800',
    seatOrder: 49,
  },
  ZENTRUM: {
    label: 'Zentrum',
    fullName: 'Deutsche Zentrumspartei',
    color: '#1f4e79',
    seatOrder: 50,
  },
  FREIE_WAEHLER: {
    label: 'FW',
    fullName: 'Freie Wähler',
    color: '#f28c28',
    seatOrder: 54,
  },
  BUENDNIS_DEUTSCHLAND: {
    label: 'BD',
    fullName: 'Bündnis Deutschland',
    color: '#1f4e79',
    seatOrder: 56,
  },
  DZP: {
    label: 'DZP',
    fullName: 'Deutsche Zentrumspartei',
    color: '#1f4e79',
    seatOrder: 50,
  },
  'CDU/CSU': {
    label: 'CDU/CSU',
    fullName: 'Gemeinsame Bundestagsfraktion von CDU und CSU',
    color: '#222222',
    seatOrder: 60,
  },
  BP: {
    label: 'BP',
    fullName: 'Bayernpartei',
    color: '#2b6cb0',
    seatOrder: 66,
  },
  FU: {
    label: 'FU',
    fullName: 'Föderalistische Union',
    color: '#315c85',
    seatOrder: 68,
  },
  GB_BHE: {
    label: 'GB/BHE',
    fullName: 'Gesamtdeutscher Block/Bund der Heimatvertriebenen und Entrechteten',
    color: '#7c6f57',
    seatOrder: 70,
  },
  DP: {
    label: 'DP',
    fullName: 'Deutsche Partei',
    color: '#795548',
    seatOrder: 74,
  },
  WAV: {
    label: 'WAV',
    fullName: 'Wirtschaftliche Aufbau-Vereinigung',
    color: '#6b7280',
    seatOrder: 76,
  },
  DSU: {
    label: 'DSU',
    fullName: 'Deutsche Soziale Union',
    color: '#315c85',
    seatOrder: 78,
  },
  LKR: {
    label: 'LKR',
    fullName: 'Liberal-Konservative Reformer',
    color: '#315c85',
    seatOrder: 80,
  },
  AFD: {
    label: 'AfD',
    fullName: 'Alternative für Deutschland',
    color: '#009ee0',
    seatOrder: 88,
  },
  SRP: {
    label: 'SRP',
    fullName: 'Sozialistische Reichspartei',
    color: '#5b1f1f',
    seatOrder: 92,
  },
}

const partyAliases = new Map([
  ['BÜNDNIS 90/DIE GRÜNEN', 'GRUENE'],
  ['BÜNDNIS 90/DIE GRUENEN', 'GRUENE'],
  ['GRÜNE', 'GRUENE'],
  ['GRUNE', 'GRUENE'],
  ['GRUENE', 'GRUENE'],
  ['DIE GRÜNEN', 'GRUENE'],
  ['DIE GRUNEN', 'GRUENE'],
  ['DIE GRUENEN', 'GRUENE'],
  ['DIE LINKE.', 'LINKE'],
  ['DIE LINKE', 'LINKE'],
  ['LINKE', 'LINKE'],
  ['PDS', 'LINKE'],
  ['PDS/LL', 'LINKE'],
  ['PDS/LINKE LISTE', 'LINKE'],
  ['PLOS', 'PARTEILOS'],
  ['PLOS.', 'PARTEILOS'],
  ['FRAKTIONSLOS', 'PARTEILOS'],
  ['FRAKTIONSFREI', 'PARTEILOS'],
  ['GRUPPENLOS', 'PARTEILOS'],
  ['BÜNDNIS SAHRA WAGENKNECHT', 'BSW'],
  ['BSW', 'BSW'],
  ['AFD', 'AFD'],
  ['ALTERNATIVE FÜR DEUTSCHLAND', 'AFD'],
  ['ALTERNATIVE FUER DEUTSCHLAND', 'AFD'],
  ['CDU', 'CDU/CSU'],
  ['CSU', 'CDU/CSU'],
  ['CDU/CSU', 'CDU/CSU'],
  ['SPD', 'SPD'],
  ['FDP', 'FDP'],
  ['VOLT', 'VOLT'],
  ['PIRATEN', 'PIRATEN'],
  ['PIRATENPARTEI', 'PIRATEN'],
  ['PIRATENPARTEI DEUTSCHLAND', 'PIRATEN'],
  ['FREIE WAHLER', 'FREIE_WAEHLER'],
  ['FREIE WAEHLER', 'FREIE_WAEHLER'],
  ['FREIE_WAHLER', 'FREIE_WAEHLER'],
  ['FREIE_WAEHLER', 'FREIE_WAEHLER'],
  ['BUNDNIS DEUTSCHLAND', 'BUENDNIS_DEUTSCHLAND'],
  ['BUENDNIS DEUTSCHLAND', 'BUENDNIS_DEUTSCHLAND'],
  ['KPD', 'KPD'],
  ['DP', 'DP'],
  ['BP', 'BP'],
  ['FU', 'FU'],
  ['DZP', 'DZP'],
  ['DSU', 'DSU'],
  ['LKR', 'LKR'],
  ['SRP', 'SRP'],
  ['ZENTRUM', 'ZENTRUM'],
  ['GB/BHE', 'GB_BHE'],
  ['BHE', 'GB_BHE'],
  ['WAV', 'WAV'],
  ['SSW', 'SSW'],
  ['PARTEILOS', 'PARTEILOS'],
  ['OHNE', 'PARTEILOS'],
])

function cleanText(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function stripDiacritics(value) {
  return cleanText(value)
    .replace(/[\u00ad\u200b-\u200d]/g, '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function normalizeName(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/prof\.|dr\.|h\.c\.|mult\.|rer\.|nat\.|med\.|jur\.|phil\./g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeParty(value) {
  const compact = stripDiacritics(value).toUpperCase().replace(/\s+/g, ' ').trim()
  return partyAliases.get(compact) ?? compact.replace(/[^A-Z0-9]+/g, '_')
}

function buildCommonsThumbnailUrl(imageUrl, width = 520) {
  let parsed
  try {
    parsed = new URL(imageUrl)
  } catch {
    return null
  }

  const filePathMarker = '/wiki/Special:FilePath/'
  const markerIndex = parsed.pathname.indexOf(filePathMarker)
  if (!parsed.hostname.includes('commons.wikimedia.org') || markerIndex < 0) {
    return imageUrl
  }

  const fileName = decodeURIComponent(
    parsed.pathname.slice(markerIndex + filePathMarker.length),
  ).replaceAll(' ', '_')

  if (!fileName || /\.(tiff?|svg|pdf|djvu)$/i.test(fileName)) {
    return null
  }

  const encodedFile = encodeCommonsFileName(fileName)
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodedFile}?width=${width}`
}

function encodeCommonsFileName(fileName) {
  return encodeURIComponent(fileName).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

function asArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function getLatestName(mdb) {
  const names = asArray(mdb.NAMEN?.NAME)
  const activeName = names.find((name) => !cleanText(name.HISTORIE_BIS)) ?? names.at(-1)
  const title = cleanText(activeName?.ANREDE_TITEL || activeName?.AKAD_TITEL)
  const firstName = cleanText(activeName?.VORNAME)
  const lastName = cleanText(activeName?.NACHNAME)
  return [title, firstName, lastName].filter(Boolean).join(' ')
}

function parseYear(date) {
  const match = cleanText(date).match(/\d{4}$/)
  return match ? Number(match[0]) : undefined
}

function buildPartyList(entries) {
  const ids = [...new Set(entries.map((entry) => entry.partyId))]
  return ids
    .map((id) => ({
      id,
      label: partyMeta[id]?.label ?? id.replaceAll('_', ' '),
      fullName: partyMeta[id]?.fullName ?? id.replaceAll('_', ' '),
      color: partyMeta[id]?.color ?? '#475569',
      seatOrder: partyMeta[id]?.seatOrder ?? 70,
    }))
    .sort((a, b) => a.seatOrder - b.seatOrder || a.label.localeCompare(b.label, 'de'))
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'bundestag-parteien-quiz/0.1 (educational local app)',
      ...options.headers,
    },
    ...options,
  })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`)
  }
  return response.text()
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'bundestag-parteien-quiz/0.1 (educational local app)',
      ...options.headers,
    },
    ...options,
  })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`)
  }
  return response.json()
}

async function fetchXmlMembers() {
  const response = await fetch(BUNDESTAG_XML_ZIP, {
    headers: { 'User-Agent': 'bundestag-parteien-quiz/0.1' },
  })
  if (!response.ok) {
    throw new Error(`Could not download Bundestag data: ${response.status}`)
  }

  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()))
  const xmlEntry = zip.getEntry('MDB_STAMMDATEN.XML')
  if (!xmlEntry) throw new Error('MDB_STAMMDATEN.XML missing from Bundestag zip')

  const xml = xmlEntry.getData().toString('utf8')
  const snapshot = xml.match(/Erstellt am:\s*([\d.]+)/)?.[1] ?? 'unknown'
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
    parseTagValue: false,
  })
  const data = parser.parse(xml)
  const members = asArray(data.DOCUMENT?.MDB)

  return { members, snapshot }
}

async function fetchBundestagPortraits() {
  const portraits = new Map()
  let offset = 0
  let hits = Infinity

  while (offset < hits) {
    const html = await fetchText(
      `${BUNDESTAG_PORTRAIT_ENDPOINT}?offset=${offset}&limit=12`,
    )
    hits = Number(html.match(/data-hits="(\d+)"/)?.[1] ?? hits)
    const nextOffset = Number(html.match(/data-nextoffset="(\d+)"/)?.[1] ?? offset + 12)
    const cards = html.matchAll(
      /<a title="([^"]+)" href="([^"]+)"[\s\S]*?<img[\s\S]*?data-img-md-retina="([^"]+)"/g,
    )

    for (const match of cards) {
      const [, title, href, imageUrl] = match
      const [lastName, firstName] = title.split(',').map((part) => cleanText(part))
      const displayName = [firstName, lastName].filter(Boolean).join(' ')
      portraits.set(normalizeName(displayName), {
        imageUrl: imageUrl.replaceAll('&amp;', '&'),
        imageSourceUrl: href.replaceAll('&amp;', '&'),
        imageAttribution: 'Deutscher Bundestag',
        imageLicense: 'Bundestag image database terms',
      })
    }

    if (!Number.isFinite(nextOffset) || nextOffset <= offset) break
    offset = nextOffset
  }

  return portraits
}

async function fetchWikidataPortraits() {
  const query = `
SELECT ?person ?personLabel ?image WHERE {
  ?person wdt:P39 wd:Q1939555;
          wdt:P18 ?image.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
}
`
  const url = `${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'bundestag-parteien-quiz/0.1 (local educational app)',
    },
  })

  if (!response.ok) {
    console.warn(`Wikidata fallback skipped: ${response.status} ${response.statusText}`)
    return new Map()
  }

  const json = await response.json()
  const portraits = new Map()

  for (const item of json.results?.bindings ?? []) {
    const label = cleanText(item.personLabel?.value)
    const imageUrl = buildCommonsThumbnailUrl(cleanText(item.image?.value))
    const personUrl = cleanText(item.person?.value)
    if (!label || !imageUrl) continue

    portraits.set(normalizeName(label), {
      imageUrl,
      imageSourceUrl: personUrl,
      imageAttribution: 'Wikimedia Commons / Wikidata',
      imageLicense: 'See linked Wikimedia file metadata',
    })
  }

  return portraits
}

async function fetchWikidataPortraitsForNames(names) {
  const uniqueNames = [...new Set(names.map(cleanText).filter(Boolean))]
  const portraits = new Map()
  const chunkSize = 80

  for (let index = 0; index < uniqueNames.length; index += chunkSize) {
    const chunk = uniqueNames.slice(index, index + chunkSize)
    const values = chunk
      .flatMap((name) => [sparqlString(name, 'de'), sparqlString(name, 'en')])
      .join(' ')
    const query = `
SELECT ?person ?personLabel ?image WHERE {
  VALUES ?personLabel { ${values} }
  ?person rdfs:label ?personLabel;
          wdt:P31 wd:Q5;
          wdt:P18 ?image.
}
`
    const url = `${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`
    const json = await fetchWikidataJson(url, 'Wikidata name portrait chunk')
    if (!json) {
      continue
    }

    for (const item of json.results?.bindings ?? []) {
      const label = cleanText(item.personLabel?.value)
      const imageUrl = buildCommonsThumbnailUrl(cleanText(item.image?.value))
      const personUrl = cleanText(item.person?.value)
      if (!label || !imageUrl) continue

      const key = normalizeName(label)
      if (portraits.has(key)) continue
      portraits.set(key, {
        imageUrl,
        imageSourceUrl: personUrl,
        imageAttribution: 'Wikimedia Commons / Wikidata',
        imageLicense: 'See linked Wikimedia file metadata',
      })
    }

    await sleep(800)
  }

  return portraits
}

async function fetchWikidataJson(url, label, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': 'bundestag-parteien-quiz/0.1 (local educational app)',
      },
    })

    if (response.ok) {
      return response.json()
    }

    if (response.status !== 429 || attempt === retries) {
      console.warn(`${label} skipped: ${response.status} ${response.statusText}`)
      return null
    }

    await sleep(4000 * (attempt + 1))
  }

  return null
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function sparqlString(value, language) {
  const escaped = cleanText(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
  return `"${escaped}"@${language}`
}

function mapMembersToEntries(members, portraitMaps) {
  const entries = []

  for (const member of members) {
    const partyRaw = cleanText(member.BIOGRAFISCHE_ANGABEN?.PARTEI_KURZ)
    if (!partyRaw) continue

    const partyId = normalizeParty(partyRaw)
    const name = getLatestName(member)
    const normalized = normalizeName(name)
    if (!normalized || !partyId) continue

    const portrait =
      portraitMaps.find((map) => map.has(normalized))?.get(normalized) ??
      portraitMaps.find((map) => {
        const tokens = normalized.split(' ')
        const swapped = normalizeName(`${tokens.at(-1)} ${tokens.slice(0, -1).join(' ')}`)
        return map.has(swapped)
      })?.get(
        normalizeName(
          `${normalized.split(' ').at(-1)} ${normalized.split(' ').slice(0, -1).join(' ')}`,
        ),
      )

    if (!portrait) continue

    const terms = asArray(member.WAHLPERIODEN?.WAHLPERIODE)
      .map((period) => Number(period.WP))
      .filter(Number.isFinite)

    entries.push({
      id: cleanText(member.ID),
      name,
      partyId,
      partyRaw,
      imageUrl: portrait.imageUrl,
      imageSourceUrl: portrait.imageSourceUrl,
      imageAttribution: portrait.imageAttribution,
      imageLicense: portrait.imageLicense,
      birthYear: parseYear(member.BIOGRAFISCHE_ANGABEN?.GEBURTSDATUM),
      deathYear: parseYear(member.BIOGRAFISCHE_ANGABEN?.STERBEDATUM),
      terms,
    })
  }

  const seen = new Set()
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false
    seen.add(entry.id)
    return true
  })
}

async function fetchAbgeordnetenwatchCurrentMandates() {
  const parliaments = await fetchJson(
    `${ABGEORDNETENWATCH_API}/parliaments?range_end=${ABGEORDNETENWATCH_RANGE_END}`,
  )
  const currentProjects = (parliaments.data ?? [])
    .map((parliament) => ({
      parliamentLabel: cleanText(parliament.label_external_long || parliament.label),
      periodId: parliament.current_project?.id,
      periodLabel: cleanText(parliament.current_project?.label),
    }))
    .filter((project) => project.periodId && project.parliamentLabel !== 'EU-Parlament')

  const mandates = []
  for (const project of currentProjects) {
    const json = await fetchJson(
      `${ABGEORDNETENWATCH_API}/candidacies-mandates?parliament_period=${project.periodId}&range_start=0&range_end=${ABGEORDNETENWATCH_RANGE_END}`,
    )
    for (const mandate of json.data ?? []) {
      if (mandate.type !== 'mandate' || mandate.end_date) continue
      mandates.push({
        ...mandate,
        parliamentLabel: project.parliamentLabel,
        periodLabel: project.periodLabel || cleanText(mandate.parliament_period?.label),
      })
    }
  }

  return {
    mandates,
    parliamentCount: currentProjects.length,
  }
}

function mapAbgeordnetenwatchMandatesToEntries(mandates, portraits, existingEntries) {
  const existingNames = new Set(existingEntries.map((entry) => normalizeName(entry.name)))
  const entries = []

  for (const mandate of mandates) {
    const name = cleanText(mandate.politician?.label)
    const normalized = normalizeName(name)
    const partyRaw = getMandatePartyLabel(mandate)
    const partyId = normalizeParty(partyRaw)
    const portrait = portraits.get(normalized)

    if (!name || !normalized || !partyRaw || !partyId || !portrait) continue
    if (partyId === 'PARTEILOS' || existingNames.has(normalized)) continue
    if (!partyMeta[partyId] && partyId.length > 14) continue

    entries.push({
      id: `aw-${mandate.id}`,
      name,
      partyId,
      partyRaw,
      imageUrl: portrait.imageUrl,
      imageSourceUrl: portrait.imageSourceUrl,
      imageAttribution: portrait.imageAttribution,
      imageLicense: portrait.imageLicense,
      birthYear: undefined,
      deathYear: undefined,
      terms: [],
      mandateLabel: mandate.periodLabel,
      dataAttribution: 'abgeordnetenwatch',
      dataSourceUrl: mandate.politician?.abgeordnetenwatch_url,
    })
  }

  return dedupeEntries(entries)
}

async function fetchYouthOrganizationCandidates() {
  const candidates = []

  for (const source of youthOrganizationSources) {
    const boardPortraits = await fetchWikidataPortraitsForNames(source.currentBoardNames)
    for (const name of source.currentBoardNames) {
      const portrait = boardPortraits.get(normalizeName(name))
      if (!portrait) continue
      candidates.push({
        source,
        name,
        portrait,
      })
    }

    const wikidataRows = await fetchWikidataYouthOrganizationMembers(source)
    candidates.push(...wikidataRows)
  }

  return candidates
}

async function fetchWikidataYouthOrganizationMembers(source) {
  const parties = source.partyWikidataIds.map((id) => `wd:${id}`).join(' ')
  const query = `
SELECT DISTINCT ?person ?personLabel ?image WHERE {
  VALUES ?party { ${parties} }
  ?person wdt:P463 wd:${source.wikidataId};
          wdt:P102 ?party;
          wdt:P31 wd:Q5;
          wdt:P18 ?image.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
}
LIMIT 180
`
  const url = `${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`
  const json = await fetchWikidataJson(url, `${source.organization} Wikidata members`)
  if (!json) return []

  return (json.results?.bindings ?? [])
    .map((item) => {
      const name = cleanText(item.personLabel?.value)
      const imageUrl = buildCommonsThumbnailUrl(cleanText(item.image?.value))
      const personUrl = cleanText(item.person?.value)
      if (!name || !imageUrl) return null

      return {
        source,
        name,
        portrait: {
          imageUrl,
          imageSourceUrl: personUrl,
          imageAttribution: 'Wikimedia Commons / Wikidata',
          imageLicense: 'See linked Wikimedia file metadata',
        },
      }
    })
    .filter(Boolean)
}

function mapYouthOrganizationCandidatesToEntries(candidates, existingEntries) {
  const existingNames = new Set(existingEntries.map((entry) => normalizeName(entry.name)))
  const entries = []

  for (const candidate of candidates) {
    const name = cleanText(candidate.name)
    const normalized = normalizeName(name)
    const partyId = candidate.source.partyId
    if (!name || !normalized || !partyMeta[partyId] || existingNames.has(normalized)) continue

    existingNames.add(normalized)
    entries.push({
      id: `youth-${candidate.source.id}-${slugifyId(name)}`,
      name,
      partyId,
      partyRaw: candidate.source.partyRaw,
      imageUrl: candidate.portrait.imageUrl,
      imageSourceUrl: candidate.portrait.imageSourceUrl,
      imageAttribution: candidate.portrait.imageAttribution,
      imageLicense: candidate.portrait.imageLicense,
      birthYear: undefined,
      deathYear: undefined,
      terms: [],
      mandateLabel: candidate.source.organization,
      dataAttribution: 'Jugendorganisationen / Wikidata',
      dataSourceUrl: candidate.source.url,
    })
  }

  return dedupeEntries(entries)
}

function slugifyId(value) {
  return normalizeName(value).replace(/\s+/g, '-')
}

function getMandatePartyLabel(mandate) {
  const currentFraction =
    mandate.fraction_membership?.find((membership) => !membership.valid_until) ??
    mandate.fraction_membership?.[0]
  const label = cleanText(currentFraction?.fraction?.label || currentFraction?.label)
  return label
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s+seit\s+\d{2}\.\d{2}\.\d{4}$/g, '')
    .trim()
}

function dedupeEntries(entries) {
  const seen = new Set()
  return entries.filter((entry) => {
    const key = `${normalizeName(entry.name)}:${entry.partyId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function main() {
  const [{ members, snapshot }, bundestagPortraits, wikidataPortraits, awSource] =
    await Promise.all([
      fetchXmlMembers(),
      fetchBundestagPortraits(),
      fetchWikidataPortraits(),
      fetchAbgeordnetenwatchCurrentMandates(),
    ])

  const bundestagEntries = mapMembersToEntries(members, [
    bundestagPortraits,
    wikidataPortraits,
  ])
    .filter((entry) => entry.partyId !== 'PARTEILOS')
    .filter((entry) => partyMeta[entry.partyId] || entry.partyId.length <= 14)

  const awPortraits = await fetchWikidataPortraitsForNames(
    awSource.mandates.map((mandate) => mandate.politician?.label),
  )
  const awEntries = mapAbgeordnetenwatchMandatesToEntries(
    awSource.mandates,
    awPortraits,
    bundestagEntries,
  )
  const youthCandidates = await fetchYouthOrganizationCandidates()
  const youthEntries = mapYouthOrganizationCandidatesToEntries(youthCandidates, [
    ...bundestagEntries,
    ...awEntries,
  ])

  const entries = dedupeEntries([...bundestagEntries, ...awEntries, ...youthEntries])
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  const data = {
    generatedAt: new Date().toISOString(),
    sources: {
      dataProviders: [
        'Deutscher Bundestag',
        'abgeordnetenwatch',
        'Jugendorganisationen',
        'Wikidata/Wikimedia',
      ],
      bundestagStammdatenUrl: BUNDESTAG_XML_ZIP,
      bundestagSnapshot: snapshot,
      currentPortraitEndpoint: BUNDESTAG_PORTRAIT_ENDPOINT,
      abgeordnetenwatchApi: ABGEORDNETENWATCH_API,
      abgeordnetenwatchCurrentParliaments: awSource.parliamentCount,
      abgeordnetenwatchMandatesScanned: awSource.mandates.length,
      abgeordnetenwatchEntriesAdded: awEntries.length,
      youthOrganizations: youthOrganizationSources.map((source) => ({
        label: source.organization,
        url: source.url,
      })),
      youthOrganizationCandidatesScanned: youthCandidates.length,
      youthOrganizationEntriesAdded: youthEntries.length,
      imageFallback: 'Bundestag portraits first; Wikidata/Wikimedia when matched by name',
      skippedEntries:
        members.length + awSource.mandates.length + youthCandidates.length - entries.length,
    },
    parties: buildPartyList(entries),
    entries,
  }

  const outDir = path.join(rootDir, 'src', 'data')
  await mkdir(outDir, { recursive: true })
  await writeFile(
    path.join(outDir, 'politicians.json'),
    `${JSON.stringify(data, null, 2)}\n`,
  )

  console.log(
    `Wrote ${entries.length} entries across ${data.parties.length} parties (${bundestagEntries.length} Bundestag, ${awEntries.length} abgeordnetenwatch additions, ${youthEntries.length} youth organization additions).`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

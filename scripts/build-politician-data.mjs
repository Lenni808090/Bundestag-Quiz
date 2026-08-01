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
  ZENTRUM: {
    label: 'Zentrum',
    fullName: 'Deutsche Zentrumspartei',
    color: '#1f4e79',
    seatOrder: 50,
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

async function main() {
  const [{ members, snapshot }, bundestagPortraits, wikidataPortraits] =
    await Promise.all([
      fetchXmlMembers(),
      fetchBundestagPortraits(),
      fetchWikidataPortraits(),
    ])

  const entries = mapMembersToEntries(members, [bundestagPortraits, wikidataPortraits])
    .filter((entry) => entry.partyId !== 'PARTEILOS')
    .filter((entry) => partyMeta[entry.partyId] || entry.partyId.length <= 14)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  const data = {
    generatedAt: new Date().toISOString(),
    sources: {
      bundestagStammdatenUrl: BUNDESTAG_XML_ZIP,
      bundestagSnapshot: snapshot,
      currentPortraitEndpoint: BUNDESTAG_PORTRAIT_ENDPOINT,
      imageFallback: 'Bundestag portraits first; Wikidata/Wikimedia when matched by name',
      skippedEntries: members.length - entries.length,
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
    `Wrote ${entries.length} entries across ${data.parties.length} parties from ${members.length} Bundestag records.`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

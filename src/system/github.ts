import { useSyncExternalStore } from 'react'

// Public, no-token paths. CORS is wildcard on both.
const USER = 'yishu-ziyu'
const CONTRIB_URL = `https://github-contributions-api.jogruber.de/v4/${USER}?y=last`
const EVENTS_URL = `https://api.github.com/users/${USER}/events/public?per_page=30`
const CACHE_KEY = 'nf-github-cache-v1'
const CACHE_TTL_MS = 10 * 60 * 1000
const DAYS = 7

export type CommitLine = { msg: string; time: string; repo: string }

export type GhData = {
  user: string
  contributions: number[]      // last 52*7 entries, levels 0-4
  weeks: number                // computed = floor(contributions.length / DAYS)
  totalContribs: number
  streakDays: number
  streakSince: string          // 'DD MMM' in en, '6月10日' in zh — formatter is widget-side
  streakSinceMs: number        // raw timestamp so widgets can format per locale
  commits: CommitLine[]
  fetchedAt: number
}

type RawContribDay = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }
type RawContribResp = { total: Record<string, number>; contributions: RawContribDay[] }

type RawPushPayload = { commits?: { message: string; sha: string }[] }
type RawEvent = { type: string; created_at: string; repo: { name: string }; payload: RawPushPayload }

let data: GhData | null = loadCache()
let inflight: Promise<void> | null = null
const listeners = new Set<() => void>()

function loadCache(): GhData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GhData
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS * 6) return null  // 1h hard ceiling
    return parsed
  } catch {
    return null
  }
}

function saveCache(d: GhData) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(d))
  } catch {
    // quota / private mode — silent
  }
}

function emit() {
  listeners.forEach(cb => cb())
}

function computeStreak(days: RawContribDay[]): { count: number; sinceMs: number } {
  if (!days.length) return { count: 0, sinceMs: Date.now() }
  // walk from most-recent backwards; skip today if count=0 (lets early-day visits show yesterday's streak)
  let i = days.length - 1
  if (days[i].count === 0) i--
  let count = 0
  let sinceIdx = i
  for (; i >= 0; i--) {
    if (days[i].count > 0) {
      count++
      sinceIdx = i
    } else break
  }
  const sinceMs = count > 0 ? Date.parse(days[sinceIdx].date + 'T00:00:00') : Date.now()
  return { count, sinceMs }
}

function buildFromRaw(contrib: RawContribResp, events: RawEvent[]): GhData {
  const days = contrib.contributions
  const levels = days.map(d => d.level)
  const totalContribs =
    typeof contrib.total === 'object' && contrib.total !== null
      ? Object.values(contrib.total).reduce((s, v) => s + v, 0)
      : 0
  const { count: streakDays, sinceMs } = computeStreak(days)
  // shape: trim leading partial week so weeks align to DAYS=7 grid
  const trimmedLen = Math.floor(levels.length / DAYS) * DAYS
  const aligned = levels.slice(-trimmedLen)
  const commits: CommitLine[] = []
  for (const ev of events) {
    if (ev.type !== 'PushEvent') continue
    const msgs = ev.payload.commits ?? []
    for (const c of msgs) {
      const firstLine = c.message.split('\n')[0].slice(0, 64)
      commits.push({
        msg: firstLine,
        time: ev.created_at,
        repo: ev.repo.name.split('/').pop() ?? ev.repo.name,
      })
      if (commits.length >= 12) break
    }
    if (commits.length >= 12) break
  }
  return {
    user: USER,
    contributions: aligned,
    weeks: aligned.length / DAYS,
    totalContribs,
    streakDays,
    streakSince: '',  // widgets format from streakSinceMs
    streakSinceMs: sinceMs,
    commits,
    fetchedAt: Date.now(),
  }
}

async function fetchOnce() {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const [contribRes, eventsRes] = await Promise.all([
        fetch(CONTRIB_URL),
        fetch(EVENTS_URL),
      ])
      if (!contribRes.ok) throw new Error(`contrib ${contribRes.status}`)
      const contrib = (await contribRes.json()) as RawContribResp
      // Events may 403 on per-IP rate limit; degrade gracefully (contributions still shown real)
      const events: RawEvent[] = eventsRes.ok ? ((await eventsRes.json()) as RawEvent[]) : []
      const next = buildFromRaw(contrib, events)
      data = next
      saveCache(next)
      emit()
    } catch {
      // network or shape failure — leave data as cached or null; widgets fall back to seeded fakes
    } finally {
      inflight = null
    }
  })()
  return inflight
}

function shouldRefetch(): boolean {
  if (!data) return true
  return Date.now() - data.fetchedAt > CACHE_TTL_MS
}

export const githubStore = {
  get: (): GhData | null => data,
  subscribe: (cb: () => void) => {
    listeners.add(cb)
    if (shouldRefetch() && typeof window !== 'undefined') {
      // fire-and-forget; subscribers re-render via emit()
      void fetchOnce()
    }
    return () => {
      listeners.delete(cb)
    }
  },
}

export function useGitHub(): GhData | null {
  return useSyncExternalStore(githubStore.subscribe, githubStore.get, () => null)
}

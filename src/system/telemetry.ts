export type Snapshot = {
  now: number
  bootAt: number
  fps: number
  frameMs: number
  heapMB: number
  heapLimitMB: number
  heapReal: boolean
  heapSource: 'heap' | 'page'
  domNodes: number
  battery: { level: number; charging: boolean } | null
  batteryReal: boolean
  net: { downlink: number; rtt: number; type: string }
  netReal: boolean
  online: boolean
  velocity: number
  inputRate: number
}

type Drawer = (t: number, dt: number) => void

const bootAt = Date.now()

let snap: Snapshot = {
  now: bootAt,
  bootAt,
  fps: 60,
  frameMs: 16.7,
  heapMB: 384,
  heapLimitMB: 4096,
  heapReal: false,
  heapSource: 'heap',
  domNodes: 0,
  battery: null,
  batteryReal: false,
  net: { downlink: 8.4, rtt: 24, type: 'wifi' },
  netReal: false,
  online: true,
  velocity: 0,
  inputRate: 0,
}

const listeners = new Set<() => void>()
const drawers = new Set<Drawer>()
const events = new Map<string, Set<() => void>>()

let running = false
let raf = 0
let last = 0
let pubAcc = 0
let fpsEma = 60
let vel = 0
let velTarget = 0
let lastMove = 0
let battery: Snapshot['battery'] = null
let batteryReal = false
let autoSweep = true
let sweepTimer = 0
let bucketTimer = 0
const buckets = new Int16Array(60)
let bucketIdx = 0

function notify() {
  for (const fn of listeners) fn()
}

function emit(name: string) {
  events.get(name)?.forEach(fn => fn())
}

function readHeap(): { mb: number; lim: number; real: boolean; source: 'heap' | 'page' } {
  const m = (performance as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
  if (m?.usedJSHeapSize) {
    return { mb: m.usedJSHeapSize / 1048576, lim: m.jsHeapSizeLimit / 1048576, real: true, source: 'heap' }
  }
  // Cross-browser real fallback: page network weight via Resource Timing API.
  let bytes = 0
  for (const r of performance.getEntriesByType('resource') as PerformanceResourceTiming[]) {
    bytes += r.transferSize || r.encodedBodySize || 0
  }
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  if (navEntry) bytes += navEntry.transferSize || navEntry.encodedBodySize || 0
  return { mb: bytes / 1048576, lim: 10, real: true, source: 'page' }
}

let measuredPingMs = 0
let pingInflight = false
let pingTimer = 0

async function measurePing() {
  if (pingInflight) return
  pingInflight = true
  const start = performance.now()
  try {
    await fetch(`/favicon.ico?_t=${Date.now()}`, { cache: 'no-store', method: 'HEAD' })
    measuredPingMs = Math.round(performance.now() - start)
  } catch {
    measuredPingMs = 0
  } finally {
    pingInflight = false
  }
}

function readNet() {
  const c = (navigator as { connection?: { downlink?: number; rtt?: number; effectiveType?: string } }).connection
  if (c && typeof c.downlink === 'number') {
    return { net: { downlink: c.downlink, rtt: c.rtt ?? 25, type: c.effectiveType ?? 'wifi' }, real: true }
  }
  // Cross-browser real fallback: measured RTT to our own origin (ping loop updates measuredPingMs).
  // Downlink is unavailable cross-browser; we surface it as 0 and let the widget hide that field when so.
  return { net: { downlink: 0, rtt: measuredPingMs, type: 'wifi' }, real: true }
}

function publish() {
  const heap = readHeap()
  const { net, real: netReal } = readNet()
  let rate = 0
  for (let i = 0; i < 60; i++) rate += buckets[i]
  snap = {
    now: Date.now(),
    bootAt,
    fps: Math.min(240, Math.round(fpsEma)),
    frameMs: 1000 / Math.max(1, fpsEma),
    heapMB: heap.mb,
    heapLimitMB: heap.lim,
    heapReal: heap.real,
    heapSource: heap.source,
    domNodes: typeof document !== 'undefined' ? document.getElementsByTagName('*').length : 0,
    battery,
    batteryReal,
    net,
    netReal,
    online: navigator.onLine,
    velocity: vel,
    inputRate: rate,
  }
  notify()
}

function frame(t: number) {
  raf = requestAnimationFrame(frame)
  const dt = Math.min(0.1, (t - last) / 1000)
  last = t
  if (dt > 0) fpsEma += (1 / Math.max(dt, 1e-4) - fpsEma) * 0.06
  vel += (velTarget - vel) * Math.min(1, dt * 9)
  velTarget *= Math.max(0, 1 - dt * 3.2)
  for (const d of drawers) d(t / 1000, dt)
  pubAcc += dt
  if (pubAcc >= 0.5) {
    pubAcc = 0
    publish()
  }
}

let distAcc = 0

function onPointerMove(e: PointerEvent) {
  const t = performance.now()
  const dt = (t - lastMove) / 1000
  lastMove = t
  const d = Math.hypot(e.movementX, e.movementY)
  if (dt > 0 && dt < 0.2) {
    velTarget = Math.min(4000, d / dt)
  }
  distAcc += d
  while (distAcc >= 240) {
    buckets[bucketIdx]++
    distAcc -= 240
  }
}

function onInput() {
  buckets[bucketIdx]++
}

function onVisibility() {
  if (document.hidden) {
    cancelAnimationFrame(raf)
  } else {
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }
}

function startSweep() {
  clearInterval(sweepTimer)
  if (autoSweep) {
    sweepTimer = window.setInterval(() => {
      if (!document.hidden) emit('sync')
    }, 45000)
  }
}

export const bus = {
  get: () => snap,
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => void listeners.delete(fn)
  },
  draw(fn: Drawer) {
    drawers.add(fn)
    return () => void drawers.delete(fn)
  },
  on(name: 'sync' | 'reroll', fn: () => void) {
    if (!events.has(name)) events.set(name, new Set())
    events.get(name)!.add(fn)
    return () => void events.get(name)!.delete(fn)
  },
  sync: () => emit('sync'),
  reroll: () => emit('reroll'),
  setAutoSweep(v: boolean) {
    autoSweep = v
    startSweep()
    if (v) emit('sync')
  },
  start() {
    if (running) return
    running = true
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onInput, { passive: true })
    window.addEventListener('keydown', onInput)
    window.addEventListener('wheel', onInput, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    bucketTimer = window.setInterval(() => {
      bucketIdx = (bucketIdx + 1) % 60
      buckets[bucketIdx] = 0
    }, 1000)
    startSweep()
    // Real RTT loop only fires when Network Info API is missing; otherwise navigator.connection.rtt is fresher.
    const hasNetApi = !!(navigator as { connection?: { downlink?: number } }).connection?.downlink
    if (!hasNetApi) {
      void measurePing()
      pingTimer = window.setInterval(() => {
        if (!document.hidden) void measurePing()
      }, 3000)
    }
    const getBattery = (navigator as { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (n: string, f: () => void) => void }> }).getBattery
    getBattery?.call(navigator).then(b => {
      const update = () => {
        battery = { level: b.level, charging: b.charging }
        batteryReal = true
      }
      update()
      b.addEventListener('levelchange', update)
      b.addEventListener('chargingchange', update)
    }).catch(() => {})
    if (!getBattery) {
      battery = { level: 0.87, charging: false }
      batteryReal = false
    }
    last = performance.now()
    raf = requestAnimationFrame(frame)
    publish()
  },
  stop() {
    if (!running) return
    running = false
    cancelAnimationFrame(raf)
    clearInterval(bucketTimer)
    clearInterval(sweepTimer)
    clearInterval(pingTimer)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerdown', onInput)
    window.removeEventListener('keydown', onInput)
    window.removeEventListener('wheel', onInput)
    document.removeEventListener('visibilitychange', onVisibility)
  },
}

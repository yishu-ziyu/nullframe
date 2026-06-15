import { useSyncExternalStore } from 'react'

export type Lang = 'en' | 'zh'

type Dict = Record<string, string>

const EN: Dict = {
  'card.clock': 'Local time · New York',
  'card.render': 'Render',
  'card.memory': 'Memory',
  'card.glyph': 'Glyph · G1',
  'card.battery': 'Battery',
  'card.network': 'Network',
  'card.contributions': 'Contributions',
  'card.streak': 'Streak',
  'card.seismo': 'Input seismograph · CH 01',
  'card.activity': 'Activity',

  'tag.live': 'LIVE',
  'tag.sim': 'SIM',
  'tag.rec': 'REC',

  'glyph.sync': 'Sync',
  'render.bus': 'RAF · Composite',
  'render.unit.ms': 'MS',
  'memory.heap': 'heap',
  'battery.charging': 'ON AC POWER · CHARGING',
  'battery.discharging': 'ON CELL · DISCHARGING',
  'network.rtt': 'RTT',
  'network.online': 'ONLINE',
  'network.offline': 'OFFLINE',
  'seismo.unit': 'EVT/MIN · pointer + keys',
  'streak.unit.day': 'D',
  'streak.since': 'Since',
  'streak.best': 'best 63',
  'contrib.weeks': 'weeks',
  'contrib.best': 'Best 23 / day',
  'contrib.year': '/ YR',
  'activity.right': 'push · main',

  'hero.uptime': 'Uptime',
  'hero.week': 'WEEK',

  'cmd.placeholder': 'RUN COMMAND…',
  'cmd.nomatch': 'NO MATCH',
  'cmd.focus.on': 'Focus mode · on',
  'cmd.focus.off': 'Focus mode · off',
  'cmd.sync': 'Trigger sync sweep',
  'cmd.reroll': 'Reroll clock',
  'cmd.motion.on': 'Motion FX · on',
  'cmd.motion.off': 'Motion FX · off',
  'cmd.autosweep.on': 'Auto sweep · on',
  'cmd.autosweep.off': 'Auto sweep · off',

  'lang.en': 'EN',
  'lang.zh': '中',
}

const ZH: Dict = {
  'card.clock': '本地时间 · 北京',
  'card.render': '渲染',
  'card.memory': '内存',
  'card.glyph': '字符阵 · G1',
  'card.battery': '电池',
  'card.network': '网络',
  'card.contributions': '贡献',
  'card.streak': '连续',
  'card.seismo': '输入地震图 · 通道 01',
  'card.activity': '活动',

  'tag.live': '实时',
  'tag.sim': '模拟',
  'tag.rec': '录制',

  'glyph.sync': '同步',
  'render.bus': 'RAF · 合成',
  'render.unit.ms': '毫秒',
  'memory.heap': '堆占用',
  'battery.charging': '交流供电 · 充电中',
  'battery.discharging': '电池供电 · 放电中',
  'network.rtt': 'RTT',
  'network.online': '在线',
  'network.offline': '离线',
  'seismo.unit': '事件/分钟 · 指针 + 键盘',
  'streak.unit.day': '天',
  'streak.since': '起始',
  'streak.best': '最长 63',
  'contrib.weeks': '周',
  'contrib.best': '单日峰值 23',
  'contrib.year': '/ 年',
  'activity.right': '推送 · main',

  'hero.uptime': '运行',
  'hero.week': '第',

  'cmd.placeholder': '输入命令…',
  'cmd.nomatch': '无匹配',
  'cmd.focus.on': '专注模式 · 开',
  'cmd.focus.off': '专注模式 · 关',
  'cmd.sync': '触发同步扫描',
  'cmd.reroll': '时钟回滚',
  'cmd.motion.on': '动效 · 开',
  'cmd.motion.off': '动效 · 关',
  'cmd.autosweep.on': '自动扫描 · 开',
  'cmd.autosweep.off': '自动扫描 · 关',

  'lang.en': 'EN',
  'lang.zh': '中',
}

const DICT: Record<Lang, Dict> = { en: EN, zh: ZH }

const STATUS: Record<Lang, string[]> = {
  en: [
    'SYS NOMINAL · ALL CHANNELS GREEN',
    'LAST PUSH main ← feat/glyph-grid',
    'CI GREEN · 247 TESTS PASSED · 0 FLAKY',
    'GLYPH INTERFACE SYNCED · READY',
    'ZERO DROPPED FRAMES · COMPOSITE OK',
  ],
  zh: [
    '系统正常 · 全通道绿灯',
    '最近推送 main ← feat/glyph-grid',
    'CI 通过 · 247 个测试全绿 · 0 个不稳定',
    '字符阵接口已同步 · 就绪',
    '零丢帧 · 合成正常',
  ],
}

const STORAGE_KEY = 'nf-lang'

function detectInitial(): Lang {
  if (typeof window === 'undefined') return 'en'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'en' || saved === 'zh') return saved
  const nav = window.navigator.language?.toLowerCase() ?? ''
  return nav.startsWith('zh') ? 'zh' : 'en'
}

let current: Lang = detectInitial()
const listeners = new Set<() => void>()

if (typeof document !== 'undefined') {
  document.documentElement.lang = current === 'zh' ? 'zh-CN' : 'en'
}

export const langStore = {
  get: (): Lang => current,
  subscribe: (cb: () => void) => {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  set: (next: Lang) => {
    if (current === next) return
    current = next
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore quota / private-mode errors
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en'
    }
    listeners.forEach(cb => cb())
  },
}

export function useLang(): Lang {
  return useSyncExternalStore(langStore.subscribe, langStore.get, langStore.get)
}

export function useT(): (key: string) => string {
  const lang = useLang()
  return (key: string) => DICT[lang][key] ?? key
}

export function statusMessagesFor(lang: Lang): string[] {
  return STATUS[lang]
}

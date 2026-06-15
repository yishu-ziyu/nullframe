import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Card } from '../Card'
import { useBootNumber, useCtl } from '../../system/hooks'
import { streakDays as fakeStreak, streakSince as fakeSince } from '../../system/fake'
import { useGitHub } from '../../system/github'
import { useLang, useT } from '../../system/i18n'

const EN_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function formatSince(ms: number, lang: 'en' | 'zh'): string {
  const d = new Date(ms)
  if (lang === 'zh') return `${d.getMonth() + 1}月${d.getDate()}日`
  return `${String(d.getDate()).padStart(2, '0')} ${EN_MONTHS[d.getMonth()]}`
}

export function StreakCard({ index }: { index: number }) {
  const ctl = useCtl()
  const gh = useGitHub()
  const lang = useLang()
  const t = useT()
  const motionOff = (useReducedMotion() ?? false) || ctl.motionOff

  const streakDays = gh?.streakDays ?? fakeStreak
  const sinceLabel = useMemo(
    () => (gh ? formatSince(gh.streakSinceMs, lang) : fakeSince),
    [gh, lang],
  )
  const shown = useBootNumber(streakDays)
  const [scramble, setScramble] = useState<string | null>(null)

  useEffect(() => {
    if (motionOff) return
    let iv = 0
    let n = 0
    const auto = window.setInterval(() => {
      if (document.hidden) return
      n = 0
      clearInterval(iv)
      iv = window.setInterval(() => {
        setScramble(`${((Math.random() * 9) | 0) + 1}${(Math.random() * 10) | 0}`)
        if (++n > 5) {
          clearInterval(iv)
          setScramble(null)
        }
      }, 45)
    }, 12000)
    return () => {
      clearInterval(auto)
      clearInterval(iv)
    }
  }, [motionOff])

  return (
    <Card index={index} label={t('card.streak')} tag={gh ? t('tag.live') : t('tag.sim')} tagAlways>
      <div className="doto-val">
        {scramble ?? shown}
        <small>{t('streak.unit.day')}</small>
      </div>
      <div className="streakbar">
        {Array.from({ length: 7 }, (_, i) => (
          <i key={i} style={{ animationDelay: `${0.6 + i * 0.05}s, ${0.8 + i * 0.3}s` }} />
        ))}
      </div>
      <div className="mono-sub" style={{ marginTop: 12 }}>
        {t('streak.since')} {sinceLabel} · {t('streak.best')}
      </div>
    </Card>
  )
}

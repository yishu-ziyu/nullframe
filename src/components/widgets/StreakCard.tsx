import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Card } from '../Card'
import { useBootNumber, useCtl } from '../../system/hooks'
import { streakDays, streakSince } from '../../system/fake'
import { useT } from '../../system/i18n'

export function StreakCard({ index }: { index: number }) {
  const ctl = useCtl()
  const t = useT()
  const motionOff = (useReducedMotion() ?? false) || ctl.motionOff
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
    <Card index={index} label={t('card.streak')} tag={t('tag.sim')} tagAlways>
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
        {t('streak.since')} {streakSince} · {t('streak.best')}
      </div>
    </Card>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Card } from '../Card'
import { commitMessages as fakeMsgs, USER } from '../../system/fake'
import { useGitHub } from '../../system/github'
import { useT } from '../../system/i18n'

type Line = { msg: string; time: string }

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
const stampFromIso = (iso: string) => {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function ActivityCard({ index }: { index: number }) {
  const [lines, setLines] = useState<Line[]>([])
  const [typing, setTyping] = useState('')
  const gh = useGitHub()
  const t = useT()

  // Source order: real commits when available (with real timestamps), else fake msgs (stamped at type-time).
  const queue = useMemo<Line[]>(() => {
    if (gh && gh.commits.length > 0) {
      return gh.commits.map(c => ({ msg: c.msg, time: stampFromIso(c.time) }))
    }
    return fakeMsgs.map(msg => ({ msg, time: '' }))
  }, [gh])

  useEffect(() => {
    let alive = true
    let t = 0
    let idx = 0
    const push = () => {
      if (!alive) return
      if (document.hidden) {
        t = window.setTimeout(push, 7000)
        return
      }
      const entry = queue[idx % queue.length]
      idx++
      const msg = entry.msg
      const time = entry.time || stamp()
      let i = 0
      const type = () => {
        if (!alive) return
        i++
        setTyping(msg.slice(0, i))
        if (i < msg.length) {
          t = window.setTimeout(type, 18)
        } else {
          setLines(ls => [{ msg, time }, ...ls].slice(0, 3))
          setTyping('')
          t = window.setTimeout(push, 6500)
        }
      }
      type()
    }
    t = window.setTimeout(push, 1200)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [queue])

  return (
    <Card index={index} label={`${t('card.activity')} · ${USER}`} right={t('activity.right')} className="feed" tag={gh ? t('tag.live') : t('tag.sim')} tagAlways>
      <div className="feed-rows">
        {typing && (
          <div className="feed-row">
            <span>{typing}<span className="sq" /></span>
            <span className="dim">{stamp()}</span>
          </div>
        )}
        {lines.map((l, i) => (
          <motion.div
            key={l.time + l.msg}
            className="feed-row"
            style={{ opacity: 1 - i * 0.3 }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1 - i * 0.3, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <span>{l.msg}</span>
            <span className="dim">{l.time}</span>
          </motion.div>
        ))}
      </div>
    </Card>
  )
}

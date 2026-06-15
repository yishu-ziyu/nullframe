import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { motion } from 'motion/react'
import { bus } from '../system/telemetry'
import { useCtl } from '../system/hooks'
import { useT } from '../system/i18n'

export function CommandPalette() {
  const ctl = useCtl()
  const t = useT()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const cmds = useMemo(
    () => [
      { label: ctl.focus ? t('cmd.focus.off') : t('cmd.focus.on'), run: () => ctl.setFocus(!ctl.focus) },
      { label: t('cmd.sync'), run: () => bus.sync() },
      { label: t('cmd.reroll'), run: () => bus.reroll() },
      { label: ctl.motionOff ? t('cmd.motion.on') : t('cmd.motion.off'), run: () => ctl.setMotionOff(!ctl.motionOff) },
      { label: ctl.autoSweep ? t('cmd.autosweep.off') : t('cmd.autosweep.on'), run: () => ctl.setAutoSweep(!ctl.autoSweep) },
    ],
    [ctl, t],
  )
  const list = cmds.filter(c => c.label.toLowerCase().includes(q.toLowerCase()))

  useEffect(() => inputRef.current?.focus(), [])
  useEffect(() => setSel(0), [q])

  const close = () => ctl.setPaletteOpen(false)

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel(s => Math.min(list.length - 1, s + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel(s => Math.max(0, s - 1))
    } else if (e.key === 'Enter' && list[sel]) {
      list[sel].run()
      close()
    }
  }

  return (
    <motion.div
      className="pal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={close}
    >
      <motion.div
        className="pal"
        initial={{ opacity: 0, y: -14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        onClick={e => e.stopPropagation()}
        onKeyDown={onKey}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={t('cmd.placeholder')}
          spellCheck={false}
        />
        {list.length === 0 && <div className="pal-empty">{t('cmd.nomatch')}</div>}
        {list.map((c, i) => (
          <div
            key={c.label}
            className={`pal-row ${i === sel ? 'sel' : ''}`}
            onMouseEnter={() => setSel(i)}
            onClick={() => {
              c.run()
              close()
            }}
          >
            <span>{c.label}</span>
            <span className="dim">↵</span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}

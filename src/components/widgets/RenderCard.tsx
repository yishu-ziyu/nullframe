import { Card } from '../Card'
import { useTelemetry, useBootNumber } from '../../system/hooks'
import { useT } from '../../system/i18n'

const RING_R = 50
const RING_C = 2 * Math.PI * RING_R

export function RenderCard({ index }: { index: number }) {
  const snap = useTelemetry()
  const t = useT()
  const shown = useBootNumber(snap.fps)
  const pct = Math.min(1, snap.fps / 60)

  return (
    <Card index={index} label={t('card.render')} tag={t('tag.live')} tagAlways>
      <div className="ring-wrap">
        <svg viewBox="0 0 110 110">
          <circle className="ring-bg" cx="55" cy="55" r={RING_R} />
          <circle
            className="ring-fg"
            cx="55"
            cy="55"
            r={RING_R}
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - pct)}
          />
        </svg>
        <div className="ring-val">
          {shown}
          <small>FPS</small>
        </div>
      </div>
      <div className="meta-row" style={{ marginTop: 'auto' }}>
        <span>{t('render.bus')}</span>
        <span>{snap.frameMs.toFixed(1)} {t('render.unit.ms')}</span>
      </div>
    </Card>
  )
}

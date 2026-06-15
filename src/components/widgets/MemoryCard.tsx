import { Card } from '../Card'
import { Segbar } from '../Segbar'
import { useTelemetry, useBootNumber } from '../../system/hooks'
import { useT } from '../../system/i18n'

export function NodesCard({ index }: { index: number }) {
  const snap = useTelemetry()
  const t = useT()
  // domNodes is always real; scale segbar to a sensible max (5k nodes).
  const pct = Math.min(99, Math.round((snap.domNodes / 5000) * 100))
  const shown = useBootNumber(snap.domNodes)

  return (
    <Card index={index} label={t('card.nodes')} tag={t('tag.live')} tagAlways>
      <div className="metric">
        {shown}
        <small>{t('memory.nodes')}</small>
      </div>
      <div className="mono-sub">
        {snap.heapMB.toFixed(1)} MB · {snap.deviceCores || '?'} {t('render.bus').split('·')[0].trim()} cores
      </div>
      <Segbar total={20} on={Math.max(1, Math.round((pct / 100) * 20))} baseDelay={0.42} />
    </Card>
  )
}

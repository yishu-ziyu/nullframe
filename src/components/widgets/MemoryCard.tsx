import { Card } from '../Card'
import { Segbar } from '../Segbar'
import { useTelemetry, useBootNumber } from '../../system/hooks'
import { useT } from '../../system/i18n'

export function MemoryCard({ index }: { index: number }) {
  const snap = useTelemetry()
  const t = useT()
  const pct = Math.min(99, Math.round((snap.heapMB / snap.heapLimitMB) * 100))
  const shown = useBootNumber(snap.heapMB)

  return (
    <Card index={index} label={t('card.memory')} tag={snap.heapReal ? t('tag.live') : t('tag.sim')} tagAlways>
      <div className="metric">
        {shown}
        <small>MB</small>
      </div>
      <div className="mono-sub">/ {(snap.heapLimitMB / 1024).toFixed(1)} GB · {pct}% {t('memory.heap')}</div>
      <Segbar total={20} on={Math.max(1, Math.round((pct / 100) * 20))} baseDelay={0.42} />
    </Card>
  )
}

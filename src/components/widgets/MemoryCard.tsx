import { Card } from '../Card'
import { Segbar } from '../Segbar'
import { useTelemetry, useBootNumber } from '../../system/hooks'
import { useT } from '../../system/i18n'

export function MemoryCard({ index }: { index: number }) {
  const snap = useTelemetry()
  const t = useT()
  const heapMode = snap.heapSource === 'heap'
  // heap mode: % of JS heap limit. page mode: % of a 10 MB target so the segbar stays meaningful.
  const pct = heapMode
    ? Math.min(99, Math.round((snap.heapMB / snap.heapLimitMB) * 100))
    : Math.min(99, Math.round((snap.heapMB / 10) * 100))
  const shown = useBootNumber(snap.heapMB, heapMode ? 0 : 2)

  return (
    <Card index={index} label={t('card.memory')} tag={t('tag.live')} tagAlways>
      <div className="metric">
        {shown}
        <small>MB</small>
      </div>
      <div className="mono-sub">
        {heapMode
          ? `/ ${(snap.heapLimitMB / 1024).toFixed(1)} GB · ${pct}% ${t('memory.heap')}`
          : `${snap.domNodes} ${t('memory.nodes')} · ${t('memory.page')}`}
      </div>
      <Segbar total={20} on={Math.max(1, Math.round((pct / 100) * 20))} baseDelay={0.42} />
    </Card>
  )
}

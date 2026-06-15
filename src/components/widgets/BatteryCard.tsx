import { Card } from '../Card'
import { Segbar } from '../Segbar'
import { useTelemetry, useBootNumber } from '../../system/hooks'
import { useT } from '../../system/i18n'

export function DeviceCard({ index }: { index: number }) {
  const snap = useTelemetry()
  const t = useT()
  const cores = snap.deviceCores || 0
  const shown = useBootNumber(cores)

  return (
    <Card index={index} label={t('card.device')} tag={t('tag.live')} tagAlways>
      <div className="metric">
        {shown}
        <small>cores</small>
      </div>
      <div className="mono-sub">
        DPR {typeof window !== 'undefined' ? window.devicePixelRatio : '?'} · {snap.screenW}×{snap.screenH}
      </div>
      <Segbar total={24} on={Math.max(1, Math.round((Math.min(cores, 24) / 24) * 24))} color="green" baseDelay={0.56} />
    </Card>
  )
}

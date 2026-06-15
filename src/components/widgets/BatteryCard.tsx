import { Card } from '../Card'
import { Segbar } from '../Segbar'
import { useTelemetry, useBootNumber } from '../../system/hooks'
import { useLang, useT } from '../../system/i18n'

const pad = (n: number) => String(n).padStart(2, '0')

function bootStamp(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function BatteryCard({ index }: { index: number }) {
  const snap = useTelemetry()
  const lang = useLang()
  const t = useT()
  const hasBattery = snap.batteryReal && !!snap.battery
  const pct = hasBattery ? Math.round((snap.battery!.level) * 100) : 0
  // Single boot-number animation drives the visible big number in either mode (pct or hours-as-integer).
  const upMs = snap.now - snap.bootAt
  const upSec = Math.floor(upMs / 1000)
  const hh = Math.floor(upSec / 3600)
  const mm = Math.floor((upSec % 3600) / 60)
  const animated = useBootNumber(hasBattery ? pct : hh)

  if (hasBattery) {
    return (
      <Card index={index} label={t('card.battery')} tag={t('tag.live')} tagAlways>
        <div className="doto-val">
          {animated}
          <small>%</small>
        </div>
        <Segbar total={24} on={Math.round((pct / 100) * 24)} color="green" baseDelay={0.56} />
        <div className="mono-sub" style={{ marginTop: 12 }}>
          {snap.battery!.charging ? t('battery.charging') : t('battery.discharging')}
        </div>
      </Card>
    )
  }

  // Fallback: session uptime — always real. Big number = HH:MM, segbar = fraction of an 8-hour session.
  const sessionPct = Math.min(100, Math.round((upMs / (8 * 3600 * 1000)) * 100))
  const segOn = Math.max(1, Math.round((sessionPct / 100) * 24))
  const hourUnit = lang === 'zh' ? '时' : 'H'

  return (
    <Card index={index} label={t('card.session')} tag={t('tag.live')} tagAlways>
      <div className="doto-val">
        {pad(hh)}:{pad(mm)}
        <small>{hourUnit}</small>
      </div>
      <Segbar total={24} on={segOn} color="green" baseDelay={0.56} />
      <div className="mono-sub" style={{ marginTop: 12 }}>
        {t('session.boot')} {bootStamp(snap.bootAt)} · {t('session.unit')}
      </div>
    </Card>
  )
}

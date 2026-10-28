import { POINT } from '../lib/config'
import type { Alert, Links } from '../lib/types'

const AlertIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3 2.5 20h19L12 3Z" />
    <path d="M12 10v4.5" />
    <path d="M12 17.5h.01" />
  </svg>
)

const LEVEL: Record<string, string> = { Extreme: ' severe', Severe: ' severe', Moderate: ' moderate' }

/** NWS watches, warnings and advisories for the venue. */
export const Alerts = ({ alerts, links }: { alerts: Alert[]; links?: Links }) => {
  const more =
    links?.zone && links.county
      ? `https://forecast.weather.gov/showsigwx.php?warnzone=${encodeURIComponent(links.zone)}&warncounty=${encodeURIComponent(links.county)}`
      : `https://forecast.weather.gov/MapClick.php?lat=${POINT.lat}&lon=${POINT.lon}`
  return (
    <div id="alerts" className="alerts" role="status" hidden={!alerts.length}>
      {alerts.map((a) => (
        <div key={`${a.event}|${a.ends}`} className={`alert${LEVEL[a.severity] ?? ''}`}>
          <AlertIcon />
          <div>
            <p className="alert-h">{a.event}</p>
            {a.headline && <p>{a.headline}</p>}
            <a href={more} target="_blank" rel="noopener">
              Read the full alert from the NWS
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Preview mode, fetch errors and the "still showing the last good update" line. */
export const Notice = ({ lines }: { lines: string[] }) => (
  <div id="notice" className="notice" role="status" hidden={!lines.length}>
    {lines.map((line) => (
      <p key={line}>{line}</p>
    ))}
  </div>
)

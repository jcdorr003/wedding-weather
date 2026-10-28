import type { ReactNode } from 'react'
import { POINT } from '../lib/config'
import type { Grid } from '../lib/types'

/** Day cards, plus the explainer under them whenever a card is an early model read. */
export const DaysSection = ({ earlyNote, children }: { earlyNote: boolean | 'predicted'; children: ReactNode }) => (
  <section aria-labelledby="days-h">
    <h2 id="days-h" className="section-h">
      Day by day
    </h2>
    <div className="days" id="days">
      {children}
    </div>
    <p
      className={earlyNote === 'predicted' ? 'early-note predicted' : 'early-note'}
      id="early-note"
      hidden={!earlyNote}
    >
      Early model reads come from the US (GFS) and European (ECMWF) ensemble forecasts via Open-Meteo, not from the
      National Weather Service. Each model is run dozens of times with small tweaks, and the bars show how many of those
      runs produce at least 0.04 inches of rain during the day. More than a week out, storm timing still shifts from run
      to run, so expect these to move until the official forecast takes over. NWS forecasters explain how they read the
      models in their{' '}
      <a
        href="https://forecast.weather.gov/product.php?site=OKX&issuedby=OKX&product=AFD"
        target="_blank"
        rel="noopener"
      >
        forecast discussion
      </a>
      .
    </p>
  </section>
)

const radarUrl = (station: string | null | undefined) =>
  station
    ? `https://radar.weather.gov/station/${encodeURIComponent(station.toLowerCase())}/standard`
    : 'https://radar.weather.gov/'

export const TimelineSection = ({ radar, children }: { radar?: string | null; children: ReactNode }) => (
  <section aria-labelledby="tl-h">
    <h2 id="tl-h" className="section-h">
      Hourly Rain Timeline
    </h2>
    <p className="section-sub">
      Chance of rain for each hour, midnight to midnight. Tap or hover a bar for details. The dashed line is 20%, where
      the NWS starts calling it a “slight chance.” For what’s falling right now, open the{' '}
      <a id="radar-link" href={radarUrl(radar)} target="_blank" rel="noopener">
        live NWS radar
      </a>
      .
    </p>
    {children}
  </section>
)

export const Footer = ({ grid }: { grid?: Grid | null }) => (
  <footer id="footer">
    {grid ? (
      <>
        Forecast from the{' '}
        <a
          href={`https://forecast.weather.gov/MapClick.php?lat=${POINT.lat}&lon=${POINT.lon}`}
          target="_blank"
          rel="noopener"
        >
          National Weather Service
        </a>
        , {grid.office} grid {grid.x},{grid.y} (40.665° N, 73.971° W).
      </>
    ) : (
      'Forecast from the National Weather Service (api.weather.gov) for 40.665° N, 73.971° W.'
    )}
  </footer>
)

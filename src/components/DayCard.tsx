import { type DayCard as Card, type EarlyRead, type Parts, noDataText, pct } from '../lib/forecast'
import { fmtInches } from '../lib/forecast'
import { shortDate, weekday } from '../lib/time'

export function CardHead({ day }: { day: string }) {
  return (
    <div className="card-head">
      <h3>{weekday(day)}</h3>
      <span className="date">{shortDate(day)}</span>
    </div>
  )
}

export function DayCard({ day, card, loadFailed }: { day: string; card: Card; loadFailed: boolean }) {
  return (
    <article className="card day">
      <CardHead day={day} />
      <DayBody card={card} loadFailed={loadFailed} />
    </article>
  )
}

// Everything under the card head. The loading skeleton renders it with sample values.
export function DayBody({ card, loadFailed }: { card: Card; loadFailed: boolean }) {
  if (card.kind !== 'full') {
    return (
      <div className="day-body">
        {card.kind === 'early' && <Early read={card.read} />}
        {card.kind === 'passed' && <p className="pending">This day has passed.</p>}
        {card.kind === 'pending' && (
          <>
            <p className="pending-h">Not in the forecast yet</p>
            <p className="pending">
              The NWS 7-day forecast currently runs through {card.dailyEnd}. {card.when}.
            </p>
          </>
        )}
        {card.kind === 'nodata' && <p className="pending">{noDataText(loadFailed)}</p>}
      </div>
    )
  }
  return (
    <>
      <div className="temp">
        <span className="hi">{card.hi}</span>
        <span className="lo">{card.lo}</span>
      </div>
      <p className="cond">{card.sky}</p>
      <dl className="stats">
        <div>
          <dt>Rain chance</dt>
          <dd>{card.rain}</dd>
          {card.rainNight && <dd className="sub">{card.rainNight}</dd>}
        </div>
        <div>
          <dt>Wind</dt>
          <dd>{card.wind}</dd>
          {card.windSub && <dd className="sub">{card.windSub}</dd>}
        </div>
      </dl>
      <div className="day-text">
        {card.detail && <p className="detail">{card.detail}</p>}
        {card.thunder && <p className="detail">{card.thunder}</p>}
      </div>
      {card.parts && <PartsOfDay parts={card.parts} />}
      {card.night && (
        <p className="night">
          <b>Night</b> {card.night.sky}, low {card.night.temp}°, wind {card.night.wind}
        </p>
      )}
    </>
  )
}

function PartsOfDay({ parts }: { parts: Parts }) {
  return (
    <div className="parts-wrap">
      <div className="parts-h">
        <span>Rain by time of day</span>
        <span>{parts.total && `${parts.total} expected${parts.totalFromNow ? ' from now' : ''}`}</span>
      </div>
      <div className="parts" role="list">
        {parts.blocks.map((x) => (
          <div key={x.name} className={x.past ? 'part past' : 'part'} role="listitem">
            <span className="part-name">{x.name}</span>
            <span className="part-range">{x.range}</span>
            <span className="part-pop">{x.past || x.chance == null ? '—' : pct(x.chance)}</span>
            <span className="part-amt">{x.past ? 'Passed' : x.amount == null ? '—' : fmtInches(x.amount)}</span>
          </div>
        ))}
      </div>
      {parts.note && <p className="parts-note">{parts.note}</p>}
    </div>
  )
}

function Early({ read }: { read: EarlyRead }) {
  return (
    <>
      <p className="early-tag">Early model read</p>
      <p className="early-h">{read.head}</p>
      <p className="early-sub">{read.sub}</p>
      <div className="runs">
        {read.runs.map((r) => (
          <div key={r.name} className="run">
            <span className="run-name">{r.name}</span>
            <span className="run-bar" aria-hidden="true">
              <i style={{ width: `${r.share}%` }} />
            </span>
            <span className="run-n">
              {r.wet} of {r.total} runs
            </span>
          </div>
        ))}
      </div>
      <p className="pending">{read.pending}</p>
    </>
  )
}

import type { DayCard as Card } from '../lib/forecast/day'
import { noDataText } from '../lib/forecast/header'
import { shortDate, weekday } from '../lib/time'
import { EarlyRead } from './EarlyRead'
import { PartsOfDay } from './PartsOfDay'

export const CardHead = ({ day }: { day: string }) => (
  <div className="card-head">
    <h3>{weekday(day)}</h3>
    <span className="date">{shortDate(day)}</span>
  </div>
)

export const DayCard = ({ day, card, loadFailed }: { day: string; card: Card; loadFailed: boolean }) => (
  <article className="card day">
    <CardHead day={day} />
    <DayBody card={card} loadFailed={loadFailed} />
  </article>
)

/** Everything under the card head. The loading skeleton renders it with sample values. */
export const DayBody = ({ card, loadFailed }: { card: Card; loadFailed: boolean }) => {
  if (card.kind !== 'full') {
    return (
      <div className="day-body">
        {card.kind === 'early' && <EarlyRead read={card.read} />}
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
  // Direct children of the card on purpose: on wide screens each one sits in a shared subgrid row.
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

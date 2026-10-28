import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { THRESHOLD } from '../lib/config'
import { fmtStamp, hoursFor, noDataText, pastBefore, pct, pendingWhen, verdict } from '../lib/forecast'
import type { Forecast } from '../lib/nws'
import { hourLabel, weekday } from '../lib/time'
import { CardHead } from './DayCard'

type Tip = { day: string; hour: number; col: HTMLElement; data: Forecast | null }

const colOf = (e: { target: EventTarget }) => (e.target as Element).closest<HTMLElement>('.col')

export function Timelines({
  days,
  data,
  loadFailed,
}: {
  days: readonly string[]
  data: Forecast | null
  loadFailed: boolean
}) {
  const [shown, setTip] = useState<Tip | null>(null)
  // New data re-renders the bars, so a tooltip from before it no longer applies.
  const tip = shown?.data === data ? shown : null
  const show = (col: HTMLElement) => setTip({ day: col.dataset.day ?? '', hour: Number(col.dataset.h), col, data })
  const hide = () => setTip(null)

  useEffect(() => {
    const hide = () => setTip(null)
    const onDocClick = (e: globalThis.MouseEvent) => {
      if (!(e.target as Element).closest('.col')) hide()
    }
    document.addEventListener('click', onDocClick)
    window.addEventListener('scroll', hide, { passive: true })
    window.addEventListener('resize', hide)
    return () => {
      document.removeEventListener('click', onDocClick)
      window.removeEventListener('scroll', hide)
      window.removeEventListener('resize', hide)
    }
  }, [])

  return (
    <>
      {/* Bars are focusable themselves (focus shows the tooltip); this wrapper only delegates their events. */}
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="timelines"
        id="timelines"
        onPointerOver={(e: ReactPointerEvent) => {
          const col = colOf(e)
          if (col && e.pointerType === 'mouse') show(col)
        }}
        onPointerOut={(e: ReactPointerEvent) => {
          if (e.pointerType !== 'mouse') return
          const col = colOf(e)
          if (col && !col.contains(e.relatedTarget as Node | null)) hide()
        }}
        onClick={(e: MouseEvent) => {
          const col = colOf(e)
          if (!col) return
          const pointerType = (e.nativeEvent as PointerEvent).pointerType
          if (tip?.col === col && pointerType !== 'mouse') hide()
          else show(col)
        }}
        onFocus={(e) => {
          const col = colOf(e)
          if (col) show(col)
        }}
        onBlur={(e) => {
          if (colOf(e)) hide()
        }}
      >
        {days.map((k) => (
          <TimelineCard
            key={k}
            day={k}
            data={data}
            loadFailed={loadFailed}
            activeHour={tip?.day === k ? tip.hour : null}
          />
        ))}
      </div>
      <Tooltip tip={tip} data={data} />
    </>
  )
}

function TimelineCard({
  day,
  data,
  loadFailed,
  activeHour,
}: {
  day: string
  data: Forecast | null
  loadFailed: boolean
  activeHour: number | null
}) {
  const hours = hoursFor(day, data)
  const v = verdict(hours)
  const past = pastBefore(day)

  if (!v && (past >= 24 || !data)) {
    return (
      <article className="card tl">
        <CardHead day={day} />
        <div>
          <p className="verdict-sub">{past >= 24 ? 'This day has passed.' : noDataText(loadFailed)}</p>
        </div>
      </article>
    )
  }

  const list = hours.filter((h) => h != null)
  return (
    <article className="card tl">
      <CardHead day={day} />
      {v ? (
        <div>
          <p className="verdict-h">{v.head}</p>
          <p className="verdict-sub">{v.sub}</p>
        </div>
      ) : (
        <div>
          <p className="verdict-h">Hourly data not out yet</p>
          <p className="verdict-sub">
            The NWS hourly forecast currently runs through {data ? fmtStamp(data.hourlyEnd) : ''}. {weekday(day)}’s
            hours {pendingWhen(day)}.
          </p>
        </div>
      )}
      <Chart day={day}>
        {hours.map((h, i) => {
          const active = activeHour === i ? ' active' : ''
          if (!h) {
            return (
              <div
                key={i}
                className={`col missing${active}`}
                role="listitem"
                tabIndex={0}
                data-day={day}
                data-h={i}
                aria-label={`${hourLabel(i)}: ${i < past ? 'already passed' : 'no hourly data yet'}`}
              >
                <i />
              </div>
            )
          }
          const cls = ['col', h.pop >= THRESHOLD ? 'wet' : '', v?.clearAt === i ? 'clear-start' : '']
            .filter(Boolean)
            .join(' ')
          return (
            <div
              key={i}
              className={cls + active}
              role="listitem"
              tabIndex={0}
              data-day={day}
              data-h={i}
              aria-label={`${hourLabel(i)}: ${pct(h.pop)} chance of rain, ${h.temp}°F, ${h.sky}`}
            >
              <i style={{ height: `${Math.max(0, Math.min(100, h.pop))}%` }} />
            </div>
          )
        })}
      </Chart>
      <ChartKey clear={v?.clearAt != null} />
      {list.length > 0 && (
        <details>
          <summary>Hour by hour</summary>
          <ul className="hours">
            {list.map((h) => (
              <li key={h.hour}>
                <span className="t">{hourLabel(h.hour)}</span>
                <span>{pct(h.pop)}</span>
                <span>{h.temp}°</span>
                <span className="s">{h.sky}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  )
}

function Tooltip({ tip, data }: { tip: Tip | null; data: Forecast | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const h = tip && data ? hoursFor(tip.day, data)[tip.hour] : null

  // Center above the bar, kept inside the window; flip below if there's no room above.
  useLayoutEffect(() => {
    const el = ref.current
    if (!tip || !el) return
    const r = tip.col.getBoundingClientRect()
    const t = el.getBoundingClientRect()
    const pad = 8
    let left = r.left + r.width / 2 - t.width / 2
    left = Math.max(pad, Math.min(left, window.innerWidth - t.width - pad))
    let top = r.top - t.height - 8
    if (top < pad) top = r.bottom + 8
    el.style.left = `${left}px`
    el.style.top = `${top}px`
  }, [tip])

  return (
    <div ref={ref} id="tip" className="tip" role="tooltip" hidden={!tip}>
      {tip &&
        (h ? (
          <>
            <b>
              {hourLabel(tip.hour)} · {pct(h.pop)} rain
            </b>
            <br />
            {h.temp}°F · {h.sky}
            <br />
            Wind {h.dir} {h.wind}
          </>
        ) : (
          <>
            <b>{hourLabel(tip.hour)}</b>
            <br />
            {tip.hour < pastBefore(tip.day) ? 'Already passed' : 'No hourly data yet'}
          </>
        ))}
    </div>
  )
}

// The chart frame (axes, grid lines, 20% line) around a day's 24 bars. Also used, empty, by the loading skeleton.
export function Chart({ day, children }: { day: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="chart">
        <div className="yaxis" aria-hidden="true">
          <span style={{ bottom: '100%' }}>100%</span>
          <span style={{ bottom: '50%' }}>50%</span>
          <span style={{ bottom: 0 }}>0%</span>
        </div>
        <div className="plot">
          <div className="gl" style={{ bottom: '100%' }} />
          <div className="gl" style={{ bottom: '50%' }} />
          <div className="gl" style={{ bottom: 0 }} />
          <div className="gl thresh" style={{ bottom: `${THRESHOLD}%` }} />
          <div className="bars" role="list" aria-label={`${weekday(day)} hourly chance of rain`}>
            {children}
          </div>
        </div>
      </div>
      <div className="xaxis" aria-hidden="true">
        {['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  )
}

export function ChartKey({ clear }: { clear: boolean }) {
  return (
    <div className="key">
      <span>
        <i className="sw" />
        {THRESHOLD}% or more
      </span>
      <span>
        <i className="sw soft" />
        Under {THRESHOLD}%
      </span>
      {clear && (
        <span>
          <i className="sw clear" />
          Dries out
        </span>
      )}
    </div>
  )
}

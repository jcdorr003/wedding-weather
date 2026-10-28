import type { Forecast } from '../../lib/types'
import { TimelineCard } from './TimelineCard'
import { Tooltip } from './Tooltip'
import { useTooltip } from './useTooltip'

type Props = { days: readonly string[]; data: Forecast | null; now: number; loadFailed: boolean }

export const Timelines = ({ days, data, now, loadFailed }: Props) => {
  const { tip, handlers } = useTooltip(data)
  return (
    <>
      {/* The bars are focusable themselves; this wrapper only delegates their pointer, click and focus events. */}
      <div className="timelines" id="timelines" {...handlers}>
        {days.map((day) => (
          <TimelineCard
            key={day}
            day={day}
            data={data}
            now={now}
            loadFailed={loadFailed}
            activeHour={tip?.day === day ? tip.hour : null}
          />
        ))}
      </div>
      <Tooltip tip={tip} now={now} />
    </>
  )
}

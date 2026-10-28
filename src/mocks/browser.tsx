// Local preview only: serve made-up forecasts through MSW and pretend it's the scenario's date and time.
import { network } from 'virtual:msw'
import { clock } from '../lib/time'
import { SCENARIOS, handlersFor, isScenario } from './scenarios'

const param = new URLSearchParams(location.search).get('scenario')
export const scenario = isScenario(param) ? param : 'wedding'

export async function startMocks() {
  const s = SCENARIOS[scenario]
  if ('now' in s) clock.pretend(s.now)
  network.configure({ handlers: handlersFor(scenario), onUnhandledFrame: 'bypass' })
  await network.enable()
  return { MockBanner }
}

function MockBanner() {
  return (
    <div className="mock-bar">
      <div>
        <b>MOCK DATA</b>: local preview only, not a real forecast. {SCENARIOS[scenario].note}
      </div>
      <nav>
        {Object.entries(SCENARIOS).map(([k, s]) => (
          <a key={k} href={`?scenario=${k}`} aria-current={k === scenario ? 'page' : undefined}>
            {s.label}
          </a>
        ))}
      </nav>
    </div>
  )
}

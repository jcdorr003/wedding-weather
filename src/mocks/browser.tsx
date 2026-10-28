// Local preview only: serve made-up forecasts through MSW and pretend it's the scenario's date and time.
import { NetworkReadyState } from 'msw/experimental'
import { network } from 'virtual:msw'
import { clock } from '../lib/time'
import { handlersFor } from './handlers'
import { SCENARIOS, isScenario } from './scenarios'

const param = new URLSearchParams(location.search).get('scenario')
export const scenario = isScenario(param) ? param : 'wedding'

export const startMocks = async () => {
  clock.pretend(SCENARIOS[scenario].now)
  const handlers = handlersFor(scenario)
  // MSW's Vite plugin may have switched the network on already; then the handlers are added to it instead.
  if (network.readyState === NetworkReadyState.ENABLED) network.use(...handlers)
  else {
    network.configure({ handlers, onUnhandledFrame: 'bypass' })
    await network.enable()
  }
  return { MockBanner }
}

const MockBanner = () => (
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

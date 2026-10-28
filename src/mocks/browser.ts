// Local preview only: serve made-up forecasts through MSW and pretend it's the scenario's date and time.
import { NetworkReadyState } from 'msw/experimental'
import { network } from 'virtual:msw'
import { clock } from '../lib/time'
import { handlersFor } from './handlers'
import { type Scenario, SCENARIOS } from './scenarios'

export const startMocks = async (scenario: Scenario) => {
  clock.pretend(SCENARIOS[scenario].now)
  const handlers = handlersFor(scenario)
  // MSW's Vite plugin may have switched the network on already; then the handlers are added to it instead.
  if (network.readyState === NetworkReadyState.ENABLED) network.use(...handlers)
  else {
    network.configure({ handlers, onUnhandledFrame: 'bypass' })
    await network.enable()
  }
}

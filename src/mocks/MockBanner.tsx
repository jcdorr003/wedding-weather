import { type Scenario, SCENARIOS } from './scenarios'

/**
 * Mock builds only: what this scenario pretends, plus links to the others. Fixed to the bottom of the screen and part
 * of the prerendered page (`scenario` is null there), so it never pops in or pushes the page around.
 */
export const MockBanner = ({ scenario }: { scenario: Scenario | null }) => (
  <div className="mock-bar">
    <div>
      <b>MOCK DATA</b>: local preview only, not a real forecast. {scenario && SCENARIOS[scenario].note}
    </div>
    <nav>
      {Object.entries(SCENARIOS).map(([key, s]) => (
        <a key={key} href={`?scenario=${key}`} aria-current={key === scenario ? 'page' : undefined}>
          {s.label}
        </a>
      ))}
    </nav>
  </div>
)

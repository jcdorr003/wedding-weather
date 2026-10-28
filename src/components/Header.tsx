type Props = { title: string; stamp: string; busy?: boolean; onRefresh?: () => void }

export const Header = ({ title, stamp, busy = false, onRefresh }: Props) => (
  <header className="top">
    <p className="eyebrow">Wedding Weather Control Station — Park Slope, Brooklyn</p>
    <h1 id="title">{title}</h1>
    <div className="controls">
      <button
        id="refresh"
        className={busy ? 'btn loading' : 'btn'}
        type="button"
        disabled={busy}
        aria-busy={busy || undefined}
        onClick={onRefresh}
      >
        <span className="spin" aria-hidden="true" />
        <span id="refresh-label">{busy ? 'Refreshing…' : 'Refresh Data'}</span>
      </button>
      <p className="stamp" id="stamp" aria-live="polite">
        {stamp}
      </p>
    </div>
  </header>
)

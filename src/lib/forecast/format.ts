export const pct = (v: number | null | undefined) => `${Math.round(v ?? 0)}%`

/** "10 to 15 mph" → "10–15 mph" */
export const windRange = (wind: string) => wind.replace(/(\d+)\s+to\s+(\d+)/, '$1–$2')

export const fmtInches = (mm: number) =>
  mm === 0 ? 'None' : mm / 25.4 < 0.01 ? '<0.01 in' : `${(mm / 25.4).toFixed(2)} in`

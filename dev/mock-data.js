// MOCK DATA: local preview only. Replaces fetch() so the real page code runs against made-up forecasts.
(() => {
  const SCENARIOS = {
    wedding: { label: 'Wedding week', note: 'Pretend it’s Wed Nov 4, 6 PM. All three days are in the NWS forecast with rain amounts. Rain Thursday, clearing Friday morning; Saturday is dry.', now: '2026-11-04T18:00:00-05:00' },
    today: { label: 'Today (Oct 27)', note: 'Wedding days are past the NWS range, so the early model read shows instead.' },
    halfway: { label: 'Halfway (Oct 31)', note: 'Pretend it’s Sat Oct 31. Thursday and Friday are in the official forecast but NWS rain amounts aren’t out yet, so their rain-by-time-of-day blocks show chances only, with a note on when amounts arrive. Saturday is still a model read.', now: '2026-10-31T10:00:00-04:00' },
    down: { label: 'NWS down', note: 'The forecast server returns errors. The page keeps the last good data saved on this device, if any.' },
    saturday: { label: 'Sat 9:30 AM', note: 'The wedding day itself, with a made-up Wind Advisory to show how NWS alerts appear. Earlier hours are marked as passed.', now: '2026-11-07T09:30:00-05:00' },
    overnight: { label: 'Sat 2:30 AM', note: 'Early on the wedding day, the forecast opens with an “Overnight” period (low 41°). The card must show Saturday night’s low (47°) instead. The forecast was issued the day before.', now: '2026-11-07T02:30:00-05:00' }
  };
  const params = new URLSearchParams(location.search);
  const scenario = SCENARIOS[params.get('scenario')] ? params.get('scenario') : 'wedding';

  if (SCENARIOS[scenario].now) {
    const RealDate = Date, offset = new RealDate(SCENARIOS[scenario].now).getTime() - RealDate.now();
    window.Date = class extends RealDate {
      constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + offset); }
      static now() { return RealDate.now() + offset; }
    };
  }

  const iso = (date, h) => `${date}T${String(h).padStart(2, '0')}:00:00${date < '2026-11-01' ? '-04:00' : '-05:00'}`;
  const dateRange = (from, to) => { const out = []; for (let d = new Date(from + 'T12:00:00Z'); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10)); return out; };
  const sky = pop => pop >= 60 ? 'Rain Showers Likely' : pop >= 30 ? 'Chance Rain Showers' : pop >= 20 ? 'Slight Chance Rain Showers' : 'Partly Sunny';

  const DAYS = {
    '2026-11-05': { hi: 58, lo: 49, popD: 70, popN: 60, wind: '10 to 15 mph', dir: 'S', skyD: 'Rain Showers Likely', skyN: 'Showers Likely',
      detail: 'Showers likely, mainly after 11am. Cloudy, with a high near 58. South wind 10 to 15 mph. Chance of precipitation is 70%. New rainfall amounts between a quarter and half of an inch possible.' },
    '2026-11-06': { hi: 55, lo: 44, popD: 40, popN: 5, wind: '10 to 20 mph', dir: 'NW', skyD: 'Chance Rain Showers then Partly Sunny', skyN: 'Mostly Clear',
      detail: 'A chance of rain showers before 11am. Partly sunny, with a high near 55. Northwest wind 10 to 20 mph, with gusts as high as 28 mph. Chance of precipitation is 40%.' },
    '2026-11-07': { hi: 59, lo: 47, popD: 5, popN: 3, wind: '5 to 10 mph', dir: 'W', skyD: 'Sunny', skyN: 'Clear',
      detail: 'Sunny, with a high near 59. West wind 5 to 10 mph.' }
  };
  const HOURLY = {
    '2026-11-05': [8, 8, 9, 9, 10, 10, 12, 18, 30, 45, 55, 62, 68, 70, 72, 70, 66, 62, 60, 58, 52, 48, 50, 55],
    '2026-11-06': [62, 64, 60, 58, 55, 52, 48, 44, 38, 31, 24, 21, 16, 12, 9, 7, 5, 4, 3, 3, 2, 2, 2, 2],
    '2026-11-07': [2, 2, 2, 1, 1, 1, 2, 3, 4, 5, 5, 6, 6, 5, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2]
  };
  const temps = { '2026-11-06': [50, 49, 49, 48, 48, 47, 47, 48, 49, 50, 52, 53, 54, 55, 55, 54, 53, 51, 49, 48, 47, 46, 45, 44],
                  '2026-11-07': [44, 43, 43, 42, 42, 42, 43, 45, 48, 51, 54, 56, 58, 59, 59, 58, 56, 54, 52, 51, 50, 49, 48, 47] };

  function daily(throughDate, { from = '2026-10-27', overnight = false, issued } = {}) {
    const periods = [];
    if (overnight) periods.push({ name: 'Overnight', startTime: iso(from, 2), isDaytime: false, temperature: 41, probabilityOfPrecipitation: { value: 12 }, windSpeed: '5 mph', windDirection: 'NW', shortForecast: 'Mostly Clear', detailedForecast: '' });
    for (const date of dateRange(from, throughDate)) {
      const d = DAYS[date] || { hi: 62, lo: 50, popD: 10, popN: 10, wind: '5 to 10 mph', dir: 'W', skyD: 'Partly Sunny', skyN: 'Partly Cloudy', detail: 'Partly sunny, with a high near 62.' };
      const wd = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      periods.push({ name: wd, startTime: iso(date, 6), isDaytime: true, temperature: d.hi, probabilityOfPrecipitation: { value: d.popD }, windSpeed: d.wind, windDirection: d.dir, shortForecast: d.skyD, detailedForecast: d.detail });
      periods.push({ name: wd + ' Night', startTime: iso(date, 18), isDaytime: false, temperature: d.lo, probabilityOfPrecipitation: { value: d.popN }, windSpeed: '5 mph', windDirection: d.dir, shortForecast: d.skyN, detailedForecast: '' });
    }
    return { properties: { updateTime: issued || new Date(Date.now() - 40 * 60000).toISOString(), periods } };
  }

  function hourly(throughDate, throughHour = 23, { from = '2026-10-27', fromHour = 0 } = {}) {
    const periods = [];
    for (const date of dateRange(from, throughDate)) {
      for (let h = date === from ? fromHour : 0; h < 24; h++) {
        if (date === throughDate && h > throughHour) break;
        const pop = HOURLY[date] ? HOURLY[date][h] : 8;
        const t = temps[date] ? temps[date][h] : 55;
        periods.push({ startTime: iso(date, h), temperature: t, probabilityOfPrecipitation: { value: pop }, windSpeed: pop > 30 ? '15 mph' : '8 mph', windDirection: 'NW', shortForecast: sky(pop) });
      }
    }
    return { properties: { updateTime: new Date().toISOString(), periods } };
  }

  // Ensemble runs: share of runs that are wet per day for each model.
  function ensemble(url) {
    const q = new URL(url).searchParams;
    const dates = dateRange(q.get('start_date'), q.get('end_date'));
    const wetShare = { '2026-11-05': [0.68, 0.74], '2026-11-06': [0.42, 0.47], '2026-11-07': [0.19, 0.24] };
    const time = []; dates.forEach(d => { for (let h = 0; h < 24; h++) time.push(`${d}T${String(h).padStart(2, '0')}:00`); });
    const hourlyOut = { time };
    [['ncep_gefs_seamless', 31, 0], ['ecmwf_ifs025_ensemble', 51, 1]].forEach(([tag, n, m]) => {
      for (let i = 0; i < n; i++) {
        const key = i === 0 ? `precipitation_${tag}` : `precipitation_member${String(i).padStart(2, '0')}_${tag}`;
        hourlyOut[key] = time.map(t => {
          const share = (wetShare[t.slice(0, 10)] || [0.1, 0.1])[m];
          const hour = Number(t.slice(11, 13));
          const wetRuns = Math.round(share * n);
          return i < wetRuns && hour >= 9 && hour < 15 ? (i < wetRuns / 2 ? 0.06 : 0.03) : 0;
        });
      }
    });
    return { hourly: hourlyOut };
  }

  // Rain amounts (mm) per 6-hour block starting 06Z (1 AM EST): early, morning, afternoon, evening.
  const QPF = { '2026-11-05': [0, 3.8, 6.4, 2.5], '2026-11-06': [2.0, 0.8, 0, 0], '2026-11-07': [0, 0, 0, 0] };
  function grid(qpfThrough) {
    const qpf = [], gust = [], thunder = [];
    for (const [date, blocks] of Object.entries(QPF)) {
      blocks.forEach((mm, i) => {
        const start = new Date(Date.parse(`${date}T06:00:00Z`) + i * 6 * 3600e3);
        if (start.getTime() + 6 * 3600e3 <= Date.parse(qpfThrough)) qpf.push({ validTime: `${start.toISOString().replace('.000Z', '+00:00')}/PT6H`, value: mm });
      });
    }
    gust.push({ validTime: '2026-11-06T11:00:00+00:00/PT12H', value: 45 });   // Fri 6 AM–6 PM: 28 mph
    gust.push({ validTime: '2026-11-07T11:00:00+00:00/PT12H', value: 22 });   // Sat: light
    thunder.push({ validTime: '2026-11-05T17:00:00+00:00/PT6H', value: 20 }); // Thu midday
    return { properties: { updateTime: new Date().toISOString(), quantitativePrecipitation: { values: qpf }, windGust: { values: gust }, probabilityOfThunder: { values: thunder } } };
  }
  const ALERTS = {
    saturday: [{ properties: { status: 'Actual', messageType: 'Alert', event: 'Wind Advisory', severity: 'Moderate', ends: '2026-11-07T18:00:00-05:00',
      headline: 'Wind Advisory issued November 7 at 4:12AM EST until November 7 at 6:00PM EST by NWS Upton NY',
      parameters: { NWSheadline: ['WIND ADVISORY IN EFFECT UNTIL 6 PM EST THIS EVENING'] } } }]
  };

  const coverage = {
    wedding: { daily: ['2026-11-10', { from: '2026-11-04' }], hourly: ['2026-11-10', 23, { from: '2026-11-04', fromHour: 18 }], qpf: '2026-11-08T06:00:00Z' },
    today: { daily: ['2026-11-02'], hourly: ['2026-11-02', 20] },
    halfway: { daily: ['2026-11-06', { from: '2026-10-31' }], hourly: ['2026-11-06', 15, { from: '2026-10-31', fromHour: 10 }], qpf: '2026-11-03T18:00:00Z' },
    saturday: { daily: ['2026-11-13', { from: '2026-11-07' }], hourly: ['2026-11-13', 23, { from: '2026-11-07', fromHour: 9 }], qpf: '2026-11-10T18:00:00Z' },
    overnight: { daily: ['2026-11-13', { from: '2026-11-07', overnight: true, issued: '2026-11-06T20:00:00Z' }], hourly: ['2026-11-13', 23, { from: '2026-11-07', fromHour: 2 }], qpf: '2026-11-10T12:00:00Z' }
  }[scenario];

  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const wait = ms => new Promise(r => setTimeout(r, ms));

  window.fetch = async (input) => {
    const url = String(input);
    await wait(700);   // long enough to see the loading state
    if (scenario === 'down' && url.includes('weather.gov')) return new Response('', { status: 503 });
    if (url.includes('/points/')) return json({ properties: { gridId: 'OKX', gridX: 35, gridY: 40, forecast: 'https://api.weather.gov/mock/forecast', forecastHourly: 'https://api.weather.gov/mock/forecast/hourly',
      forecastGridData: 'https://api.weather.gov/mock/grid', forecastZone: 'https://api.weather.gov/zones/forecast/NYZ075', county: 'https://api.weather.gov/zones/county/NYC047', radarStation: 'KDIX' } });
    if (url.includes('/alerts/active')) return json({ features: ALERTS[scenario] || [] });
    if (url.endsWith('/mock/grid')) return json(grid(coverage.qpf));
    if (url.endsWith('/forecast/hourly')) return json(hourly(...coverage.hourly));
    if (url.endsWith('/forecast')) return json(daily(...coverage.daily));
    if (url.includes('open-meteo')) return json(ensemble(url));
    return new Response('', { status: 404 });
  };

  // Banner with scenario switcher.
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div');
    bar.style.cssText = 'background:var(--note-bg);color:var(--note-ink);border-bottom:1px solid var(--note-line);font:13px/1.45 var(--meta);padding:10px max(16px, env(safe-area-inset-right, 0px)) 10px max(16px, env(safe-area-inset-left, 0px));display:grid;gap:8px';
    const links = Object.entries(SCENARIOS).map(([k, s]) =>
      `<a href="?scenario=${k}" style="color:inherit;padding:4px 10px;border-radius:999px;border:1px solid var(--note-line);text-decoration:none;${k === scenario ? 'background:var(--surface);font-weight:600' : ''}">${s.label}</a>`).join('');
    bar.innerHTML = `<div><b>MOCK DATA</b>: local preview only, not a real forecast. ${SCENARIOS[scenario].note}</div><div style="display:flex;flex-wrap:wrap;gap:6px">${links}</div>`;
    document.body.prepend(bar);
  });
})();

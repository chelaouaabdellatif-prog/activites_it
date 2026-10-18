// Appels API, dates et calculs d'avancement.

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Erreur ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

export const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const pad = (n) => String(n).padStart(2, '0')

export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const currentMonth = () => todayIso().slice(0, 7)

export const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

export const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export const monthBounds = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return { start: `${ym}-01`, end: `${ym}-${pad(last)}` }
}

export const nowTime = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const fmtDate = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—')

export const fmtDateTime = (iso, hhmm) => (iso && hhmm ? `${fmtDate(iso)} ${hhmm}` : fmtDate(iso))

export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5)

// Une tâche non terminée « court » jusqu'à aujourd'hui : elle apparaît dans chaque mois où elle est active.
export const effectiveEnd = (t) => {
  if (t.status === 'terminee') return t.end_date || t.start_date
  const today = todayIso()
  return t.end_date && t.end_date > today ? t.end_date : today
}

export const inMonth = (t, ym) => {
  const { start, end } = monthBounds(ym)
  return t.start_date <= end && effectiveEnd(t) >= start
}

export const isLate = (t) => t.status !== 'terminee' && !!t.end_date && t.end_date < todayIso()

export const durationDays = (t) => {
  const end = t.status === 'terminee' ? t.end_date || t.start_date : t.end_date
  return end ? daysBetween(t.start_date, end) + 1 : null
}

export function stats(tasks) {
  const done = tasks.filter((t) => t.status === 'terminee')
  const doing = tasks.filter((t) => t.status === 'en_cours')
  const waiting = tasks.filter((t) => t.status === 'en_attente')
  const interventions = done.reduce((s, t) => s + (Number(t.count) || 0), 0)
  const rate = tasks.length ? done.length / tasks.length : 0
  const avgProgress = tasks.length ? tasks.reduce((s, t) => s + (Number(t.progress) || 0), 0) / tasks.length / 100 : 0
  return {
    total: tasks.length,
    done: done.length,
    doing: doing.length,
    waiting: waiting.length,
    late: tasks.filter(isLate).length,
    interventions,
    rate,
    avgProgress,
  }
}

export const pct = (x) => `${Math.round(x * 100)}%`

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

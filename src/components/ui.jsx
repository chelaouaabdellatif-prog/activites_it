import { useEffect } from 'react'
import { STATUS_BY_ID, categoryLabel } from '../shared/catalog.js'
import { isLate, monthLabel, shiftMonth } from '../lib.js'

const PATHS = {
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Z',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  check: 'M5 12.5l4.5 4.5L19 7',
  download: 'M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  x: 'M6 6l12 12M18 6L6 18',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4v-9Z',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  file: 'M7 3h7l5 5v13H7V3Zm7 0v5h5M10 13h6M10 17h6',
  lock: 'M6 11h12v9H6v-9Zm2 0V8a4 4 0 0 1 8 0v3',
}

export function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}

export function StatusChip({ task }) {
  if (task.status !== 'terminee' && isLate(task)) return <span className="chip st-late">⚠ En retard</span>
  const s = STATUS_BY_ID[task.status]
  return (
    <span className={`chip st-${task.status}`}>
      {s.icon} {s.label}
    </span>
  )
}

export const CategoryChip = ({ id }) => <span className="chip cat">{categoryLabel(id)}</span>

export function Progress({ value, task, lg }) {
  let cls = ''
  if (task) cls = task.status === 'terminee' ? 'ok' : isLate(task) ? 'late' : task.status === 'en_attente' ? 'wait' : ''
  return (
    <div className={`progress ${cls} ${lg ? 'lg' : ''}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function MonthPicker({ value, onChange }) {
  return (
    <div className="month-pick">
      <button type="button" onClick={() => onChange(shiftMonth(value, -1))} aria-label="Mois précédent">‹</button>
      <b>{monthLabel(value)}</b>
      <button type="button" onClick={() => onChange(shiftMonth(value, 1))} aria-label="Mois suivant">›</button>
    </div>
  )
}

export function Modal({ title, onClose, children, footer, narrow }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${narrow ? 'narrow' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-h">
          <h2>{title}</h2>
          <button className="btn ghost sm icon-btn" onClick={onClose} aria-label="Fermer">
            <Icon name="x" />
          </button>
        </div>
        {children}
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  )
}

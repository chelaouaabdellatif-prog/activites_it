import { useMemo, useState } from 'react'
import { CATEGORIES, STATUSES } from '../shared/catalog.js'
import { fmtDateTime, inMonth, isLate, monthLabel } from '../lib.js'
import { CategoryChip, Icon, MonthPicker, Progress, StatusChip } from './ui.jsx'

export default function Tasks({ tasks, month, setMonth, onEdit, onComplete, onDelete, onNew }) {
  const [period, setPeriod] = useState('month')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return tasks
      .filter((t) => period === 'all' || inMonth(t, month))
      .filter((t) => !status || (status === 'late' ? isLate(t) : t.status === status))
      .filter((t) => !category || t.category === category)
      .filter((t) => !needle || [t.title, t.subcategory, t.beneficiary, t.details].some((v) => v?.toLowerCase().includes(needle)))
  }, [tasks, period, month, status, category, q])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Mes tâches</h1>
          <p>
            {list.length} tâche{list.length > 1 ? 's' : ''} {period === 'month' ? `— ${monthLabel(month)}` : '— toutes périodes'}
          </p>
        </div>
        <div className="page-actions">
          <div className="seg">
            <button className={period === 'month' ? 'on' : ''} onClick={() => setPeriod('month')}>Par mois</button>
            <button className={period === 'all' ? 'on' : ''} onClick={() => setPeriod('all')}>Toutes</button>
          </div>
          {period === 'month' && <MonthPicker value={month} onChange={setMonth} />}
          <button className="btn primary" onClick={onNew}>
            <Icon name="plus" /> Nouvelle tâche
          </button>
        </div>
      </div>

      <div className="filters">
        <input className="input search" placeholder="Rechercher une tâche, une personne, un détail…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
          <option value="late">⚠ En retard</option>
        </select>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie">
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
      </div>

      <div className="card table-wrap">
        {list.length ? (
          <table className="tasks">
            <thead>
              <tr>
                <th>Tâche</th>
                <th className="hide-sm">Catégorie</th>
                <th>Statut</th>
                <th>Avancement</th>
                <th className="hide-sm">Début → Fin</th>
                <th className="hide-sm">Nb</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="title">
                      {t.highlight ? <span className="star">★ </span> : null}
                      {t.title}
                    </div>
                    <div className="sub">
                      {[t.subcategory, t.beneficiary].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </td>
                  <td className="hide-sm"><CategoryChip id={t.category} /></td>
                  <td><StatusChip task={t} /></td>
                  <td className="prog">
                    <b className="num">{t.progress}%</b>
                    <Progress value={t.progress} task={t} />
                  </td>
                  <td className="hide-sm num" style={{ whiteSpace: 'nowrap' }}>
                    {fmtDateTime(t.start_date, t.start_time)} → {t.end_date ? fmtDateTime(t.end_date, t.end_time) : '…'}
                  </td>
                  <td className="hide-sm num">{t.count}</td>
                  <td className="acts">
                    {t.status !== 'terminee' && (
                      <button className="btn sm ghost icon-btn" onClick={() => onComplete(t)} title="Marquer comme terminée" aria-label="Terminer">
                        <Icon name="check" />
                      </button>
                    )}
                    <button className="btn sm ghost icon-btn" onClick={() => onEdit(t)} title="Modifier" aria-label="Modifier">
                      <Icon name="edit" />
                    </button>
                    <button className="btn sm ghost icon-btn danger" onClick={() => onDelete(t)} title="Supprimer" aria-label="Supprimer">
                      <Icon name="trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-note" style={{ padding: 40 }}>
            Aucune tâche ne correspond. Cliquez sur « Nouvelle tâche » pour en ajouter une.
          </p>
        )}
      </div>
    </>
  )
}

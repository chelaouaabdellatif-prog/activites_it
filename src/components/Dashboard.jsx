import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES } from '../shared/catalog.js'
import { api, fmtDate, inMonth, initials, isLate, monthLabel, pct, stats } from '../lib.js'
import { CategoryChip, Icon, MonthPicker, Progress, StatusChip } from './ui.jsx'

function TaskItem({ t, me, showWho, onEdit, onComplete }) {
  const mine = t.profile_id === me.id
  return (
    <div className="titem">
      <div className="t">
        {t.highlight ? <span className="star">★ </span> : null}
        {t.title}
      </div>
      <div>
        {t.status !== 'terminee' ? (
          <span className="pc">{t.progress}%</span>
        ) : (
          <span className="muted num" style={{ fontSize: 12.5 }}>{fmtDate(t.end_date)}</span>
        )}
      </div>
      {t.status !== 'terminee' && <Progress value={t.progress} task={t} />}
      <div className="meta">
        <CategoryChip id={t.category} />
        {t.subcategory && <span>{t.subcategory}</span>}
        <span className="num">
          {fmtDate(t.start_date)} → {t.end_date ? fmtDate(t.end_date) : '…'}
        </span>
        {t.status !== 'terminee' && <StatusChip task={t} />}
        {showWho && <span className="chip who">{t.profile_name}</span>}
        {mine && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {t.status !== 'terminee' && (
              <button className="btn sm" onClick={() => onComplete(t)} title="Marquer comme terminée">
                <Icon name="check" /> Terminer
              </button>
            )}
            <button className="btn sm ghost icon-btn" onClick={() => onEdit(t)} aria-label="Modifier">
              <Icon name="edit" />
            </button>
          </span>
        )}
      </div>
    </div>
  )
}

export default function Dashboard({ me, tasks, month, setMonth, onEdit, onComplete, onNew }) {
  const [scope, setScope] = useState('me')
  const [slots, setSlots] = useState([])
  useEffect(() => {
    api('/api/profiles').then((d) => setSlots(d.slots.filter((s) => s.id))).catch(() => {})
  }, [])

  const monthTasks = useMemo(
    () => tasks.filter((t) => inMonth(t, month) && (scope === 'team' || t.profile_id === me.id)),
    [tasks, month, scope, me.id],
  )
  const s = stats(monthTasks)
  const open = monthTasks
    .filter((t) => t.status !== 'terminee')
    .sort((a, b) => isLate(b) - isLate(a) || (a.end_date || '9999').localeCompare(b.end_date || '9999'))
  const done = monthTasks.filter((t) => t.status === 'terminee').sort((a, b) => (b.end_date || '').localeCompare(a.end_date || ''))
  const byCat = CATEGORIES.map((c) => {
    const items = monthTasks.filter((t) => t.category === c.id)
    return { c, n: items.length, done: items.filter((t) => t.status === 'terminee').length }
  })
    .filter((x) => x.n)
    .sort((a, b) => b.n - a.n)
  const maxCat = Math.max(1, ...byCat.map((x) => x.n))
  const first = me.name.split(' ')[0]

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bonjour {first} 👋</h1>
          <p>Avancement des tâches — {monthLabel(month)}</p>
        </div>
        <div className="page-actions">
          <div className="seg" role="tablist">
            <button className={scope === 'me' ? 'on' : ''} onClick={() => setScope('me')}>Mes tâches</button>
            <button className={scope === 'team' ? 'on' : ''} onClick={() => setScope('team')}>Équipe IT</button>
          </div>
          <MonthPicker value={month} onChange={setMonth} />
          <button className="btn primary" onClick={onNew}>
            <Icon name="plus" /> Nouvelle tâche
          </button>
        </div>
      </div>

      <section className="card hero">
        <div>
          <h2>Taux de réalisation {scope === 'team' ? "de l'équipe" : ''}</h2>
          <div className="stack" aria-hidden="true">
            <span style={{ width: pct(s.total ? s.done / s.total : 0), background: 'var(--ok)' }} />
            <span style={{ width: pct(s.total ? (s.doing - countLate(monthTasks, 'en_cours')) / s.total : 0), background: 'var(--accent)' }} />
            <span style={{ width: pct(s.total ? s.late / s.total : 0), background: 'var(--danger)' }} />
            <span style={{ width: pct(s.total ? (s.waiting - countLate(monthTasks, 'en_attente')) / s.total : 0), background: 'var(--line-strong)' }} />
          </div>
          <div className="legend">
            <span><i style={{ background: 'var(--ok)' }} />Terminées {s.done}</span>
            <span><i style={{ background: 'var(--accent)' }} />En cours {s.doing - countLate(monthTasks, 'en_cours')}</span>
            <span><i style={{ background: 'var(--danger)' }} />En retard {s.late}</span>
            <span><i style={{ background: 'var(--line-strong)' }} />En attente {s.waiting - countLate(monthTasks, 'en_attente')}</span>
            <span>Avancement moyen : <b className="num">{pct(s.avgProgress)}</b></span>
          </div>
        </div>
        <div className="big num">{pct(s.rate)}</div>
      </section>

      <div className="kpis">
        <Kpi label="Total des tâches" value={s.total} color="var(--ink)" />
        <Kpi label="Terminées" value={s.done} color="var(--ok)" />
        <Kpi label="En cours" value={s.doing} color="var(--accent)" />
        <Kpi label="En attente" value={s.waiting} color="var(--line-strong)" />
        <Kpi label="En retard" value={s.late} color="var(--danger)" />
        <Kpi label="Interventions" value={s.interventions} color="var(--accent-strong)" hint="Somme des « Nb de fois » des tâches terminées" />
      </div>

      {scope === 'team' && slots.length > 0 && (
        <div className="team">
          {slots.map((p) => {
            const ms = stats(monthTasks.filter((t) => t.profile_id === p.id))
            return (
              <div key={p.id} className="card member">
                <div className="member-h">
                  <div className="avatar sm">{initials(p.name)}</div>
                  <div>
                    <b>{p.name}</b>
                    <small>{p.poste || 'Équipe IT'}</small>
                  </div>
                </div>
                <div className="member-s">
                  <span><b>{ms.done}</b>terminées</span>
                  <span><b>{ms.doing + ms.waiting}</b>en cours</span>
                  <span><b>{ms.interventions}</b>interv.</span>
                </div>
                <Progress value={ms.rate * 100} lg />
              </div>
            )
          })}
        </div>
      )}

      <div className="grid-2">
        <section className="card">
          <div className="card-h">
            <h2>⏳ Tâches en cours <span className="count-pill">{open.length}</span></h2>
          </div>
          <div className="card-b tlist">
            {open.length ? open.map((t) => <TaskItem key={t.id} t={t} me={me} showWho={scope === 'team'} onEdit={onEdit} onComplete={onComplete} />) : <p className="empty-note">Aucune tâche en cours 🎉</p>}
          </div>
        </section>
        <section className="card">
          <div className="card-h">
            <h2>✅ Tâches terminées <span className="count-pill">{done.length}</span></h2>
          </div>
          <div className="card-b tlist">
            {done.length ? done.map((t) => <TaskItem key={t.id} t={t} me={me} showWho={scope === 'team'} onEdit={onEdit} onComplete={onComplete} />) : <p className="empty-note">Aucune tâche terminée ce mois-ci.</p>}
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-h">
          <h2>🏷️ Répartition par catégorie</h2>
          <span className="muted" style={{ fontSize: 12.5 }}>barre = part terminée</span>
        </div>
        <div className="card-b">
          {byCat.length ? (
            <div className="bars">
              {byCat.map(({ c, n, done }) => (
                <div className="bar-row" key={c.id}>
                  <span className="lbl">{c.icon} {c.label} <span className="muted">· {done}/{n} terminée{done > 1 ? 's' : ''}</span></span>
                  <span className="v">{n}</span>
                  <div className="progress" style={{ width: `${(n / maxCat) * 100}%` }}>
                    <i style={{ width: `${(done / n) * 100}%`, background: 'var(--ok)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-note">Aucune tâche sur la période. Ajoutez votre première tâche avec « Nouvelle tâche ».</p>
          )}
        </div>
      </section>
    </>
  )
}

const countLate = (tasks, status) => tasks.filter((t) => t.status === status && isLate(t)).length

function Kpi({ label, value, color, hint }) {
  return (
    <div className="card kpi" style={{ '--kpi': color }} title={hint}>
      <small>{label}</small>
      <b className="num">{value}</b>
    </div>
  )
}

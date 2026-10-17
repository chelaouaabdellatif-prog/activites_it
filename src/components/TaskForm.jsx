import { useState } from 'react'
import { CATEGORIES, CATEGORY_BY_ID, STATUSES } from '../shared/catalog.js'
import { todayIso } from '../lib.js'
import { Modal } from './ui.jsx'

const OTHER = '__autre__'

export default function TaskForm({ task, onSave, onClose }) {
  const isNew = !task.id
  const [f, setF] = useState(() => ({
    category: 'helpdesk',
    subcategory: '',
    title: '',
    beneficiary: '',
    start_date: todayIso(),
    end_date: '',
    status: 'en_cours',
    progress: 0,
    count: 1,
    details: '',
    highlight: 0,
    ...task,
    end_date: task.end_date || '',
  }))
  const subs = CATEGORY_BY_ID[f.category]?.subs || []
  const [customSub, setCustomSub] = useState(() => !!task.subcategory && !subs.includes(task.subcategory))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const bind = (k) => ({ value: f[k] ?? '', onChange: (e) => set(k, e.target.value) })

  const setStatus = (status) =>
    setF((x) => ({
      ...x,
      status,
      progress: status === 'terminee' ? 100 : x.progress === 100 ? 80 : x.progress,
      end_date: status === 'terminee' && !x.end_date ? todayIso() : x.end_date,
    }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (f.end_date && f.end_date < f.start_date) return setError('La date de fin doit être postérieure à la date de début.')
    setBusy(true)
    try {
      await onSave({ ...f, end_date: f.end_date || null, progress: Number(f.progress), count: Number(f.count) })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal
      title={isNew ? 'Nouvelle tâche' : 'Modifier la tâche'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary" form="task-form" disabled={busy}>
            {busy ? 'Enregistrement…' : isNew ? 'Ajouter la tâche' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <form id="task-form" className="modal-b" onSubmit={submit}>
        <label className="field">
          <span>Catégorie</span>
          <select
            className="input"
            value={f.category}
            onChange={(e) => {
              set('category', e.target.value)
              set('subcategory', '')
              setCustomSub(false)
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sous-catégorie</span>
          {customSub ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input" {...bind('subcategory')} placeholder="Préciser la sous-catégorie" maxLength={120} autoFocus />
              <button type="button" className="btn sm" style={{ height: 40 }} onClick={() => { setCustomSub(false); set('subcategory', '') }}>Liste</button>
            </div>
          ) : (
            <select
              className="input"
              value={f.subcategory}
              onChange={(e) => {
                if (e.target.value === OTHER) {
                  setCustomSub(true)
                  set('subcategory', '')
                } else set('subcategory', e.target.value)
              }}
            >
              <option value="">— Choisir —</option>
              {subs.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value={OTHER}>Autre (préciser)…</option>
            </select>
          )}
        </label>

        <label className="field full">
          <span>Tâche *</span>
          <input className="input" {...bind('title')} required maxLength={300} placeholder="ex. Configuration Outlook et VPN sur le nouveau portable" autoFocus={isNew} />
        </label>

        <label className="field">
          <span>Date de début *</span>
          <input className="input" type="date" {...bind('start_date')} required />
        </label>
        <label className="field">
          <span>Date de fin {f.status === 'terminee' ? '(réelle)' : '(prévue)'}</span>
          <input className="input" type="date" {...bind('end_date')} min={f.start_date} />
        </label>

        <div className="field full">
          <span>Statut</span>
          <div className="status-pick">
            {STATUSES.map((s) => (
              <button type="button" key={s.id} className={f.status === s.id ? 'on' : ''} onClick={() => setStatus(s.id)}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        <label className="field full">
          <span>Avancement</span>
          <div className="range">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={f.progress}
              disabled={f.status === 'terminee'}
              onChange={(e) => set('progress', Number(e.target.value))}
            />
            <b>{f.progress}%</b>
          </div>
        </label>

        <label className="field">
          <span>Pour qui (service / personne)</span>
          <input className="input" {...bind('beneficiary')} maxLength={200} placeholder="ex. HPS — Service commercial" />
        </label>
        <label className="field">
          <span>Nb de fois / interventions</span>
          <input className="input" type="number" min="1" max="9999" {...bind('count')} />
        </label>

        <label className="field full">
          <span>Détails / Remarques</span>
          <textarea className="input" {...bind('details')} maxLength={4000} placeholder="Ce qui a été fait, résultat, liens utiles…" />
        </label>

        <label className="check full">
          <input type="checkbox" checked={!!f.highlight} onChange={(e) => set('highlight', e.target.checked ? 1 : 0)} />
          ⭐ Fait marquant du mois (apparaît dans la synthèse du rapport)
        </label>

        {error && <p className="error full">{error}</p>}
      </form>
    </Modal>
  )
}

import { useMemo, useState } from 'react'
import { CATEGORIES } from '../shared/catalog.js'
import { fmtDate, inMonth, monthBounds, monthLabel, pct, stats } from '../lib.js'
import { Icon, MonthPicker } from './ui.jsx'

export default function Report({ me, tasks, month, setMonth, notify }) {
  const [destinataire, setDestinataire] = useState(me.destinataire || 'Direction générale')
  const [busy, setBusy] = useState(false)
  const monthTasks = useMemo(() => tasks.filter((t) => inMonth(t, month)), [tasks, month])
  const s = stats(monthTasks)
  const { start, end } = monthBounds(month)
  const byCat = CATEGORIES.map((c) => {
    const items = monthTasks.filter((t) => t.category === c.id)
    return { c, ...stats(items) }
  }).filter((x) => x.total)

  async function generate() {
    setBusy(true)
    try {
      const { buildReport, download, reportFileName } = await import('../excel.js')
      const blob = await buildReport({ profile: me, month, tasks: monthTasks, destinataire })
      download(blob, reportFileName(me, month))
      notify('Rapport Excel généré ✔')
    } catch (err) {
      console.error(err)
      notify("Erreur lors de la génération de l'Excel")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Rapport mensuel</h1>
          <p>Excel professionnel aux couleurs HPS, avec toutes vos tâches du mois.</p>
        </div>
        <div className="page-actions">
          <MonthPicker value={month} onChange={setMonth} />
        </div>
      </div>

      <div className="report">
        <section className="card card-b report-form">
          <label className="field">
            <span>Destinataire</span>
            <input className="input" value={destinataire} onChange={(e) => setDestinataire(e.target.value)} maxLength={120} />
          </label>
          <div className="muted" style={{ fontSize: 13 }}>
            Le fichier contient 3 feuilles :
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              <li><b>{monthLabel(month)}</b> — toutes les tâches par catégorie, statut, avancement, dates, durée, détails</li>
              <li><b>Synthèse</b> — indicateurs, répartition par catégorie et sous-catégorie, points d'attention, faits marquants</li>
              <li><b>Planning</b> — diagramme de Gantt du mois</li>
            </ul>
          </div>
          <button className="btn primary" onClick={generate} disabled={busy} style={{ height: 46 }}>
            <Icon name="download" /> {busy ? 'Génération…' : `Générer l'Excel — ${monthLabel(month)}`}
          </button>
          {!monthTasks.length && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Aucune tâche sur ce mois : le rapport sera vide.</p>}
        </section>

        <section className="card xl-preview">
          <div className="xl-head">
            <h3>📋 Rapport d'activité mensuel — {monthLabel(month)}</h3>
            <img src="/logo-hps.png" alt="HPS" />
          </div>
          <div className="xl-info">
            <div><small>👤 Nom</small>{me.name}</div>
            <div><small>✅ Tâches terminées</small><b className="o num">{s.done}</b></div>
            <div><small>💼 Poste</small>{me.poste || '—'}</div>
            <div><small>🔁 Total interventions</small><b className="o num">{s.interventions}</b></div>
            <div><small>📅 Période</small>{fmtDate(start)} au {fmtDate(end)}</div>
            <div><small>📊 Taux de réalisation</small><b className="o num">{pct(s.rate)}</b></div>
            <div><small>📨 Destinataire</small>{destinataire || '—'}</div>
            <div><small>⏳ En cours / en attente</small><b className="o num">{s.doing + s.waiting}</b></div>
          </div>
          {byCat.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="cat-table">
                <thead>
                  <tr>
                    <th>Catégorie</th>
                    <th className="c">Tâches</th>
                    <th className="c">Terminées</th>
                    <th className="c">En cours</th>
                    <th className="c">Interventions</th>
                  </tr>
                </thead>
                <tbody>
                  {byCat.map((x) => (
                    <tr key={x.c.id}>
                      <td>{x.c.icon} {x.c.label}</td>
                      <td className="c num">{x.total}</td>
                      <td className="c num">{x.done}</td>
                      <td className="c num">{x.doing + x.waiting}</td>
                      <td className="c num">{x.interventions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="sheet-tabs">
            <span>{monthLabel(month)}</span>
            <span>Synthèse</span>
            <span>Planning</span>
          </div>
        </section>
      </div>
    </>
  )
}

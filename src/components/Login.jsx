import { useEffect, useState } from 'react'
import { api, initials } from '../lib.js'

export default function Login({ onLogged }) {
  const [slots, setSlots] = useState(null)
  const [active, setActive] = useState(null) // slot number
  const [form, setForm] = useState({ name: '', poste: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => api('/api/profiles').then((d) => setSlots(d.slots)).catch((e) => setError(e.message))
  useEffect(() => {
    load()
  }, [])

  const select = (slot) => {
    setActive(slot)
    setError('')
    setForm({ name: '', poste: '', password: '', confirm: '' })
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e, s) {
    e.preventDefault()
    setError('')
    if (!s.id && form.password !== form.confirm) return setError('Les deux mots de passe ne correspondent pas.')
    setBusy(true)
    try {
      if (s.id) await api('/api/login', { method: 'POST', body: { id: s.id, password: form.password } })
      else await api('/api/profiles', { method: 'POST', body: { slot: s.slot, name: form.name, poste: form.poste, password: form.password } })
      await onLogged()
    } catch (err) {
      setError(err.message)
      if (err.status === 409) load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-head">
          <img src="/logo-hps.png" alt="HPS — Hasnaoui Profile Systems" />
          <h1>Activités de l'équipe IT</h1>
          <p>Choisissez votre profil pour suivre vos tâches et générer votre rapport mensuel.</p>
        </div>
        {!slots && !error && <p className="loading">Chargement…</p>}
        {error && !active && <p className="error">{error}</p>}
        {slots && (
          <div className="profiles">
            {slots.map((s) => {
              const open = active === s.slot
              return (
                <div
                  key={s.slot}
                  className={`profile-card ${s.id ? '' : 'empty'} ${open ? 'active' : ''}`}
                  onClick={() => !open && select(s.slot)}
                  role={open ? undefined : 'button'}
                  tabIndex={open ? undefined : 0}
                  onKeyDown={(e) => !open && (e.key === 'Enter' || e.key === ' ') && select(s.slot)}
                >
                  <div className="avatar">{s.id ? initials(s.name) : '+'}</div>
                  <strong>{s.id ? s.name : `Profil ${s.slot}`}</strong>
                  <small>{s.id ? s.poste || 'Équipe IT' : 'Créer ce profil'}</small>
                  {open && (
                    <form onSubmit={(e) => submit(e, s)}>
                      {!s.id && (
                        <>
                          <label className="field">
                            <span>Nom complet</span>
                            <input className="input" value={form.name} onChange={set('name')} required autoFocus maxLength={80} />
                          </label>
                          <label className="field">
                            <span>Poste</span>
                            <input className="input" value={form.poste} onChange={set('poste')} placeholder="ex. Technicien Helpdesk — HPS" maxLength={120} />
                          </label>
                        </>
                      )}
                      <label className="field">
                        <span>{s.id ? 'Mot de passe' : 'Choisir un mot de passe (6 caractères min.)'}</span>
                        <input
                          className="input"
                          type="password"
                          value={form.password}
                          onChange={set('password')}
                          required
                          minLength={s.id ? undefined : 6}
                          autoFocus={!!s.id}
                          autoComplete={s.id ? 'current-password' : 'new-password'}
                        />
                      </label>
                      {!s.id && (
                        <label className="field">
                          <span>Confirmer le mot de passe</span>
                          <input className="input" type="password" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" />
                        </label>
                      )}
                      {error && <p className="error">{error}</p>}
                      <button className="btn primary" disabled={busy}>
                        {busy ? 'Patientez…' : s.id ? 'Se connecter' : 'Créer mon profil'}
                      </button>
                      <button type="button" className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setActive(null); setError('') }}>
                        Annuler
                      </button>
                    </form>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

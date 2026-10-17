import { useState } from 'react'
import { api } from '../lib.js'
import { Modal } from './ui.jsx'

export default function Settings({ me, onClose, onSaved, notify }) {
  const [p, setP] = useState({ name: me.name, poste: me.poste || '', destinataire: me.destinataire || '' })
  const [pw, setPw] = useState({ current: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function saveProfile(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { profile } = await api('/api/me', { method: 'PUT', body: p })
      onSaved(profile)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    setError('')
    if (pw.password !== pw.confirm) return setError('Les deux nouveaux mots de passe ne correspondent pas.')
    setBusy(true)
    try {
      await api('/api/me/password', { method: 'PUT', body: { current: pw.current, password: pw.password } })
      setPw({ current: '', password: '', confirm: '' })
      notify('Mot de passe modifié ✔')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Mon profil" onClose={onClose} narrow>
      <form className="modal-b" onSubmit={saveProfile} style={{ gridTemplateColumns: '1fr' }}>
        <label className="field">
          <span>Nom complet</span>
          <input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} required maxLength={80} />
        </label>
        <label className="field">
          <span>Poste</span>
          <input className="input" value={p.poste} onChange={(e) => setP({ ...p, poste: e.target.value })} maxLength={120} />
        </label>
        <label className="field">
          <span>Destinataire par défaut du rapport</span>
          <input className="input" value={p.destinataire} onChange={(e) => setP({ ...p, destinataire: e.target.value })} maxLength={120} />
        </label>
        <button className="btn primary" disabled={busy}>Enregistrer le profil</button>
      </form>
      <form className="modal-b" onSubmit={savePassword} style={{ gridTemplateColumns: '1fr', borderTop: '1px solid var(--line)' }}>
        <b>🔒 Changer le mot de passe</b>
        <label className="field">
          <span>Mot de passe actuel</span>
          <input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" />
        </label>
        <label className="field">
          <span>Nouveau mot de passe (6 caractères min.)</span>
          <input className="input" type="password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} required minLength={6} autoComplete="new-password" />
        </label>
        <label className="field">
          <span>Confirmer</span>
          <input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required autoComplete="new-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy}>Modifier le mot de passe</button>
      </form>
    </Modal>
  )
}

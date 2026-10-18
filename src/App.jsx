import { useCallback, useEffect, useMemo, useState } from 'react'
import Login from './components/Login.jsx'
import Dashboard from './components/Dashboard.jsx'
import Tasks from './components/Tasks.jsx'
import Report from './components/Report.jsx'
import TaskForm from './components/TaskForm.jsx'
import Settings from './components/Settings.jsx'
import { Icon } from './components/ui.jsx'
import { api, currentMonth, initials, nowTime, todayIso } from './lib.js'

const VIEWS = [
  { id: 'accueil', label: 'Accueil', icon: 'home' },
  { id: 'taches', label: 'Mes tâches', icon: 'list' },
  { id: 'rapport', label: 'Rapport mensuel', icon: 'file' },
]

const viewFromHash = () => {
  const h = location.hash.replace('#', '')
  return VIEWS.some((v) => v.id === h) ? h : 'accueil'
}

export default function App() {
  const [profile, setProfile] = useState(undefined)
  const [tasks, setTasks] = useState([])
  const [view, setView] = useState(viewFromHash)
  const [month, setMonth] = useState(currentMonth)
  const [editing, setEditing] = useState(null) // null | {} (nouvelle) | tâche
  const [settings, setSettings] = useState(false)
  const [menu, setMenu] = useState(false)
  const [toast, setToast] = useState('')

  const notify = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }, [])

  const loadMe = useCallback(async () => {
    try {
      const { profile } = await api('/api/me')
      setProfile(profile)
      const { tasks } = await api('/api/tasks?scope=team')
      setTasks(tasks)
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    loadMe()
    const onHash = () => setView(viewFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [loadMe])

  const go = (id) => {
    location.hash = id
    setView(id)
  }

  const myTasks = useMemo(() => (profile ? tasks.filter((t) => t.profile_id === profile.id) : []), [tasks, profile])

  const handleError = (err) => {
    if (err.status === 401) setProfile(null)
    notify(err.message)
  }

  async function saveTask(data) {
    const { task } = data.id
      ? await api(`/api/tasks/${data.id}`, { method: 'PUT', body: data })
      : await api('/api/tasks', { method: 'POST', body: data })
    setTasks((list) => (data.id ? list.map((t) => (t.id === task.id ? task : t)) : [task, ...list]))
    setEditing(null)
    notify(data.id ? 'Tâche mise à jour' : 'Tâche ajoutée')
  }

  async function completeTask(t) {
    try {
      const end = t.end_date ? {} : { end_date: todayIso(), end_time: nowTime() }
      const { task } = await api(`/api/tasks/${t.id}`, { method: 'PUT', body: { ...t, ...end, status: 'terminee', progress: 100 } })
      setTasks((list) => list.map((x) => (x.id === task.id ? task : x)))
      notify('Tâche marquée comme terminée ✔')
    } catch (err) {
      handleError(err)
    }
  }

  async function deleteTask(t) {
    if (!confirm(`Supprimer la tâche « ${t.title} » ?`)) return
    try {
      await api(`/api/tasks/${t.id}`, { method: 'DELETE' })
      setTasks((list) => list.filter((x) => x.id !== t.id))
      notify('Tâche supprimée')
    } catch (err) {
      handleError(err)
    }
  }

  async function logout() {
    await api('/api/logout', { method: 'POST' }).catch(() => {})
    setProfile(null)
    setTasks([])
    setMenu(false)
  }

  if (profile === undefined) return <div className="loading">Chargement…</div>
  if (!profile) return <Login onLogged={loadMe} />

  const actions = { onEdit: setEditing, onComplete: completeTask, onDelete: deleteTask, onNew: () => setEditing({}) }

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <a className="brand" href="#accueil" onClick={() => go('accueil')}>
            <img src="/logo-hps.png" alt="HPS" />
            <span>Activités IT</span>
          </a>
          <nav className="nav">
            {VIEWS.map((v) => (
              <button key={v.id} className={view === v.id ? 'on' : ''} onClick={() => go(v.id)} title={v.label}>
                <Icon name={v.icon} />
                <span>{v.label}</span>
              </button>
            ))}
          </nav>
          <div className="me">
            <button onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
              <div className="me-name">
                <b>{profile.name}</b>
                <small>{profile.poste || 'Équipe IT'}</small>
              </div>
              <div className="avatar sm">{initials(profile.name)}</div>
            </button>
            {menu && (
              <div className="menu" onMouseLeave={() => setMenu(false)}>
                <button onClick={() => { setSettings(true); setMenu(false) }}>
                  <Icon name="user" /> Mon profil & mot de passe
                </button>
                <button onClick={logout}>
                  <Icon name="logout" /> Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        {view === 'accueil' && <Dashboard me={profile} tasks={tasks} month={month} setMonth={setMonth} {...actions} />}
        {view === 'taches' && <Tasks tasks={myTasks} month={month} setMonth={setMonth} {...actions} />}
        {view === 'rapport' && <Report me={profile} tasks={myTasks} month={month} setMonth={setMonth} notify={notify} />}
      </main>

      {editing && <TaskForm task={editing} onSave={saveTask} onClose={() => setEditing(null)} />}
      {settings && (
        <Settings
          me={profile}
          onClose={() => setSettings(false)}
          onSaved={(p) => {
            setProfile(p)
            setTasks((list) => list.map((t) => (t.profile_id === p.id ? { ...t, profile_name: p.name } : t)))
            notify('Profil mis à jour')
          }}
          notify={notify}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}

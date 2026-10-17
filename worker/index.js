import { CATEGORY_BY_ID, MAX_PROFILES, STATUS_BY_ID } from '../src/shared/catalog.js'

const SESSION_COOKIE = 'hps_session'
const SESSION_DAYS = 30
const PBKDF2_ITERATIONS = 100000 // plafond imposé par Workers

const enc = new TextEncoder()

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })

const fail = (status, message) => json({ error: message }, status)

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/* ---------- crypto ---------- */

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function hashPassword(password, saltB64) {
  const salt = saltB64 ? fromB64url(saltB64) : crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  )
  return { hash: b64url(bits), salt: b64url(salt) }
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function sessionKey(env) {
  let secret = env.SESSION_SECRET
  if (!secret) {
    const row = await env.DB.prepare("SELECT value FROM meta WHERE key = 'session_secret'").first()
    secret = row?.value
    if (!secret) {
      secret = b64url(crypto.getRandomValues(new Uint8Array(32)))
      await env.DB.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES ('session_secret', ?)").bind(secret).run()
      secret = (await env.DB.prepare("SELECT value FROM meta WHERE key = 'session_secret'").first()).value
    }
  }
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

async function createSessionCookie(env, profileId, secure) {
  const payload = b64url(enc.encode(JSON.stringify({ pid: profileId, exp: Date.now() + SESSION_DAYS * 864e5 })))
  const sig = b64url(await crypto.subtle.sign('HMAC', await sessionKey(env), enc.encode(payload)))
  return `${SESSION_COOKIE}=${payload}.${sig}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`
}

const clearCookie = (secure) => `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`

async function currentProfile(request, env) {
  const cookie = request.headers.get('cookie') || ''
  const raw = cookie.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  if (!raw) return null
  const [payload, sig] = raw.slice(SESSION_COOKIE.length + 1).split('.')
  if (!payload || !sig) return null
  try {
    const ok = await crypto.subtle.verify('HMAC', await sessionKey(env), fromB64url(sig), enc.encode(payload))
    if (!ok) return null
    const { pid, exp } = JSON.parse(new TextDecoder().decode(fromB64url(payload)))
    if (!pid || Date.now() > exp) return null
    return await env.DB.prepare('SELECT id, slot, name, poste, destinataire, created_at FROM profiles WHERE id = ?')
      .bind(pid)
      .first()
  } catch {
    return null
  }
}

/* ---------- validation ---------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const text = (v, max, field, required = false) => {
  const s = typeof v === 'string' ? v.trim() : ''
  if (required && !s) throw new HttpError(400, `Le champ « ${field} » est obligatoire.`)
  if (s.length > max) throw new HttpError(400, `Le champ « ${field} » est trop long (${max} caractères max).`)
  return s
}

function checkPassword(p) {
  if (typeof p !== 'string' || p.length < 6) throw new HttpError(400, 'Le mot de passe doit contenir au moins 6 caractères.')
  if (p.length > 200) throw new HttpError(400, 'Mot de passe trop long.')
  return p
}

function cleanTask(body) {
  if (!CATEGORY_BY_ID[body.category]) throw new HttpError(400, 'Catégorie inconnue.')
  const status = STATUS_BY_ID[body.status] ? body.status : 'en_cours'
  const start = body.start_date
  if (!ISO_DATE.test(start || '')) throw new HttpError(400, 'Date de début invalide.')
  let end = body.end_date || null
  if (end && !ISO_DATE.test(end)) throw new HttpError(400, 'Date de fin invalide.')
  if (end && end < start) throw new HttpError(400, 'La date de fin doit être postérieure à la date de début.')
  if (status === 'terminee' && !end) end = new Date().toISOString().slice(0, 10)
  let progress = Math.round(Number(body.progress) || 0)
  progress = Math.min(100, Math.max(0, progress))
  if (status === 'terminee') progress = 100
  const count = Math.min(9999, Math.max(1, Math.round(Number(body.count) || 1)))
  return {
    category: body.category,
    subcategory: text(body.subcategory, 120, 'Sous-catégorie'),
    title: text(body.title, 300, 'Tâche', true),
    beneficiary: text(body.beneficiary, 200, 'Pour qui'),
    start_date: start,
    end_date: end,
    status,
    progress,
    count,
    details: text(body.details, 4000, 'Détails'),
    highlight: body.highlight ? 1 : 0,
  }
}

const readJson = async (request) => {
  try {
    return await request.json()
  } catch {
    throw new HttpError(400, 'Requête invalide.')
  }
}

/* ---------- routes ---------- */

async function handleApi(request, env, url) {
  const { pathname } = url
  const method = request.method
  const secure = url.protocol === 'https:'

  if (pathname === '/api/profiles' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT id, slot, name, poste FROM profiles ORDER BY slot').all()
    const slots = Array.from({ length: MAX_PROFILES }, (_, i) => results.find((p) => p.slot === i + 1) || { slot: i + 1 })
    return json({ slots })
  }

  if (pathname === '/api/profiles' && method === 'POST') {
    const body = await readJson(request)
    const slot = Number(body.slot)
    if (!Number.isInteger(slot) || slot < 1 || slot > MAX_PROFILES) throw new HttpError(400, 'Emplacement de profil invalide.')
    const name = text(body.name, 80, 'Nom', true)
    const poste = text(body.poste, 120, 'Poste')
    const { hash, salt } = await hashPassword(checkPassword(body.password))
    const res = await env.DB.prepare(
      'INSERT INTO profiles (slot, name, poste, pass_hash, pass_salt) VALUES (?, ?, ?, ?, ?) ON CONFLICT(slot) DO NOTHING',
    )
      .bind(slot, name, poste, hash, salt)
      .run()
    if (!res.meta.changes) throw new HttpError(409, 'Ce profil a déjà été créé.')
    const id = res.meta.last_row_id
    return json({ ok: true }, 201, { 'set-cookie': await createSessionCookie(env, id, secure) })
  }

  if (pathname === '/api/login' && method === 'POST') {
    const body = await readJson(request)
    const row = await env.DB.prepare('SELECT id, pass_hash, pass_salt FROM profiles WHERE id = ?').bind(Number(body.id)).first()
    if (!row) throw new HttpError(401, 'Profil introuvable.')
    if (!row.pass_hash) {
      // Mot de passe réinitialisé par l'administrateur : le mot de passe saisi devient le nouveau.
      const { hash, salt } = await hashPassword(checkPassword(body.password))
      await env.DB.prepare('UPDATE profiles SET pass_hash = ?, pass_salt = ? WHERE id = ?').bind(hash, salt, row.id).run()
      return json({ ok: true }, 200, { 'set-cookie': await createSessionCookie(env, row.id, secure) })
    }
    const { hash } = await hashPassword(String(body.password || ''), row.pass_salt)
    if (!safeEqual(hash, row.pass_hash)) throw new HttpError(401, 'Mot de passe incorrect.')
    return json({ ok: true }, 200, { 'set-cookie': await createSessionCookie(env, row.id, secure) })
  }

  if (pathname === '/api/logout' && method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': clearCookie(secure) })
  }

  // ---- routes authentifiées ----
  const me = await currentProfile(request, env)
  if (!me) return fail(401, 'Session expirée. Veuillez vous reconnecter.')

  if (pathname === '/api/me' && method === 'GET') return json({ profile: me })

  if (pathname === '/api/me' && method === 'PUT') {
    const body = await readJson(request)
    const name = text(body.name, 80, 'Nom', true)
    const poste = text(body.poste, 120, 'Poste')
    const destinataire = text(body.destinataire, 120, 'Destinataire')
    await env.DB.prepare('UPDATE profiles SET name = ?, poste = ?, destinataire = ? WHERE id = ?')
      .bind(name, poste, destinataire, me.id)
      .run()
    return json({ profile: { ...me, name, poste, destinataire } })
  }

  if (pathname === '/api/me/password' && method === 'PUT') {
    const body = await readJson(request)
    const row = await env.DB.prepare('SELECT pass_hash, pass_salt FROM profiles WHERE id = ?').bind(me.id).first()
    const { hash: current } = await hashPassword(String(body.current || ''), row.pass_salt)
    if (!safeEqual(current, row.pass_hash)) throw new HttpError(400, 'Mot de passe actuel incorrect.')
    const { hash, salt } = await hashPassword(checkPassword(body.password))
    await env.DB.prepare('UPDATE profiles SET pass_hash = ?, pass_salt = ? WHERE id = ?').bind(hash, salt, me.id).run()
    return json({ ok: true })
  }

  if (pathname === '/api/tasks' && method === 'GET') {
    const team = url.searchParams.get('scope') === 'team'
    const sql = `SELECT t.*, p.name AS profile_name FROM tasks t JOIN profiles p ON p.id = t.profile_id
                 ${team ? '' : 'WHERE t.profile_id = ?'} ORDER BY t.start_date DESC, t.id DESC`
    const stmt = team ? env.DB.prepare(sql) : env.DB.prepare(sql).bind(me.id)
    const { results } = await stmt.all()
    return json({ tasks: results })
  }

  if (pathname === '/api/tasks' && method === 'POST') {
    const t = cleanTask(await readJson(request))
    const row = await env.DB.prepare(
      `INSERT INTO tasks (profile_id, category, subcategory, title, beneficiary, start_date, end_date, status, progress, count, details, highlight)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    )
      .bind(me.id, t.category, t.subcategory, t.title, t.beneficiary, t.start_date, t.end_date, t.status, t.progress, t.count, t.details, t.highlight)
      .first()
    return json({ task: { ...row, profile_name: me.name } }, 201)
  }

  const m = pathname.match(/^\/api\/tasks\/(\d+)$/)
  if (m) {
    const id = Number(m[1])
    const existing = await env.DB.prepare('SELECT profile_id FROM tasks WHERE id = ?').bind(id).first()
    if (!existing) throw new HttpError(404, 'Tâche introuvable.')
    if (existing.profile_id !== me.id) throw new HttpError(403, 'Vous ne pouvez modifier que vos propres tâches.')

    if (method === 'PUT') {
      const t = cleanTask(await readJson(request))
      const row = await env.DB.prepare(
        `UPDATE tasks SET category = ?, subcategory = ?, title = ?, beneficiary = ?, start_date = ?, end_date = ?, status = ?,
         progress = ?, count = ?, details = ?, highlight = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`,
      )
        .bind(t.category, t.subcategory, t.title, t.beneficiary, t.start_date, t.end_date, t.status, t.progress, t.count, t.details, t.highlight, id)
        .first()
      return json({ task: { ...row, profile_name: me.name } })
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run()
      return json({ ok: true })
    }
  }

  return fail(404, 'Route inconnue.')
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request)
    try {
      return await handleApi(request, env, url)
    } catch (err) {
      if (err instanceof HttpError) return fail(err.status, err.message)
      console.error(err)
      return fail(500, 'Erreur serveur.')
    }
  },
}

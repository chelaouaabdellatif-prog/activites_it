// Génération du rapport mensuel Excel aux couleurs HPS (police Exo 2, logo, 3 feuilles).
import { CATEGORIES, CATEGORY_BY_ID, categoryLabel } from './shared/catalog.js'
import { durationDays, fmtDate, isLate, monthBounds, monthLabel, stats, todayIso } from './lib.js'

const FONT = 'Exo 2'
const C = {
  orange: 'FFE96423',
  orangeDark: 'FFB8481A',
  orangeSoft: 'FFFDE6D6',
  orangeTint: 'FFFFF6EF',
  ink: 'FF2E2D32',
  inkSoft: 'FF3B3A40',
  grey: 'FF6E6D73',
  paper: 'FFF5F5F6',
  line: 'FFE6E5E8',
  white: 'FFFFFFFF',
  green: 'FF1E7B45',
  greenSoft: 'FFE6F4EC',
  red: 'FFC0392B',
  redSoft: 'FFFBE9E7',
  weekend: 'FFEDEDEF',
}
const FOOTER = 'HPS — Hasnaoui Profile Systems · Une Nouvelle Fenêtre, Une Nouvelle Sensation · Document interne'

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const font = (o = {}) => ({ name: FONT, size: 10, color: { argb: C.ink }, ...o, color: { argb: o.color || C.ink } })
const thin = (argb = C.line) => ({ style: 'thin', color: { argb } })

const toDate = (iso) => {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function style(cell, { f, bg, align, border, numFmt } = {}) {
  if (f) cell.font = font(f)
  if (bg) cell.fill = fill(bg)
  cell.alignment = { vertical: 'middle', wrapText: true, ...align }
  if (border) cell.border = border
  if (numFmt) cell.numFmt = numFmt
}

function merged(ws, range, value, opts) {
  ws.mergeCells(range)
  const cell = ws.getCell(range.split(':')[0])
  cell.value = value
  style(cell, opts)
  return cell
}

const statusView = (t) => {
  if (t.status === 'terminee') return { label: '✔ Terminée', color: C.green, bg: C.greenSoft }
  if (isLate(t)) return { label: '⚠ En retard', color: C.red, bg: C.redSoft }
  if (t.status === 'en_attente') return { label: '⏸ En attente', color: C.grey, bg: C.paper }
  return { label: '⏳ En cours', color: C.orangeDark, bg: C.orangeTint }
}

const estimateHeight = (texts, widths) => {
  let lines = 1
  texts.forEach((s, i) => {
    if (!s) return
    const perLine = Math.max(8, Math.floor(widths[i] * 1.15))
    const n = String(s)
      .split('\n')
      .reduce((acc, part) => acc + Math.max(1, Math.ceil(part.length / perLine)), 0)
    lines = Math.max(lines, n)
  })
  return Math.max(24, Math.min(400, lines * 12.5 + 10))
}

function sortForReport(tasks) {
  const order = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, i]))
  return [...tasks].sort(
    (a, b) =>
      (order[a.category] ?? 99) - (order[b.category] ?? 99) ||
      a.start_date.localeCompare(b.start_date) ||
      a.id - b.id,
  )
}

function addLogo(ws, imageId, col, width = 220, height = 52) {
  ws.addImage(imageId, { tl: { col, row: 0.18 }, ext: { width, height }, editAs: 'oneCell' })
}

function pageSetup(ws, title, printRow) {
  ws.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    ...(printRow ? { printTitlesRow: printRow } : {}),
  }
  ws.headerFooter = { oddFooter: `&L&8&"${FONT}"HPS — ${title}&R&8&"${FONT}"Page &P / &N` }
}

/* ---------------- Feuille 1 : rapport du mois ---------------- */

function sheetReport(wb, { profile, month, tasks, destinataire, logoId }) {
  const label = monthLabel(month)
  const ws = wb.addWorksheet(label, {
    properties: { tabColor: { argb: C.orange } },
    views: [{ state: 'frozen', ySplit: 8, showGridLines: false, zoomScale: 85 }],
  })
  const widths = [6, 26, 24, 42, 14, 12, 12, 12, 9, 9, 24, 56]
  ws.columns = widths.map((width) => ({ width }))
  const s = stats(tasks)
  const { start, end } = monthBounds(month)

  ws.getRow(1).height = 54
  merged(ws, 'A1:I1', `📋 Rapport d'activité mensuel — ${label}`, {
    f: { bold: true, size: 18 },
    align: { indent: 1, wrapText: false },
  })
  addLogo(ws, logoId, 11.35)
  ws.getRow(2).height = 18
  merged(ws, 'A2:I2', `Service Informatique — HPS · Généré le ${fmtDate(todayIso())}`, {
    f: { italic: true, size: 9, color: C.grey },
    align: { indent: 1, wrapText: false },
  })

  const info = [
    ['👤 Nom', profile.name],
    ['💼 Poste', profile.poste || '—'],
    ['📅 Période', `${fmtDate(start)} au ${fmtDate(end)}`],
    ['📨 Destinataire', destinataire || '—'],
  ]
  const kpis = [
    [['✅ Tâches terminées', s.done, '0'], ['⏳ Tâches en cours', s.doing, '0']],
    [['🔁 Total interventions', s.interventions, '0'], ['⏸️ Tâches en attente', s.waiting, '0']],
    [['📊 Taux de réalisation', s.rate, '0%'], ['📈 Avancement moyen', s.avgProgress, '0%']],
    [['📝 Total des tâches', s.total, '0'], ['⚠️ Tâches en retard', s.late, '0']],
  ]
  const sep = { bottom: thin(C.white) }
  info.forEach(([k, v], i) => {
    const r = 3 + i
    ws.getRow(r).height = 22
    merged(ws, `A${r}:B${r}`, k, { f: { bold: true, color: C.white }, bg: C.inkSoft, align: { indent: 1 }, border: sep })
    merged(ws, `C${r}:E${r}`, v, { f: { bold: true }, bg: C.paper, align: { indent: 1 }, border: sep })
    kpis[i].forEach(([kl, kv, fmt], j) => {
      const [lc1, lc2, vc] = j === 0 ? ['G', 'H', 'I'] : ['J', 'K', 'L']
      merged(ws, `${lc1}${r}:${lc2}${r}`, kl, {
        f: { bold: true, color: C.orangeDark },
        bg: C.orangeTint,
        align: { indent: 1, wrapText: false },
        border: { ...sep, left: { style: 'thick', color: { argb: C.orange } } },
      })
      const c = ws.getCell(`${vc}${r}`)
      c.value = kv
      style(c, { f: { bold: true, size: 13, color: C.orange }, bg: C.orangeTint, align: { horizontal: 'left', indent: 1 }, border: sep, numFmt: fmt })
    })
  })
  ws.getRow(7).height = 8

  const headers = ['N°', '🏷️ Catégorie', '🧩 Sous-catégorie', '📝 Tâche', '📌 Statut', '📈 Avancement', '📅 Début', '🏁 Fin', '⏱️ Durée (j)', '🔢 Nb de fois', '👥 Pour qui (service / personne)', '💬 Détails / Remarques']
  const hr = ws.getRow(8)
  hr.height = 32
  headers.forEach((h, i) => {
    const c = hr.getCell(i + 1)
    c.value = h
    style(c, {
      f: { bold: true, color: C.white },
      bg: C.ink,
      align: { horizontal: [0, 4, 5, 6, 7, 8, 9].includes(i) ? 'center' : 'left', indent: [0, 4, 5, 6, 7, 8, 9].includes(i) ? 0 : 1 },
      border: { bottom: { style: 'medium', color: { argb: C.orange } } },
    })
  })

  let r = 9
  let n = 1
  const rowBorder = { bottom: thin() }
  const sorted = sortForReport(tasks)
  const groups = CATEGORIES.map((cat) => ({ cat, items: sorted.filter((t) => t.category === cat.id) })).filter((g) => g.items.length)

  if (!groups.length) {
    ws.getRow(r).height = 30
    merged(ws, `A${r}:L${r}`, 'Aucune tâche enregistrée pour cette période.', {
      f: { italic: true, color: C.grey },
      bg: C.paper,
      align: { horizontal: 'center' },
    })
    r++
  }

  for (const { cat, items } of groups) {
    const gs = stats(items)
    ws.getRow(r).height = 26
    merged(
      ws,
      `A${r}:L${r}`,
      `${cat.icon}  ${cat.label.toUpperCase()}   ·   ${gs.total} tâche${gs.total > 1 ? 's' : ''} · ${gs.done} terminée${gs.done > 1 ? 's' : ''} · ${gs.interventions} intervention${gs.interventions > 1 ? 's' : ''}`,
      { f: { bold: true, size: 11, color: C.white }, bg: C.orange, align: { indent: 1, wrapText: false } },
    )
    r++
    for (const t of items) {
      const st = statusView(t)
      const row = ws.getRow(r)
      const values = [
        n++,
        categoryLabel(t.category),
        t.subcategory || '—',
        (t.highlight ? '⭐ ' : '') + t.title,
        st.label,
        (Number(t.progress) || 0) / 100,
        toDate(t.start_date),
        toDate(t.status === 'terminee' ? t.end_date || t.start_date : t.end_date),
        durationDays(t),
        t.status === 'terminee' ? Number(t.count) || 1 : Number(t.count) || null,
        t.beneficiary || '—',
        t.details || '',
      ]
      values.forEach((v, i) => {
        row.getCell(i + 1).value = v ?? ''
      })
      style(row.getCell(1), { f: { bold: true, color: C.grey }, bg: C.paper, align: { horizontal: 'center' }, border: rowBorder })
      style(row.getCell(2), { f: { bold: true, color: C.orangeDark }, bg: C.orangeSoft, align: { indent: 1 }, border: rowBorder })
      style(row.getCell(3), { f: { color: C.inkSoft }, bg: C.white, align: { indent: 1 }, border: rowBorder })
      style(row.getCell(4), { f: { bold: true }, bg: C.white, align: { indent: 1 }, border: rowBorder })
      style(row.getCell(5), { f: { bold: true, color: st.color }, bg: st.bg, align: { horizontal: 'center' }, border: rowBorder })
      style(row.getCell(6), { f: { bold: true, size: 11, color: t.progress >= 100 ? C.green : C.orange }, bg: C.orangeTint, align: { horizontal: 'center' }, border: rowBorder, numFmt: '0%' })
      ;[7, 8].forEach((ci) => style(row.getCell(ci), { bg: C.white, align: { horizontal: 'center' }, border: rowBorder, numFmt: 'dd/mm/yyyy' }))
      ;[9, 10].forEach((ci) => style(row.getCell(ci), { f: { bold: true }, bg: C.white, align: { horizontal: 'center' }, border: rowBorder, numFmt: '0' }))
      style(row.getCell(11), { bg: C.white, align: { indent: 1 }, border: rowBorder })
      style(row.getCell(12), { f: { size: 9 }, bg: C.white, align: { indent: 1 }, border: rowBorder })
      row.height = estimateHeight([values[3], values[11], values[10], values[2]], [widths[3], widths[11], widths[10], widths[2]])
      r++
    }
  }

  if (groups.length) ws.autoFilter = `A8:L${r - 1}`
  ws.getRow(r).height = 8
  r++
  const totals = [
    ['✅ Nombre de tâches terminées', s.done, '0'],
    ['⏳ Nombre de tâches en cours / en attente', s.doing + s.waiting, '0'],
    ["🔁 Nombre total d'interventions", s.interventions, '0'],
    ['📊 Taux de réalisation', s.rate, '0%'],
  ]
  for (const [k, v, fmt] of totals) {
    ws.getRow(r).height = 26
    merged(ws, `B${r}:D${r}`, k, { f: { bold: true, size: 11, color: C.white }, bg: C.ink, align: { horizontal: 'right', indent: 1, wrapText: false }, border: sep })
    merged(ws, `E${r}:F${r}`, v, { f: { bold: true, size: 13, color: C.white }, bg: C.orange, align: { horizontal: 'center' }, border: sep, numFmt: fmt })
    r++
  }
  r++
  merged(ws, `A${r}:L${r}`, FOOTER, { f: { italic: true, size: 8, color: C.grey }, align: { horizontal: 'center', wrapText: false } })

  pageSetup(ws, `Rapport d'activité ${label} — ${profile.name}`, '8:8')
}

/* ---------------- Feuille 2 : synthèse ---------------- */

function sheetSummary(wb, { profile, month, tasks, logoId }) {
  const label = monthLabel(month)
  const ws = wb.addWorksheet('Synthèse', {
    properties: { tabColor: { argb: C.ink } },
    views: [{ showGridLines: false }],
  })
  ws.columns = [3, 40, 15, 15, 15, 16, 17, 3].map((width) => ({ width }))
  const s = stats(tasks)

  ws.getRow(1).height = 54
  merged(ws, 'B1:E1', `📊 Synthèse — ${label}`, { f: { bold: true, size: 18 }, align: { wrapText: false } })
  addLogo(ws, logoId, 5.25, 200, 48)
  merged(ws, 'B2:E2', `${profile.name}${profile.poste ? ' · ' + profile.poste : ''}`, { f: { italic: true, size: 9, color: C.grey }, align: { wrapText: false } })

  let r = 4
  const section = (title) => {
    ws.getRow(r).height = 26
    merged(ws, `B${r}:G${r}`, title, { f: { bold: true, size: 12 }, border: { bottom: { style: 'medium', color: { argb: C.orange } } }, align: { wrapText: false } })
    r++
  }
  const tableHeader = (cols) => {
    const row = ws.getRow(r)
    row.height = 28
    cols.forEach((h, i) => {
      const c = row.getCell(i + 2)
      c.value = h
      style(c, {
        f: { bold: true, color: C.white },
        bg: C.ink,
        align: { horizontal: i ? 'center' : 'left', indent: i ? 0 : 1 },
        border: { bottom: { style: 'medium', color: { argb: C.orange } } },
      })
    })
    r++
  }

  section('⭐ Indicateurs clés')
  const tiles = [
    ['📝 Total tâches', s.total, '0'],
    ['✅ Terminées', s.done, '0'],
    ['⏳ En cours', s.doing, '0'],
    ['⏸️ En attente', s.waiting, '0'],
    ['🔁 Interventions', s.interventions, '0'],
    ['📊 Réalisation', s.rate, '0%'],
  ]
  ws.getRow(r).height = 24
  ws.getRow(r + 1).height = 40
  tiles.forEach(([k, v, fmt], i) => {
    const top = ws.getRow(r).getCell(i + 2)
    top.value = k
    style(top, { f: { bold: true, color: C.orangeDark }, bg: C.orangeTint, align: { horizontal: 'center' }, border: { top: { style: 'thick', color: { argb: C.orange } }, left: thin(C.white) } })
    const val = ws.getRow(r + 1).getCell(i + 2)
    val.value = v
    style(val, { f: { bold: true, size: 22, color: C.orange }, bg: C.orangeTint, align: { horizontal: 'center' }, border: { left: thin(C.white) }, numFmt: fmt })
  })
  r += 3

  section('🏷️ Répartition par catégorie')
  tableHeader(['Catégorie', '📝 Tâches', '✅ Terminées', '⏳ En cours', '🔁 Interventions', '📊 Part des tâches'])
  const byCat = CATEGORIES.map((cat) => ({ cat, items: tasks.filter((t) => t.category === cat.id) })).filter((g) => g.items.length)
  const rowB = { bottom: thin() }
  for (const { cat, items } of byCat) {
    const gs = stats(items)
    const row = ws.getRow(r)
    row.height = 22
    ;[`${cat.icon} ${cat.label}`, gs.total, gs.done, gs.doing + gs.waiting, gs.interventions, s.total ? gs.total / s.total : 0].forEach((v, i) => {
      const c = row.getCell(i + 2)
      c.value = v
      if (i === 0) style(c, { f: { bold: true, color: C.orangeDark }, bg: C.orangeSoft, align: { indent: 1 }, border: rowB })
      else style(c, { bg: C.white, align: { horizontal: 'center' }, border: rowB, numFmt: i === 5 ? '0%' : '0' })
    })
    r++
  }
  {
    const row = ws.getRow(r)
    row.height = 24
    ;['Total', s.total, s.done, s.doing + s.waiting, s.interventions, s.total ? 1 : 0].forEach((v, i) => {
      const c = row.getCell(i + 2)
      c.value = v
      style(c, i === 0
        ? { f: { bold: true, size: 11, color: C.white }, bg: C.ink, align: { horizontal: 'right', indent: 1 } }
        : { f: { bold: true, size: 11, color: C.white }, bg: C.orange, align: { horizontal: 'center' }, numFmt: i === 5 ? '0%' : '0' })
    })
    r += 2
  }

  section('🧩 Détail par sous-catégorie')
  tableHeader(['Catégorie › Sous-catégorie', '📝 Tâches', '✅ Terminées', '⏳ En cours', '🔁 Interventions', '📈 Avancement moyen'])
  for (const { cat, items } of byCat) {
    const subs = [...new Set(items.map((t) => t.subcategory || '—'))]
    for (const sub of subs) {
      const gs = stats(items.filter((t) => (t.subcategory || '—') === sub))
      const row = ws.getRow(r)
      row.height = 21
      ;[`${cat.icon} ${cat.label} › ${sub}`, gs.total, gs.done, gs.doing + gs.waiting, gs.interventions, gs.avgProgress].forEach((v, i) => {
        const c = row.getCell(i + 2)
        c.value = v
        if (i === 0) style(c, { f: { color: C.inkSoft }, bg: C.paper, align: { indent: 1 }, border: rowB })
        else style(c, { bg: C.white, align: { horizontal: 'center' }, border: rowB, numFmt: i === 5 ? '0%' : '0' })
      })
      r++
    }
  }
  r++

  section("⚠️ Points d'attention")
  const late = tasks.filter(isLate)
  const waiting = tasks.filter((t) => t.status === 'en_attente')
  const attention = [
    ...late.map((t) => `⚠ En retard (fin prévue le ${fmtDate(t.end_date)}) — ${t.title} · ${t.progress}%`),
    ...waiting.map((t) => `⏸ En attente — ${t.title}${t.details ? ' : ' + t.details.split('\n')[0].slice(0, 120) : ''}`),
  ]
  if (!attention.length) attention.push('✔ Aucune tâche en retard ni en attente sur la période.')
  for (const line of attention) {
    ws.getRow(r).height = estimateHeight([line], [110])
    merged(ws, `B${r}:G${r}`, line, { f: { size: 10, color: line.startsWith('⚠') ? C.red : C.ink }, bg: line.startsWith('⚠') ? C.redSoft : C.orangeTint, align: { indent: 1 }, border: { bottom: thin(C.white) } })
    r++
  }
  r++

  section('🏆 Faits marquants du mois')
  let highlights = tasks.filter((t) => t.highlight)
  if (!highlights.length) {
    highlights = tasks
      .filter((t) => t.status === 'terminee')
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 5)
  }
  if (!highlights.length) highlights = [{ title: 'Aucune tâche terminée sur la période.', category: '' }]
  for (const t of highlights) {
    const icon = CATEGORY_BY_ID[t.category]?.icon || '•'
    const line = `${icon} ${t.title}${t.details ? ' — ' + t.details.split('\n')[0].slice(0, 160) : ''}`
    ws.getRow(r).height = estimateHeight([line], [110])
    merged(ws, `B${r}:G${r}`, line, { f: { size: 10 }, bg: C.orangeTint, align: { indent: 1 }, border: { bottom: thin(C.white) } })
    r++
  }
  r++
  merged(ws, `B${r}:G${r}`, FOOTER, { f: { italic: true, size: 8, color: C.grey }, align: { horizontal: 'center', wrapText: false } })

  pageSetup(ws, `Synthèse ${label} — ${profile.name}`)
  ws.pageSetup.orientation = 'portrait'
}

/* ---------------- Feuille 3 : planning (Gantt) ---------------- */

function sheetPlanning(wb, { profile, month, tasks, logoId }) {
  const label = monthLabel(month)
  const ws = wb.addWorksheet('Planning', {
    properties: { tabColor: { argb: C.orangeDark } },
    views: [{ state: 'frozen', xSplit: 3, ySplit: 4, showGridLines: false, zoomScale: 90 }],
  })
  const { start, end } = monthBounds(month)
  const lastDay = Number(end.slice(8))
  ws.columns = [{ width: 6 }, { width: 44 }, { width: 13 }, ...Array.from({ length: lastDay }, () => ({ width: 3.6 }))]
  const lastCol = ws.getColumn(3 + lastDay).letter

  ws.getRow(1).height = 54
  merged(ws, `A1:${ws.getColumn(3 + Math.min(lastDay, 18)).letter}1`, `🗓️ Planning des tâches — ${label}`, { f: { bold: true, size: 18 }, align: { indent: 1, wrapText: false } })
  addLogo(ws, logoId, 3 + lastDay - 8.6, 200, 48)
  merged(ws, `A2:${ws.getColumn(3 + Math.min(lastDay, 18)).letter}2`, `${profile.name} · ■ Terminée   ■ En cours   ■ En attente   (vendredi et samedi grisés)`, {
    f: { italic: true, size: 9, color: C.grey },
    align: { indent: 1, wrapText: false },
  })

  const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
  const hr = ws.getRow(4)
  const hd = ws.getRow(3)
  hr.height = 22
  hd.height = 16
  ;['N°', '📝 Tâche', '📌 Statut'].forEach((h, i) => {
    ws.mergeCells(3, i + 1, 4, i + 1)
    const c = hd.getCell(i + 1)
    c.value = h
    style(c, { f: { bold: true, color: C.white }, bg: C.ink, align: { horizontal: i === 1 ? 'left' : 'center', indent: i === 1 ? 1 : 0 }, border: { bottom: { style: 'medium', color: { argb: C.orange } } } })
  })
  const weekend = []
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, d).getDay()
    weekend[d] = dow === 5 || dow === 6
    const top = hd.getCell(3 + d)
    top.value = days[dow]
    style(top, { f: { bold: true, size: 8, color: weekend[d] ? C.orange : C.line }, bg: C.ink, align: { horizontal: 'center' } })
    const c = hr.getCell(3 + d)
    c.value = d
    style(c, { f: { bold: true, size: 9, color: C.white }, bg: C.ink, align: { horizontal: 'center' }, border: { bottom: { style: 'medium', color: { argb: C.orange } } } })
  }

  let r = 5
  sortForReport(tasks).forEach((t, i) => {
    const row = ws.getRow(r)
    row.height = 20
    const st = statusView(t)
    row.getCell(1).value = i + 1
    style(row.getCell(1), { f: { bold: true, color: C.grey }, bg: C.paper, align: { horizontal: 'center' }, border: { bottom: thin() } })
    row.getCell(2).value = `${CATEGORY_BY_ID[t.category]?.icon || ''} ${t.title}`
    style(row.getCell(2), { f: { bold: true }, bg: C.white, align: { indent: 1, wrapText: false }, border: { bottom: thin() } })
    row.getCell(3).value = st.label
    style(row.getCell(3), { f: { bold: true, size: 9, color: st.color }, bg: st.bg, align: { horizontal: 'center', wrapText: false }, border: { bottom: thin() } })
    const tEnd = t.status === 'terminee' ? t.end_date || t.start_date : t.end_date || todayIso()
    const bar = t.status === 'terminee' ? C.orange : t.status === 'en_attente' ? 'FFB5B4BA' : isLate(t) ? C.red : 'FFF4A06F'
    for (let d = 1; d <= lastDay; d++) {
      const iso = `${month}-${String(d).padStart(2, '0')}`
      const c = row.getCell(3 + d)
      const active = iso >= t.start_date && iso <= tEnd && iso >= start && iso <= end
      c.fill = fill(active ? bar : weekend[d] ? C.weekend : C.white)
      c.border = { bottom: thin(), right: thin(active ? bar : C.line) }
    }
    r++
  })
  if (!tasks.length) {
    merged(ws, `A${r}:${lastCol}${r}`, 'Aucune tâche sur la période.', { f: { italic: true, color: C.grey }, align: { horizontal: 'center' } })
    r++
  }
  r++
  merged(ws, `A${r}:${lastCol}${r}`, FOOTER, { f: { italic: true, size: 8, color: C.grey }, align: { horizontal: 'center', wrapText: false } })
  pageSetup(ws, `Planning ${label} — ${profile.name}`, '3:4')
}

/* ---------------- export ---------------- */

export async function buildReport({ profile, month, tasks, destinataire }) {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = profile.name
  wb.company = 'HPS — Hasnaoui Profile Systems'
  wb.title = `Rapport d'activité ${monthLabel(month)}`
  wb.created = new Date()

  const logo = await fetch('/logo-hps.png').then((r) => r.arrayBuffer())
  const logoId = wb.addImage({ buffer: logo, extension: 'png' })
  const ctx = { profile, month, tasks, destinataire, logoId }

  sheetReport(wb, ctx)
  sheetSummary(wb, ctx)
  sheetPlanning(wb, ctx)

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export const reportFileName = (profile, month) => {
  const first = (profile.name || 'Profil').split(/\s+/)[0].normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]/g, '')
  return `Rapport_Activite_${monthLabel(month).replace(' ', '_').normalize('NFD').replace(/[̀-ͯ]/g, '')}_${first}.xlsx`
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

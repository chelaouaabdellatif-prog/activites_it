// Catalogue partagé entre l'interface et le Worker : catégories, sous-catégories et statuts.

export const MAX_PROFILES = 3

export const CATEGORIES = [
  {
    id: 'helpdesk',
    label: 'Helpdesk & Support',
    icon: '🛠️',
    subs: [
      'Problème réseau / Internet',
      'Messagerie (Outlook)',
      'VPN / accès à distance',
      'Installation & configuration de poste',
      'Imprimantes & périphériques',
      'Comptes & mots de passe',
      'Logiciels bureautiques',
      'Téléphonie',
    ],
  },
  {
    id: 'dev',
    label: "Développement d'applications",
    icon: '📱',
    subs: [
      'Application mobile iOS',
      'Application mobile Android',
      'Application web',
      'Application PC / desktop',
      'Publication sur les stores',
      'Maintenance & correctifs',
      'Tests & recette',
    ],
  },
  {
    id: 'web',
    label: 'Web & Digital',
    icon: '🌐',
    subs: [
      'Site web',
      'SEO / référencement',
      'Domaines, DNS & redirections',
      'Hébergement (Cloudflare…)',
      'Réseaux sociaux',
      'Contenus & visuels',
    ],
  },
  {
    id: 'db',
    label: 'Base de données',
    icon: '🗄️',
    subs: [
      'Création / modélisation',
      'Import & nettoyage de données',
      'Requêtes & optimisation',
      'Sauvegarde & restauration',
      'Migration',
    ],
  },
  {
    id: 'bi',
    label: 'Reporting & BI',
    icon: '📊',
    subs: [
      'Création de rapport',
      'Mise à jour de rapport / KPI',
      'Tableau de bord',
      'Analyse de données',
      'Extraction / export',
    ],
  },
  {
    id: 'crm',
    label: 'Dashboard & CRM HPS',
    icon: '📈',
    subs: [
      'HPS CRM',
      'My Score HPS',
      'Intégration de listes',
      'Grands comptes / projets',
      'Suivi & analyse',
    ],
  },
  {
    id: 'infra',
    label: 'Infrastructure & Réseau',
    icon: '🖧',
    subs: [
      'Serveurs',
      'Réseau LAN / Wi-Fi',
      'Pare-feu & routeurs',
      'Virtualisation',
      'Câblage & matériel réseau',
    ],
  },
  {
    id: 'secu',
    label: 'Sécurité informatique',
    icon: '🔐',
    subs: [
      'Antivirus / EDR',
      'Gestion des accès & droits',
      'Sauvegardes',
      'Audit & conformité',
      'Incident de sécurité',
    ],
  },
  {
    id: 'parc',
    label: 'Matériel & Parc informatique',
    icon: '💻',
    subs: [
      'Inventaire',
      'Achat & devis',
      'Préparation de poste',
      'Réparation & maintenance',
      'Affectation de matériel',
    ],
  },
  {
    id: 'erp',
    label: 'ERP & Logiciels métiers',
    icon: '🧩',
    subs: ['Paramétrage', 'Licences', 'Assistance utilisateurs', 'Mises à jour', 'Intégration / interfaces'],
  },
  {
    id: 'formation',
    label: 'Présentation & Formation',
    icon: '🎤',
    subs: ['Présentation', 'Formation utilisateurs', 'Documentation / procédures', 'Traduction & analyse de fiches'],
  },
  {
    id: 'doc',
    label: 'Documentation IT',
    icon: '📚',
    subs: ['Mise à jour', "Rapport d'incident", 'Administration', 'Journal des changements', 'Alimentation'],
  },
  {
    id: 'gestion',
    label: 'Gestion / Direction',
    icon: '💼',
    subs: ['Réunion', 'Préparation de présentation', 'Reporting direction', 'Planification & budget'],
  },
  {
    id: 'appels',
    label: 'Appels téléphoniques',
    icon: '📞',
    subs: ['Appels clients', 'Appels internes', 'Appels fournisseurs'],
  },
  {
    id: 'relance',
    label: 'Relance & Suivi',
    icon: '🔔',
    subs: ['Relance interne', 'Relance fournisseur / prestataire', 'Suivi de demande'],
  },
  {
    id: 'event',
    label: 'Événements & Salons',
    icon: '🏛️',
    subs: ['Préparation', 'Présence sur site', 'Regroupement commercial', 'Bilan'],
  },
  {
    id: 'autre',
    label: 'Autre',
    icon: '📦',
    subs: ['Divers'],
  },
]

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))

export const categoryLabel = (id) => {
  const c = CATEGORY_BY_ID[id]
  return c ? `${c.icon} ${c.label}` : id
}

export const STATUSES = [
  { id: 'en_cours', label: 'En cours', icon: '⏳' },
  { id: 'en_attente', label: 'En attente', icon: '⏸️' },
  { id: 'terminee', label: 'Terminée', icon: '✅' },
]

export const STATUS_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s]))

# HPS — Activités IT

Application web de suivi des tâches et de génération des rapports d'activité mensuels de l'équipe informatique HPS.

- **3 profils** : chaque membre crée son profil (nom, poste, mot de passe) à la première connexion.
- **Tâches** : catégorie, sous-catégorie, dates de début et de fin, statut (en cours / en attente / terminée), avancement en %, nombre d'interventions, bénéficiaire, détails et ⭐ fait marquant.
- **Accueil** : taux de réalisation, tâches en cours et terminées, tâches en retard, répartition par catégorie, vue « Mes tâches » ou « Équipe IT ».
- **Rapport mensuel** : Excel aux couleurs HPS (logo, police Exo 2) avec 3 feuilles : le mois détaillé, la synthèse et le planning (Gantt).

Stack : React + Vite, Cloudflare Worker (API + fichiers statiques), base Cloudflare D1, export Excel avec ExcelJS (dans le navigateur).

## Structure

```
worker/index.js          API : profils, connexion, sessions, tâches
migrations/              schéma de la base D1
src/shared/catalog.js    catégories, sous-catégories, statuts (à modifier ici)
src/excel.js             génération du rapport Excel
src/components/          écrans (connexion, accueil, tâches, rapport, profil)
public/                  logo HPS et police Exo 2
```

## Développement local

```bash
npm install
npm run db:migrate:local
npm run dev
```

## Déploiement sur Cloudflare

Le dépôt est relié à Cloudflare (*Workers & Pages* → *Import a repository*) :

- Build command : `npm run build`
- Deploy command : `npx wrangler deploy`

Chaque push sur `main` redéploie l'application. Aucune configuration de base n'est nécessaire :

- au premier déploiement, `wrangler deploy` crée la base D1 `activites-it` (aucun `database_id` à renseigner) ;
- au premier appel de l'API, le Worker crée les tables (`migrations/0001_init.sql`).

L'application est disponible sur `https://activites-it.<votre-sous-domaine>.workers.dev`.

> Le premier qui ouvre un emplacement de profil vide le crée. Après le déploiement, demandez aux 3 membres de l'équipe de créer leur profil rapidement.

## Mot de passe oublié

Réinitialisez le mot de passe (les tâches sont conservées) :

```bash
npx wrangler d1 execute activites-it --remote --command "UPDATE profiles SET pass_hash = '' WHERE slot = 1"
```

La même requête SQL peut aussi être lancée depuis le tableau de bord Cloudflare : *Storage & Databases* → *D1* → `activites-it` → *Console*.

Remplacez `1` par le numéro du profil (1, 2 ou 3). À la connexion suivante, le mot de passe saisi devient le nouveau mot de passe.

## Notes

- Les mots de passe sont hachés (PBKDF2-SHA256), et la session est un cookie signé valable 30 jours.
- Les catégories et sous-catégories se modifient dans `src/shared/catalog.js`. Un champ « Autre (préciser) » permet aussi de saisir une sous-catégorie libre.
- Une tâche non terminée apparaît dans chaque mois où elle est active, jusqu'à sa clôture.
- La police **Exo 2** doit être installée sur le PC qui ouvre l'Excel (fichiers dans `public/fonts`). Sinon, Excel affiche une police de remplacement.

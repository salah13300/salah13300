# EV Price Watch

Application web qui suit l'évolution des prix des Tesla neuves (tous modèles,
plusieurs pays), affiche l'historique, et envoie une alerte email quand un
prix atteint son plus bas historique.

## Comment ça marche

1. **Scraper** (`lib/scraper.ts`) — interroge les endpoints publics du
   configurateur Tesla par pays/modèle et récupère le prix affiché.
2. **Cron** (`scripts/check-prices.ts`) — exécuté périodiquement (ex: toutes
   les 2h), il appelle le scraper, enregistre chaque relevé en base, et
   compare au minimum historique.
3. **Base de données** (Postgres, schéma dans `prisma/schema.prisma`) —
   stocke l'historique de prix et les abonnements des utilisateurs.
4. **Alertes** (`lib/notify.ts`) — quand un nouveau plus bas est détecté,
   envoie un email via Resend aux abonnés concernés.
5. **Frontend** (`app/page.tsx`) — page publique avec courbes de prix par
   pays/modèle et formulaire d'abonnement.

## Stack

- Next.js 14 (App Router) — frontend + API routes
- Postgres (recommandé : [Neon](https://neon.tech), gratuit pour démarrer)
- Prisma — ORM / migrations
- Resend — envoi d'emails
- Déploiement : Vercel (frontend + API) + Vercel Cron ou GitHub Actions
  (pour le scraping périodique)

## Démarrage

```bash
npm install
cp .env.example .env   # renseigner DATABASE_URL et RESEND_API_KEY
npx prisma migrate dev --name init
npm run dev
```

## Déploiement (résumé)

1. Créer une base Postgres sur Neon, copier l'URL dans `DATABASE_URL`
2. Créer un compte [Resend](https://resend.com), copier la clé API
3. Déployer sur Vercel :
   - Ce repo contient plusieurs projets — dans les réglages du projet
     Vercel, mettre **Root Directory** sur `tesla-price-tracker`
   - **Framework Preset** : `Next.js` (sinon Vercel cherche un dossier
     `public` et échoue)
   - **Build Command** (override) : `npx prisma db push && next build`
     — synchronise le schéma Prisma avec la base à chaque déploiement.
     Aucune migration versionnée n'existe encore dans ce projet ; `db push`
     est adapté pour démarrer. À remplacer par de vraies migrations
     (`prisma migrate dev` en local, puis `migrate deploy` ici) avant que
     la base ne contienne des données réelles à préserver.
   - Renseigner toutes les variables de `.env.example` dans les
     "Environment Variables" du projet
4. Configurer un Cron Vercel (`vercel.json`) qui appelle
   `POST /api/prices/check` toutes les 2h — voir `vercel.json`

## Important : à savoir sur le scraping Tesla

Tesla n'expose pas d'API publique officielle. Les endpoints utilisés dans
`lib/scraper.ts` sont ceux du configurateur web, largement utilisés par la
communauté (voir des projets comme TeslaTracker), mais :

- Ils peuvent changer sans préavis → prévoir une surveillance/alertes en cas
  d'échec du scraper.
- Respecter un rythme raisonnable de requêtes pour éviter tout blocage.
- Vérifier les conditions d'utilisation de tesla.com avant une mise en
  production publique à grande échelle.

## Paiement (abonnement 3,99€/mois) et sécurité

Le paiement passe entièrement par **Stripe Checkout** : les numéros de carte
ne transitent jamais par ce serveur, ce qui élimine le risque de vol de
données bancaires même en cas de compromission de l'app.

Mise en place :
1. Crée un compte Stripe, active le mode Test
2. Dashboard Stripe > Produits > créer un produit à 3,99€/mois récurrent →
   copier son `price_id` dans `STRIPE_PRICE_ID`
3. Dashboard Stripe > Développeurs > Webhooks > ajouter un endpoint pointant
   vers `https://ton-domaine.com/api/webhooks/stripe`, événements à écouter :
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`
   → copier le secret de signature dans `STRIPE_WEBHOOK_SECRET`
4. Teste avec les [cartes de test Stripe](https://stripe.com/docs/testing)
   avant de passer en clés live (`sk_live_...`)

Règles de sécurité déjà appliquées dans le code :
- `lib/stripe.ts` utilise uniquement la clé **secrète** côté serveur, jamais
  exposée au frontend
- `app/api/webhooks/stripe/route.ts` **vérifie la signature** de chaque
  webhook — sans ça, n'importe qui pourrait falsifier un paiement
- `app/api/subscribe/route.ts` vérifie que `subscriptionStatus === "active"`
  avant de créer une alerte : seul le webhook Stripe (signé) peut faire
  passer ce statut à `active`, jamais une requête directe du frontend
- Aucune donnée bancaire n'est stockée en base — seulement des identifiants
  Stripe (`stripeCustomerId`, `stripeSubscriptionId`)

À ajouter avant une mise en production réelle :
- [ ] HTTPS obligatoire (automatique sur Vercel)
- [ ] Rate limiting sur `/api/checkout` et `/api/subscribe` (ex: Upstash)
- [ ] Page de gestion d'abonnement (lien vers le Portail Client Stripe pour
      que l'utilisateur résilie/mette à jour sa carte lui-même)
- [ ] Journalisation des erreurs (Sentry) sans jamais logger d'infos
      sensibles (emails complets, tokens)

## Actus Tesla quotidiennes

Deux niveaux d'accès :
- **Aperçu public gratuit** (`/api/news/preview`) : les 3 derniers articles,
  affichés directement sur la page d'accueil pour donner envie de
  s'abonner — c'est le point d'accroche du site.
- **Fil complet réservé aux abonnés** (`/api/news`) : les 30 derniers
  articles, uniquement pour les comptes avec `subscriptionStatus === "active"`.

Alimentation :
- `lib/news.ts` récupère les flux RSS publics de Teslarati, Electrek et Tesla
  Oracle (facile d'en ajouter d'autres : c'est juste une liste d'URLs RSS)
- Le cron quotidien (`/api/news/fetch`, voir `vercel.json`) les enregistre en
  base en évitant les doublons (contrainte unique sur l'URL de l'article)
- Visible sur la page d'accueil (aperçu) et `/compte` (fil complet)

Pour ajouter d'autres sources : compléter le tableau `FEEDS` dans `lib/news.ts`.

## Page compte client (`/compte`)

- Bouton vers le **Portail Client Stripe** (`/api/portal`) : l'utilisateur y
  gère lui-même sa carte, ses factures et la résiliation — aucun code de
  gestion d'abonnement à écrire côté app
- Fil des actus Tesla du jour

## Multilingue et marchés couverts

**Langues** : français (défaut), anglais, allemand — via `next-intl`.
- Chaque page vit sous `/fr`, `/en` ou `/de` (ex: `/fr/compte`, `/en/compte`)
- `middleware.ts` détecte automatiquement la langue du navigateur au premier
  passage et redirige vers la bonne URL
- Sélecteur de langue manuel dans l'en-tête (`SiteHeader.tsx`)
- Textes centralisés dans `messages/fr.json`, `messages/en.json`, `messages/de.json`
- **Pour ajouter une langue** : créer `messages/xx.json` (copier `en.json` et
  traduire), puis ajouter `"xx"` dans `locales` (`i18n/config.ts`)

**Pays suivis** (`lib/countries.ts`) : France, Allemagne, Belgique, Pays-Bas,
Espagne, Italie, Autriche, Portugal, Irlande, Danemark, Suède, Pologne,
Royaume-Uni. Pour en ajouter, compléter le tableau `COUNTRIES`.

Limite connue : les noms de pays affichés (`name` dans `COUNTRIES`) sont en
français quelle que soit la langue de l'interface — à traduire aussi par
langue si besoin d'une localisation complète.

## Prochaines étapes suggérées

- [ ] Traduire les noms de pays par langue (actuellement en français partout)
- [ ] Compléter la liste des pays/régions dans `lib/countries.ts`
- [ ] Remplacer l'identification par email simple (`/compte`) par une vraie
      authentification (magic link ou NextAuth) — actuellement, n'importe
      qui connaissant un email abonné pourrait voir les actus/gérer le compte
- [ ] Ajouter un désabonnement en un clic dans les emails d'alerte
- [ ] Période d'essai gratuite avant le prélèvement (paramétrable dans Stripe)

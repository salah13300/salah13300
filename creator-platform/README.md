# VelvetClub — MVP Phase 1

Plateforme de créateurs de contenu premium (abonnements, contenu payant, messagerie), construite
à partir du cahier des charges fourni. Ce dépôt implémente la **Phase 1 de la roadmap** (section 8
du cahier des charges) : landing, onboarding fan/créateur, profils, abonnements, contenu,
messagerie basique, dashboards, modération.

## ⚠️ Ce qui est mocké (à ne jamais lancer en production tel quel)

Conformément à la section 9 du cahier des charges ("démarrer le développement avec des mocks/stubs
pour KYC et paiement, brancher les vraies intégrations une fois les contrats signés"), ce projet
simule volontairement deux briques qui nécessitent des prestataires externes contractualisés :

| Brique | Fichier | Mock actuel | Prestataire réel à intégrer |
|---|---|---|---|
| KYC / vérification de majorité | `src/lib/kyc.ts` | Auto-approuve toute demande, ne vérifie aucun document | Sumsub, Veriff, Yoti, Onfido |
| Paiement | `src/lib/payments.ts` | Wallet interne crédité sans carte réelle, aucune donnée bancaire collectée | CCBill, Segpay, Epoch, Verotel (compte "high-risk/adult") |

**Ne jamais ouvrir ce site au public avant d'avoir remplacé ces deux modules par de vrais
prestataires** (section 10, étape 5 du cahier des charges) — un lancement sans eux expose à un
risque juridique et à la fermeture immédiate du service.

Autres points non implémentés dans ce MVP (prévus aux phases suivantes, section 8) :
- Tatouage numérique (watermarking forensique) anti-fuite — section 4.2
- Sessions cam WebRTC, enchères de contenu inédit — phase 3
- Modération IA de détection de contenu illégal (API tierce type Hive) — un filtre best-effort
  anti-paiement-hors-plateforme est implémenté dans la messagerie (`src/app/api/conversations/[id]/messages/route.ts`),
  mais ne remplace pas une vraie modération de contenu
- Score de confiance bidirectionnel, programme de fidélité, DRM vidéo mobile — phase 4
- Application mobile

## Stack

- Next.js 14 (App Router, SSR) + TypeScript + Tailwind CSS
- Prisma + PostgreSQL (ex: [Neon](https://neon.tech), plan gratuit — compatible Vercel serverless)
- NextAuth (credentials + JWT) pour l'authentification et les rôles (FAN / CREATOR / MODERATOR / ADMIN)

## Démarrage (local)

```bash
npm install
cp .env.example .env   # renseignez DATABASE_URL avec une URL Postgres (ex: Neon)
npm run db:push        # crée les tables à partir du schéma Prisma
npm run db:seed        # crée des comptes de démo
npm run dev
```

## Déploiement sur Vercel

1. Créez une base Postgres gratuite sur [neon.tech](https://neon.tech), récupérez la chaîne de
   connexion (utilisez la version "pooled connection" pour un environnement serverless).
2. Importez ce dépôt sur [vercel.com/new](https://vercel.com/new) (racine du projet : `creator-platform/`),
   ou déployez via la CLI : `npx vercel --cwd creator-platform`.
3. Dans les variables d'environnement du projet Vercel, renseignez :
   - `DATABASE_URL` — la chaîne de connexion Neon
   - `NEXTAUTH_SECRET` — une valeur aléatoire (`openssl rand -base64 32`)
   - `NEXTAUTH_URL` — l'URL de déploiement Vercel (ex: `https://votre-projet.vercel.app`)
4. Le script `build` (`package.json`) exécute automatiquement `prisma db push` puis le seed de
   démo avant `next build` — aucune commande manuelle à lancer, les tables et les comptes de
   démo sont créés à chaque déploiement.

Comptes de démonstration créés par le seed (mot de passe : `password1234`) :
- `admin@demo.local` — rôle modérateur/admin, accès à `/admin/moderation`
- `fan@demo.local` — compte fan avec 100€ de solde wallet
- `luna@demo.local` — créateur déjà approuvé (`/creators/luna_star`)

## Parcours à tester

1. **Visiteur** : page d'accueil `/`, bandeau 18+, teaser flouté, découverte `/creators`
2. **Inscription fan** : `/register` → vérification d'âge (mock) → `/onboarding/fan` (recharge wallet) → `/creators`
3. **Inscription créateur** : `/register?role=CREATOR` → KYC (mock) → `/onboarding/creator` (profil) → statut `PENDING_REVIEW`
4. **Modération** : connectez-vous en `admin@demo.local`, allez sur `/admin/moderation`, approuvez le profil créé à l'étape 3
5. **Abonnement / achat** : en tant que fan, abonnez-vous à un créateur approuvé, débloquez un contenu PPV, envoyez un pourboire
6. **Messagerie** : envoyez un message à un créateur depuis son profil, testez l'envoi de média payant (PPV) côté créateur et son déblocage côté fan
7. **Dashboard créateur** : `/dashboard/creator` — publier du contenu, voir les revenus

## Prochaines étapes (hors code, bloquantes selon le cahier des charges section 10)

- Immatriculer une société, ouvrir un compte pro
- Missionner un avocat spécialisé (CGU/CGV définitives, contrat créateur, politique RGPD)
- Contractualiser un prestataire KYC et un prestataire de paiement high-risk
- Vérifier que l'hébergeur cloud choisi autorise le contenu adulte dans ses CGU

Voir les pages `/legal/*` pour des versions indicatives (non définitives) de ces documents.

# Avenger

**Vitrine et suivi des projets open source.** Chaque produit a sa page d'accueil, son wiki et ses files
de tickets (bugs, retours utilisateurs, demandes de fonctionnalités).

| Partie     | Stack                                                  | URL de dev            |
|------------|--------------------------------------------------------|-----------------------|
| `backend`  | Symfony 8.1, Doctrine ORM, PostgreSQL 16, LexikJWT     | http://127.0.0.1:8001 |
| `frontend` | Angular 22 (standalone, signals, SCSS), Markdown       | http://localhost:4300 |

## Fonctionnement

- **Espace public** (sans compte)
  - `/` : les produits publiés.
  - `/produits/{slug}` : page d'accueil du produit, avec des onglets *Wiki* et *Tickets*.
  - `/produits/{slug}/wiki/{page}` : wiki en lecture, page `accueil` par défaut.
  - `/produits/{slug}/tickets` : tickets, filtrables par file et par statut. N'importe qui peut en
    ouvrir un (`/tickets/nouveau`) avec son nom et son e-mail. L'e-mail n'est jamais publié : seuls
    les administrateurs le voient. Les tickets sont numérotés par produit (#1, #2…). L'envoi est
    limité à 10 tickets par quart d'heure et par adresse IP (`config/packages/rate_limiter.yaml`).
- **Espace privé** (`/admin`, administrateurs)
  - Création d'un produit : le **wiki** (avec sa page *Accueil*) et les **trois files de tickets**
    sont créés avec lui (constructeur de `App\Entity\Product`).
  - Édition du produit et de sa page d'accueil en Markdown, avec aperçu. Un produit non publié
    reste invisible dans l'espace public.
  - Wiki : création, modification et suppression des pages. La page d'accueil ne peut être ni
    supprimée ni déplacée.
  - Tickets : changer le statut (nouveau, accepté, en cours, résolu, refusé, fermé), déplacer un
    ticket dans une autre file, supprimer un ticket.

- **Administration du serveur** :
  - *Utilisateurs* : liste des administrateurs, ajout (e-mail et mot de passe), retrait ; on ne peut pas
    retirer son propre compte, et Avenger garde toujours au moins un administrateur ;
  - *E-mail* : adresse publique d'Avenger (liens des e-mails) et service de mail (serveur SMTP champ par
    champ avec réglages tout prêts, sendmail, DSN avancé ou désactivé), test qui vérifie connexion,
    authentification et envoi. Le mot de passe est chiffré en base (clé dérivée d'`APP_SECRET`) et jamais
    renvoyé au navigateur. `MAILER_DSN`, `MAILER_FROM`, `MAILER_FROM_NAME` et `APP_PUBLIC_URL` restent
    possibles en repli ;
  - *Mon compte* : mot de passe, et e-mail à chaque nouveau ticket (activé par défaut).
- **Notifications des tickets**, envoyées après la réponse (un serveur de mail absent ou en panne ne
  bloque jamais l'ouverture d'un ticket) : aux administrateurs à chaque nouveau ticket (« Répondre » écrit à
  l'auteur), à l'auteur un accusé de réception avec le lien pour suivre son ticket, puis à chaque
  changement de statut.
- **Import / export d'un produit**, pour le passer d'un Avenger à un autre : *Exporter* sur la page d'un
  produit télécharge un fichier JSON (page d'accueil, icône, wiki et, si on coche la case, les tickets avec
  leurs numéros, statuts, dates et auteurs) ; *Produits › Importer un produit* le recrée **en brouillon**,
  sous une autre adresse si la sienne est prise. Le fichier est entièrement validé (format, version, champs,
  icône) avant que quoi que ce soit soit créé. Les tickets contiennent les e-mails de leurs auteurs : leur
  export est un choix explicite.
- **Widget de dépôt de tickets** : une ligne de code ajoute un bouton « Signaler un problème » à
  l'application d'un produit (onglet *Intégration* de l'administration). Voir [docs/widget.md](docs/widget.md).

Le contenu Markdown est rendu par `marked` côté navigateur, puis nettoyé par Angular : pas de
scripts ni de gestionnaires d'événements.

## Installation avec Docker

L'image `iemperor/avenger` contient toute l'application : l'interface Angular et l'API Symfony, servies par
[FrankenPHP](https://frankenphp.dev) en HTTP sur le port 8080. Il lui faut une base PostgreSQL, prévue dans
le fichier Compose. **Aucune variable n'est obligatoire.**

```bash
mkdir avenger && cd avenger
curl -O https://raw.githubusercontent.com/imperiumclansoftware/avenger/main/docker/compose.yaml
docker compose up -d
docker compose logs avenger | grep "Code d'installation"
```

Au premier démarrage, le service `init` génère les secrets (mot de passe de la base, `APP_SECRET`,
phrase de passe des clés de connexion) dans le volume `avenger_data`, puis s'arrête ; la base démarre avec
ce mot de passe (`POSTGRES_PASSWORD_FILE`).

Ouvrez ensuite `http://<serveur>:8080` : l'**assistant d'installation** (`/installation`) demande ce code,
puis crée le premier administrateur et le connecte. Le code n'est lisible que sur le serveur (journaux, ou
`docker compose exec avenger php bin/console app:setup:code`) : le premier venu ne peut pas s'attribuer le
compte. Une fois l'administrateur créé, le code est détruit et l'assistant se ferme.

Toutes les variables sont facultatives (fichier `.env` à côté de `compose.yaml`, modèle dans
[docker/.env.example](docker/.env.example)) :

| Variable | Rôle |
|---|---|
| `AVENGER_PORT` | Port publié sur la machine hôte (8080 par défaut) |
| `AVENGER_VERSION` | Étiquette de l'image (`latest` ou une version) |
| `TRUSTED_PROXIES` | Derrière un reverse proxy : ses adresses (ex. `172.16.0.0/12`), pour l'adresse réelle des visiteurs |
| `APP_SECRET`, `JWT_PASSPHRASE`, `POSTGRES_PASSWORD` | Générés au premier démarrage et conservés dans `/data/secrets` ; une valeur fournie l'emporte |
| `DATABASE_URL` | Base PostgreSQL externe, à la place de celle du fichier Compose |

- **Données** : le volume `/data` conserve les secrets (dont le mot de passe de la base), les clés de
  connexion et les icônes ; la base est dans son propre volume. Sauvegardez les deux ensemble.
- **Démarrage** : le conteneur attend la base, applique les migrations, génère les clés de connexion si
  besoin, et affiche le code d'installation tant qu'aucun administrateur n'existe. Il tourne sans
  privilège.
- **Depuis la 0.1.0** : gardez votre `.env`, son `POSTGRES_PASSWORD` est celui de votre base ; il est
  recopié dans le volume au premier démarrage.
- **HTTPS** : placez l'image derrière un reverse proxy (Caddy, Traefik, Nginx Proxy Manager…) et
  renseignez `TRUSTED_PROXIES`.
- **Mise à jour** : `docker compose pull && docker compose up -d` (migrations appliquées au démarrage).
- **Autres comptes** : `docker compose exec avenger php bin/console app:admin:create <e-mail>`.
- **Construire l'image** : `docker build --build-arg APP_VERSION=1.0.0 -t iemperor/avenger:1.0.0 .` à la
  racine du dépôt (`Dockerfile`, fichiers dans `docker/`).

## Démarrage

```bash
# Backend
cd backend
docker compose up -d                 # PostgreSQL sur 127.0.0.1:5433 (projet compose "avenger")
composer install
# Secrets de développement dans backend/.env.local : APP_SECRET et JWT_PASSPHRASE (openssl rand -hex 32)
php bin/console lexik:jwt:generate-keypair --skip-if-exists
php bin/console doctrine:migrations:migrate
php bin/console app:setup:code       # code demandé par l'assistant d'installation (/installation)
symfony serve -d --port=8001         # API sur http://127.0.0.1:8001

# Frontend
cd ../frontend
npm install
npm start                            # http://localhost:4300, /api est relayé vers Symfony (proxy.conf.mjs)
# ou, derrière code-server : npm run start:code-server → https://dev.imperiumclan.fr/absproxy/4300/
```

## API

| Méthode | Route                                                 | Accès  |
|---------|-------------------------------------------------------|--------|
| POST    | `/api/login` (`email`, `password`) → `{ token }`      | public |
| GET     | `/api/products`, `/api/products/{slug}`               | public |
| GET     | `/api/products/{slug}/wiki/{page}`                    | public |
| GET     | `/api/products/{slug}/tickets[?type=&status=]`        | public |
| GET     | `/api/products/{slug}/tickets/{number}`               | public |
| POST    | `/api/products/{slug}/tickets`                        | public |
| GET     | `/api/me`                                             | connecté |
| GET/POST | `/api/admin/products`                                | admin  |
| GET/PUT/DELETE | `/api/admin/products/{id}`                     | admin  |
| POST    | `/api/admin/products/{id}/wiki`                       | admin  |
| GET/PUT/DELETE | `/api/admin/products/{id}/wiki/{pageId}`       | admin  |
| GET     | `/api/admin/products/{id}/tickets[?type=&status=]`    | admin  |
| PUT/DELETE | `/api/admin/products/{id}/tickets/{number}`        | admin  |
| GET     | `/api/admin/products/{id}/export[?tickets=1]`         | admin  |
| POST    | `/api/admin/products/import[?slug=]` (corps : le fichier exporté) | admin  |

## Tests

```bash
cd backend && php bin/phpunit                 # tests fonctionnels sur PostgreSQL (base app_test)
cd frontend && npx ng test --watch=false
```

La base de test se crée une fois : `php bin/console doctrine:database:create --env=test`. Si Docker
tourne sur un autre hôte, surchargez `DATABASE_URL` dans `backend/.env.test.local`.

## Licence

[MIT](LICENSE) © 2026 Imperium Clan Software.

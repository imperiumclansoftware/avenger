# Avenger

**Avenger** est la vitrine de vos projets open source : une page de présentation par projet, un wiki, et
des files de tickets (bugs, retours utilisateurs, demandes de fonctionnalités) que vos utilisateurs
remplissent sans créer de compte, sur le site ou depuis vos applications grâce à un widget.

L'image contient l'interface **Angular** et l'API **Symfony**, servies par **FrankenPHP** en HTTP sur le
port 8080. Il lui faut une base **PostgreSQL**.

## Démarrage

```bash
mkdir avenger && cd avenger
curl -O https://raw.githubusercontent.com/imperiumclansoftware/avenger/main/docker/compose.yaml
curl -o .env https://raw.githubusercontent.com/imperiumclansoftware/avenger/main/docker/.env.example
# Renseigner POSTGRES_PASSWORD dans .env (openssl rand -hex 32)
docker compose up -d
docker compose logs avenger | grep "Code d'installation"
```

Ouvrez `http://<serveur>:8080` : l'assistant d'installation demande ce code, puis crée le premier
administrateur.

## Variables

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Base PostgreSQL (construite par le fichier Compose à partir de `POSTGRES_PASSWORD`) |
| `APP_SECRET`, `JWT_PASSPHRASE` | Facultatifs : générés au premier démarrage et conservés dans `/data/secrets` |
| `TRUSTED_PROXIES` | Derrière un reverse proxy : ses adresses, pour l'adresse réelle des visiteurs |

## Volume et port

| Chemin | Contenu |
|---|---|
| `/data` | Secrets, clés de connexion, icônes des produits. **À sauvegarder**, avec la base |

Port **8080** (HTTP), utilisateur sans privilège. Pour HTTPS, placez un reverse proxy devant.

Sources : [GitHub](https://github.com/imperiumclansoftware/avenger), licence MIT.

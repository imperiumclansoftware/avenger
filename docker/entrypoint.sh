#!/bin/sh
# Starts Avenger. No variable is required: the secrets are generated on the first start and kept
# in the /data volume, the database address is built from them.
#
#   avenger-entrypoint init         generates the missing secrets and stops (before the database:
#                                   its password is read from /data/secrets/postgres_password)
#   avenger-entrypoint frankenphp…  prepares the database and the keys, then runs the web server
set -e

mkdir -p /data/icons /data/setup /data/jwt /data/secrets /data/caddy /data/caddy-config

# A secret given in the environment wins; otherwise the one kept in the volume, generated once
secret() {
	name="$1"
	file="/data/secrets/$(echo "$name" | tr 'A-Z' 'a-z')"
	eval "value=\${$name:-}"
	if [ -n "$value" ]; then
		# Kept in the volume too: the database reads its password from there (POSTGRES_PASSWORD_FILE)
		if [ ! -s "$file" ]; then
			(umask 077 && printf '%s\n' "$value" > "$file")
		fi
		return
	fi
	if [ ! -s "$file" ]; then
		(umask 077 && openssl rand -hex 32 > "$file")
		echo "Avenger : $name généré et conservé dans $file."
	fi
	export "$name=$(cat "$file")"
}
secret APP_SECRET
secret JWT_PASSPHRASE
# Only for the database of the Compose file: an external database is given by DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
	secret POSTGRES_PASSWORD
	export DATABASE_URL="postgresql://${DATABASE_USER:-avenger}:${POSTGRES_PASSWORD}@${DATABASE_HOST:-database}:${DATABASE_PORT:-5432}/${DATABASE_NAME:-avenger}?serverVersion=16&charset=utf8"
fi

if [ "$1" = 'init' ]; then
	echo 'Avenger : secrets prêts.'
	exit 0
fi

echo "Avenger ${APP_VERSION:-dev} : attente de la base de données…"
tries=0
until error=$(php bin/console dbal:run-sql -q 'SELECT 1' 2>&1); do
	tries=$((tries + 1))
	reason=$(printf '%s\n' "$error" | grep -Eo 'FATAL: .*|could not translate host name .*|Connection refused|timeout expired' | head -n 1 | cut -c1-200)
	if [ "$tries" -ge 60 ]; then
		echo "Avenger : base de données injoignable après 2 minutes : ${reason:-$error}" >&2
		echo 'Si le volume de la base existait déjà, son mot de passe est celui de sa création : donnez-le par POSTGRES_PASSWORD.' >&2
		exit 1
	fi
	if [ $((tries % 5)) -eq 1 ]; then
		echo "Avenger : base de données pas encore prête (${reason:-réponse inattendue}), nouvel essai…"
	fi
	sleep 2
done
echo 'Avenger : base de données prête.'

if [ "$1" = 'frankenphp' ]; then
	php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
	# Login keys: generated once; kept ones must open with JWT_PASSPHRASE
	# (lexik:jwt:check-config only checks the configuration, not the keys)
	if [ ! -s /data/jwt/private.pem ]; then
		php bin/console lexik:jwt:generate-keypair --overwrite
		echo 'Avenger : clés de connexion générées dans /data/jwt.'
	elif ! openssl pkey -in /data/jwt/private.pem -passin env:JWT_PASSPHRASE -noout 2>/dev/null; then
		echo 'Avenger : la clé de connexion /data/jwt/private.pem ne s ouvre pas avec JWT_PASSPHRASE.' >&2
		echo 'Remettez la phrase de passe d origine, ou supprimez /data/jwt pour en générer de nouvelles (les sessions seront fermées).' >&2
		exit 1
	fi
	# Until the first administrator exists: the code asked by the wizard (/installation)
	php bin/console app:setup:code
fi

exec "$@"

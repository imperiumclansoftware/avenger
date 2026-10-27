# syntax=docker/dockerfile:1

# Avenger: one image serving the Angular app and the Symfony API (FrankenPHP), on port 8080.

ARG PHP_VERSION=8.4
ARG NODE_VERSION=24

# ---- Angular application ----
FROM node:${NODE_VERSION}-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npx ng build --configuration production --output-path dist

# ---- PHP application ----
FROM dunglas/frankenphp:1-php${PHP_VERSION}-alpine AS app

# Version shown in the logs: docker build --build-arg APP_VERSION=1.0.0 …
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION} \
    APP_ENV=prod \
    APP_DEBUG=0 \
    COMPOSER_ALLOW_SUPERUSER=1 \
    XDG_DATA_HOME=/data/caddy \
    XDG_CONFIG_HOME=/data/caddy-config

# Refuses a base image with a vulnerable PHP (CVE-2026-109618 and CVE-2026-109619, "PHP2Shell":
# remote code execution without authentication, fixed in 8.4.27). Rebuild with --pull.
ARG PHP_MIN_VERSION=8.4.27
RUN php -r 'exit(version_compare(PHP_VERSION, getenv("PHP_MIN_VERSION"), ">=") ? 0 : 1);' \
    || { echo "PHP $(php -r 'echo PHP_VERSION;') trop ancien : $PHP_MIN_VERSION minimum (failles de sécurité). Reconstruisez avec --pull." >&2; exit 1; }

RUN install-php-extensions pdo_pgsql intl opcache zip \
    && apk add --no-cache curl openssl \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY docker/php.ini $PHP_INI_DIR/conf.d/zz-avenger.ini
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /app

# Dependencies first: rebuilt only when composer.json/lock change
COPY backend/composer.json backend/composer.lock backend/symfony.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-progress --no-interaction

COPY backend/ ./
COPY --from=frontend /build/dist/browser/ ./public/
RUN composer dump-autoload --no-dev --classmap-authoritative \
    # The secrets of .env are development examples: the real ones are generated in /data
    && APP_SECRET=build php bin/console cache:clear --no-warmup \
    && APP_SECRET=build php bin/console cache:warmup \
    # Persistent files (icons, keys, installation code) live in the /data volume
    && mkdir -p /data var \
    && rm -rf var/icons var/setup config/jwt \
    && ln -s /data/icons var/icons \
    && ln -s /data/setup var/setup \
    && ln -s /data/jwt config/jwt \
    && chown -R www-data:www-data /data var

COPY docker/Caddyfile /etc/frankenphp/Caddyfile
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/avenger-entrypoint

USER www-data
VOLUME /data
EXPOSE 8080

# First start: migrations can take a moment on a small server
HEALTHCHECK --interval=15s --timeout=5s --start-period=120s --retries=5 \
    CMD curl -fsS http://localhost:8080/api/health > /dev/null || exit 1

ENTRYPOINT ["avenger-entrypoint"]
CMD ["frankenphp", "run", "--config", "/etc/frankenphp/Caddyfile"]

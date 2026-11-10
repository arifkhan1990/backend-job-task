#!/usr/bin/env bash
# Single quality gate used by developers, the AI, autopilot and CI.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

bash scripts/check-repo-hygiene.sh

if [ -f package.json ]; then
  if   [ -f pnpm-lock.yaml ]; then PM=pnpm; pnpm install --frozen-lockfile
  elif [ -f yarn.lock ];      then PM=yarn; yarn install --frozen-lockfile
  else PM=npm; npm ci; fi
  for s in lint typecheck test build; do
    if node -e "process.exit(require('./package.json').scripts&&require('./package.json').scripts['$s']?0:1)"; then
      echo "==> $PM run $s"; $PM run "$s"
    fi
  done
  if [ "$PM" = npm ]; then npm audit --omit=dev --audit-level=high; fi
fi

if [ -f composer.json ]; then
  composer install --no-interaction --prefer-dist
  [ -f vendor/bin/pint ] && vendor/bin/pint --test
  [ -f artisan ] && php artisan test
  composer audit
fi

if [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  command -v ruff   >/dev/null && ruff check .
  command -v pytest >/dev/null && pytest -q
fi
echo "verify OK"

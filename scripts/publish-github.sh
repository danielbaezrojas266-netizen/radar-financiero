#!/usr/bin/env bash
set -euo pipefail

OWNER="${GITHUB_OWNER:-daniel-baez-rojas}"
REPO="${GITHUB_REPO:-radar-financiero}"
FULL="${OWNER}/${REPO}"

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "Falta GH_TOKEN (Personal Access Token con scope repo)."
  echo "Crea uno en: https://github.com/settings/tokens/new?scopes=repo&description=Radar%20Financiero"
  exit 1
fi

echo "$GH_TOKEN" | gh auth login --hostname github.com --git-protocol https --skip-ssh-key --with-token

if gh repo view "$FULL" >/dev/null 2>&1; then
  echo "Repositorio $FULL ya existe."
else
  gh repo create "$FULL" --public --description "Radar Financiero — alertas XAU/BTC vía Telegram (RSS + Nitter)"
fi

git remote remove github 2>/dev/null || true
git remote add github "https://github.com/${FULL}.git"
git push -u github main --force

echo ""
echo "Listo: https://github.com/${FULL}"

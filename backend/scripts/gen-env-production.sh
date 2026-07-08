#!/bin/bash
# gen-env-production.sh
# Génère frontend/.env.production avec l'IP locale du Pi.
# À lancer depuis la racine du projet : bash backend/scripts/gen-env-production.sh

PORT=${API_PORT:-3002}

# Détecte l'IP locale (wlan0 en priorité, sinon eth0)
IP=$(ip -4 addr show wlan0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)
if [ -z "$IP" ]; then
  IP=$(ip -4 addr show eth0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)
fi
if [ -z "$IP" ]; then
  echo "❌ Impossible de détecter l'IP locale. Renseignez VITE_API_URL manuellement."
  exit 1
fi

cat > frontend/.env.production <<EOF
VITE_API_URL=http://${IP}:${PORT}/api
EOF

echo "✅ frontend/.env.production → VITE_API_URL=http://${IP}:${PORT}/api"

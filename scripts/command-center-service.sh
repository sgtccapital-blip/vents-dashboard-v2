#!/bin/sh
# Servicios de arranque automático (macOS LaunchAgents) para que el Command Center
# y su túnel público de Tailscale sigan vivos tras reiniciar la Mac o si se caen.
#
#   sh scripts/command-center-service.sh install    instala y arranca ambos
#   sh scripts/command-center-service.sh uninstall  los detiene y los quita
#   sh scripts/command-center-service.sh status     estado de cada uno
#
# Tailscale corre en modo usuario (sin permisos de administrador) con su propio estado en
#   ~/Library/Application Support/arrive-tailscale
# Usa scripts/tailscale.sh para hablarle a ese tailscaled (login, funnel…).
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS="$HOME/Library/LaunchAgents"
TS_DIR="$HOME/Library/Application Support/arrive-tailscale"
NODE="${NODE_BIN:-$(command -v node)}"
TAILSCALED="$(brew --prefix tailscale 2>/dev/null)/bin/tailscaled"
DOMAIN="gui/$(id -u)"
LOG_DIR="$HOME/Library/Logs/arrive-command-center"

SERVER_LABEL="com.arrive.command-center"
TS_LABEL="com.arrive.tailscaled"

xml_escape() { printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'; }

write_server_plist() {
  mkdir -p "$LOG_DIR"
  cat > "$AGENTS/$SERVER_LABEL.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$SERVER_LABEL</string>
  <key>Comment</key><string>ARRIVE Command Center (dashboard + MCP en :8090)</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/sh</string>
    <string>-c</string>
    <string>cd "\$0" &amp;&amp; exec "\$1" server.js</string>
    <string>$(xml_escape "$ROOT")</string>
    <string>$(xml_escape "$NODE")</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$(xml_escape "$(dirname "$NODE"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin")</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>ProcessType</key><string>Interactive</string>
  <key>StandardOutPath</key><string>$(xml_escape "$LOG_DIR/server.log")</string>
  <key>StandardErrorPath</key><string>$(xml_escape "$LOG_DIR/server.log")</string>
</dict>
</plist>
EOF
}

write_ts_plist() {
  mkdir -p "$TS_DIR"
  cat > "$AGENTS/$TS_LABEL.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$TS_LABEL</string>
  <key>Comment</key><string>Tailscale en modo usuario: publica /mcp del Command Center con Funnel</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(xml_escape "$TAILSCALED")</string>
    <string>--tun=userspace-networking</string>
    <string>--statedir=$(xml_escape "$TS_DIR")</string>
    <string>--socket=$(xml_escape "$TS_DIR/tailscaled.sock")</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$(xml_escape "$TS_DIR/tailscaled.log")</string>
  <key>StandardErrorPath</key><string>$(xml_escape "$TS_DIR/tailscaled.log")</string>
</dict>
</plist>
EOF
}

reload() {
  launchctl bootout "$DOMAIN/$1" 2>/dev/null && sleep 2 || true
  launchctl bootstrap "$DOMAIN" "$AGENTS/$1.plist"
}

case "${1:-status}" in
  install)
    [ -x "$NODE" ] || { echo "No encuentro node"; exit 1; }
    [ -x "$TAILSCALED" ] || { echo "Falta Tailscale: brew install tailscale"; exit 1; }
    mkdir -p "$AGENTS"
    write_server_plist
    write_ts_plist
    # Si el dashboard ya corre fuera de launchd, se detiene para que el servicio tome el puerto.
    OLD="$(lsof -nP -tiTCP:8090 -sTCP:LISTEN 2>/dev/null || true)"
    if [ -n "$OLD" ] && ! launchctl print "$DOMAIN/$SERVER_LABEL" >/dev/null 2>&1; then
      kill -TERM $OLD 2>/dev/null || true
      sleep 2
    fi
    reload "$SERVER_LABEL"
    reload "$TS_LABEL"
    echo "Instalados: $SERVER_LABEL y $TS_LABEL"
    ;;
  uninstall)
    for l in "$SERVER_LABEL" "$TS_LABEL"; do
      launchctl bootout "$DOMAIN/$l" 2>/dev/null || true
      rm -f "$AGENTS/$l.plist"
    done
    echo "Servicios quitados (el estado de Tailscale queda en $TS_DIR)"
    ;;
  status)
    for l in "$SERVER_LABEL" "$TS_LABEL"; do
      if launchctl print "$DOMAIN/$l" >/dev/null 2>&1; then
        echo "$l: $(launchctl print "$DOMAIN/$l" | awk -F'= ' '/^\tstate/ {print $2; exit}')"
      else
        echo "$l: no instalado"
      fi
    done
    ;;
  *)
    echo "Uso: $0 install|uninstall|status"; exit 1 ;;
esac

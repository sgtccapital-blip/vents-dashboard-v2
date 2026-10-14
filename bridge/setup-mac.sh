#!/bin/bash
# Conecta tu OpenClaw (agente Bart) con el Command Center.
#
#   bash <(curl -fsSL https://TU-DASHBOARD/bridge/setup-mac.sh) https://TU-DASHBOARD
#
# Qué hace (te pide confirmación antes de cambiar nada):
#   1. Activa en OpenClaw el endpoint local /v1/chat/completions (solo 127.0.0.1, no se expone a internet)
#   2. Busca tu agente Bart
#   3. Instala la skill "command-center" para que Bart pueda leer/actuar en el dashboard
#   4. Instala bart-bridge como servicio (launchd): arranca solo con el Mac y se reconecta solo
set -euo pipefail

DASHBOARD_URL="${1:-${DASHBOARD_URL:-}}"
DASHBOARD_URL="${DASHBOARD_URL%/}"
DIR="$HOME/.bart-bridge"
PLIST="$HOME/Library/LaunchAgents/com.arrive.bart-bridge.plist"
LABEL="com.arrive.bart-bridge"

say()  { printf '\n\033[1;35m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✔ %s\033[0m\n' "$*"; }
warn() { printf '  \033[33m⚠ %s\033[0m\n' "$*"; }
die()  { printf '  \033[31m✖ %s\033[0m\n' "$*"; exit 1; }

say "Command Center ↔ OpenClaw (Bart)"

[ -n "$DASHBOARD_URL" ] || read -r -p "  URL del dashboard (ej. https://command-center.onrender.com): " DASHBOARD_URL
DASHBOARD_URL="${DASHBOARD_URL%/}"
case "$DASHBOARD_URL" in https://*|http://*) ;; *) die "La URL debe empezar con https://";; esac

NODE_BIN="$(command -v node || true)"
[ -n "$NODE_BIN" ] || die "No encontré Node.js (OpenClaw lo necesita). Instálalo y vuelve a correr esto."
NODE_MAJOR="$("$NODE_BIN" -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || die "Necesito Node 18 o más nuevo (tienes $("$NODE_BIN" -v))."
ok "Node $("$NODE_BIN" -v)"

command -v openclaw >/dev/null 2>&1 || die "No encontré el comando 'openclaw'. ¿Está instalado OpenClaw en este Mac?"
ok "OpenClaw: $(openclaw --version 2>/dev/null | head -1 || echo instalado)"

# ── 1. Token del dashboard (API_TOKEN de Render) ──
say "Token del dashboard"
echo "  Es el valor de API_TOKEN en las variables de entorno de Render."
API_TOKEN="${API_TOKEN:-}"
while :; do
    if [ -z "$API_TOKEN" ]; then read -r -s -p "  API_TOKEN: " API_TOKEN; echo; fi
    CODE="$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $API_TOKEN" "$DASHBOARD_URL/api/bridge/status" || echo 000)"
    if [ "$CODE" = "200" ]; then ok "El dashboard aceptó el token"; break; fi
    if [ "$CODE" = "000" ]; then die "No pude conectar con $DASHBOARD_URL"; fi
    warn "El dashboard respondió $CODE: token incorrecto, prueba otra vez."
    API_TOKEN=""
done

# ── 2. Gateway de OpenClaw ──
say "Gateway de OpenClaw"
CONFIG_FILE="$(openclaw config file 2>/dev/null | tail -1 || true)"
[ -n "$CONFIG_FILE" ] && [ -f "$CONFIG_FILE" ] || CONFIG_FILE="$HOME/.openclaw/openclaw.json"

# Lee port / modo de auth / token del openclaw.json (JSON5) sin mostrarlos en pantalla
read_gateway() {
    "$NODE_BIN" -e '
const fs = require("fs");
let cfg = {};
try { cfg = new Function("return (" + fs.readFileSync(process.argv[1], "utf8") + ")")() || {}; } catch {}
const g = cfg.gateway || {}, a = g.auth || {};
const secret = (v) => (typeof v === "string" ? v : "");
const field = process.argv[2];
if (field === "port") console.log(g.port || 18789);
if (field === "mode") console.log(a.mode || (secret(a.token) ? "token" : secret(a.password) ? "password" : "token"));
if (field === "secret") console.log(secret(a.mode === "password" ? a.password : a.token) || secret(a.token) || secret(a.password));
if (field === "chat") console.log(!!(g.http && g.http.endpoints && g.http.endpoints.chatCompletions && g.http.endpoints.chatCompletions.enabled));
' "$CONFIG_FILE" "$1" 2>/dev/null || true
}

PORT="$(read_gateway port)"; PORT="${PORT:-18789}"
GATEWAY_URL="http://127.0.0.1:$PORT"
GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-${OPENCLAW_GATEWAY_PASSWORD:-}}"
[ -n "$GATEWAY_TOKEN" ] || GATEWAY_TOKEN="$(read_gateway secret)"
if [ -z "$GATEWAY_TOKEN" ] && [ "$(read_gateway mode)" != "none" ]; then
    echo "  No pude leer el token del gateway (puede estar guardado como secreto)."
    read -r -s -p "  Pega el token/contraseña del gateway de OpenClaw: " GATEWAY_TOKEN; echo
fi
ok "Gateway en $GATEWAY_URL"

if [ "$(read_gateway chat)" != "true" ]; then
    echo "  Hay que activar el endpoint local /v1/chat/completions (queda solo en 127.0.0.1)."
    read -r -p "  ¿Activarlo y reiniciar el gateway ahora? [S/n] " R
    case "${R:-S}" in [nN]*) die "Sin ese endpoint el dashboard no puede hablar con Bart.";; esac
    openclaw config set gateway.http.endpoints.chatCompletions.enabled true --strict-json
    openclaw gateway restart || warn "No pude reiniciar el gateway automáticamente: corre 'openclaw gateway restart'."
    ok "Endpoint activado"
else
    ok "Endpoint /v1/chat/completions ya estaba activo"
fi

AUTH_HEADER=()
[ -n "$GATEWAY_TOKEN" ] && AUTH_HEADER=(-H "Authorization: Bearer $GATEWAY_TOKEN")
printf '  Esperando al gateway'
for _ in $(seq 1 30); do
    CODE="$(curl -s -o /dev/null -w '%{http_code}' "${AUTH_HEADER[@]+"${AUTH_HEADER[@]}"}" "$GATEWAY_URL/v1/models" || echo 000)"
    [ "$CODE" = "200" ] && break
    printf '.'; sleep 1
done; echo
case "$CODE" in
    200) ok "El gateway responde";;
    401|403) die "El gateway rechazó el token. Revisa gateway.auth.token en $CONFIG_FILE";;
    404) die "El endpoint sigue apagado. Corre: openclaw config set gateway.http.endpoints.chatCompletions.enabled true --strict-json && openclaw gateway restart";;
    *) die "El gateway no responde en $GATEWAY_URL (código $CODE). ¿Está corriendo OpenClaw? (openclaw gateway status)";;
esac

# ── 3. Agente Bart ──
say "Agente"
AGENTS_JSON="$(openclaw agents list --json 2>/dev/null || echo '[]')"
AGENT_INFO="$(printf '%s' "$AGENTS_JSON" | "$NODE_BIN" -e '
let raw = ""; process.stdin.on("data", d => raw += d).on("end", () => {
  let data; try { data = JSON.parse(raw); } catch { data = []; }
  const list = Array.isArray(data) ? data : (data.agents || data.list || []);
  const nameOf = a => (a.identity && (a.identity.name || a.identity.displayName)) || a.name || a.displayName || "";
  const all = list.map(a => ({ id: a.id || a.agentId || a.name, name: nameOf(a) })).filter(a => a.id);
  const bart = all.find(a => /bart/i.test(a.id) || /bart/i.test(a.name));
  const pick = bart || (all.length === 1 ? all[0] : null);
  console.log(pick ? `${pick.id}\t${pick.name || pick.id}` : "");
  if (!pick) console.error(all.map(a => `    - ${a.id}${a.name ? " (" + a.name + ")" : ""}`).join("\n"));
});' 2>/tmp/bart-agents.txt || true)"
AGENT_ID="${AGENT_INFO%%	*}"; AGENT_NAME="${AGENT_INFO#*	}"
if [ -z "$AGENT_ID" ]; then
    echo "  No encontré un agente llamado Bart. Agentes disponibles:"; cat /tmp/bart-agents.txt 2>/dev/null || true
    read -r -p "  Escribe el id del agente a usar [main]: " AGENT_ID; AGENT_ID="${AGENT_ID:-main}"; AGENT_NAME="Bart"
fi
[ -n "$AGENT_NAME" ] && [ "$AGENT_NAME" != "$AGENT_ID" ] || AGENT_NAME="Bart"
ok "Usando openclaw/$AGENT_ID ($AGENT_NAME)"

# ── 4. Instalar puente, ayudante y skill ──
say "Instalando bart-bridge"
mkdir -p "$DIR" "$HOME/.openclaw/skills/command-center" "$HOME/Library/LaunchAgents"
chmod 700 "$DIR"
curl -fsSL "$DASHBOARD_URL/bridge/bart-bridge.mjs" -o "$DIR/bart-bridge.mjs"
curl -fsSL "$DASHBOARD_URL/bridge/SKILL.md" -o "$HOME/.openclaw/skills/command-center/SKILL.md"

DASHBOARD_URL="$DASHBOARD_URL" API_TOKEN="$API_TOKEN" GATEWAY_URL="$GATEWAY_URL" GATEWAY_TOKEN="$GATEWAY_TOKEN" AGENT_ID="$AGENT_ID" AGENT_NAME="$AGENT_NAME" \
"$NODE_BIN" -e '
const e = process.env;
require("fs").writeFileSync(process.argv[1], JSON.stringify({
  dashboardUrl: e.DASHBOARD_URL, apiToken: e.API_TOKEN, gatewayUrl: e.GATEWAY_URL,
  gatewayToken: e.GATEWAY_TOKEN, agentId: e.AGENT_ID, agentName: e.AGENT_NAME,
}, null, 2), { mode: 0o600 });' "$DIR/config.json"
chmod 600 "$DIR/config.json"

cat > "$DIR/cc" <<CC
#!/bin/bash
# Ayudante para Bart: llama a la API del Command Center con la URL y el token guardados.
# Uso: cc GET /api/openclaw/state   |   cc POST /api/openclaw/action '{"action":"add_task","payload":{...}}'
CFG="\$HOME/.bart-bridge/config.json"
URL="\$("$NODE_BIN" -p "require('\$CFG').dashboardUrl")"
TOKEN="\$("$NODE_BIN" -p "require('\$CFG').apiToken")"
METHOD="\${1:-GET}"; PATH_="\${2:-/api/openclaw/state}"; BODY="\${3:-}"
if [ -n "\$BODY" ]; then
  curl -sS -X "\$METHOD" "\$URL\$PATH_" -H "Authorization: Bearer \$TOKEN" -H 'Content-Type: application/json' -d "\$BODY"
else
  curl -sS -X "\$METHOD" "\$URL\$PATH_" -H "Authorization: Bearer \$TOKEN"
fi
echo
CC
chmod 700 "$DIR/cc"
ok "Skill command-center instalada en ~/.openclaw/skills"

cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$DIR/bart-bridge.mjs</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$DIR/bridge.log</string>
  <key>StandardErrorPath</key><string>$DIR/bridge.log</string>
</dict>
</plist>
PL
launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
ok "Servicio activo (arranca solo con el Mac)"

# ── 5. Verificación ──
say "Verificación"
sleep 3
if "$NODE_BIN" "$DIR/bart-bridge.mjs" --check; then
    ok "Todo conectado. Abre el dashboard → Bart & Cerebro RAG → OpenClaw Master Orchestrator."
else
    warn "Algo no quedó bien; revisa el log: tail -f $DIR/bridge.log"
fi
echo
echo "  Log:        tail -f $DIR/bridge.log"
echo "  Reiniciar:  launchctl kickstart -k gui/$(id -u)/$LABEL"
echo "  Quitar:     launchctl bootout gui/$(id -u)/$LABEL && rm -rf $DIR $PLIST"
echo "  En OpenClaw, empieza una sesión nueva (/new) para que Bart cargue la skill."

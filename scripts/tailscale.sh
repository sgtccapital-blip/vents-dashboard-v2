#!/bin/sh
# Atajo al tailscale del Command Center (modo usuario, socket propio).
#   sh scripts/tailscale.sh up        inicia sesión (abre el enlace que imprime)
#   sh scripts/tailscale.sh status
#   sh scripts/tailscale.sh funnel status
exec "$(brew --prefix tailscale)/bin/tailscale" --socket="$HOME/Library/Application Support/arrive-tailscale/tailscaled.sock" "$@"

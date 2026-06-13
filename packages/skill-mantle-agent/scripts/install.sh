#!/usr/bin/env bash
# Concierge Mantle Agent — RealClaw skill post-install configurator.
#
# Prompts for the user's concierge.xyz account id (or launches OAuth) and
# writes the result to ~/.concierge/config.json. Subsequent MCP tool calls
# read that file at startup.
#
# Idempotent: re-running this script overwrites the existing config after a
# y/N confirmation, never silently.

set -euo pipefail

CONFIG_DIR="${HOME}/.concierge"
CONFIG_FILE="${CONFIG_DIR}/config.json"
CONCIERGE_URL="${CONCIERGE_URL:-https://concierge.xyz}"
OAUTH_URL="${CONCIERGE_URL}/oauth/authorize?client=skill"

log() { printf '[concierge] %s\n' "$*" >&2; }

prompt_user_id() {
  local uid
  printf 'concierge.xyz user id (or press Enter to open the OAuth flow): ' >&2
  read -r uid
  printf '%s\n' "$uid"
}

write_config() {
  local user_id="$1"
  mkdir -p "${CONFIG_DIR}"
  # Permissions 0600 — file holds an auth token after OAuth completes.
  umask 077
  cat > "${CONFIG_FILE}" <<EOF
{
  "userId": "${user_id}",
  "url": "${CONCIERGE_URL}",
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
  log "wrote ${CONFIG_FILE}"
}

main() {
  if [[ -f "${CONFIG_FILE}" ]]; then
    printf 'existing config at %s — overwrite? [y/N] ' "${CONFIG_FILE}" >&2
    read -r answer
    case "${answer}" in
      y|Y|yes|YES) ;;
      *) log "keeping existing config; exiting"; exit 0 ;;
    esac
  fi

  local user_id
  user_id="$(prompt_user_id)"

  if [[ -z "${user_id}" ]]; then
    log "no user id provided — open this URL in your browser to complete OAuth:"
    log "  ${OAUTH_URL}"
    log "re-run this script after OAuth completes."
    exit 0
  fi

  write_config "${user_id}"
  log "done. test with: claude mcp list | grep concierge"
}

main "$@"

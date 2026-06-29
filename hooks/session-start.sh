#!/bin/bash
echo "$(date -Iseconds) hook ran pid=$$" >> $HOME/claude-hook-trace.log
# agent-skills session start hook
# 1. Ensures npm dependencies are installed (idempotent)
# 2. Injects the using-agent-skills meta-skill into every new session

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="$PLUGIN_ROOT/skills"
META_SKILL="$SKILLS_DIR/using-agent-skills/SKILL.md"

# ---- phase 0: ensure npm dependencies are installed ----
if [ ! -d "$PLUGIN_ROOT/node_modules" ] && [ -f "$PLUGIN_ROOT/package.json" ]; then
  echo "[agent-skills] Installing npm dependencies…" >&2
  cd "$PLUGIN_ROOT"
  npm install --production --no-audit --no-fund >&2
  echo "[agent-skills] Dependencies ready." >&2
fi

if ! command -v jq >/dev/null 2>&1; then
  echo '{"priority": "INFO", "message": "agent-skills: jq is required for the session-start hook but was not found on PATH. Install jq (e.g. `brew install jq` or `apt-get install jq`) to enable meta-skill injection. Skills remain available individually."}'
  exit 0
fi

if [ -f "$META_SKILL" ]; then
  CONTENT=$(cat "$META_SKILL")
  # Use jq to properly escape and construct valid JSON
  jq -cn \
    --arg message "agent-skills loaded. Use the skill discovery flowchart to find the right skill for your task.

$CONTENT" \
    '{priority: "IMPORTANT", message: $message}'
else
  echo '{"priority": "INFO", "message": "agent-skills: using-agent-skills meta-skill not found. Skills may still be available individually."}'
fi

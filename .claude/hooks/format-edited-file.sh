#!/bin/sh
# Formats and lint-fixes the file an agent just edited, so formatting never costs a turn.
file=$(jq -r '.tool_input.file_path // empty')
[ -n "$file" ] && [ -f "$file" ] || exit 0
root=$(git -C "$(dirname "$file")" rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.mjs|*.cjs)
    ./node_modules/.bin/prettier --write --log-level warn "$file"
    ./node_modules/.bin/eslint --fix --cache --cache-location node_modules/.cache/eslint "$file" >/dev/null 2>&1 || true ;;
  *.json|*.jsonc|*.md|*.css|*.yml|*.yaml)
    ./node_modules/.bin/prettier --write --log-level warn --ignore-unknown "$file" ;;
esac
exit 0

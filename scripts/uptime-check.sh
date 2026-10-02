#!/bin/sh
# Checks every tenant host in tenants/*.jsonc: the health route answers ok, the sign-in page loads, and both are quick.
# Exit 1 when any check fails, so a scheduled run turns red and the repository owner is told.
set -u
limit_seconds="${UPTIME_LIMIT_SECONDS:-6}"
failed=0
for manifest in tenants/*.jsonc; do
  host=$(sed -n 's/^ *"host": *"\([^"]*\)".*/\1/p' "$manifest" | head -1)
  [ -z "$host" ] && continue
  health=$(curl -s -m 20 -w ' %{http_code} %{time_total}' "https://$host/api/v1/health" || true)
  login=$(curl -s -m 20 -o /dev/null -w '%{http_code} %{time_total}' "https://$host/login" || true)
  echo "$host health:$health login:$login"
  case "$health" in *'"status":"ok"'*' 200 '*) ;; *) echo "FAIL $host: health is not ok"; failed=1 ;; esac
  case "$login" in 200*) ;; *) echo "FAIL $host: sign-in page did not load"; failed=1 ;; esac
  for seconds in $(echo "$health $login" | grep -Eo '[0-9]+\.[0-9]+$|[0-9]+\.[0-9]+ ' | tr -d ' '); do
    slow=$(echo "$seconds $limit_seconds" | awk '{print ($1 > $2) ? 1 : 0}')
    [ "$slow" = "1" ] && { echo "FAIL $host: a request took ${seconds}s (limit ${limit_seconds}s)"; failed=1; }
  done
done
exit $failed

#!/usr/bin/env bash
# Starts the server and opens Chrome in kiosk mode across the wall (macOS / Linux).
#   ./start.sh                         → full screen (kiosk)
#   WALL_W=5760 WALL_H=3240 ./start.sh → exact window size at 0,0 instead of kiosk
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
URL="http://127.0.0.1:$PORT/"

PORT="$PORT" node server.js &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT

for _ in $(seq 1 40); do
  curl -s -o /dev/null "$URL" && break
  sleep 0.25
done

if [ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
  CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else
  CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser)"
fi
[ -z "$CHROME" ] && { echo "Chrome not found. Open this in a browser: $URL"; wait $SERVER_PID; exit; }

ARGS=(--app="$URL" --user-data-dir="$PWD/.chrome-profile" --noerrdialogs --disable-infobars
      --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required
      --check-for-update-interval=31536000)
if [ -n "$WALL_W" ] && [ -n "$WALL_H" ]; then
  ARGS+=(--window-position=0,0 --window-size="$WALL_W,$WALL_H")
else
  ARGS+=(--kiosk)
fi

"$CHROME" "${ARGS[@]}"

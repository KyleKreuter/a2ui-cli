#!/usr/bin/env bash
#
# Plays one agent on the board: adds a build widget, updates it with `set`,
# and removes it with `remove --mine`.
#
# Start the board first, in its own terminal:
#
#   a2ui-term serve
#
# Then run this script from two tmux, Zellij, WezTerm or kitty panes at the same
# time. Each pane is one owner. In another terminal, give each run its own owner:
#
#   A2UI_TERM_OWNER=api examples/board.sh API &
#   A2UI_TERM_OWNER=web examples/board.sh Web &
#   wait
#
# If the board runs a session other than "default", set A2UI_TERM_SESSION.
set -euo pipefail

title="${1:-Build}"
catalog='https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json'

# `add` prints {"widgetId":"w1"}. Keep the id for the commands that follow.
widget=$(
  a2ui-term add --title "$title" --width 6 <<JSONL | sed -E 's/.*"widgetId":"([^"]+)".*/\1/'
{"version":"1.0","createSurface":{"surfaceId":"build","catalogId":"$catalog","dataModel":{"step":"Starting","percent":"0%"}}}
{"version":"1.0","updateComponents":{"surfaceId":"build","components":[{"id":"root","component":"Column","children":["step","percent"]},{"id":"step","component":"Text","text":{"@path":"/step"}},{"id":"percent","component":"Text","text":{"@path":"/percent"},"variant":"caption"}]}}
JSONL
)
echo "$title: added widget $widget"

for step in 'Installing dependencies:20%' 'Compiling:50%' 'Running tests:80%' 'Done:100%'; do
  sleep 1
  a2ui-term set --text "$widget" /step "${step%%:*}" /percent "${step##*:}"
done

sleep 2
echo "$title: $(a2ui-term remove --mine)"

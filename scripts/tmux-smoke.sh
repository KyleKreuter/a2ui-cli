#!/bin/sh
# Smoke test with a real tmux: an agent pane adds a widget, which opens the
# board next to it without taking the focus. Closing the agent pane marks the
# widget as ended, and close stops the board and closes its pane.
#
# Runs on a tmux server of its own (tmux -L), so it does not touch the tmux
# server of the user. Needs `npm run build` first.
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
cli="$root/dist/cli.js"
server="a2ui-smoke-$$"
work=$(mktemp -d)
runtime="$work/run"
mkdir -m 700 "$runtime"
out="$work/add.out"

t() { tmux -L "$server" -f /dev/null "$@"; }

cleanup() {
  t kill-server 2>/dev/null || true
  rm -rf "$work"
}
trap cleanup EXIT

fail() {
  echo "tmux-smoke: $*" >&2
  t list-panes -a -F '#{pane_id} dead=#{pane_dead} #{pane_current_command}' >&2 || true
  for pane in $(t list-panes -a -F '#{pane_id}' 2>/dev/null); do
    echo "--- pane $pane" >&2
    t capture-pane -p -t "$pane" >&2 || true
  done
  [ -f "$out" ] && { echo "--- add output" >&2; cat "$out" >&2; }
  exit 1
}

# Waits up to 10 s until the command succeeds.
wait_for() {
  tries=0
  until "$@" >/dev/null 2>&1; do
    tries=$((tries + 1))
    [ "$tries" -lt 100 ] || return 1
    sleep 0.1
  done
}

board_shows() { t capture-pane -p -t "$board" | grep -q -- "$1"; }

t new-session -d -s smoke -x 200 -y 50 -c "$root" \
  "XDG_RUNTIME_DIR='$runtime' node '$cli' add --title Smoke examples/progress.jsonl > '$out' 2>&1; echo \"exit \$?\" >> '$out'; sleep 60"
t set-option -g remain-on-exit on
agent=$(t display-message -p -t smoke '#{pane_id}')

wait_for grep -q '^exit' "$out" || fail 'add did not finish'
grep -q '^exit 0$' "$out" || fail 'add failed'
grep -q '"widgetId":"w1"' "$out" || fail 'add printed no widget id'

state="$runtime/a2ui-term/default.json"
board=$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('$state', 'utf8')).paneRef)")
[ "$board" != "$agent" ] || fail 'the board runs in the agent pane'
wait_for board_shows 'Smoke' || fail 'the board does not show the widget'
[ "$(t display-message -p -t smoke '#{pane_id}')" = "$agent" ] || fail 'the agent pane lost the focus'
echo "tmux-smoke: add opened board pane $board next to agent pane $agent"

t kill-pane -t "$agent"
wait_for board_shows 'w1 · ended' || fail 'the widget of the closed agent pane is not ended'
echo 'tmux-smoke: the widget of the closed agent pane is ended'

socket=$(t display-message -p '#{socket_path}')
TMUX="$socket,0,0" TMUX_PANE="$board" XDG_RUNTIME_DIR="$runtime" node "$cli" close
wait_for sh -c "! tmux -L '$server' -f /dev/null list-panes -a -F '#{pane_id}' | grep -qx -- '$board'" ||
  fail 'close left the board pane open'
[ ! -e "$state" ] || fail 'close left the state file'
echo 'tmux-smoke: close stopped the board and closed its pane'

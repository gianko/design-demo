#!/bin/bash
# Pins each Claude session to the branch it last put its checkout on, so a
# commit can't land on a branch another session switched to in the meantime.
# Usage: pin-branch.sh record | follow-switch | check-commit  (hook JSON on stdin)
input=$(cat)
session=$(jq -r '.session_id // empty' <<<"$input")
cwd=$(jq -r '.cwd // empty' <<<"$input")
command=$(jq -r '.tool_input.command // empty' <<<"$input")
[ -n "$session" ] && [ -n "$cwd" ] || exit 0

git_dir=$(git -C "$cwd" rev-parse --absolute-git-dir 2>/dev/null) || exit 0
pin="$git_dir/claude-branch-pins/$session"
branch=$(git -C "$cwd" branch --show-current)

record() {
  mkdir -p "$(dirname "$pin")" && printf '%s\n' "$branch" >"$pin"
}

case "$1" in
  record)
    record
    ;;
  follow-switch)
    # The session's own switch moves its pin, whether run bare or as
    # `git -C <path> switch` aimed at this same checkout.
    switch='(^|[;&|[:space:]])git[[:space:]]+(-C[[:space:]]+("[^"]*"|[^[:space:]]+)[[:space:]]+)?(switch|checkout)([[:space:]]|$)'
    if [[ $command =~ $switch ]]; then
      target=${BASH_REMATCH[3]//\"/}
      if [ -z "$target" ] ||
        [ "$(git -C "$cwd" -C "$target" rev-parse --absolute-git-dir 2>/dev/null)" = "$git_dir" ]; then
        record
      fi
    fi
    ;;
  check-commit)
    grep -Eq '(^|[;&|[:space:]])git[[:space:]]+commit([[:space:]]|$)' <<<"$command" || exit 0
    # A commit run in another directory is checked by that directory's own state.
    grep -Eq '(^|[;&|[:space:]])cd[[:space:]]|git[[:space:]]+-C[[:space:]]' <<<"$command" && exit 0
    if [ ! -f "$pin" ]; then
      record
      exit 0
    fi
    pinned=$(cat "$pin")
    if [ "$branch" != "$pinned" ]; then
      echo "Commit blocked: this checkout is on '$branch', but this session last put it on '$pinned'. Another session likely switched it. Run git status, then switch back to '$pinned' or commit from your own worktree." >&2
      exit 2
    fi
    ;;
esac
exit 0

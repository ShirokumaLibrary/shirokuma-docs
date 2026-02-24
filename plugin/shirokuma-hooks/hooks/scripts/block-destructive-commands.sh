#!/bin/bash
set -euo pipefail

# Block destructive git/GitHub commands via shirokuma-docs CLI.
# Used as a PreToolUse hook for the Bash tool.
#
# Configuration:
#   Rules:   shirokuma-docs.config.yaml → hooks.allow
#   Default: All rules in blocked-commands.json are active when hooks.allow is unset
#
# The CLI handles:
#   - Reading blocked-commands.json rules
#   - Filtering by hooks.allow in shirokuma-docs.config.yaml
#   - Stripping quoted strings (false-positive prevention)
#   - Pattern matching and deny JSON output
#
# To allow specific commands, edit shirokuma-docs.config.yaml:
#   hooks:
#     allow:
#       - pr-merge              # Allow gh pr merge / issues merge
#       # - force-push          # Allow git push --force
#       # - hard-reset          # Allow git reset --hard
#       # - discard-worktree    # Allow git checkout/restore .
#       # - clean-untracked     # Allow git clean -f
#       # - force-delete-branch # Allow git branch -D
#
# Limitation: Commands constructed via eval or variable expansion
# (e.g., cmd="git push --force" && eval "$cmd") are not detected.
# This hook performs string matching on the direct command text only.
#
# Input: JSON on stdin (Claude Code hook format)
# Output: JSON with permissionDecision (deny) or exit 0 (allow)

# Fail-open: if shirokuma-docs is not available, allow all commands
if ! command -v shirokuma-docs >/dev/null 2>&1; then
  exit 0
fi

# Pipe stdin to CLI for evaluation
# CLI outputs deny JSON on match, nothing on allow, and always exits 0
shirokuma-docs hooks evaluate || exit 0

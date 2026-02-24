#!/bin/bash
set -euo pipefail

# PreCompact hook: Auto-backup session state before context compaction.
# Saves git state and active issues to .claude/sessions/ for recovery
# when a session is unexpectedly interrupted.
#
# Input: JSON on stdin (Claude Code PreCompact hook format)
# Output: JSON (empty object — no modification to compaction behavior)

# Consume stdin (required by hook protocol)
cat > /dev/null

SESSIONS_DIR=".claude/sessions"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
BACKUP_FILE="${SESSIONS_DIR}/${TIMESTAMP}-precompact-backup.md"

# Create sessions directory
mkdir -p "$SESSIONS_DIR"

# Get git state (fast operations only)
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
GIT_STATUS=$(git status --short 2>/dev/null || echo "")
RECENT_COMMITS=$(git log --oneline -5 2>/dev/null || echo "")

# Get open issues (lightweight gh query, no project fields)
# timeout prevents hang if gh auth prompt appears during compaction
ACTIVE_ISSUES=""
if command -v gh &>/dev/null && command -v timeout &>/dev/null; then
  ACTIVE_ISSUES=$(timeout 5 gh issue list --state open --json number,title \
    --jq '.[] | "- #\(.number) \(.title)"' -L 10 2>/dev/null || echo "")
elif command -v gh &>/dev/null; then
  ACTIVE_ISSUES=$(gh issue list --state open --json number,title \
    --jq '.[] | "- #\(.number) \(.title)"' -L 10 2>/dev/null || echo "")
fi

# Build backup file
cat > "$BACKUP_FILE" <<EOF
# PreCompact 自動バックアップ

**作成日時**: $(date +"%Y-%m-%d %H:%M:%S")
**ブランチ**: ${BRANCH}

## Git 状態

### 未コミット変更
\`\`\`
${GIT_STATUS:-なし}
\`\`\`

### 直近のコミット
\`\`\`
${RECENT_COMMITS:-なし}
\`\`\`

## オープンな Issue
${ACTIVE_ISSUES:-情報取得失敗}

---
> このファイルは PreCompact フックにより自動生成されました。
> 正式な引き継ぎは \`/ending-session\` で GitHub Discussions に保存してください。
EOF

echo '{}'
exit 0

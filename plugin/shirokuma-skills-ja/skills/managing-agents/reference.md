# エージェントリファレンス

Claude Code エージェント仕様の完全な技術リファレンス。

## 目次

- [Frontmatter スキーマ](#frontmatter-スキーマ)
- [説明文の形式](#説明文の形式)
- [オプションフィールド](#オプションフィールド)
- [システムプロンプト構造](#システムプロンプト構造)
- [エージェント作成ワークフロー](#エージェント作成ワークフロー)
- [品質チェックリスト](#品質チェックリスト)
- [バリデーションルール](#バリデーションルール)
- [エラーメッセージ](#エラーメッセージ)
- [ディレクトリ形式](#ディレクトリ形式)
- [ドキュメント構造](#ドキュメント構造)

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [design-patterns.md](design-patterns.md) | 5つのエージェントパターン（Analyzer, Generator 等） |
| [best-practices.md](best-practices.md) | アンチパターン、テスト、パフォーマンス |
| [documentation-structure.md](documentation-structure.md) | ナレッジベース整理、パターンファイル形式 |
| [examples.md](examples.md) | 実際のエージェント例 |

## Frontmatter スキーマ

### name

**Type**: `string`
**Required**: Yes
**Pattern**: `/^[a-z][a-z0-9-]*$/`

**有効**:
- `code-reviewer`
- `test-generator`
- `doc-builder-v2`

**無効**:
- `CodeReviewer` (大文字)
- `code_reviewer` (アンダースコア)
- `123-agent` (数字始まり)

### description

**Type**: `string`
**Required**: Yes
**Purpose**: エージェントの発見と呼び出しに不可欠

## 説明文の形式

### シンプル形式

**長さ**: 50-300文字
**構造**: `[機能]. Use when [トリガー].`

```yaml
description: Reviews code for quality and security. Use when user asks to "review PR", "check code", or "review my changes".
```

### リッチ形式（推奨）

**長さ**: 300-2000文字
**構造**: 目的の記述 + `<example>` ブロック

```yaml
description: Use this agent when the user needs to [task]. This agent [characteristics].

Examples:

<example>
Context: [Situation that triggers this agent]
user: "[Sample user message]"
assistant: "[Expected response before invoking]"
<Task tool call to [agent-name] agent>
</example>
```

**Example ブロックのフィールド**:

| フィールド | 説明 | 例 |
|-----------|------|-----|
| `Context:` | 状況の説明 | "User wants to add a new feature" |
| `user:` | サンプルメッセージ（引用符付き） | `"Add pagination to posts"` |
| `assistant:` | 期待される応答 | `"I'll implement this with TDD."` |
| `<Task...>` | ツール呼び出しプレースホルダ | `<Task tool call to coder agent>` |

**形式の使い分け**:

| 形式 | ユースケース | エージェント例 |
|------|------------|--------------|
| シンプル | 単一目的、明確なトリガー | `linter`, `formatter` |
| リッチ | 多目的、微妙なトリガー | `vibe-coder`, `reviewer` |

**アンチパターン**:

```yaml
# 短すぎる
description: Code reviewer

# トリガーなし
description: An agent that reviews code for quality issues

# 良いシンプル形式
description: Reviews code for quality and security. Use when user asks to "review PR" or "check code".

# 良いリッチ形式
description: Use this agent for TDD implementation.

<example>
Context: User wants new feature.
user: "Add dark mode toggle"
assistant: "I'll implement this with TDD."
<Task tool call to tdd-developer agent>
</example>
```

## オプションフィールド

### tools

**Type**: `string` (カンマ区切り)
**Default**: 省略時は全ツール

**利用可能なツール**:
- `Read` - ファイル読み取り
- `Write` - ファイル作成
- `Edit` - ファイル変更
- `Bash` - コマンド実行
- `Grep` - コンテンツ検索
- `Glob` - ファイル検索
- `WebFetch` - URL 取得
- `WebSearch` - Web 検索
- `Task` - サブエージェント起動

**一般的な構成**:

```yaml
# コードレビューア（読み取り専用）
tools: Read, Grep, Glob, Bash

# テスト生成（読み取り＋書き込み）
tools: Read, Write, Bash

# ドキュメントビルダー
tools: Read, Write, Glob, Grep

# 全ツール（デフォルト - フィールド省略）
```

### model

**Type**: `string`
**Default**: `sonnet`

| 値 | ユースケース |
|-----|------------|
| `sonnet` | ほとんどのエージェント、バランス型 |
| `opus` | 複雑な推論、重要なタスク |
| `haiku` | 単純なタスク、高速反復 |
| `inherit` | ユーザーのモデル選択に合わせる |

### permissionMode

**Type**: `string`
**Default**: `default`

| 値 | 動作 |
|-----|------|
| `default` | 標準の権限プロンプト |
| `acceptEdits` | ファイル編集を自動承認 |
| `bypassPermissions` | 全プロンプトをスキップ（慎重に使用） |
| `plan` | 計画モードのみ |
| `ignore` | 権限リクエストを無視 |

### skills

**Type**: `string` (カンマ区切り)
**Default**: なし

```yaml
# 単一スキル
skills: processing-pdfs

# 複数スキル
skills: processing-pdfs, analyzing-spreadsheets
```

## システムプロンプト構造

### 推奨セクション

```markdown
# [Agent Name]

[簡潔な説明]

## Core Responsibilities
- [タスク 1]
- [タスク 2]

## Workflow
1. **[Step 1]**: [ツール使用を含む指示]
2. **[Step 2]**: [分岐点を含む指示]

## Quality Criteria
- [成功基準 1]
- [成功基準 2]

## Output Format
[期待される出力構造]

## Examples
### Example 1: [シナリオ]
[Input → Process → Output]
```

### ライティングガイドライン

**推奨**:
- 命令形を使用 ("Check for...", "Verify that...")
- 具体的でアクション可能に
- コード例を含める
- 技術用語を定義

**非推奨**:
- 曖昧な表現 ("try to", "maybe")
- コンテキストを前提にする
- エラー処理を省略
- 定義なしの専門用語

## エージェント作成ワークフロー

### ステップ 1: 要件の理解

- エージェントが実行するタスクは？
- いつ呼び出されるべきか？
- どのツールが必要か？

### ステップ 2: 形式の選択

| 条件 | 形式 |
|------|------|
| シンプル、300行未満 | 単一ファイル (`.md`) |
| 複雑、300行以上 | ディレクトリ構造 |

### ステップ 3: Frontmatter の記述

```yaml
---
name: my-agent
description: Purpose. Use when [triggers].
tools: Read, Grep, Glob
model: sonnet
---
```

### ステップ 4: システムプロンプトの記述

含めるべき内容:
- コア責務 (3-5項目)
- ステップバイステップワークフロー (3-7ステップ)
- 品質基準
- 出力形式
- 例 (2-3シナリオ)

### ステップ 5: ファイル作成

```bash
# シンプルなエージェント
cat > .claude/agents/my-agent.md << 'EOF'
[frontmatter + system prompt]
EOF

# 複雑なエージェント
mkdir -p .claude/agents/my-agent/{templates,scripts}
cat > .claude/agents/my-agent/AGENT.md << 'EOF'
[frontmatter + core prompt]
EOF
```

### ステップ 6: 呼び出しテスト

説明文のフレーズを試す:
- "Use the my-agent agent"
- 定義したトリガーフレーズ

## 品質チェックリスト

### 構造
- [ ] 有効な YAML frontmatter
- [ ] 必須フィールド (name, description) あり
- [ ] 適切な Markdown フォーマット
- [ ] 500行未満（またはディレクトリ使用）

### コンテンツ
- [ ] 具体的な責務の定義
- [ ] ステップバイステップワークフロー
- [ ] 品質基準の指定
- [ ] 例の提供
- [ ] エラー処理の対応

### 技術
- [ ] 名前が規約に従う (lowercase-with-hyphens)
- [ ] 説明文に呼び出しトリガーを含む
- [ ] ツールが適切に制限されている
- [ ] モデル選択に根拠がある

### セキュリティ
- [ ] 最小限のツール権限
- [ ] 不必要な Bash アクセスなし
- [ ] Write アクセスに正当な理由
- [ ] 機密操作にガードあり

## バリデーションルール

### Name

```regex
^[a-z][a-z0-9-]*$
```

- 小文字で開始
- 小文字、数字、ハイフンのみ
- 長さ: 3-50文字

### Tools

- 有効なツール名のみ（大文字小文字区別）
- 重複なし
- タイポなし（例: "Grep" であり "grep" ではない）

### Model

- sonnet, opus, haiku, inherit のいずれか
- 小文字のみ

## エラーメッセージ

### 必須フィールドの欠如

```
Error: Missing required field: description
File: .claude/agents/my-agent.md

Every agent must have a description that explains:
1. What the agent does
2. When to use it

Example:
description: Reviews code for quality. Use when user asks "review PR".
```

### 無効な名前

```
Error: Invalid agent name: "CodeReviewer"

Agent names must:
- Use lowercase letters only
- Separate words with hyphens

Please rename to: code-reviewer
```

### 無効なツール

```
Error: Invalid tool: "bash"

Tool names are case-sensitive. Did you mean: "Bash"

Valid tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch, Task
```

## ディレクトリ形式

広範なドキュメントを必要とする複雑なエージェント向け。

### 構造

| ファイル | 必須 | 目的 |
|---------|------|------|
| `AGENT.md` | はい | コアプロンプト (<500行) |
| `reference.md` | | 詳細仕様 |
| `examples.md` | | ユースケース |
| `best-practices.md` | | 高度なパターン |
| `templates/` | | 再利用可能なテンプレート |
| `scripts/` | | ヘルパースクリプト |

### AGENT.md の要件

- 500行未満
- frontmatter を含む
- ハイレベルなワークフロー
- サポートファイルへのリンク（1階層のみ）

### サポートファイル

| ファイル | 目的 | 内容 |
|---------|------|------|
| `reference.md` | 詳細仕様 | 完全なチェックリスト、API仕様 |
| `examples.md` | ユースケース | 入出力シナリオ |
| `best-practices.md` | 高度なパターン | エキスパートテクニック、アンチパターン |
| `templates/` | 再利用テンプレート | レポート形式 |
| `scripts/` | ヘルパースクリプト | 分析ツール |

### バリデーションチェックリスト

- [ ] AGENT.md が500行未満
- [ ] Frontmatter が有効（YAML: スペース使用、タブ不可）
- [ ] 参照は1階層のみ
- [ ] 全リンクが有効
- [ ] 長いファイルに目次あり
- [ ] スラッシュのみ使用（Windows パスなし）
- [ ] スクリプトに実行権限あり

### クイックセットアップ

```bash
# ディレクトリ構造を作成
mkdir -p .claude/agents/my-agent/{templates,scripts}

# AGENT.md を作成
cat > .claude/agents/my-agent/AGENT.md << 'EOF'
---
name: my-agent
description: Purpose and triggers
tools: Read, Write, Bash
---

# My Agent

[500行未満のコアプロンプト]

See [reference.md](reference.md) for details.
EOF

# サポートファイルを作成
touch .claude/agents/my-agent/{reference,examples,best-practices}.md

# スクリプト権限を設定
chmod +x .claude/agents/my-agent/scripts/*.py
```

## ドキュメント構造

複数の参照ファイルを持つ複雑なエージェント向けに **ドキュメント構造パターン** を使用。

### 使用場面

- 3つ以上の参照ファイルが必要
- トピック別の複数パターンファイル
- コード生成用テンプレート
- 品質ゲート用チェックリスト

### 基本原則

1. **単一情報源**: 情報は1箇所にのみ記述
2. **明確な責務**: 各ファイルは1つの目的
3. **参照リンク**: 他のファイルはリンクのみ、重複なし

→ 詳細パターン: [documentation-structure.md](documentation-structure.md)

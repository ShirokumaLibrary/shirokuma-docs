---
name: managing-agents
description: Anthropicの公式ベストプラクティスに従ってClaude Codeエージェントファイルを作成・更新・改善します。「agent」「AGENT.md」「create agent」「update agent」「improve agent」「generate agent」「agent template」「workflow pattern」、エージェントの作成・更新・改善時に使用。「エージェント作成」「コードレビュー用のエージェントを作って」「エージェント改善」がトリガー。
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Claude Code エージェントの管理

エージェントを作成・更新・改善する。

> **基本原則**: シンプルに始める。「成功は最も高度なシステムを構築することではなく、ニーズに合った正しいシステムを構築すること。」 — [Anthropic](https://www.anthropic.com/engineering/building-effective-agents)

## いつ使うか

- 「エージェント作成」「create an agent」「make a new agent」
- 「エージェント更新」「update an agent」「improve an agent」
- 「agent template」「agent example」
- 「エージェントレビュー」「check agent quality」

## 移行: エージェント → `context: fork` 付きスキル

スキルが `context: fork` をサポートしたことで、独立サブエージェントとして実行可能に。ほとんどのユースケースでスキルを推奨:
- リサーチタスク（`best-practices-researching` スキル参照）
- レビュータスク（`reviewing-on-issue` スキル参照）
- 設定検証（`claude-config-reviewing` スキル参照）

**エージェントが適切な場合:**
- 真にオープンエンドなマルチステップタスクで完全な自律性が必要
- Task ツールでさらにサブエージェントを生成する必要がある

## エージェントシステム: ワークフロー vs エージェント

この区別の理解は効果的なシステム設計に**不可欠**。

| タイプ | 制御 | 使用タイミング |
|--------|------|--------------|
| **ワークフロー** | 事前定義コードパスが LLM 呼び出しを統制 | サブタスクが予測可能、一貫性が必要 |
| **エージェント** | LLM が動的にプロセスとツール使用を決定 | オープンエンドな問題、予測不可能なステップ |

### 判断ガイド

**全ステップを予測できるか?**

| 回答 | 使用 | 特徴 |
|------|------|------|
| YES | ワークフロー | 決定論的、信頼性高い（プロンプトチェーン、ルーティング、並列化） |
| NO | エージェント | 柔軟、自律的（高レイテンシ/コスト、未知を処理） |

**まずワークフローから始める** — 結果が正当化する場合にのみエージェントの自律性を追加。

[design-patterns.md](design-patterns.md) に5つのワークフローパターン + エージェントロールあり。

## クイックリファレンス

### エージェントファイルの場所

**シンプルなエージェント**: `.claude/agents/agent-name.md`（単一ファイル）

**複雑なエージェント**: `.claude/agents/agent-name/`（ディレクトリ）

| ファイル | 必須 | 用途 |
|---------|------|------|
| `AGENT.md` | ✓ | コアプロンプト（500行未満） |
| `reference.md` | | 詳細仕様 |
| `examples.md` | | ユースケース |
| `templates/` | | 再利用可能テンプレート |

### 最小エージェントテンプレート

```markdown
---
name: agent-identifier
description: What it does. Use when [triggers].
tools: Read, Grep, Glob
model: sonnet
---

# Agent Name

概要。

## コア責務
- タスク 1
- タスク 2

## ワークフロー
1. **ステップ 1**: アクション
2. **ステップ 2**: アクション

## 出力フォーマット
[期待される出力構造]
```

## 必須フィールド

### name
- 小文字とハイフン: `code-reviewer`, `test-generator`
- パターン: `/^[a-z][a-z0-9-]*$/`

### description（発見性に極めて重要）

**シンプル形式**:
```yaml
description: Reviews code for quality. Use when user asks "review PR" or "check code".
```

**リッチ形式（推奨）**:
```yaml
description: Use this agent when [task]. Examples:

<example>
Context: [Situation]
user: "[Message]"
assistant: "[Response before invoking]"
<Task tool call to agent-name agent>
</example>
```

[reference.md](reference.md#description-formats) に完全な例あり。

## オプションフィールド

| フィールド | 値 | デフォルト |
|-----------|-----|----------|
| `tools` | Read, Write, Edit, Bash, Grep, Glob, WebFetch, Task | 全ツール |
| `model` | sonnet, opus, haiku, inherit | sonnet |
| `permissionMode` | default, acceptEdits, bypassPermissions | default |
| `skills` | カンマ区切りのスキル名 | なし |

[reference.md](reference.md#optional-fields) に詳細あり。

## エージェント設計原則

### 1. シンプルさ優先
最もシンプルな解決策から始める。結果が正当化する場合にのみ複雑さを追加。

### 2. 単一責任
1エージェント1目的。重いエージェント（25k+ トークン）はボトルネックになる; 軽量エージェント（3k未満）は柔軟なオーケストレーションを可能に。

### 3. Creator-Checker パターン（Evaluator-Optimizer）

| タイプ | 役割 | ルールスタイル |
|--------|------|-------------|
| **Creator** | 実装 | 「する」ルールのみ |
| **Checker** | レビュー/監査 | 「する」+「しない」ルール |

**例**: `nextjs-vibe-coding (Creator) ←→ reviewing-on-issue (Checker)`

### 4. 最小ツールアクセス（ACI）

**Agent-Computer Interface** — ツール設計はプロンプトと同等に重要:

| エージェントタイプ | 推奨ツール |
|------------------|-----------|
| レビュアー（読み取り専用） | Read, Grep, Glob, Bash |
| ジェネレーター | Read, Write, Bash |
| トランスフォーマー | Read, Edit, Bash |

[best-practices.md](best-practices.md#aci-agent-computer-interface) にツール設計ガイドラインあり。

### 5. 明確な起動トリガー
以下のようなフレーズを含める:
- "Use PROACTIVELY when..."
- "Automatically invoke when..."

[design-patterns.md](design-patterns.md) にワークフローパターン + エージェントロールあり。

## よくあるエージェントタイプ

### Creator エージェント
| エージェント | 用途 | ツール |
|------------|------|--------|
| コーダー/ビルダー | 機能実装 | Read, Write, Edit, Bash |
| テストジェネレーター | テストスイート作成 | Read, Write, Bash |
| ドキュメントビルダー | ドキュメント作成 | Read, Write, Glob |

### Checker エージェント
| エージェント | 用途 | ツール |
|------------|------|--------|
| コードレビュアー | 品質・セキュリティ | Read, Grep, Glob, Bash |
| セキュリティ監査 | 脆弱性検出 | Read, Grep, Glob, Bash |
| デバッガー | 根本原因分析 | Read, Bash, Grep, Glob |

[examples.md](examples.md) に完全なテンプレートあり。

## ワークフロー: エージェント作成

1. **要件理解**: タスク、トリガー、必要なツールを確認
2. **フォーマット選択**: 単一ファイル（300行未満）またはディレクトリ
3. **フロントマター記述**: name, description, tools, model
4. **システムプロンプト記述**: 責務、ワークフロー、出力フォーマット
5. **ファイル作成**: `.claude/agents/[name].md`
6. **テスト**: 呼び出しフレーズで起動確認
7. **レビュー**: `claude-config-reviewing` スキルで検証

**クイックスタート**:
```bash
# シンプルなエージェント
cat > .claude/agents/my-agent.md << 'EOF'
---
name: my-agent
description: Does X. Use when user asks for Y.
tools: Read, Grep, Glob
---

# My Agent

[システムプロンプト...]
EOF
```

[reference.md](reference.md#creating-agents-workflow) に詳細なワークフローあり。

## ワークフロー: エージェント更新

1. **現状読み込み**: 既存ファイルを読み込み
2. **問題特定**: 曖昧な指示、不足ワークフロー
3. **変更適用**: Edit ツールで修正
4. **検証**: 品質チェックリストで確認
5. **レビュー**: `claude-config-reviewing` スキルで検証

[reference.md](reference.md#quality-checklist) に評価基準あり。

## 段階的開示（複雑なエージェント）

300行を超えるエージェントはディレクトリ構造を使用:

| ファイル | 用途 |
|---------|------|
| `AGENT.md` | コアプロンプト（500行未満） |
| `reference.md` | 詳細仕様 |
| `examples.md` | ユースケース |
| `best-practices.md` | 高度なパターン |
| `templates/` | 再利用可能テンプレート |

**主要ルール**:
- AGENT.md は500行未満
- 参照は1階層まで
- 長いファイルには目次を含める

[reference.md](reference.md#directory-format) に完全な仕様あり。

## ビルトインエージェント

| エージェント | モデル | ツール | 用途 |
|------------|--------|--------|------|
| General-purpose | sonnet | 全ツール | 複雑なマルチステップタスク |
| Plan | haiku | 読み取り専用 | コードベースリサーチ |
| Explore | haiku | 読み取り専用 | 軽量探索 |

## 再開可能なエージェント

```typescript
// 前回のセッションを再開
Task({
  resume: "previous-agent-id",
  prompt: "Continue from where we left off"
})
```

## よくある間違い

| 間違い | 修正 |
|--------|------|
| スコープが広すぎる | 単一責任に集中 |
| 曖昧な指示 | ステップバイステップのワークフローを追加 |
| ツールが多すぎる | 必要なツールのみに制限 |
| 不十分な説明文 | 起動トリガーを含める |

## 保存場所

| 優先度 | 場所 | ユースケース |
|--------|------|-------------|
| 最高 | `.claude/agents/` | プロジェクト用、git 追跡 |
| 中 | `--agents` CLI フラグ | 動的、セッション限定 |
| 最低 | `~/.claude/agents/` | 個人用、共有なし |

## 関連リソース

- [reference.md](reference.md) - フロントマタースキーマ、検証ルール、ディレクトリ形式
- [examples.md](examples.md) - 完全なエージェントテンプレート（9タイプ）
- [design-patterns.md](design-patterns.md) - 5つのエージェント設計パターン
- [best-practices.md](best-practices.md) - 高度なパターン、アンチパターン

## 注意事項

- AGENT.md は500行未満、参照は1階層まで
- 要件不明確時は AskUserQuestion で用途・トリガー・ツールを確認
- 作成+更新の複合タスクは TodoWrite で管理

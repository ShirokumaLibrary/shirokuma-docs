---
name: managing-skills
description: Claude Codeのスキルファイルを公式ベストプラクティスに従って作成・更新・改善します。「skill」「SKILL.md」「create skill」「update skill」「improve skill」「generate skill」「skill template」、スキルの作成・更新・改善時に使用。「スキル作成」「PDF処理用のスキルを作って」「update the managing-agents skill」がトリガー。
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Claude Code スキルの管理

スキルを作成・更新・改善する。

## いつ使うか

- 「スキル作成」「create a skill」「make a skill」
- 「スキル更新」「update a skill」「improve a skill」
- 「skill template」「SKILL.md help」
- 「スキルレビュー」「check skill quality」

## スキルとは

**Skills** は Claude の機能を拡張するモジュール型ケイパビリティ:
- **モデル起動型**: Claude が自律的に使用を判断
- **段階的開示**: コア指示 + オンデマンドリソース
- 必須の `SKILL.md`（YAML フロントマター付き）
- オプションのサポートファイル（reference.md, examples.md 等）

## クイックリファレンス

### ファイル構造

| ファイル | 必須 | 用途 |
|---------|------|------|
| `SKILL.md` | ✓ | コア指示（500行未満） |
| `scripts/` | | 自動化スクリプト |
| `references/` | | オンデマンドドキュメント |
| `assets/` | | 出力ファイル |
| `templates/` | | ボイラープレート |

### 最小テンプレート

```markdown
---
name: skill-name
description: [What it does]. Use when [triggers].
---

# Skill Title

概要。

## いつ使うか
- [トリガーシナリオ]

## ワークフロー

### ステップ 1: [アクション]
手順とチェックリスト。

### ステップ 2: [アクション]
検証: 実行 → 確認 → 修正 → 繰り返し。

## 注意事項
- 制約と前提条件
```

## 保存場所

| 場所 | 用途 |
|------|------|
| `~/.claude/skills/` | 個人用（共有なし） |
| `.claude/skills/` | プロジェクト用（git 管理） |
| `plugin/skills/` | プラグイン配布用 |

## ワークフロー: スキル作成

### ステップ 1: 要件収集

1. **目的**: スキルの機能
2. **トリガー**: 起動フレーズ
3. **スコープ**: 1つの集中した機能か?
4. **複雑さ**: サポートファイルが必要か?

### ステップ 2: 命名

**規約**: 動名詞形（verb + -ing）

| 有効 | 無効 |
|------|------|
| `processing-pdfs` | `PDF-Processor` |
| `analyzing-data` | `helper` |

ルール: 小文字、ハイフン、最大64文字

### ステップ 3: 説明文（重要）

**テンプレート**: `[What it does]. Use when [conditions/triggers].`

**要件**:
- 最大1024文字、三人称
- WHAT（機能）+ WHEN（トリガー）を含む
- 具体的な用語

**良い例**:
```yaml
description: Extract text and tables from PDF files. Use when working with PDF files or when user mentions PDFs.
```

**悪い例**:
```yaml
description: Helps with documents  # 曖昧すぎる
```

[reference.md](reference.md#description-field) にリッチフォーマットの例あり。

### ステップ 4: SKILL.md 本文

**目標**: 500行未満。各文の必要性を吟味する。

**構造**:
1. 概要（1-2段落）
2. いつ使うか（トリガーシナリオ）
3. ワークフロー（番号付きステップ）
4. 注意事項（制約）
5. 関連リソース（リンク）

**原則**: 参照は1階層まで。

### ステップ 5: サポートファイル

| ファイル | 作成タイミング |
|---------|---------------|
| reference.md | API仕様、完全なチェックリスト |
| examples.md | I/O 例付き複数ユースケース |
| best-practices.md | 高度なパターン |
| scripts/ | ユーティリティスクリプト（chmod +x） |
| templates/ | ボイラープレート |

[architecture.md](architecture.md) に段階的開示の詳細あり。

### ステップ 6: ツール設定

#### allowed-tools（推奨）

`allowed-tools` を必ず指定してスキルのツールを制約する:

```yaml
---
name: code-analyzer
description: ...
allowed-tools: Read, Grep, Glob
---
```

| プロファイル | ツール | 用途 |
|------------|--------|------|
| 読み取り専用 | Read, Grep, Glob | 分析、探索 |
| GitHub操作 | Bash, Read, Grep, Glob | CLI ベースワークフロー |
| インタラクティブ | Read, Grep, Glob, AskUserQuestion | ユーザー判断が必要 |
| フル編集 | Read, Write, Edit, Bash, Grep, Glob | 実装スキル |

#### インタラクティブツール

| ツール | 追加タイミング |
|--------|-------------|
| AskUserQuestion | 判断ポイント、確認、エッジケースでのユーザー入力が必要な場合。プレーンテキストではなく構造化オプションを使用 |
| TodoWrite | 4+ステップの順次ワークフローで進捗表示が有用な場合。単純な線形ワークフローでは不要 |

#### 高度なフロントマター

| フィールド | 用途 | 例 |
|-----------|------|-----|
| `context: fork` | サブエージェント実行（分離コンテキスト） | レビュー、リサーチ |
| `agent` | サブエージェントタイプ（`context: fork` と併用） | `general-purpose`, `Explore` |
| `model` | モデルオーバーライド | `opus`, `sonnet`, `haiku` |

**`context: fork` 移行パターン**（Agent → Skill）:

```yaml
# 以前: Agent (AGENT.md)
---
name: best-practices-researcher
tools: Read, Grep, Glob, WebSearch, WebFetch, Bash
model: opus
---

# 現在: Skill with context: fork (SKILL.md)
---
name: researching-best-practices
context: fork
agent: general-purpose
model: opus
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch, Bash
---
```

**スキルのメリット**:
- 統一管理（全機能がスキル）
- `claude plugin install` で配布
- 一貫した命名規約（動名詞形）
- `allowed-tools` で明示的ツール制約
- Skill ツールで起動（Task ツール + subagent_type より簡潔）

#### 動的コンテキスト注入

`` !`command` `` でスキル本文にコマンド出力を注入:

```markdown
## 現在の Issue データ
!`shirokuma-docs issues show $ARGUMENTS`
```

常に同じコンテキストが必要なスキルに最適。引数に追加テキストが含まれる場合は避ける。

#### Bash 非同期実行

長時間操作（テスト、ビルド）には `run_in_background` を使用:

```markdown
テストをバックグラウンドで実行:
Bash ツールで `run_in_background: true` を指定して `pnpm test`
```

### ステップ 7: ファイル作成

**方法 A: init スクリプト（推奨）**

```bash
./scripts/init_skill.py my-skill --path .claude/skills
```

テンプレート付きの完全なスキル構造を作成。

**方法 B: 手動**

```bash
mkdir -p .claude/skills/skill-name
cat > .claude/skills/skill-name/SKILL.md << 'EOF'
---
name: skill-name
description: [description]
---

# Title
...
EOF
```

### ステップ 8: 検証

**検証スクリプト:**

```bash
./scripts/quick_validate.py .claude/skills/skill-name
```

**手動チェックリスト:**

- [ ] 名前: 動名詞形、小文字、最大64文字
- [ ] 説明文: トリガー、三人称、最大1024文字
- [ ] SKILL.md: 500行未満
- [ ] フロントマター: 有効な YAML（スペース、タブ不可）
- [ ] 参照: 1階層まで
- [ ] パス: スラッシュのみ

[reference.md](reference.md#validation-checklist) に完全なチェックリストあり。

### ステップ 9: レビュー

`reviewing-claude-config` スキルで検証:
- 構造と必須セクション
- アンチパターン（一時マーカー、壊れたリンク）
- ファイルサイズ制限

### ステップ 10: テスト

1. トリガーフレーズで起動テスト
2. ワークフローをステップごとに実行
3. 複数モデル（Haiku, Sonnet, Opus）でテスト
4. 観察に基づきイテレーション

[best-practices.md](best-practices.md#testing) にテスト戦略あり。

## ワークフロー: スキル更新

### ステップ 1: 現状確認

```bash
cat .claude/skills/skill-name/SKILL.md
ls .claude/skills/skill-name/
```

### ステップ 2: 問題特定

よくある問題:
- 曖昧な説明文、トリガー不足
- 古い例
- SKILL.md が500行超過
- 構造不良

### ステップ 3: 変更適用

作成時と同じ原則:
- 500行未満維持
- 説明文のトリガー更新
- 大量コンテンツはサポートファイルに移動

### ステップ 4: レビュー

`reviewing-claude-config` スキルで検証。

### ステップ 5: テスト

- トリガーフレーズで起動テスト
- 複数モデルでテスト
- フィードバック収集

[updating-skills.md](updating-skills.md) に詳細なワークフローあり。

## 主要原則

### 1. 簡潔さ
500行未満。Claude は基礎知識を持つ前提。

### 2. 自由度の設計
タスクの脆弱性に応じて具体性を調整:
- **高**: テキスト指示（柔軟）
- **中**: 疑似コード（ガイド付き）
- **低**: 正確なスクリプト（決定論的）

### 3. 1階層参照
SKILL.md → サポートファイル（それ以上のチェーンなし）

### 4. 用語の一貫性
1つの概念に1つの用語を使用。

## よくあるアンチパターン

| アンチパターン | 修正 |
|-------------|------|
| 選択肢が多すぎる | デフォルトを提供 |
| 曖昧な命名 | 具体的な動名詞形 |
| Windows パス | スラッシュのみ使用 |
| 深い参照チェーン | SKILL.md から1階層まで |
| スコープが広すぎる | 集中したスキルに分割 |

## トラブルシューティング

| 問題 | 解決策 |
|------|--------|
| スキルが起動しない | 説明文にユーザーの言い回しを追加 |
| コンテンツが無視される | 目次追加、構造改善 |
| 他スキルと競合 | 明確に区別された用語を使用 |

## 完了レポート

```markdown
## スキル{作成 | 更新}完了

**名前:** {skill-name}
**説明文:** {description}
**場所:** {path}
**サイズ:** ~{X} 行
```

スタンドアロン実行時は次のステップ（レビュー、テスト方法）を提案する。

## スクリプト

| スクリプト | 用途 |
|-----------|------|
| `scripts/init_skill.py` | テンプレートから新規スキル作成 |
| `scripts/quick_validate.py` | スキル構造の検証 |
| `scripts/package_skill.py` | 配布用パッケージ |

```bash
# 新規スキル初期化
./scripts/init_skill.py my-skill --path .claude/skills

# 既存スキル検証
./scripts/quick_validate.py .claude/skills/my-skill

# 配布用パッケージ
./scripts/package_skill.py .claude/skills/my-skill ./dist
```

## 関連リソース

- [reference.md](reference.md) - 完全な仕様、フロントマターフィールド
- [best-practices.md](best-practices.md) - 高度なパターン、テスト
- [examples.md](examples.md) - 具体的なユースケース
- [architecture.md](architecture.md) - 段階的開示
- [updating-skills.md](updating-skills.md) - 更新ワークフロー
- [reference-workflows.md](reference-workflows.md) - ワークフローパターン
- [reference-output-patterns.md](reference-output-patterns.md) - 出力テンプレート

## 注意事項

- スキルは**モデル起動型**（自動）
- 説明文は発見性に極めて重要
- SKILL.md は500行未満を維持
- パスは常にスラッシュを使用
- 変更後は Claude Code を再起動
- 複数モデルでテスト

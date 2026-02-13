# 出力スタイルリファレンス

Claude Code 出力スタイルの完全な技術仕様。

## 目次

- [Frontmatter 仕様](#frontmatter-仕様)
- [設定ファイル形式](#設定ファイル形式)
- [ファイル配置](#ファイル配置)
- [ビルトインスタイル](#ビルトインスタイル)
- [カスタムスタイル要件](#カスタムスタイル要件)
- [優先度とオーバーライドルール](#優先度とオーバーライドルール)

## Frontmatter 仕様

### 必須フィールド

```yaml
---
name: style-name          # 必須: 一意の識別子（kebab-case）
description: Brief text   # 必須: スタイルの機能（1-2文）
---
```

### フィールド詳細

#### name

- Type: `string`
- Pattern: `^[a-z0-9-]+$`（小文字、数字、ハイフンのみ）
- 最大長: 64文字
- スコープ内で一意であること（ユーザーレベルまたはプロジェクトレベル）
- `/output-style [name]` コマンドで使用
- 予約名は使用不可: `default`, `explanatory`, `learning`

例:
- `security-focused` -- 有効
- `refactoring-mode` -- 有効
- `SecurityFocused` -- 無効（大文字）
- `security_focused` -- 無効（アンダースコア）

#### description

- Type: `string`
- 最大長: 1024文字
- スタイルの動作を明確に記述
- インタラクティブメニューとヘルプテキストに表示される

## 設定ファイル形式

出力スタイル設定は `.claude/settings.local.json` に保存:

```json
{
  "outputStyle": "style-name"
}
```

- 場所: `.claude/settings.local.json`（プロジェクトルート）
- `/output-style` コマンド使用時に自動作成
- `.gitignore` に追加すべき（ローカル設定、共有しない）

`outputStyle` フィールドが存在しない、またはファイルが存在しない場合、"default" スタイルが有効。

## ファイル配置

### ユーザーレベルスタイル

場所: `~/.claude/output-styles/*.md`

- すべてのプロジェクトで利用可能
- ホームディレクトリ同期でマシン間移動可能
- プロジェクトレベルより低優先度

### プロジェクトレベルスタイル

場所: `.claude/output-styles/*.md`

- このプロジェクト内でのみ利用可能
- git リポジトリでチームと共有
- ユーザーレベルより高優先度（同名の場合オーバーライド）

## ビルトインスタイル

### default

効率的なタスク完了に最適化された標準エンジニアリングモード。

**特性**: 簡潔なコミュニケーション、本番重視、最小限の説明テキスト

**使用場面**: 本番機能構築、時間制約あり、コードベースを十分理解している場合

### explanatory

コーディング活動の間に教育的な "Insights" セクションを追加。

**特性**: アーキテクチャ決定の説明、パターンの強調、教育的コメンタリー

**使用場面**: 新しいコードベースの学習、デザインパターンの理解、プロジェクトオンボーディング

### learning

`TODO(human)` マーカー付きの協調的ハンズオンアプローチ。

**特性**: Claude が部分的なソリューションを実装、`TODO(human)` で完成部分を指示

**使用場面**: 新しい言語・フレームワークの学習、特定テクニックの練習、教育目的のペアプログラミング

## カスタムスタイル要件

### 最小構成

```markdown
---
name: minimal-style
description: A minimal custom output style
---

# Minimal Style

Add your custom instructions here.
```

### 推奨構造

```markdown
---
name: style-name
description: Clear description of behavior changes
---

# Style Title

Brief overview of this style's purpose.

## Core Principles

- Principle 1
- Principle 2

## Modified Behaviors

### When Writing Code

[Instructions for code generation...]

### When Explaining

[Instructions for explanations...]

## Additional Guidelines

[Any other customizations...]
```

### カスタマイズ可能な範囲

**カスタマイズ可能:**
- トーンとコミュニケーションスタイル
- 説明の詳細レベル
- コードコメントのアプローチ
- テスト哲学
- ドキュメント重視度
- フォーカスエリア（セキュリティ、パフォーマンス等）

**オーバーライド不可:**
- ツールの可用性（Read, Write, Bash 等）
- コアセーフティガイドライン
- ファイル操作の動作
- Git ワークフロー

## 優先度とオーバーライドルール

### スタイル選択の優先度

1. **明示的コマンド**: `/output-style [name]` -- 最高優先度
2. **設定ファイル**: `.claude/settings.local.json` -- 中優先度
3. **デフォルト**: ビルトイン "default" スタイル -- フォールバック

### ファイル配置の優先度

同名のスタイルが複数存在する場合:

1. **プロジェクトレベル**: `.claude/output-styles/style.md` -- 最高優先度
2. **ユーザーレベル**: `~/.claude/output-styles/style.md` -- 低優先度
3. **ビルトイン**: `default`, `explanatory`, `learning` -- オーバーライド不可

### 有効化の動作

- `/output-style [name]` で即時有効化
- 変更は `.claude/settings.local.json` に永続化
- スタイルファイル編集後は再有効化またはリスタートが必要
- アクティブスタイルのファイル削除で "default" にフォールバック

## コマンドリファレンス

### /output-style

利用可能なスタイルから選択するインタラクティブメニューを開く。

### /output-style [name]

指定したスタイルに直接切り替え。

```bash
/output-style default
/output-style explanatory
/output-style my-custom-style
```

### /output-style:new [description]

新しいカスタムスタイルをインタラクティブに作成。

```bash
/output-style:new Focus on API development with OpenAPI specs
```

動作:
1. `~/.claude/output-styles/` にスタイルファイルを生成
2. AI が説明に基づいて適切なコンテンツを作成
3. 新しいスタイルを自動的に有効化

## よくある YAML エラー

### 無効な frontmatter

```yaml
# 間違い
---
name: my style          # name にスペース不可
description: "Missing closing quote
---

# 正しい
---
name: my-style          # ハイフンを使用
description: Proper description here
---
```

### タブの代わりにスペース

YAML はインデントにスペースを要求。タブ文字は使用不可。

### 必須フィールドの欠如

`name` と `description` は両方必須。

## 高度なテクニック

### 条件付き指示

```markdown
---
name: context-aware
description: Adapts based on file type
---

# Context-Aware Style

## When Working with TypeScript

- Emphasize type safety
- Suggest interface definitions
- Use strict mode

## When Working with Python

- Follow PEP 8
- Use type hints
- Prefer dataclasses

## When Working with Bash

- Add error handling (set -euo pipefail)
- Include usage comments
- Validate inputs
```

### CLAUDE.md との併用

出力スタイルと CLAUDE.md は連携して動作:

- 出力スタイル: Claude の**振る舞い方**を制御
- CLAUDE.md: Claude が**知っていること**を制御

### バージョン管理

プロジェクトレベルスタイル:

```gitignore
# .gitignore
.claude/settings.local.json    # コミットしない（個人設定）
```

```bash
# プロジェクトスタイルをコミット
git add .claude/output-styles/
git commit -m "Add team output styles"
```

ユーザーレベルスタイルは dotfiles リポジトリでの管理を検討:

```bash
ln -s ~/dotfiles/claude/output-styles ~/.claude/output-styles
```

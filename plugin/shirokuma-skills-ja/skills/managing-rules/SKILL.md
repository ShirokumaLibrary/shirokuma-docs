---
name: managing-rules
description: Claude Codeのルール（.claude/rules/）を公式ベストプラクティスに従って作成・更新・整理します。「create rule」「add rule」「ルール作成」「ルール追加」、パス固有の規約設定時に使用。
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Claude Code ルールの管理

パス固有のコンテキストを自動提供するルールを作成・保守する。

## いつ使うか

- 「ルール作成」「create a rule」「add a rule」
- パス固有の規約設定（例: 「lib/ のルール」）
- CLAUDE.md やスキルからルールへの移行
- `.claude/rules/` に関する質問

## 推奨アーキテクチャ

**Skills = 汎用/再利用可能、Rules = プロジェクト固有**

```
.claude/
├── skills/                        # 汎用（プロジェクト間で共有可能）
│   ├── coding-nextjs/
│   │   ├── patterns/              # 再利用可能なパターン
│   │   └── templates/             # コードテンプレート
│   └── managing-rules/            # このスキル
│
└── rules/                         # プロジェクト固有（自動ロード）
    ├── tech-stack.md              # このプロジェクトのバージョン
    ├── lib-structure.md           # このプロジェクトの構造ルール
    └── testing.md                 # このプロジェクトのテストパターン
```

### マネージドルール（shirokuma/）

`.claude/rules/shirokuma/` は `shirokuma-docs init`（または `update-skills --with-rules`）で自動デプロイ。
手動編集禁止 — 更新時に上書きされる。カスタマイズは `.claude/rules/`（`shirokuma/` 外）に配置。

### この構造の理由

| コンテンツタイプ | 場所 | 理由 |
|--------------|------|------|
| ワークフロー手順 | Skills | ステップバイステップ、オンデマンド |
| 汎用パターン | Skills `patterns/`, `criteria/` | 再利用可能、配布可能 |
| プロジェクト規約 | Rules | 自動ロード、パス固有 |
| 技術バージョン | Rules | プロジェクト固有、常時必要 |
| 既知の問題 | Rules | プロジェクト固有の CVE |

### Skills project/ からの移行

**移行前**（Skills `project/` ディレクトリ）:
```
.claude/skills/coding-nextjs/
├── patterns/         # ✓ 維持（汎用パターン）
├── templates/        # ✓ 維持（コードテンプレート）
└── project/          # → ルールに移動
    ├── reference/tech-stack.md
    └── issues/known-issues.md
```

**移行後**（Rules）:
```
.claude/
├── skills/coding-nextjs/
│   ├── patterns/     # 汎用パターン
│   └── templates/    # コードテンプレート
│
└── rules/            # プロジェクト固有
    ├── tech-stack.md
    └── known-issues.md
```

## ルール vs スキル vs CLAUDE.md

| 機能 | Rules | Skills | CLAUDE.md |
|------|-------|--------|-----------|
| **ローディング** | 自動（パスベース） | オンデマンド | 毎セッション |
| **スコープ** | ファイルパターン | ワークフロー/タスク | グローバル |
| **最適な用途** | プロジェクト規約 | 汎用手順 | 重要な常時適用ルール |
| **パスフィルタ** | ✓ `paths:` フロントマター | ✗ | ✗ |
| **共有方法** | シンボリックリンク | publish | コピー |

**Rules**: プロジェクト固有の規約を自動適用したい場合。
**Skills**: プロジェクト間で再利用可能な汎用ワークフロー。
**CLAUDE.md**: 常に適用が必要な重要ルール。

## ルールの構造

### 基本ルール（パスフィルタなし）

```markdown
# コードスタイル

- ES modules（import/export）を使用、CommonJS 不可
- let より const を優先
- TypeScript strict モード使用
```

毎セッションロード、全ファイルに適用。

### パス固有ルール

```markdown
---
paths:
  - "lib/actions/**/*.ts"
  - "app/**/actions.ts"
---

# Server Actions 規約

- 最初に認証を検証
- CSRF 保護を使用
- Zod スキーマでバリデーション
- ミューテーション後に revalidatePath
```

一致するファイルを操作する場合のみロード。

## ディレクトリ構造

```
.claude/rules/
├── code-style.md          # 常時ロード
├── testing.md             # 常時ロード
├── server-actions.md      # paths: lib/actions/**
├── components.md          # paths: components/**
└── frontend/              # サブディレクトリ対応
    ├── react.md
    └── tailwind.md
```

### ユーザーレベルルール

```
~/.claude/rules/
├── preferences.md         # 個人的コーディング設定
└── workflows.md           # 個人的ワークフロー
```

ユーザールールは全プロジェクトに適用、プロジェクトルールより先にロード。

## ワークフロー

### ステップ 1: ルールタイプを決定

| 質問 | Yes の場合 → |
|------|------------|
| 特定ファイルタイプに適用? | `paths:` フロントマター使用 |
| 全ファイルに適用? | フロントマター不要 |
| 個人設定? | `~/.claude/rules/` に配置 |
| チーム規約? | `.claude/rules/` に配置 |

### ステップ 2: 配置場所を選択

```
.claude/rules/
├── {topic}.md              # 単一トピック
├── {category}/             # 関連ルールをグループ化
│   └── {subtopic}.md
└── shirokuma/              # 予約済み — プラグイン管理（カスタムルール禁止）
```

**重要**: `.claude/rules/shirokuma/` は shirokuma-skills プラグインが管理。更新時に上書きされる。カスタムルールは `.claude/rules/` 直下または独自サブディレクトリに配置。

**命名**: 説明的な kebab-case。

### ステップ 3: ルール記述

1. **テンプレート読み込み**:
   ```bash
   cat .claude/skills/managing-rules/templates/rule.md.template
   ```

2. **フロントマター追加**（パス固有の場合）:
   ```yaml
   ---
   paths:
     - "src/**/*.ts"
     - "lib/**/*.ts"
   ---
   ```

3. **簡潔なルール記述**:
   - 1ファイル1トピック
   - 箇条書き推奨
   - 具体的で実行可能な項目
   - 冗長な説明を避ける

### ステップ 4: Glob パターン検証

| パターン | マッチ対象 |
|---------|----------|
| `**/*.ts` | 全 TypeScript ファイル |
| `src/**/*` | src/ 配下の全ファイル |
| `*.md` | プロジェクトルートの Markdown のみ |
| `src/components/*.tsx` | 特定ディレクトリのコンポーネント |
| `src/**/*.{ts,tsx}` | src/ 配下の TS/TSX |
| `{src,lib}/**/*.ts` | src/ または lib/ の TS |

### ステップ 5: ファイル作成

```bash
mkdir -p .claude/rules
cat > .claude/rules/{name}.md << 'EOF'
---
paths:
  - "pattern/**/*.ext"
---

# Rule Title

- Rule 1
- Rule 2
EOF
```

### ステップ 6: 確認

```bash
# 全ルール一覧
ls -la .claude/rules/

# ルール内容確認
cat .claude/rules/{name}.md

# セッション内のロード状態確認
/memory
```

## Glob パターンリファレンス

### 基本パターン

| パターン | 説明 |
|---------|------|
| `*` | `/` 以外の任意の文字 |
| `**` | `/` を含む任意の文字 |
| `?` | 1文字 |
| `[abc]` | 文字クラス |
| `{a,b}` | ブレース展開 |

### よく使うパターン

| ユースケース | パターン |
|------------|---------|
| 全 TypeScript | `**/*.ts` |
| TypeScript + TSX | `**/*.{ts,tsx}` |
| 特定ディレクトリ | `src/components/**/*` |
| 複数ディレクトリ | `{src,lib}/**/*.ts` |
| テストファイル | `**/*.test.{ts,tsx}` |
| Actions のみ | `lib/actions/**/*.ts` |

## ベストプラクティス

### Do

- **1ファイル1トピック**: `testing.md`, `api-conventions.md`
- **説明的なファイル名**: 名前が内容を示す
- **具体的に記述**: 「2スペースインデント使用」（「適切にフォーマット」ではない）
- **paths は控えめに**: 本当に特定ファイルにのみ適用する場合のみ
- **短く保つ**: 1ファイル10-30行

### 言語

- **ルールは英語で記述**: `.claude/rules/` ファイルはプロジェクト間再利用のため英語
- **テーブル内の言語混在禁止**: バイリンガルコンテンツが必要な場合は言語ごとに別セクション
- **応答言語は自動マッチ**: AI はユーザー言語に自動対応 — ルールにバイリンガル翻訳は不要

### Don't

- **CLAUDE.md と重複しない**: 両方に書くと混乱を招く
- **paths を多用しない**: 無条件ルールの方がシンプル
- **チュートリアルを書かない**: ルールはリマインダー
- **一時的メモを含めない**: ルールは安定したもの

## 移行ガイド

### CLAUDE.md からルールへ

1. CLAUDE.md のファイル固有セクションを特定
2. 適切な paths 付きで別ルールファイルに抽出
3. グローバルルールは CLAUDE.md に残す
4. ルールが正しくロードされることをテスト

### Skills project/ からルールへ

現在のパターン:
```
.claude/skills/coding-nextjs/project/patterns/lib-structure.md
```

ルールとして:
```
.claude/rules/lib-structure.md
```

フロントマター付き:
```yaml
---
paths:
  - "lib/**/*.ts"
---
```

## シンボリックリンクで共有

ルールはプロジェクト間共有にシンボリックリンクをサポート:

```bash
# 共有ルールディレクトリをリンク
ln -s ~/shared-rules .claude/rules/shared

# 個別ルールをリンク
ln -s ~/company-standards/security.md .claude/rules/security.md
```

## クイックリファレンス

```bash
# 新規ルール作成
"create rule for {topic}"
"add rule for {file-pattern}"

# パス固有ルール
"create rule for Server Actions in lib/actions/"

# CLAUDE.md から移行
"extract testing rules from CLAUDE.md to rules/"

# 現在のルール一覧
/memory
```

## テンプレート

| テンプレート | 用途 |
|------------|------|
| [rule.md.template](templates/rule.md.template) | 基本ルール構造 |
| [path-rule.md.template](templates/path-rule.md.template) | パス固有ルール |
| [tech-stack.md.template](templates/tech-stack.md.template) | プロジェクト技術スタックリファレンス |

## 完了レポート

```markdown
## ルール{作成 | 更新}完了

**ファイル:** `.claude/rules/{name}.md`
**タイプ:** {パス固有 | 常時ロード}
**パス:** {paths フロントマターの値 | "なし（全ファイル対象）"}
```

スタンドアロン実行時は次のステップ（検証コマンド、テスト方法）を提案する。

## 注意事項

- ルールは**自動ロード** — 起動操作不要
- パス固有ルールは一致ファイル操作時のみロード
- ユーザールール（`~/.claude/rules/`）はプロジェクトルールより先にロード
- サブディレクトリは再帰的に検出
- シンボリックリンクは解決されて通常通りロード
- `/memory` でロード状態確認
- ルールタイプ・スコープの判断が曖昧な場合は AskUserQuestion で確認
- 複数ルール一括作成時は TodoWrite で管理

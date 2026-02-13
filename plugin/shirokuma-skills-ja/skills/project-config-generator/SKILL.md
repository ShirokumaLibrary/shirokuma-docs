---
name: project-config-generator
description: スキル向けのプロジェクト固有設定ファイル（tech-stack、パターン、issues、セットアップ、ワークフロー）を生成・更新します。新規プロジェクトのセットアップ、プロジェクト規約の更新、スキルのプロジェクトディレクトリ設定時に使用。
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# プロジェクト設定ジェネレーター

`nextjs-vibe-coding` や `reviewing-on-issue` 向けにプロジェクト固有の設定ディレクトリを作成・管理。

## いつ使うか

- 既存スキルで新規プロジェクトをセットアップする場合
- 「generate project config」「initialize skill configs」
- tech-stack バージョンの更新が必要な場合
- プロジェクト固有のパターンや規約を追加したい場合
- 「configure skills for this project」

## 生成内容

各スキル内の `project/` ディレクトリにプロジェクト固有の設定を格納:

```
skill-name/
├── patterns/         # 再利用可能なパターン（共有向け）
├── templates/        # コードテンプレート（共有向け）
└── project/          # プロジェクト固有（このスキルが生成）
    ├── reference/
    │   └── tech-stack.md
    ├── patterns/
    │   └── *.md
    ├── issues/
    │   └── known-issues.md
    ├── setup/
    │   └── *.md
    ├── workflows/
    │   └── *.md
    └── optional/
        └── *.md
```

## ワークフロー

### ステップ 1: 対象スキルの特定

プロジェクト固有設定をサポートするスキルを検出:

```bash
ls .claude/skills/*/project/ 2>/dev/null || echo "No project configs found"
```

対応スキル:
- `nextjs-vibe-coding`
- `reviewing-on-issue`

### ステップ 2: プロジェクト情報の収集

ユーザーからの入力または自動検出:

| 情報 | ソース | 例 |
|------|--------|-----|
| 技術スタック | `package.json`, CLAUDE.md | Next.js 16, React 19 |
| データベース | スキーマファイル | Drizzle + PostgreSQL |
| 認証 | auth 設定 | Better Auth |
| スタイリング | tailwind 設定 | Tailwind v4 + shadcn |
| テスト | jest/playwright 設定 | Jest + Playwright |
| i18n | messages ディレクトリ | next-intl (ja/en) |

### ステップ 3: ファイルの生成

`templates/` ディレクトリからテンプレートを使用:

#### 必須ファイル

1. **tech-stack.md** - バージョン情報
   ```bash
   cat templates/tech-stack.md.template
   ```

2. **known-issues.md** - CVE とバグ
   ```bash
   cat templates/known-issues.md.template
   ```

#### 任意ファイル

| ファイル | 作成タイミング |
|---------|---------------|
| `patterns/*.md` | プロジェクトに独自パターンがある場合 |
| `setup/*.md` | 複雑なセットアップドキュメントが必要な場合 |
| `workflows/*.md` | プロジェクト固有ワークフロー |
| `optional/*.md` | オプション統合 |

### ステップ 4: テンプレート適用

各対象スキルに対して:

```bash
SKILL_DIR=".claude/skills/{skill-name}"
mkdir -p "$SKILL_DIR/project/reference"
mkdir -p "$SKILL_DIR/project/patterns"
mkdir -p "$SKILL_DIR/project/issues"
mkdir -p "$SKILL_DIR/project/setup"
mkdir -p "$SKILL_DIR/project/workflows"
mkdir -p "$SKILL_DIR/project/optional"
```

検出した値でファイルを生成:
- `{{NEXTJS_VERSION}}` を実際のバージョンに置換
- `{{REACT_VERSION}}` を実際のバージョンに置換
- プロジェクト固有パターンを追加

### ステップ 5: ルールのインストール（スタック検出）

`shirokuma-skills/rules/` から検出されたスタックに基づきルールをインストール。

```bash
mkdir -p .claude/rules
```

#### 検出ロジック

| 条件 | ソース | インストールされるルール |
|------|--------|----------------------|
| 常時 | `rules/`（ルート） | `skill-authoring.md`, `output-destinations.md` |
| 常時 | `rules/github/` | `discussions-usage.md`, `project-items.md` |
| `next.config.*` 存在 | `rules/nextjs/` | 全7ルール |
| `shirokuma-docs.config.*` 存在 | `rules/shirokuma-docs/` | `shirokuma-annotations.md` |

#### Next.js スタックルール (`rules/nextjs/`)

| ルール | 内容 |
|--------|------|
| `tech-stack.md` | 推奨スタック + 主要パターン |
| `known-issues.md` | CVE + フレームワーク問題 |
| `radix-ui-hydration.md` | mounted ステートパターン (path: `components/**`) |
| `server-actions.md` | Auth → CSRF → Zod フロー (path: `lib/actions/**`) |
| `tailwind-v4.md` | CSS 変数構文 (path: `**/*.css`, `components/ui/**`) |
| `lib-structure.md` | ディレクトリ規約 (path: `lib/**`) |
| `testing.md` | Jest/Playwright パターン (path: `**/*.test.*`) |

#### 言語設定

言語ポリシーはプラグイン固有のルールで管理:

| 関心事 | 場所 |
|--------|------|
| GitHub 出力言語 | `output-language` ルール |
| 設定ファイル言語 | `skill-authoring` ルール |
| コード/コメント言語 | `git-commit-style` ルール |

#### インストール後の調整

ルールコピー後、プロジェクト固有の値を調整:
- `tech-stack.md`: `package.json` からバージョン更新
- `known-issues.md`: プロジェクト固有の CVE を追加（該当する場合）
- パス固有ルール: プロジェクト構造に合わせて `paths:` フロントマターを調整

さらなるルールカスタマイズには `managing-rules` スキルを使用。

### ステップ 6: 検証

チェックリスト:
- [ ] `project/reference/tech-stack.md` 存在
- [ ] `project/issues/known-issues.md` 存在
- [ ] `.claude/rules/` にインストール済みルール含む
- [ ] 全テンプレートプレースホルダーが置換済み
- [ ] SKILL.md 内のリンクが有効なファイルを指している

### ステップ 7: レポート

出力サマリー:

```markdown
## Project Config Generated

### Target Skills
- nextjs-vibe-coding
- reviewing-on-issue

### Files Created/Updated
- project/reference/tech-stack.md
- project/issues/known-issues.md
- project/patterns/lib-structure.md

### Detected Stack
| Category | Value |
|----------|-------|
| Framework | Next.js 16.0.7 |
| Database | Drizzle 0.44.7 |
| Auth | Better Auth 1.4.3 |
```

## テンプレートリファレンス

| テンプレート | 用途 |
|------------|------|
| [tech-stack.md.template](templates/tech-stack.md.template) | バージョン情報 |
| [known-issues.md.template](templates/known-issues.md.template) | CVE トラッキング |
| [lib-structure.md.template](templates/lib-structure.md.template) | lib/ 規約 |
| [github-discussions.md.template](templates/github-discussions.md.template) | Discussion カテゴリセットアップ |

## GitHub Discussions セットアップ

新規プロジェクトセットアップ時に、知識管理用の Discussions カテゴリを設定。

### クイックセットアップガイド

1. Discussions を有効化: `Settings → General → Features → Discussions`
2. カテゴリ設定を開く: `https://github.com/{owner}/{repo}/discussions/categories`
3. "New category" をクリックして[テンプレート](templates/github-discussions.md.template)から追加

### 追加するカテゴリ

| カテゴリ | アイコン | 形式 | 用途 |
|---------|--------|------|------|
| Handovers | 🔄 | Announcement | セッション継続性 |
| ADR | 📐 | Announcement | 設計決定 |
| Knowledge | 💡 | Announcement | 確認済みパターン |
| Research | 🔬 | Open-ended | 調査 |

### ルールとの統合

```
Discussion (human-readable, ユーザー言語)
    ↓ キーポイントを抽出
.claude/rules/ (AI-readable, English)
```

[テンプレート](templates/github-discussions.md.template)に本文テンプレートあり。

### Discussion テンプレート生成

`.github/DISCUSSION_TEMPLATE/` ファイルをプロジェクト用に生成。

**トリガー**: "generate discussion templates" または "setup discussion forms"

**ワークフロー**:

1. **言語検出** ユーザーまたは CLAUDE.md から（デフォルト: en）
2. **テンプレートコピー** `templates/discussion-templates/{lang}/` → `.github/DISCUSSION_TEMPLATE/`
3. **検証** カテゴリスラグが既存カテゴリと一致することを確認

**対応言語**:

| 言語 | ディレクトリ | ファイル |
|------|-----------|---------|
| English | `templates/discussion-templates/en/` | handovers.yml, adr.yml, knowledge.yml, research.yml |
| Japanese | `templates/discussion-templates/ja/` | handovers.yml, adr.yml, knowledge.yml, research.yml |

**出力**:

```
.github/DISCUSSION_TEMPLATE/
├── handovers.yml
├── adr.yml
├── knowledge.yml
└── research.yml
```

## クイックコマンド

```bash
# 現在のプロジェクト用に初期化
"generate project config"

# tech-stack バージョン更新
"update tech-stack versions"

# 新規パターン追加
"add project pattern for {feature}"

# CLAUDE.md から同期
"sync project configs from CLAUDE.md"

# Discussion テンプレート生成
"generate discussion templates"
"generate discussion templates in Japanese"
```

## 注意事項

- 7ステップのため `TodoWrite` で進捗管理
- 自動検出結果は `AskUserQuestion` でユーザーに確認
- 既存ファイルをユーザー確認なしに上書きしない
- 依存関係更新後に再実行
- tech-stack.md を package.json と同期
- プロジェクト設定はプロジェクト間で共有しない
- 共通設定は `patterns/` や `templates/` ディレクトリに配置

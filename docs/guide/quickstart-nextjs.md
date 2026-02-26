# Next.js クイックスタート

新規 Next.js プロジェクトをゼロから作成し、shirokuma-docs + Claude Code で開発を始めるまでの手順です。

## 対象読者

- Next.js の基礎知識がある
- shirokuma-docs を初めて使う
- Claude Code と組み合わせてプロジェクト管理を効率化したい

## 全体の流れ

```
1. プロジェクト作成 → 2. shirokuma-docs 導入 → 3. GitHub セットアップ → 4. 開発開始
```

---

## 1. プロジェクトの作成

### 方法 A: shirokuma-docs でスキャフォールド（推奨）

```bash
mkdir my-project && cd my-project
shirokuma-docs init --nextjs --with-skills --with-rules --lang ja
```

`--nextjs` オプションがモノレポ構造（`apps/web`, `packages/database` 等）を自動スキャフォールドします。`git init` も同時に実行されます。

### 方法 B: create-next-app から始める

```bash
npx create-next-app@latest my-project --typescript --tailwind --app
cd my-project
shirokuma-docs init --with-skills --with-rules --lang ja
```

> 詳細なオプションは [Next.js 公式ドキュメント](https://nextjs.org/docs/getting-started/installation) を参照してください。

### 推奨技術スタック

shirokuma-docs のスキル・ルールは以下のスタックを想定しています（必須ではありません）:

| カテゴリ | テクノロジー |
|----------|-------------|
| フロントエンド | Next.js / React / TypeScript |
| データベース | PostgreSQL + Drizzle ORM |
| 認証 | Better Auth |
| i18n | next-intl |
| スタイリング | Tailwind CSS + shadcn/ui |
| テスト | Jest + Playwright |

## 2. shirokuma-docs の導入

### インストール

```bash
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash -s -- --lang ja
```

### プロジェクトの初期化

```bash
# 方法 A: モノレポスキャフォールド込みで初期化
shirokuma-docs init --nextjs --with-skills --with-rules --lang ja

# 方法 B: 既存プロジェクトへの導入
shirokuma-docs init --with-skills --with-rules --lang ja
```

これにより以下が自動的にセットアップされます:

- `shirokuma-docs.config.yaml` - 設定ファイル
- Claude Code 用スキル - マーケットプレース経由でグローバルキャッシュにインストール
- 安全フック（破壊的コマンドの自動ブロック）- 同上
- `.claude/rules/shirokuma/` - ルールファイル

### 設定ファイルの編集

`shirokuma-docs.config.yaml` をプロジェクトに合わせて編集します:

```yaml
project:
  name: "my-project"
  description: "プロジェクトの説明"
  version: "0.1.0"
  repository: "https://github.com/your-org/my-project"

output:
  generated: "docs/generated"

testCases:
  jest:
    testMatch: ["**/__tests__/**/*.test.ts"]

github:
  discussionsCategory: "Handovers"
```

詳しくは [設定ファイルリファレンス](config.md) を参照してください。

## 3. GitHub のセットアップ

### リポジトリの作成

```bash
# 方法 A: --nextjs でスキャフォールドした場合（git init 済み）
git add .
git commit -m "chore: initial commit"
gh repo create your-org/my-project --private --push

# 方法 B: 既存プロジェクトの場合
git init
git add .
git commit -m "chore: initial commit"
gh repo create your-org/my-project --private --push
```

### GitHub Projects V2 のセットアップ

Claude Code を起動し、`setting-up-project` スキルでプロジェクトを初期化します:

```
/setting-up-project
```

これにより以下のフィールドが自動作成されます:

| フィールド | 選択肢 |
|-----------|--------|
| Status | Icebox / Backlog / Planning / Spec Review / In Progress / Pending / Review / Testing / Done / Not Planned / Released |
| Priority | Critical / High / Medium / Low |
| Type | Feature / Bug / Chore / Docs / Research / Evolution |
| Size | XS / S / M / L / XL |

### Discussions カテゴリの設定

GitHub リポジトリの Settings → Features → Discussions を有効にし、以下のカテゴリを作成します:

| カテゴリ | 用途 |
|---------|------|
| Handovers | セッション引き継ぎ |
| ADR | アーキテクチャ決定記録 |
| Knowledge | 確認されたパターン・解決策 |
| Research | 調査事項 |

## 4. 開発の開始

### セッション開始

Claude Code で作業セッションを開始します:

```
/starting-session
```

前回の引き継ぎ内容とアクティブな Issue が表示されます。

### Issue の作成と作業

まず `/creating-item` で Issue を作成し、そのまま作業を開始します:

```
/creating-item 認証ページの実装
```

Issue が作成され、自動的に `/working-on-issue` に引き継がれます。`working-on-issue` が以下のワークフローを自動で実行します:

1. **計画**: Issue の要件を分析し、実装計画を策定
2. **承認**: 計画を確認してユーザーが承認
3. **実装**: テストファースト（TDD）で機能を実装
4. **コミット**: 変更をコミット・プッシュ
5. **PR 作成**: プルリクエストを自動作成
6. **セルフレビュー**: コード品質をチェックし結果を PR にコメント

既存の Issue に取り組む場合は Issue 番号を直接指定できます:

```
/working-on-issue #42
```

### セッション終了

作業が終わったらセッションを終了します:

```
/ending-session
```

引き継ぎ情報が GitHub Discussions（Handovers カテゴリ）に保存され、次回のセッション開始時に参照できます。

---

## 次のステップ

- スキルとルールの詳細 → [プラグイン管理](plugins.md)
- 各コマンドの使い方 → [ドキュメント生成コマンド](commands/generation.md)
- コード品質チェック → [検証コマンド](commands/linting.md)
- GitHub 連携の詳細 → [GitHub 連携コマンド](commands/github.md)
- 設定の全項目 → [設定ファイルリファレンス](config.md)
- 問題が起きたら → [トラブルシューティング](troubleshooting.md)

# プラグインリファレンス

Claude Code プラグイン開発の完全な技術仕様。

## 目次

- [plugin.json スキーマ](#pluginjson-スキーマ)
- [marketplace.json スキーマ](#marketplacejson-スキーマ)
- [プラグイン構造](#プラグイン構造)
- [配布方法](#配布方法)
- [プラグイン管理コマンド](#プラグイン管理コマンド)
- [コンポーネント統合](#コンポーネント統合)
- [高度な機能](#高度な機能)

## plugin.json スキーマ

場所: `.claude-plugin/plugin.json`

### 必須フィールド

#### name (string)

プラグイン識別子。マーケットプレイス内で一意であること。

**ルール**:
- 小文字、数字、ハイフンのみ
- スペースや特殊文字不可
- 最大 64文字
- 予約語不可 ("anthropic", "claude")

#### description (string)

プラグインの目的と機能の簡潔な説明。最大 200文字推奨。三人称で記述。

#### version (string)

セマンティックバージョニング（MAJOR.MINOR.PATCH 形式）。

- MAJOR: 破壊的変更
- MINOR: 新機能（後方互換）
- PATCH: バグ修正（後方互換）

#### author (object)

作成者情報。`name` (string) が必須。

```json
{
  "author": {
    "name": "John Doe"
  }
}
```

### オプションフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `homepage` | string | ドキュメントまたは Web サイトの URL |
| `repository` | object | ソースコードリポジトリ情報（`type`, `url`） |
| `keywords` | array | 検索用キーワード |
| `license` | string | ライセンス識別子（SPDX 形式） |

### 完全な例

```json
{
  "name": "spreadsheet-analyzer",
  "description": "Analyzes spreadsheets and generates reports with data visualization",
  "version": "1.2.3",
  "author": {
    "name": "Data Tools Team"
  },
  "homepage": "https://github.com/data-tools/spreadsheet-analyzer",
  "repository": {
    "type": "git",
    "url": "https://github.com/data-tools/spreadsheet-analyzer.git"
  },
  "keywords": ["spreadsheet", "analysis", "reporting", "xlsx"],
  "license": "MIT"
}
```

## marketplace.json スキーマ

場所: マーケットプレイスディレクトリのルート

### 必須フィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `name` | string | マーケットプレイス識別子（小文字、数字、ハイフン） |
| `owner` | object | メンテナー情報（`name` が必須） |
| `plugins` | array | 利用可能なプラグインのリスト |

各プラグインエントリの必須フィールド: `name`, `source`, `description`

### 完全な例

```json
{
  "name": "company-plugins",
  "version": "1.0.0",
  "owner": {
    "name": "Company Engineering"
  },
  "homepage": "https://github.com/company/claude-plugins",
  "plugins": [
    {
      "name": "code-reviewer",
      "source": "./plugins/code-reviewer",
      "description": "Automated code review with company standards"
    },
    {
      "name": "deployment-helper",
      "source": "./plugins/deployment-helper",
      "description": "Deployment workflow automation"
    }
  ]
}
```

## プラグイン構造

### ディレクトリレイアウト

| パス | 必須 | 目的 |
|------|------|------|
| `.claude-plugin/plugin.json` | はい | プラグインマニフェスト |
| `skills/{skill-name}/SKILL.md` | いいえ | スキル定義（+ reference.md, examples.md） |
| `agents/{agent-name}/AGENT.md` | いいえ | エージェント定義（+ reference.md） |
| `commands/{command}.md` | いいえ | スラッシュコマンド |
| `hooks/{event}.js` | いいえ | イベントハンドラ |
| `README.md` | いいえ | プラグインドキュメント |

### 命名規約

| コンポーネント | 形式 | 例 |
|---------------|------|-----|
| プラグイン | `plugin-name` | `api-toolkit` |
| スキル | `doing-something`（動名詞形） | `analyzing-logs` |
| エージェント | `noun-agent` | `code-reviewer-agent` |
| コマンド | `command-name` | `review-pr` |

## 配布方法

### 方法 1: マーケットプレイス（推奨）

チーム連携と集中管理に最適。

**セットアップ**:
1. マーケットプレイスリポジトリを作成
2. プラグインディレクトリを追加
3. ルートに marketplace.json を作成
4. GitHub にプッシュ

**インストール**:
```bash
/plugin marketplace add https://raw.githubusercontent.com/user/repo/main/marketplace.json
/plugin install plugin-name@marketplace-name
```

**更新**: プラグインファイルを更新 -> plugin.json のバージョンを更新 -> プッシュ -> ユーザーが `/plugin update plugin-name` を実行。

### 方法 2: Git リポジトリ

プロジェクト固有プラグインのバージョン管理共有に最適。

`.claude/settings.json` で自動インストールを設定:

```json
{
  "plugins": {
    "autoInstall": true,
    "sources": [
      {
        "type": "local",
        "path": ".claude/plugins/plugin-name"
      }
    ]
  }
}
```

### 方法 3: npm パッケージ

広いコミュニティへの公開配布に最適。

```bash
npm publish --access public
# ユーザーインストール:
npm install -g @username/plugin-name
```

### 方法 4: ローカルファイル

個人使用やテストに最適。スキル/エージェント/コマンドを `~/.claude/` にコピー。

## プラグイン管理コマンド

### マーケットプレイスコマンド

```bash
/plugin marketplace add <url>     # マーケットプレイスを追加
/plugin marketplace list          # 一覧表示
/plugin marketplace remove <name> # 削除
```

### プラグインコマンド

```bash
/plugin list                          # インストール済み一覧
/plugin install <name>@<marketplace>  # インストール
/plugin update <name>                 # 更新
/plugin enable <name>                 # 有効化
/plugin disable <name>                # 無効化
/plugin uninstall <name>              # アンインストール
```

## コンポーネント統合

### スキル

場所: `plugin-name/skills/{skill-name}/`

| ファイル | 必須 | 目的 |
|---------|------|------|
| SKILL.md | はい | 指示 + frontmatter |
| reference.md | いいえ | 詳細仕様 |
| examples.md | いいえ | ユースケース |
| scripts/*.py | いいえ | ヘルパースクリプト |

SKILL.md の frontmatter の description に基づいて自動認識される。

### エージェント

場所: `plugin-name/agents/{agent-name}/` -- AGENT.md（必須）、reference.md（任意）

呼び出し方: Claude が自律的に、ユーザーが明示的に、または他のエージェント/スキルから。

### コマンド

場所: `plugin-name/commands/{command}.md`

コマンドファイルにプロンプトを記述。ユーザーが `/command-name` で呼び出し。

### フック

場所: `plugin-name/hooks/{event}.js`

フックタイプ: `pre-commit`, `post-commit`, `pre-push`, `post-build`, `on-file-change`

```javascript
module.exports = {
  name: 'hook-name',
  event: 'pre-commit',
  async execute(context) {
    // true を返すと操作を許可、false でブロック
    return true;
  }
};
```

## 高度な機能

### プラグイン間依存

```json
{
  "dependencies": {
    "base-plugin": ">=1.0.0"
  }
}
```

注意: 手動依存チェックが必要。自動解決なし。

### プラグイン設定

`.claude/settings.json` に設定を定義:

```json
{
  "plugins": {
    "plugin-name": {
      "setting1": "value1"
    }
  }
}
```

### バージョン互換性

```json
{
  "engines": {
    "claude-code": ">=1.5.0"
  }
}
```

### プラグインテスト

1. ローカルテストマーケットプレイスを作成
2. テストマーケットプレイスからインストール
3. 全コンポーネントの読み込みを確認
4. 各スキル/エージェント/コマンドを個別テスト
5. コンポーネント間の相互作用をテスト
6. 他のプラグインとの競合をチェック
7. 更新をテスト（バージョンバンプ -> 再インストール）

### 公開チェックリスト

- [ ] plugin.json に必須フィールドあり
- [ ] バージョンがセマンティックバージョニングに従う
- [ ] 全スキルに有効な frontmatter あり
- [ ] 全エージェントに有効な frontmatter あり
- [ ] コマンドに明確な説明あり
- [ ] README.md で使用方法を文書化
- [ ] ローカルで新規インストールテスト済み
- [ ] ハードコードされたパスや認証情報なし
- [ ] クロスプラットフォーム互換（フォワードスラッシュ）
- [ ] 人気プラグインとの競合なし
- [ ] 公開配布の場合ライセンスを指定
- [ ] リポジトリ URL を提供（該当する場合）

## よくあるパターン

### スキルのみプラグイン

```
utility-plugin/
├── .claude-plugin/
│   └── plugin.json
└── skills/
    ├── skill-one/
    │   └── SKILL.md
    └── skill-two/
        └── SKILL.md
```

### エージェントのみプラグイン

```
automation-plugin/
├── .claude-plugin/
│   └── plugin.json
└── agents/
    ├── builder-agent/
    │   └── AGENT.md
    └── tester-agent/
        └── AGENT.MD
```

### コマンドのみプラグイン

```
command-plugin/
├── .claude-plugin/
│   └── plugin.json
└── commands/
    ├── quick-fix.md
    └── generate-docs.md
```

### 包括的プラグイン

```
full-plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── analyzer/
│       └── SKILL.md
├── agents/
│   └── optimizer/
│       └── AGENT.md
├── commands/
│   └── optimize.md
└── hooks/
    └── pre-commit.js
```

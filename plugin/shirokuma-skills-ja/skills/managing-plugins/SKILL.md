---
name: managing-plugins
description: Claude Codeプラグインをスキル、エージェント、コマンド、フックと共に作成・設定・配布します。「plugin」「plugin.json」「marketplace.json」「create plugin」「publish plugin」、機能をパッケージとして配布したい場合に使用。「プラグイン作成」「カスタムスキルをプラグインとして配布したい」「marketplace設定」がトリガー。
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Claude Code プラグインの管理

プラグインを作成・設定・配布する。

## いつ使うか

- 「プラグイン作成」「create a plugin」「make a plugin」
- 「plugin.json」「marketplace.json」に関する質問
- 「プラグイン配布」「publish plugin」「distribute plugin」
- 「スキル/エージェントをパッケージ化して共有したい」
- 「marketplace セットアップ」「install plugins」
- プラグインの構造や仕組みについての質問

## プラグインとは

プラグインは Claude Code の機能をプロジェクトやチーム間で共有可能な形で拡張する。含められるもの:
- **Skills**: モデル起動型ケイパビリティ（自動）
- **Agents**: 複雑なワークフロー用の特化サブエージェント
- **Commands**: スラッシュコマンド（ユーザーが `/` で手動起動）
- **Hooks**: 自動化用イベントハンドラ
- **MCP Servers**: 外部ツール連携

## ワークフロー

### ステップ 1: スコープ決定

AskUserQuestion で確認:
1. 含める機能（Skills/Agents/Commands/Hooks）
2. 配布方法
   - Marketplace（チーム向け推奨）
   - Git リポジトリ（バージョン管理プロジェクト用）
   - npm パッケージ（公開配布用）
   - 手動コピー（個人用）
3. 対象ユーザー（個人/チーム/パブリック）

### ステップ 2: 構造作成

#### 基本構造

| パス | 必須 | 用途 |
|------|------|------|
| `.claude-plugin/plugin.json` | ✓ | メタデータマニフェスト |
| `skills/skill-name/SKILL.md` | | Skills を含む場合 |
| `agents/agent-name/AGENT.md` | | Agents を含む場合 |
| `commands/command-name.md` | | Commands を含む場合 |
| `hooks/hook-name.js` | | Hooks を含む場合 |

#### ディレクトリ作成

```bash
mkdir -p plugin-name/.claude-plugin
mkdir -p plugin-name/skills
mkdir -p plugin-name/agents
mkdir -p plugin-name/commands
mkdir -p plugin-name/hooks
```

### ステップ 3: plugin.json マニフェスト

`.claude-plugin/plugin.json` を作成:

```json
{
  "name": "plugin-name",
  "description": "Brief description of what this plugin does",
  "version": "1.0.0",
  "author": {
    "name": "Author Name"
  }
}
```

#### 必須フィールド

- `name`: プラグイン識別子（小文字、ハイフン、最大64文字）
- `description`: 簡潔な説明（推奨最大200文字）
- `version`: セマンティックバージョニング（MAJOR.MINOR.PATCH）
- `author.name`: 作成者

#### 検証チェックリスト

- [ ] 有効な JSON 構文（引用符、カンマ適切）
- [ ] 命名規約に従った名前（小文字、ハイフン）
- [ ] semver 形式のバージョン（例: "1.0.0"）
- [ ] 明確で簡潔な説明

### ステップ 4: コンポーネント追加

#### Skills の追加

1. スキルディレクトリ作成: `skills/skill-name/`
2. フロントマター付き `SKILL.md` を追加
3. 必要に応じてサポートファイルを追加

[examples.md](examples.md#skill-plugin) に完全な例あり。

#### Agents の追加

1. エージェントディレクトリ作成: `agents/agent-name/`
2. フロントマター付き `AGENT.md` を追加

[examples.md](examples.md#agent-plugin) に完全な例あり。

#### Commands の追加

1. Markdown ファイル作成: `commands/command-name.md`
2. コマンド説明とプロンプトを追加
3. `/command-name` で起動

[examples.md](examples.md#command-plugin) に完全な例あり。

### ステップ 5: ローカルテスト

#### 方法 1: 開発用 marketplace

1. marketplace ディレクトリ構造を作成:
```bash
mkdir -p test-marketplace
mv plugin-name test-marketplace/
```

2. `marketplace.json` を作成:
```json
{
  "name": "test-marketplace",
  "owner": { "name": "Your Name" },
  "plugins": [
    {
      "name": "plugin-name",
      "source": "./plugin-name",
      "description": "Brief description"
    }
  ]
}
```

3. marketplace を追加:
```bash
/plugin marketplace add file:///absolute/path/to/test-marketplace/marketplace.json
```

4. プラグインをインストール:
```bash
/plugin install plugin-name@test-marketplace
```

#### 方法 2: 直接インストール

個人テスト用に `~/.claude/` にコピー:
```bash
cp -r plugin-name/skills/* ~/.claude/skills/
cp -r plugin-name/agents/* ~/.claude/agents/
cp -r plugin-name/commands/* ~/.claude/commands/
```

#### 確認

1. Claude Code を再起動
2. プラグイン状態確認: `/plugin list`
3. Skills テスト（自然言語でトリガー）
4. Agents テスト（Task ツールまたは自然言語で起動）
5. Commands テスト（`/command-name` で使用）

### ステップ 6: 配布

#### 方法 A: Marketplace（チーム向け推奨）

1. marketplace リポジトリ作成:
```bash
mkdir my-marketplace && cd my-marketplace && git init
```

2. プラグインを追加:
```bash
mkdir plugins
cp -r /path/to/plugin-name plugins/
```

3. `marketplace.json` を作成:
```json
{
  "name": "my-marketplace",
  "owner": { "name": "Team Name" },
  "plugins": [
    {
      "name": "plugin-name",
      "source": "./plugins/plugin-name",
      "description": "Plugin description"
    }
  ]
}
```

4. コミットしてホスト:
```bash
git add . && git commit -m "Add plugin-name" && git push origin main
```

5. チームメンバーが追加:
```bash
/plugin marketplace add https://raw.githubusercontent.com/user/repo/main/marketplace.json
/plugin install plugin-name@my-marketplace
```

#### 方法 B: Git リポジトリ（プロジェクト固有用）

1. プロジェクトリポジトリに追加:
```bash
mkdir -p .claude/plugins
cp -r plugin-name .claude/plugins/
git add .claude/plugins && git commit -m "Add custom plugin"
```

2. `.claude/settings.json` を設定:
```json
{
  "plugins": { "autoInstall": true }
}
```

3. チームメンバーは `git pull` で自動取得（フォルダ信頼後）

#### 方法 C: npm パッケージ（公開配布用）

1. `package.json` を作成:
```json
{
  "name": "@username/plugin-name",
  "version": "1.0.0",
  "description": "プラグインの説明",
  "main": ".claude-plugin/plugin.json",
  "files": [
    ".claude-plugin/",
    "skills/",
    "agents/",
    "commands/",
    "hooks/"
  ],
  "keywords": ["claude-code", "plugin"],
  "author": "Your Name",
  "license": "MIT"
}
```

2. 公開:
```bash
npm publish --access public
```

3. ユーザーはインストール:
```bash
npm install -g @username/plugin-name
```

## よくあるパターン

### 既存スキルからクイックプラグイン作成

```bash
mkdir -p my-plugin/.claude-plugin my-plugin/skills
cp -r ~/.claude/skills/my-skill my-plugin/skills/
cat > my-plugin/.claude-plugin/plugin.json << 'EOF'
{
  "name": "my-plugin",
  "description": "Collection of useful skills",
  "version": "1.0.0",
  "author": { "name": "Your Name" }
}
EOF
```

### 混合プラグイン（skills + agents + commands）

[examples.md](examples.md#comprehensive-plugin) に全コンポーネントタイプを組み合わせた例あり。

### プラグインバージョン更新

1. `.claude-plugin/plugin.json` の `version` を更新
2. marketplace 配布の場合は marketplace.json も更新
3. ユーザーは `/plugin update plugin-name` で更新

## エラーハンドリング

### プラグインが見つからない

**症状**: `/plugin install` が "not found" で失敗

**解決策**:
- marketplace.json のパスが正しいか確認
- プラグイン名が正確に一致するか確認（大文字小文字区別）
- marketplace が追加済みか確認: `/plugin marketplace list`
- marketplace を再追加

### Skills/Agents が表示されない

**症状**: インストール済みだが機能が利用不可

**解決策**:
- Claude Code を再起動（インストール後は必須）
- プラグインが有効か確認: `/plugin list`
- 無効なら有効化: `/plugin enable plugin-name`
- ファイル構造とフロントマターが正しいか確認

### 無効な plugin.json

**症状**: インストールが "invalid manifest" で失敗

**解決策**:
- JSON 構文の検証（カンマ、引用符、ブラケット）
- 必須フィールドの存在確認（name, description, version, author）
- バージョンが semver 形式か確認（例: "1.0.0"、"1.0" は不可）
- ファイルが `.claude-plugin/plugin.json` にあるか確認

### Marketplace URL にアクセスできない

**症状**: "Failed to fetch marketplace"

**解決策**:
- GitHub の場合は raw URL（raw.githubusercontent.com）を使用
- ファイルが公開アクセス可能か確認
- URL にタイポがないか確認
- ローカルテストには `file:///` 絶対パスを使用

### プラグインの競合

**症状**: 複数プラグインが同じスキル/コマンドを提供

**解決策**:
- プラグイン間でユニークな名前を使用
- 競合プラグインを無効化: `/plugin disable other-plugin`
- スキル/コマンドをリネーム
- 説明文の重複を確認

## 完了レポート

```markdown
## プラグイン{作成 | 更新}完了

**名前:** {plugin-name}
**バージョン:** {version}
**場所:** {path}
**コンポーネント:** {Skills: N, Agents: N, Commands: N}
```

スタンドアロン実行時は次のステップ（テスト手順、配布方法）を提案する。

## 注意事項

- プラグイン名は小文字とハイフンのみ
- パスは常にスラッシュ使用（クロスプラットフォーム）
- インストール/更新後は Claude Code 再起動が必要
- チーム配布前にローカルテスト
- セマンティックバージョニング使用（MAJOR.MINOR.PATCH）
- Skills はモデル起動型（自動）、Commands はユーザー起動型（`/`）
- リモート marketplace の marketplace.json は公開アクセス可能であること
- ローカル marketplace は `file:///` 絶対パスを使用

## 関連リソース

- [reference.md](reference.md) - plugin.json と marketplace.json の完全仕様
- [examples.md](examples.md) - 全コンポーネントタイプの実例
- Claude Code Plugin Documentation: https://code.claude.com/docs/en/plugins

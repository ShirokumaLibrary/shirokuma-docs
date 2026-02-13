---
name: managing-output-styles
description: Claude Codeの出力スタイルを管理。デフォルト/説明的/学習モードの切り替えやカスタムスタイルの作成を行います。「output style」「explanatory mode」「learning mode」「change style」「create custom style」、「explanatory modeに切り替えて」「スタイル変更」「カスタムスタイル作成」がトリガー。
allowed-tools: Read, Write, Edit, Glob, Grep
---

# 出力スタイルの管理

ビルトインスタイルの切り替えやカスタムスタイルの作成で Claude Code の動作を設定する。

## いつ使うか

- 「スタイル変更」「change output style」「switch to explanatory mode」
- 「学習モード」「learning mode」「default mode」
- 「カスタムスタイル作成」「create custom output style」
- 「現在のスタイルは?」「what output style am I using」
- 「スタイル一覧」「show available styles」「list output styles」

## 概要

出力スタイルは Claude Code のシステムプロンプトを変更し、ユースケースに応じた動作を実現する:

- **default**: 標準エンジニアリングモード（効率的、プロダクション重視）
- **explanatory**: 判断を説明する「Insights」セクション追加
- **learning**: `TODO(human)` マーカー付き協調モード（ハンズオン練習用）

カスタムスタイルで無制限のパーソナライズが可能。

## ワークフロー

### ステップ 1: 現在のスタイル確認

ローカル設定ファイルを確認:

```bash
cat .claude/settings.local.json
```

`outputStyle` フィールドを確認。存在しなければ "default" がアクティブ。

### ステップ 2: ビルトインスタイルに切り替え

スラッシュコマンドを使用:

```bash
/output-style [style-name]
```

例:
- `/output-style default` - 標準エンジニアリングモード
- `/output-style explanatory` - 教育的インサイト
- `/output-style learning` - ハンズオン練習モード

インタラクティブメニューを開く:

```bash
/output-style
```

### ステップ 3: カスタムスタイル作成

#### インタラクティブ作成:

```bash
/output-style:new [望む動作の説明]
```

例:
```bash
/output-style:new Focus on security best practices and include threat modeling
```

#### 手動作成:

1. 保存場所を選択:
   - ユーザーレベル: `~/.claude/output-styles/style-name.md`
   - プロジェクトレベル: `.claude/output-styles/style-name.md`

2. フロントマター付き Markdown ファイルを作成:

```markdown
---
name: security-focused
description: Emphasize security best practices
---

# Security-Focused Development

When writing code:
- Always consider OWASP Top 10 vulnerabilities
- Include security comments for sensitive operations
- Suggest security testing approaches
- Flag potential security risks

[追加の指示...]
```

3. 有効化:

```bash
/output-style security-focused
```

### ステップ 4: カスタムスタイル編集

1. スタイルファイルを探す:

```bash
# ユーザーレベル
ls ~/.claude/output-styles/

# プロジェクトレベル
ls .claude/output-styles/
```

2. 現在の内容を確認:

```bash
cat ~/.claude/output-styles/style-name.md
```

3. Edit ツールでファイルを編集

4. Claude Code 再起動またはスタイル再適用:

```bash
/output-style style-name
```

## よくあるパターン

### パターン 1: クイックスタイル切り替え

頻繁な切り替え用に `.claude/commands/` にショートカットを作成:

```bash
# .claude/commands/explain.md
Switch to explanatory output style with /output-style explanatory
```

使用: `/explain`

### パターン 2: チーム共有スタイル

カスタムスタイルを `.claude/output-styles/` に配置して git にコミット:

```bash
git add .claude/output-styles/team-style.md
git commit -m "Add team output style"
```

チームメンバーは以下で有効化:

```bash
/output-style team-style
```

### パターン 3: タスク特化スタイル

特定ワークフロー用のスタイルを作成:
- `refactoring-focused.md` - コード品質とテスト重視
- `documentation-first.md` - インラインドキュメントと README 更新優先
- `performance-optimized.md` - ベンチマークと最適化重視

[examples.md](examples.md) に完全な例あり。

## 関連機能との違い

| 機能 | 目的 | スコープ |
|------|------|---------|
| 出力スタイル | システムプロンプトを変更 | Claude の基本動作を変更 |
| CLAUDE.md | コンテキスト追加 | ユーザーメッセージとして付加 |
| --append-system-prompt | プロンプト拡張 | システムプロンプトに追加（置換ではない） |
| エージェント | 特化タスク | 専用モデルと特定ツール |

出力スタイルはシステムプロンプトを**置換**するが、コア機能は保持される。

## エラーハンドリング

### カスタムスタイルが見つからない

```
Error: Output style 'my-style' not found
```

**解決策**: ファイルの存在と名前の一致を確認:

```bash
# ファイル存在確認
ls ~/.claude/output-styles/my-style.md
ls .claude/output-styles/my-style.md

# フロントマターの name 確認
cat ~/.claude/output-styles/my-style.md
```

### スタイル変更が反映されない

**解決策**: スタイルファイル編集後に Claude Code を再起動、または `/output-style style-name` を再実行。

### 無効な YAML フロントマター

```
Error: Invalid frontmatter in output style
```

**解決策**: YAML 構文を検証（タブではなくスペース使用）:

```yaml
---
name: my-style        # シンプルな名前には引用符不要
description: Brief description
---
```

## 関連リソース

- [reference.md](reference.md) - 完全なフロントマター仕様、設定ファイル形式
- [examples.md](examples.md) - よくあるユースケースのカスタムスタイル例

## 注意事項

- 設定は `.claude/settings.local.json` に保存（プロジェクトレベル）
- カスタムスタイルは `~/.claude/output-styles/`（ユーザー）または `.claude/output-styles/`（プロジェクト）
- ユーザーレベルスタイルは全プロジェクトで利用可能
- プロジェクトレベルは同名のユーザーレベルをオーバーライド
- パスは常にスラッシュを使用（クロスプラットフォーム）
- フロントマターはタブではなくスペースを使用
- `/output-style` コマンド使用時はスタイル変更が即座に反映
- コア機能（Read, Write, Bash 等）は全スタイルで保持
- カスタムスタイルの方向性は AskUserQuestion で確認してから作成
- 複数スタイル作成時は TodoWrite で管理
- ビルトインスタイル名（default, explanatory, learning）と衝突する名前を使わない

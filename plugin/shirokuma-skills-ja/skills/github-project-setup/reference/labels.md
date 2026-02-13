# ラベルリファレンス

## 設計原則

ラベルと Type フィールドは異なる目的を持つ:

| 仕組み | 役割 | 軸 | 例 |
|--------|------|-----|-----|
| Type（Project フィールド / Issue Types） | 作業の**種類** | カテゴリ | Bug, Feature, Chore |
| Labels | 作業の**影響範囲** | 横断的属性 | area:cli, area:plugin |

ラベルは Type と重複させないこと。ラベルが Type 値と1:1対応する場合、ラベルを削除して Type を使用する。

## 推奨ラベル分類

### エリアラベル（必須）

プロジェクトのモジュール構造に基づいてエリアを定義。`area:` プレフィックスを使用。

| ラベル | 色 | 説明 |
|-------|-----|------|
| `area:cli` | `#0e8a16` | コア CLI とコマンド |
| `area:plugin` | `#5319e7` | プラグインシステム（skills, rules, agents） |
| `area:github` | `#1d76db` | GitHub 連携コマンド |
| `area:lint` | `#fbca04` | Lint・バリデーションコマンド |

**プロジェクトに合わせてカスタマイズ**: コードベース構造に合ったエリアに置き換える（例: `area:api`, `area:web`, `area:database`）。

### 運用ラベル（デフォルトから保持）

| ラベル | 色 | 説明 |
|-------|-----|------|
| `duplicate` | `#cfd3d7` | この Issue または PR は既に存在 |
| `invalid` | `#e4e669` | 正しくないと思われる |
| `wontfix` | `#ffffff` | 対応しない |

これらはライフサイクル・トリアージ目的であり、Type ではカバーできない。

## 削除すべきデフォルトラベル

以下の GitHub デフォルトラベルは Type と重複するか、適用外:

| ラベル | 削除理由 |
|-------|---------|
| `bug` | Type: Bug と重複 |
| `enhancement` | Type: Feature と重複 |
| `documentation` | Type: Docs と重複 |
| `good first issue` | 非該当（プライベートリポ / AI 支援） |
| `help wanted` | 非該当（プライベートリポ / AI 支援） |
| `question` | Discussions を使用 |

## ラベル割り当てルール

1. **エリアラベルは任意** - 全ての Issue にエリアラベルが必要なわけではない。タイトルから影響範囲が明らかでない場合に使用
2. **複数エリアラベル可** - 横断的な Issue は複数エリアを持てる（例: `area:cli` + `area:github`）
3. **運用ラベルはトリアージ時に適用** - `duplicate`, `invalid`, `wontfix` はクローズやリダイレクト時に設定
4. **AI はエリアラベルを提案すべき** - Issue 作成時、スコープが明確ならエリアラベルを提案

## セットアップ

**注意**: 以下のコマンドは `gh label` を直接使用。`shirokuma-docs` CLI がインストール済みの場合は `shirokuma-docs repo labels --create` を使用して他の GitHub 操作との一貫性を保つ。

### 重複ラベルの削除

```bash
for label in bug enhancement documentation "good first issue" "help wanted" question; do
  gh label delete "$label" --yes
done
```

### エリアラベルの作成

```bash
gh label create "area:cli" --color "0e8a16" --description "Core CLI and commands"
gh label create "area:plugin" --color "5319e7" --description "Plugin system (skills, rules, agents)"
gh label create "area:github" --color "1d76db" --description "GitHub integration commands"
gh label create "area:lint" --color "fbca04" --description "Lint and validation commands"
```

## 注意事項

- ラベルはリポジトリレベルの設定（Issue Types は組織レベル）
- ラベルは Issue 一覧に表示され、視覚的なフィルタリングに有用
- `gh label` コマンドは特別な OAuth スコープ不要（標準の `repo` スコープで十分）
- Type 重複ラベルから移行する場合、ラベル定義を削除する前に既存 Issue からラベルを外す

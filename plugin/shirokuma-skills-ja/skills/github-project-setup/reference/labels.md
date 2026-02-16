# ラベルリファレンス

## 設計原則

作業種別の分類は **Issue Types**（Organization レベルの Type フィールド）が主な手段。ラベルは作業の**影響範囲**を示す補助的な仕組み:

| 仕組み | 役割 | 例 |
|--------|------|-----|
| Issue Types | 作業の**種類** | Feature, Bug, Chore, Docs, Research |
| エリアラベル | 作業の**影響範囲** | `area:cli`, `area:plugin` |
| 運用ラベル | トリアージ・ライフサイクル | `duplicate`, `invalid`, `wontfix` |

ラベルは `create-project` コマンドでは自動作成されない。プロジェクトの構造に合わせて手動で追加する。

## 推奨ラベル分類

### エリアラベル（任意）

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

## 不要なデフォルトラベルの削除

以下の GitHub デフォルトラベルは Issue Types と重複するか、適用外:

| ラベル | 削除理由 |
|-------|---------|
| `bug` | Issue Types (Bug) を使用 |
| `enhancement` | Issue Types (Feature) を使用 |
| `documentation` | Issue Types (Docs) を使用 |
| `good first issue` | 非該当（プライベートリポ / AI 支援） |
| `help wanted` | 非該当（プライベートリポ / AI 支援） |
| `question` | Discussions を使用 |

## ラベル割り当てルール

1. **エリアラベルは任意** - 全ての Issue にエリアラベルが必要なわけではない。タイトルから影響範囲が明らかでない場合に使用
2. **複数エリアラベル可** - 横断的な Issue は複数エリアを持てる（例: `area:cli` + `area:github`）
3. **運用ラベルはトリアージ時に適用** - `duplicate`, `invalid`, `wontfix` はクローズやリダイレクト時に設定
4. **AI はエリアラベルを提案すべき** - Issue 作成時、スコープが明確ならエリアラベルを提案

## 注意事項

- ラベルはリポジトリレベルの設定
- ラベルは Issue 一覧に表示され、視覚的なフィルタリングに有用
- `gh label` コマンドは特別な OAuth スコープ不要（標準の `repo` スコープで十分）
- 作業種別の分類は Issue Types が主な手段

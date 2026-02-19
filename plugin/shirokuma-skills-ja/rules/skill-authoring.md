---
paths:
  - ".claude/skills/**/*.md"
  - ".claude/agents/**/*.md"
  - ".claude/output-styles/**/*.md"
  - ".claude/commands/**/*.md"
---

# Claude 設定ファイル作成ルール

## 命名規約

**形式**: `動名詞形`（動詞 + -ing）、小文字、ハイフン、最大64文字

```yaml
# 良い例
name: processing-pdfs
name: managing-agents

# 悪い例
name: PDF-Processor    # 動名詞でない、大文字
name: helper           # 曖昧すぎる
```

## description（重要）

**テンプレート**: `[機能の説明]. Use when [トリガー].`

**要件**:
- 最大1024文字
- 三人称
- WHAT（機能）と WHEN（トリガー）を含む
- 山括弧禁止（`<example>` は不可）

```yaml
# 良い例
description: PDFファイルからテキストを抽出します。PDFを扱う場合や「PDF」「PDF処理」に言及された場合に使用。

# 悪い例
description: Helps with documents  # 曖昧、トリガーなし
```

## ファイルサイズ制限

- `SKILL.md` / `AGENT.md`: 500行以下
- すべての文の必要性を精査
- 詳細な内容はリファレンスファイルに移動

## 言語ガイドライン

| ファイルタイプ | 言語 |
|---------------|------|
| SKILL.md / AGENT.md | 日本語 |
| rules/*.md | 日本語 |
| output-styles/*.md | 日本語 |
| CLAUDE.md | 日本語 |
| description (SKILL.md frontmatter) | 日本語 + 英語技術用語（下記参照） |

- **避ける**: 重いテーブルフォーマット（トークン非効率）
- **EN版 description**: 英語キーワードのみ（日本語トリガー不要）
- **JA版 description**: 日本語 + 日本語ユーザーが実際に使う英語技術用語（例: 「コミット」+「commit」）
- **存在しないスラッシュコマンド禁止**: `/skill-name` は実在するコマンドのみ参照可。引用符付きキーワードを使用（例: 「commit」であって「/commit」ではない）

## ファイル構造

```
skill-name/
├── SKILL.md        # 必須、500行以下
├── reference.md    # オプション、詳細仕様
├── examples.md     # オプション、I/O 例
└── scripts/        # オプション、自動化
```

## アンチパターン

- 深い参照チェーン（SKILL.md から1レベルに保つ）
- Windows のバックスラッシュ（フォワードスラッシュのみ）
- デフォルトなしのオプション過多
- 具体的なトリガーのない曖昧な命名
- LLM が知っている概念の長い説明
- 動機付け・哲学セクション（"なぜ" より "何を"）
- **ワークフローの省略**（フローは LLM に推測させてはいけない）
- **ツール使用指示の省略**（TodoWrite, AskUserQuestion 等の使い所）
- **NGケースの省略**（禁止事項がないと LLM はデフォルト動作する）

## バリデーションチェックリスト

コミット前に確認：
- [ ] 名前: 動名詞形、小文字
- [ ] description: トリガー、三人称、`<>` なし
- [ ] SKILL.md: 500行以下
- [ ] フロントマター: 有効な YAML（タブではなくスペース）
- [ ] パス: フォワードスラッシュのみ
- [ ] **ワークフロー**: ステップバイステップのフローが記載されているか
- [ ] **ツール使用**: TodoWrite / AskUserQuestion / Task の使い所が明記されているか
- [ ] **NGケース**: スキル固有の禁止事項・チェックリストがあるか
- [ ] コーダー系: 既知概念の説明を削除し参照のみにしたか
- [ ] レビュアー系: チェックリストの網羅性は十分か

# Git コミットスタイル

Conventional Commits 形式: `{type}: {description} (#{issue-number})`

**タイプ**: `feat` | `fix` | `refactor` | `docs` | `test` | `chore`

## プロジェクト固有ルール

- 1行目は72文字以内、命令形（"add feature" not "added feature"）
- 該当する場合は Issue 番号を参照: `(#39)`
- **`Co-Authored-By` 署名は付けない**
- `--no-verify` 禁止、明示的な依頼なしに amend 禁止、ベースブランチに force push 禁止

## コード言語

| 要素 | 言語 |
|------|------|
| コード / 変数名 | English |
| コメント / JSDoc | 日本語 |
| コミットメッセージ | 日本語（プレフィックスは English: `feat:`, `fix:` 等） |
| CLI 出力 | i18n 辞書 (`i18n/cli/`) |

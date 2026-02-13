# 実装レポートテンプレート

レポートの保存先: `GitHub Discussions (Reports){YYYY-MM-DD}-{HHmmss}-{feature-name}-implementation.md`

```markdown
# 実装レポート: {{Feature Name}}

- 日付: {YYYY-MM-DD}
- アプリ: {admin|public|web}
- タイプ: {feature|component|page|fix}

## サマリー

実装内容の簡潔な説明。

## 作成ファイル

| ファイル | 用途 |
|---------|------|
| `path/to/file.ts` | 説明 |

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `path/to/file.ts` | 変更内容 |

## テストカバレッジ

- ユニットテスト: {N} テスト
- テストファイル: `__tests__/path/to/test.ts`
- カバレッジ: {PASS|PARTIAL}

## 追加した i18n キー

- `namespace.key1` - 説明
- `namespace.key2` - 説明

## 追加した依存関係

- `package-name` - 追加理由

## 確認事項

- [ ] 全テストパス
- [ ] Lint エラーなし
- [ ] 型チェックパス
- [ ] 手動確認完了

## 備考

追加メモやフォローアップタスク。
```

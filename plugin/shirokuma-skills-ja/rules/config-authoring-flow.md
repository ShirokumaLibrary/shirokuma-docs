# 設定ファイル作成フロー

Claude Code の設定ファイル（ルール、スキル、エージェント、出力スタイル、プラグイン）を作成・更新する際は、このフローに従い品質と一貫性を確保してください。

## 必要なツール

| ツール | タイプ | タイミング |
|--------|--------|-----------|
| `managing-rules` | スキル | ルールの作成・更新時 |
| `managing-skills` | スキル | スキルの作成・更新時 |
| `managing-agents` | スキル | エージェントの作成・更新時 |
| `managing-output-styles` | スキル | 出力スタイルの作成・更新時 |
| `managing-plugins` | スキル | プラグインの作成・更新時 |
| `claude-config-reviewing` | スキル | 設定の作成・更新後（品質チェック） |

## フロー

1. **書く前に**: 関連する managing-* スキルを起動してベストプラクティスとテンプレートを取得
2. **書く**: スキルのガイダンスに従い設定ファイルを作成・更新
3. **書いた後に**: `claude-config-reviewing` スキルを実行して品質を検証

### 例: 新しいルールの作成

```
1. managing-rules スキルを起動 -> テンプレートとベストプラクティスを取得
2. plugin/shirokuma-skills-ja/rules/my-rule.md を作成
3. claude-config-reviewing スキルを起動 -> 品質と一貫性を検証
```

## 適用対象

- `.claude/rules/`, `.claude/skills/`, `.claude/agents/`, `.claude/output-styles/`, `.claude/commands/` への新規ファイル作成
- `plugin/` ディレクトリ（skills, agents, rules, plugins）への新規ファイル作成
- 構造的な変更を伴う既存設定ファイルの更新（タイポ修正は除く）

## 例外

- 軽微なタイポ修正や1行のみの編集はフルフロー不要
- ユーザーから明示的に指示された場合、レビュースキルのステップはスキップ可能

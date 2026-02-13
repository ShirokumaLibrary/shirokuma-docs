# エージェントのベストプラクティス

[Anthropic の "Building Effective Agents"](https://www.anthropic.com/engineering/building-effective-agents) と [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices) に基づくパターン。

## 目次

- [基本原則](#基本原則)
- [ACI: エージェント-コンピュータインターフェース](#aci-エージェント-コンピュータインターフェース)
- [システムプロンプト設計](#システムプロンプト設計)
- [ツール選択戦略](#ツール選択戦略)
- [説明文の最適化](#説明文の最適化)
- [クイックリファレンス](#クイックリファレンス)

高度なトピックは [best-practices-advanced.md](best-practices-advanced.md) を参照:
- よくあるアンチパターン
- エージェントのテスト
- パフォーマンス最適化
- セキュリティに関する考慮事項

---

## 基本原則

Anthropic の3つの基本原則:

### 1. シンプルさ
> "成功とは最も洗練されたシステムを構築することではなく、ニーズに合った適切なシステムを構築すること。"

- 最もシンプルなソリューションから始める
- 結果が正当化する場合のみ複雑さを追加
- 多くのアプリケーションは「単一の LLM 呼び出しの最適化と検索・インコンテキスト例」で十分

### 2. 透明性
- 計画ステップを明示
- エージェントの推論を可視化
- 人間のレビューと介入を可能に

### 3. エージェント-コンピュータインターフェース (ACI)
- ツール設計はプロンプトと同等に重視
- ツールを徹底的にテスト
- モデルの誤りに基づいてイテレーション

---

## ACI: エージェント-コンピュータインターフェース

> "ACI を HCI（ヒューマン-コンピュータインターフェース）と同じように考えよ。"

### ツール設計ガイドライン

| ガイドライン | 例 |
|------------|-----|
| **明確な名前** | `read_file`（`rf` ではない） |
| **詳細なドキュメント** | 使用タイミング、エッジケースを含む |
| **使用例** | 入出力ペア |
| **エラーメッセージ** | アクション可能で分かりやすい |
| **ポカヨケ** | エラーを事前に防止 |

### ツールドキュメントテンプレート

```markdown
## tool_name

**Purpose**: [一文で説明]

**When to use**: [具体的なシナリオ]

**Parameters**:
- `param1` (required): [説明]
- `param2` (optional): [説明, default: X]

**Returns**: [形式と構造]

**Examples**:
\```
Input: { "param1": "value" }
Output: { "result": "..." }
\```

**Edge cases**:
- If X happens, returns Y
- Does NOT handle Z (use other_tool instead)
```

### よくあるツール設計の誤り

| 誤り | 修正 |
|------|------|
| 曖昧な説明 | 具体的なユースケース |
| 例の欠如 | 入出力ペア |
| エラー処理ドキュメントなし | 失敗モードを文書化 |
| ツールの重複 | 明確な境界 |
| 複雑なパラメータ | シンプルで直感的な入力 |

### トークン効率

**読みやすさよりトークン効率を優先。**

| 避ける | 推奨 |
|--------|------|
| ASCII アート / ボックス図 | Markdown テーブル、箇条書き |
| 装飾的セパレータ | ヘッダーのみ |
| `Last Updated:` スタンプ | Git 履歴 |
| 冗長な説明 | 簡潔な指示 |

---

## システムプロンプト設計

### 明確な構造

```markdown
# Agent Name

[一文の役割説明]

## Core Responsibilities
- [具体的なタスク 1]
- [具体的なタスク 2]

## Workflow
1. **Step Name**: [アクション] using [ツール]
   - Decision point: If X, then Y
   - Output: [期待される結果]

## Quality Criteria
- [測定可能な基準 1]
- [測定可能な基準 2]

## Output Format
[例付きの正確な構造]
```

### 効果的な指示の書き方

**良い例**:
```markdown
## Workflow
1. **Scan Files**: Use Glob("**/*.ts") to find TypeScript files
2. **Check Imports**: For each file, verify imports are used
3. **Report Unused**: List file:line for each unused import
```

**悪い例**:
```markdown
## Workflow
1. Look at the files
2. Check for problems
3. Report findings
```

### プロンプト長のガイドライン

| 複雑さ | 推奨行数 |
|--------|---------|
| シンプル、集中型 | 100-300行 |
| 標準 | 300-500行 |
| 複雑（ディレクトリ使用） | 500行以上を分割 |

---

## ツール選択戦略

### 原則: 必要最小限のアクセス

| エージェントタイプ | 推奨ツール | 避ける |
|-----------------|-----------|-------|
| 読み取り専用レビューア | Read, Grep, Glob | Write, Edit |
| ファイル生成 | Read, Write | Edit（新規ファイルは Write） |
| コード変換 | Read, Edit | Write（変更は Edit 推奨） |
| デバッガ | Read, Bash, Grep | Write, Edit |

### ツールの組み合わせ

**分析エージェント**:
```yaml
tools: Read, Grep, Glob, Bash
```
- Bash はテスト/リンター実行のみ
- ファイル変更機能なし

**生成エージェント**:
```yaml
tools: Read, Write, Bash
```

**変換エージェント**:
```yaml
tools: Read, Edit, Bash
```

### Web アクセス

必要な場合のみ追加:
```yaml
# ドキュメント取得
tools: Read, Write, WebFetch

# リサーチエージェント
tools: Read, WebSearch, WebFetch
```

---

## 説明文の最適化

### トリガーフレーズの配置

**良い例**: トリガーを末尾に
```yaml
description: Reviews code for security vulnerabilities following OWASP Top 10. Use when user asks to "security review", "audit security", or "check vulnerabilities".
```

**より良い例**: `<example>` ブロック付きリッチ形式
```yaml
description: Security auditor for OWASP Top 10 vulnerabilities.

<example>
Context: User wants security review
user: "Check auth module for vulnerabilities"
assistant: "I'll use the security-auditor to analyze the authentication code."
<Task tool call to security-auditor agent>
</example>
```

### 曖昧さの解消

複数のエージェントがマッチしうる場合:

```yaml
# Agent 1: code-reviewer
description: Reviews code for quality, style, and maintainability. Use for general code reviews, NOT security-specific.

# Agent 2: security-auditor
description: Reviews code for security vulnerabilities (OWASP). Use specifically for security audits, NOT general code quality.
```

### プロアクティブな呼び出し

自動使用を促進する:
```yaml
description: Use PROACTIVELY after any feature implementation to ensure code quality. MUST BE USED when PR is ready for review.
```

---

## クイックリファレンス

### エージェント品質チェックリスト

- [ ] 単一の明確な責務
- [ ] 具体的なワークフローステップ
- [ ] 必要最小限のツール
- [ ] 明確な呼び出しトリガー
- [ ] 定義された出力形式
- [ ] エラー処理を含む
- [ ] サンプル入力でテスト済み
- [ ] 500行未満（またはディレクトリ形式）

### ファイルサイズのガイドライン

| ファイル | 目標行数 |
|---------|---------|
| SKILL.md / AGENT.md | < 500 |
| reference.md | < 800 |
| examples.md | < 600 |
| best-practices.md | < 400 |

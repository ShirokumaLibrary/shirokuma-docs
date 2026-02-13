# プラグインの例

完全なファイル構造とコンテンツを含む実際のプラグイン例。

## 目次

- [シンプルグリーティングプラグイン（クイックスタート）](#シンプルグリーティングプラグイン)
- [スキルのみプラグイン](#スキルのみプラグイン)
- [エージェントのみプラグイン](#エージェントのみプラグイン)
- [コマンドのみプラグイン](#コマンドのみプラグイン)

高度な例は [examples-advanced.md](examples-advanced.md) を参照:
- 包括的プラグイン（スキル + エージェント + コマンド + フック）
- マーケットプレイスセットアップ
- チームワークフロー
- npm 公開

---

## シンプルグリーティングプラグイン

基本を学ぶための最小限のプラグイン。ユーザーに挨拶する1つのコマンドを含む。

### ディレクトリ構造

| パス | 目的 |
|------|------|
| `.claude-plugin/plugin.json` | プラグインマニフェスト |
| `commands/greet.md` | 挨拶コマンド |
| `README.md` | ドキュメント |

### plugin.json

```json
{
  "name": "my-first-plugin",
  "description": "A simple greeting plugin to learn the basics",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

### commands/greet.md

```markdown
# Greet User

Greet the user warmly and ask how you can help today.

Please greet the user in a friendly way and ask what they would like to work on.
```

### テスト

1. marketplace.json を作成:
```json
{
  "name": "test-marketplace",
  "owner": {
    "name": "Test User"
  },
  "plugins": [
    {
      "name": "my-first-plugin",
      "source": "./my-first-plugin",
      "description": "My first test plugin"
    }
  ]
}
```

2. マーケットプレイスを追加してインストール:
```bash
/plugin marketplace add file:///absolute/path/to/marketplace.json
/plugin install my-first-plugin@test-marketplace
/greet
```

---

## スキルのみプラグイン

コード分析とドキュメント生成のための複数スキルを含むプラグイン。

### ディレクトリ構造

| パス | 目的 |
|------|------|
| `.claude-plugin/plugin.json` | プラグインマニフェスト |
| `skills/analyzing-complexity/` | SKILL.md + examples.md |
| `skills/generating-docs/` | SKILL.md + reference.md |
| `README.md` | ドキュメント |

### plugin.json

```json
{
  "name": "code-helper",
  "description": "Code analysis and documentation generation skills",
  "version": "1.0.0",
  "author": {
    "name": "Dev Tools Team"
  },
  "keywords": ["code", "analysis", "documentation"],
  "license": "MIT"
}
```

### skills/analyzing-complexity/SKILL.md

```markdown
---
name: analyzing-complexity
description: Analyze code complexity metrics including cyclomatic complexity, nesting depth, and function length. Use when user asks to "analyze complexity", "check code complexity", or "measure cyclomatic complexity".
---

# Analyzing Code Complexity

Analyze code complexity metrics to identify areas needing refactoring.

## Workflow

### Step 1: Identify Target Code

Ask the user:
- Specific file to analyze?
- Entire directory?
- Just current selection?

### Step 2: Calculate Metrics

For each function, calculate:
- Cyclomatic complexity (decision points + 1)
- Nesting depth (maximum indentation level)
- Function length (lines of code)
- Parameter count

### Step 3: Report Results

Present in table format:
- Function name
- Complexity score
- Recommendation (refactor / acceptable / simple)

### Step 4: Suggest Improvements

For high-complexity functions:
- Suggest extract method refactoring
- Identify nested conditionals to simplify
- Propose early returns

## Common Patterns

See [examples.md](examples.md) for analysis output examples.
```

### skills/generating-docs/SKILL.md

```markdown
---
name: generating-docs
description: Generate API documentation, README files, and inline code comments with proper formatting. Use when user mentions "generate docs", "create documentation", "write README", or "document this code".
---

# Generating Documentation

Generate comprehensive documentation for code projects.

## Workflow

### Step 1: Determine Documentation Type

- API documentation (functions, classes, methods)
- README (project overview, installation, usage)
- Inline comments (code explanations)
- Architecture docs (system design)

### Step 2: Analyze Code Structure

- Read target files
- Identify public APIs
- Extract function signatures
- Find usage examples

### Step 3: Generate Documentation

Follow language conventions:
- JSDoc for JavaScript/TypeScript
- Docstrings for Python
- XML comments for C#
- Javadoc for Java

### Step 4: Format Output

Include:
- Description
- Parameters with types
- Return value
- Examples
- Exceptions/errors

## Notes

See [reference.md](reference.md) for format specifications per language.
```

---

## エージェントのみプラグイン

ビルドとデプロイメントワークフロー向けの専門エージェントを含むプラグイン。

### ディレクトリ構造

| パス | 目的 |
|------|------|
| `.claude-plugin/plugin.json` | プラグインマニフェスト |
| `agents/build-manager/` | AGENT.md + reference.md |
| `agents/deployment-coordinator/` | AGENT.md + examples.md |
| `README.md` | ドキュメント |

### plugin.json

```json
{
  "name": "devops-agents",
  "description": "Specialized agents for build management and deployment coordination",
  "version": "2.1.0",
  "author": {
    "name": "DevOps Team"
  },
  "homepage": "https://github.com/company/devops-agents",
  "license": "Apache-2.0"
}
```

### agents/build-manager/AGENT.md

```markdown
---
name: build-manager
description: Manages complex build processes including dependency installation, compilation, testing, and artifact generation with error recovery. Use for build tasks, CI/CD workflows, or multi-step compilation.
---

# Build Manager Agent

Autonomously manages complex build processes with error handling and recovery.

## Capabilities

- Run build commands (npm, make, gradle, cargo, etc.)
- Install dependencies automatically
- Execute tests and report failures
- Generate build artifacts
- Handle common build errors
- Retry with fixes on failure

## Workflow

### Phase 1: Analyze Build System

- Detect build tool (package.json, Makefile, pom.xml, etc.)
- Read build configuration
- Identify build targets

### Phase 2: Prepare Environment

- Check dependencies installed
- Install missing dependencies
- Verify build tool versions

### Phase 3: Execute Build

- Run build command
- Monitor output for errors
- Capture warnings

### Phase 4: Handle Errors

If build fails:
- Parse error messages
- Identify root cause
- Apply fix (missing dep, syntax error, etc.)
- Retry build

### Phase 5: Report Results

- Build success/failure status
- Generated artifacts
- Test results
- Warnings summary

## Notes

See [reference.md](reference.md) for supported build tools and error recovery patterns.
```

---

## コマンドのみプラグイン

一般的なタスク向けのユーティリティコマンドを含むプラグイン。

### ディレクトリ構造

| パス | 目的 |
|------|------|
| `.claude-plugin/plugin.json` | プラグインマニフェスト |
| `commands/` | format-all.md, clean-deps.md, check-security.md |
| `README.md` | ドキュメント |

### plugin.json

```json
{
  "name": "quick-commands",
  "description": "Utility commands for formatting, cleaning, and security checks",
  "version": "1.3.0",
  "author": {
    "name": "Engineering Team"
  }
}
```

### commands/format-all.md

```markdown
# Format All Code

Format all code files in the project according to configured style rules.

Please format all code files in the project:

1. Detect formatter (Prettier, Black, gofmt, rustfmt, etc.)
2. Run formatter on all applicable files
3. Report which files were changed
4. Show any formatting errors

If no formatter configured, ask user which formatter to use.
```

### commands/clean-deps.md

```markdown
# Clean Dependencies

Remove unused dependencies and update outdated packages.

Please clean up project dependencies:

1. Analyze imports/requires to find unused dependencies
2. Check for outdated packages (npm outdated, pip list --outdated, etc.)
3. Present findings to user
4. Ask which to remove/update
5. Update package files and lockfiles
6. Run tests to verify nothing broke
```

### commands/check-security.md

```markdown
# Security Check

Scan project for security vulnerabilities and best practice violations.

Please perform security analysis:

1. Run security scanner (npm audit, pip-audit, cargo audit, etc.)
2. Check for hardcoded secrets (API keys, passwords)
3. Verify HTTPS usage (no HTTP URLs)
4. Check dependency vulnerabilities
5. Report findings with severity levels
6. Suggest remediation for critical issues
```

---

## 関連リソース

- [高度な例](examples-advanced.md) - 包括的プラグイン、マーケットプレイスセットアップ、チームワークフロー、npm 公開
- [リファレンスガイド](reference.md) - 完全なプラグイン仕様

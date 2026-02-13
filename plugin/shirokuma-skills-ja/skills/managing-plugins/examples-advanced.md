# 高度なプラグインの例

包括的プラグイン、マーケットプレイスセットアップ、チームワークフロー、npm 公開を含む高度な例。

基本的なプラグイン例（スキルのみ、エージェントのみ、コマンドのみ）は [examples.md](examples.md) を参照。

## 包括的プラグイン

スキル、エージェント、コマンド、フックが連携するプラグイン。

### ディレクトリ構造

| パス | 目的 |
|------|------|
| `.claude-plugin/plugin.json` | プラグインマニフェスト |
| `skills/designing-apis/SKILL.md` | API 設計スキル |
| `skills/validating-schemas/SKILL.md` | スキーマ検証スキル |
| `agents/api-generator/AGENT.md` | コード生成エージェント |
| `commands/new-endpoint.md` | エンドポイント作成コマンド |
| `commands/test-api.md` | API テストコマンド |
| `hooks/validate-openapi.js` | Pre-commit フック |
| `templates/` | OpenAPI テンプレート |

### plugin.json

```json
{
  "name": "api-toolkit",
  "description": "Complete toolkit for API design, generation, validation, and testing",
  "version": "3.0.0",
  "author": {
    "name": "API Platform Team"
  },
  "homepage": "https://github.com/company/api-toolkit",
  "repository": {
    "type": "git",
    "url": "https://github.com/company/api-toolkit.git"
  },
  "keywords": ["api", "openapi", "rest", "validation"],
  "license": "MIT"
}
```

### skills/designing-apis/SKILL.md

```markdown
---
name: designing-apis
description: Design RESTful APIs following best practices with OpenAPI specifications. Use when user mentions "design API", "create REST endpoint", or "OpenAPI spec".
---

# Designing APIs

Design RESTful APIs with OpenAPI specifications following best practices.

## Workflow

### Step 1: Understand Requirements

Ask the user:
- What resource/entity?
- Required operations (CRUD)?
- Authentication needed?
- Rate limiting?

### Step 2: Design Endpoints

Follow REST conventions:
- GET /resources - List
- GET /resources/:id - Get one
- POST /resources - Create
- PUT /resources/:id - Update
- DELETE /resources/:id - Delete

### Step 3: Define Schemas

Create OpenAPI schema:
- Request body schemas
- Response schemas
- Query parameters
- Path parameters

### Step 4: Generate OpenAPI Spec

Use template from [templates/openapi-template.yaml](templates/openapi-template.yaml)
```

### agents/api-generator/AGENT.md

```markdown
---
name: api-generator
description: Generates complete API implementations from OpenAPI specifications including routes, controllers, validation, tests, and documentation. Use for API scaffolding and code generation from specs.
---

# API Generator Agent

Generate complete API implementation from OpenAPI specification.

## Workflow

### Phase 1: Parse OpenAPI Spec

- Read OpenAPI YAML/JSON
- Validate spec correctness
- Extract endpoints, schemas, auth

### Phase 2: Generate Code

Create:
- Route handlers
- Controller classes
- Request validation
- Response serialization
- Error handling

### Phase 3: Add Tests

Generate:
- Unit tests for controllers
- Integration tests for endpoints
- Example requests/responses

### Phase 4: Create Documentation

Generate:
- API usage guide
- Authentication docs
- Example curl commands
```

### commands/new-endpoint.md

```markdown
# New API Endpoint

Interactively create a new API endpoint with proper structure.

Please create a new API endpoint:

1. Ask for endpoint details:
   - Path (e.g., /api/users)
   - Method (GET, POST, PUT, DELETE)
   - Request body schema
   - Response schema
   - Authentication required?

2. Generate files:
   - Route handler
   - Controller method
   - Validation schema
   - Unit test
   - Integration test

3. Update OpenAPI spec

4. Show usage example
```

### hooks/validate-openapi.js

```javascript
// Pre-commit hook to validate OpenAPI specs

module.exports = {
  name: 'validate-openapi',
  event: 'pre-commit',

  async execute(context) {
    const { files } = context;

    const specFiles = files.filter(f =>
      f.endsWith('openapi.yaml') || f.endsWith('openapi.json')
    );

    if (specFiles.length === 0) {
      return true; // No specs to validate
    }

    console.log('Validating OpenAPI specifications...');

    for (const file of specFiles) {
      const valid = await validateOpenAPI(file);
      if (!valid) {
        console.error(`Invalid OpenAPI spec: ${file}`);
        return false; // Block commit
      }
    }

    console.log('All OpenAPI specs valid');
    return true;
  }
};
```

---

## マーケットプレイスセットアップ

複数プラグインを含むマーケットプレイスの完全な例。

### ディレクトリ構造

| パス | 目的 |
|------|------|
| `marketplace.json` | マーケットプレイスマニフェスト |
| `plugins/code-helper/` | コード分析プラグイン |
| `plugins/devops-agents/` | DevOps エージェントプラグイン |
| `plugins/api-toolkit/` | API ツールキットプラグイン |

### marketplace.json

```json
{
  "name": "company-plugins",
  "version": "1.0.0",
  "owner": {
    "name": "Company Engineering"
  },
  "homepage": "https://github.com/company/claude-plugins",
  "plugins": [
    {
      "name": "code-helper",
      "source": "./plugins/code-helper",
      "description": "Code analysis and documentation generation skills"
    },
    {
      "name": "devops-agents",
      "source": "./plugins/devops-agents",
      "description": "Build management and deployment agents"
    },
    {
      "name": "api-toolkit",
      "source": "./plugins/api-toolkit",
      "description": "Complete API development toolkit"
    },
    {
      "name": "quick-commands",
      "source": "./plugins/quick-commands",
      "description": "Utility commands for common tasks"
    }
  ]
}
```

### Git セットアップ

```bash
git init
git add .
git commit -m "Initial company plugins marketplace"
git remote add origin https://github.com/company/claude-plugins.git
git push -u origin main
```

配布 URL: `https://raw.githubusercontent.com/company/claude-plugins/main/marketplace.json`

---

## チームワークフロー

リポジトリ設定を通じてチームがプラグインを使用する方法。

### .claude/settings.json

```json
{
  "plugins": {
    "autoInstall": true,
    "marketplaces": [
      "https://raw.githubusercontent.com/company/claude-plugins/main/marketplace.json"
    ],
    "autoInstallPlugins": [
      "code-helper",
      "devops-agents"
    ]
  }
}
```

### ワークフロー

1. チームメンバーがリポジトリをクローン
2. Claude Code で開く
3. フォルダを信頼（初回のみ）
4. プラグインが自動インストール
5. プラグインが利用可能な状態で作業開始

### プロジェクトプラグインの追加

```bash
mkdir -p .claude/plugins/project-linter
# ... プラグインファイルを作成 ...
git add .claude/plugins/project-linter
git commit -m "Add project-specific linter plugin"
git push
# 他のチームメンバーは次の pull で取得
```

---

## npm 公開

プラグインを npm パッケージとして公開配布。

### package.json のセットアップ

```json
{
  "name": "@username/claude-plugin-api-toolkit",
  "version": "1.0.0",
  "description": "Complete API development toolkit for Claude Code",
  "main": ".claude-plugin/plugin.json",
  "files": [
    ".claude-plugin/",
    "skills/",
    "agents/",
    "commands/",
    "hooks/",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "claude-code",
    "plugin",
    "api",
    "openapi",
    "rest"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/claude-plugin-api-toolkit.git"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### .npmignore

```
.git
.github
node_modules
*.log
test/
tests/
__tests__
docs/
.vscode
.idea
*.swp
```

### 公開

```bash
npm pack          # ローカルテスト
npm login         # npm にログイン
npm publish --access public

# 次のリリースでバージョン更新
npm version patch  # or minor, major
npm publish --access public
```

### ユーザーインストール

```bash
npm install -g @username/claude-plugin-api-toolkit
```

Claude Code がグローバル node_modules から自動検出。

### メンテナンス

```bash
# 変更を加える
git add .
git commit -m "feat: add new feature"

# バージョンバンプ
npm version minor

# 公開
npm publish

# タグをプッシュ
git push --tags
```

ユーザー更新:
```bash
npm update -g @username/claude-plugin-api-toolkit
```

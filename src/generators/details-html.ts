/**
 * details-html - コアHTML生成
 *
 * 詳細ページのメインHTML生成、JSDocセクション、テストセクションを提供する。
 */

import { basename } from "node:path";
import { wrapHtmlDocument, escapeHtml } from "../utils/html.js";
import type {
  DetailsContext,
  DetailHTMLData,
  CategorizedTestCase,
  TestCoverageAnalysis,
  TestCategory,
} from "../commands/details-types.js";
import { findElementLink } from "../commands/details-context.js";
import { formatCode, parseJSDoc, simpleMarkdown } from "../parsers/details-jsdoc.js";
import {
  categoryLabels,
  getCdnScripts,
  getDetailStyles,
  getDetailScripts,
  generateTestPageUrl,
} from "./details-styles.js";

/**
 * 詳細ページ HTML を生成
 */
export function generateDetailHTML(data: DetailHTMLData, ctx: DetailsContext): string {
  const typeLabels = {
    screen: "Screen",
    component: "Component",
    action: "Server Action",
    module: "Module",
    table: "Database Table",
  };

  const typeLabelsJa: Record<string, string> = {
    screen: "Screens",
    component: "Components",
    action: "Actions",
    module: "Modules",
    table: "Tables",
  };

  const typeColors = {
    screen: "blue",
    component: "green",
    action: "orange",
    module: "yellow",
    table: "pink",
  };

  const color = typeColors[data.type];

  // テストセクション HTML
  const testSectionHTML = generateTestSectionHTML(data.testCases, data.testAnalysis, color);

  // 関連要素 HTML（モジュールパス対応）
  const relatedHTML = data.related
    .filter((r) => r.items.length > 0)
    .map(
      (r) => `
      <div class="related-group">
        <h4>${escapeHtml(r.type)}</h4>
        <div class="related-list">
          ${r.items
            .map((item) => {
              const linkInfo = findElementLink(ctx, r.linkType, item);
              if (linkInfo) {
                return `<a href="../../${r.linkType}/${linkInfo.module}/${item}.html" class="related-item">
                  <span class="related-item-name">${escapeHtml(item)}</span>
                  <span class="related-item-module">${escapeHtml(linkInfo.module)}</span>
                </a>`;
              }
              return `<span class="related-item related-item-nolink">${escapeHtml(item)}</span>`;
            })
            .join("")}
        </div>
      </div>
    `
    )
    .join("");

  const cdnScripts = getCdnScripts();

  // パンくずナビゲーション
  const breadcrumb = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li><a href="../../../index.html">Portal</a></li>
        <li><a href="../../../feature-map.html">${typeLabelsJa[data.type]}</a></li>
        <li><a href="../${escapeHtml(data.moduleName)}.html" class="breadcrumb-module">${escapeHtml(data.moduleName)}</a></li>
        <li aria-current="page">${escapeHtml(data.name)}</li>
      </ol>
    </nav>
  `;

  // アクション種別バッジ
  const actionTypeBadge = data.actionType
    ? `<span class="page-badge badge-${data.actionType === "CRUD" ? "teal" : "purple"}">${data.actionType}</span>`
    : "";

  const content = `
    ${cdnScripts}
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">
          <span class="page-module-prefix">${escapeHtml(data.moduleName)}/</span>${escapeHtml(data.name)}
          <span class="page-badge badge-${color}">${typeLabels[data.type]}</span>
          ${actionTypeBadge}
        </h1>
        <p class="page-description">${escapeHtml((data.description || "").split("\n")[0])}</p>
        <div class="page-meta">
          ${escapeHtml(data.filePath)}
          ${data.route ? ` • Route: ${escapeHtml(data.route)}` : ""}
        </div>
      </div>

      <div class="tabs">
        <button class="tab active" onclick="showTab('overview')">概要</button>
        <button class="tab" onclick="showTab('code')">コード</button>
        <button class="tab" onclick="showTab('tests')">テスト (${data.testCases.length})</button>
        <button class="tab" onclick="showTab('related')">関連</button>
      </div>

      <div id="overview" class="tab-content active">
        ${generateJSDocSection(data.jsDoc, data.description)}
      </div>

      <div id="code" class="tab-content">
        <div class="section">
          <h3 class="section-title">ソースコード</h3>
          <pre class="code-block"><code class="language-typescript">${formatCode(data.code)}</code></pre>
        </div>
      </div>

      <div id="tests" class="tab-content">
        ${testSectionHTML}
      </div>

      <div id="related" class="tab-content">
        <div class="section">
          <h3 class="section-title">関連要素</h3>
          ${relatedHTML || "<p>関連要素はありません</p>"}
        </div>
      </div>
    </div>
  `;

  const styles = getDetailStyles(color);
  const scripts = getDetailScripts();

  return wrapHtmlDocument({
    title: `${data.name} - ${typeLabels[data.type]} | ${data.projectName}`,
    content,
    styles,
    scripts,
  });
}

/**
 * JSDocセクションのHTMLを生成
 */
export function generateJSDocSection(jsDoc: string, fallbackDescription: string): string {
  const parsed = parseJSDoc(jsDoc);
  const description = parsed.description || fallbackDescription;

  let html = "";

  if (description) {
    html += `
      <div class="section">
        <h3 class="section-title">概要</h3>
        <div class="description markdown-content">${simpleMarkdown(description)}</div>
      </div>
    `;
  }

  if (parsed.params.length > 0) {
    html += `
      <div class="section">
        <h3 class="section-title">パラメータ</h3>
        <table class="params-table">
          <thead>
            <tr><th>名前</th><th>型</th><th>説明</th></tr>
          </thead>
          <tbody>
            ${parsed.params
              .map(
                (p) => `
              <tr>
                <td><code>${escapeHtml(p.name)}</code></td>
                <td>${p.type ? `<code>${escapeHtml(p.type)}</code>` : "-"}</td>
                <td>${escapeHtml(p.description)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  if (parsed.returns) {
    html += `
      <div class="section">
        <h3 class="section-title">戻り値</h3>
        <p>${escapeHtml(parsed.returns)}</p>
      </div>
    `;
  }

  if (parsed.throws && parsed.throws.length > 0) {
    html += `
      <div class="section">
        <h3 class="section-title">例外</h3>
        <ul class="throws-list">
          ${parsed.throws.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  if (parsed.examples.length > 0) {
    html += `
      <div class="section">
        <h3 class="section-title">使用例</h3>
        ${parsed.examples
          .map((ex) => {
            const trimmed = ex.trim();
            if (trimmed.startsWith("```")) {
              return simpleMarkdown(trimmed);
            }
            return simpleMarkdown("```ts\n" + trimmed + "\n```");
          })
          .join("")}
      </div>
    `;
  }

  const metaTags = parsed.tags.filter((t) =>
    ["serverAction", "feature", "dbTables", "module"].includes(t.name)
  );
  if (metaTags.length > 0) {
    html += `
      <div class="section">
        <h3 class="section-title">メタ情報</h3>
        <div class="meta-tags">
          ${metaTags
            .map((t) => {
              const label = getTagLabel(t.name);
              return `<span class="meta-tag"><span class="meta-tag-name">${label}</span>${t.value ? ` ${escapeHtml(t.value)}` : ""}</span>`;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  return html || '<div class="section"><p>説明はありません</p></div>';
}

/**
 * タグ名を日本語ラベルに変換
 */
export function getTagLabel(tagName: string): string {
  const labels: Record<string, string> = {
    serverAction: "🚀 Server Action",
    feature: "📦 機能",
    dbTables: "🗄️ DB",
    module: "📁 モジュール",
  };
  return labels[tagName] || `@${tagName}`;
}

/**
 * テストセクション HTML を生成
 */
export function generateTestSectionHTML(
  testCases: CategorizedTestCase[],
  analysis: TestCoverageAnalysis,
  color: string
): string {
  if (testCases.length === 0) {
    return `
      <div class="section">
        <h3 class="section-title">テストケース</h3>
        <div class="no-tests">
          <p>テストケースが見つかりませんでした</p>
          <ul class="recommendations">
            ${analysis.recommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}
          </ul>
        </div>
      </div>
    `;
  }

  const scoreColor =
    analysis.coverageScore >= 70 ? "#22c55e" : analysis.coverageScore >= 40 ? "#f59e0b" : "#ef4444";

  const categorySummary = Object.entries(analysis.byCategory)
    .filter(([_, tests]) => tests.length > 0)
    .map(([cat, tests]) => {
      const info = categoryLabels[cat as TestCategory];
      return `<span class="category-badge" style="background: ${info.color}20; color: ${info.color}">${info.icon} ${info.label} ${tests.length}</span>`;
    })
    .join("");

  const testListHTML = Object.entries(analysis.byCategory)
    .filter(([_, tests]) => tests.length > 0)
    .map(([cat, tests]) => {
      const info = categoryLabels[cat as TestCategory];
      return `
        <div class="test-category">
          <h4 class="category-header" style="border-color: ${info.color}">
            ${info.icon} ${info.label} (${tests.length})
          </h4>
          <ul class="test-list">
            ${tests
              .map(
                (tc) => `
              <li class="test-item">
                <div class="test-header">
                  <span class="test-name">${escapeHtml(tc.description || tc.summary)}</span>
                  <span class="test-meta">L${tc.line}</span>
                </div>
                ${tc.description && tc.it !== tc.description ? `<div class="test-original">EN: ${escapeHtml(tc.it)}</div>` : ""}
                ${tc.purpose ? `<div class="test-detail"><strong>目的:</strong> ${escapeHtml(tc.purpose)}</div>` : ""}
                ${tc.expected ? `<div class="test-detail"><strong>期待:</strong> ${escapeHtml(tc.expected)}</div>` : ""}
                ${
                  tc.bdd
                    ? `
                  <div class="test-bdd">
                    ${tc.bdd.given ? `<div class="bdd-item"><span class="bdd-label">Given</span> ${escapeHtml(tc.bdd.given)}</div>` : ""}
                    ${tc.bdd.when ? `<div class="bdd-item"><span class="bdd-label">When</span> ${escapeHtml(tc.bdd.when)}</div>` : ""}
                    ${tc.bdd.then ? `<div class="bdd-item"><span class="bdd-label">Then</span> ${escapeHtml(tc.bdd.then)}</div>` : ""}
                  </div>
                `
                    : ""
                }
                <a href="${generateTestPageUrl(tc.file, tc.framework, 3)}" class="test-file-link">${escapeHtml(basename(tc.file))}:${tc.line}</a>
              </li>
            `
              )
              .join("")}
          </ul>
        </div>
      `;
    })
    .join("");

  return `
    <div class="section">
      <h3 class="section-title">テストカバレッジ</h3>
      <div class="coverage-score">
        <div class="score-bar">
          <div class="score-fill" style="width: ${analysis.coverageScore}%; background: ${scoreColor}"></div>
        </div>
        <span class="score-value">${analysis.coverageScore}%</span>
      </div>
      <div class="category-summary">${categorySummary}</div>
      ${
        analysis.missingPatterns.length > 0
          ? `
        <div class="missing-patterns">
          <strong>不足しているテスト:</strong>
          ${analysis.missingPatterns.map((p) => `<span class="missing-badge">${escapeHtml(p)}</span>`).join("")}
        </div>
      `
          : ""
      }
    </div>

    <div class="section">
      <h3 class="section-title">テストケース (${testCases.length}件)</h3>
      ${testListHTML}
    </div>
  `;
}

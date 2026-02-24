/**
 * lint-tests コマンド - テストドキュメントのlint
 *
 * Jest と Playwright のテストケースの @testdoc コメントをチェック
 */
import type { OutputFormat } from "../lint/types.js";
/**
 * コマンドオプション
 */
interface LintTestsOptions {
    project: string;
    config: string;
    format?: OutputFormat;
    output?: string;
    strict?: boolean;
    coverageThreshold?: number;
    ignore?: string[];
    verbose?: boolean;
}
/**
 * lint-tests コマンドハンドラ
 */
export declare function lintTestsCommand(options: LintTestsOptions): Promise<void>;
export {};
//# sourceMappingURL=lint-tests.d.ts.map
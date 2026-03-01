/**
 * show command - 番号指定による Issue/PR/Discussion 自動判別取得
 *
 * GraphQL の単一クエリで issue, pullRequest, discussion を同時にリクエストし、
 * レスポンスのどのフィールドにデータがあるかで種別を判別する。
 * 判別後は既存の内部関数に委任して同等の出力を得る。
 */
import { createLogger } from "../utils/logger.js";
import { runGraphQL, isIssueNumber, parseIssueNumber, } from "../utils/github.js";
import { resolveTargetRepo, validateCrossRepoAlias, } from "../utils/repo-pairs.js";
import { cmdIssueShow } from "./issues.js";
import { cmdPrShow } from "./issues-pr.js";
import { cmdDiscussionShow } from "./discussions.js";
// =============================================================================
// GraphQL
// =============================================================================
/**
 * 3 種別同時チェッククエリ。
 * 存在しない種別は null が返り、errors 配列に NOT_FOUND が含まれる場合がある。
 */
const GRAPHQL_QUERY_DETECT_TYPE = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      number
      title
    }
    pullRequest(number: $number) {
      number
      title
    }
    discussion(number: $number) {
      number
      title
    }
  }
}
`;
/**
 * GraphQL レスポンスから種別を判別する。
 * 優先順: PR > Issue > Discussion
 *
 * - Issue と PR は同一番号空間（GitHub 上では排他的だが、GraphQL では両方返る場合に備える）
 * - Discussion は別番号空間のため、Issue/PR がある場合はそちらを優先
 * - DetectResult.type は短縮形（"pr"）を使用。DetectInput のキー名（"pullRequest"）とは異なる
 */
export function detectItemType(input) {
    const { issue, pullRequest, discussion } = input;
    const hasIssue = issue != null;
    const hasPR = pullRequest != null;
    const hasDiscussion = discussion != null;
    // 何も見つからない
    if (!hasIssue && !hasPR && !hasDiscussion) {
        return null;
    }
    // PR を最優先（Issue/PR 同一番号空間で PR が正確）
    if (hasPR) {
        const result = { type: "pr", data: pullRequest };
        if (hasDiscussion) {
            result.ambiguous = { type: "discussion", data: discussion };
        }
        return result;
    }
    // Issue
    if (hasIssue) {
        const result = { type: "issue", data: issue };
        if (hasDiscussion) {
            result.ambiguous = { type: "discussion", data: discussion };
        }
        return result;
    }
    // Discussion のみ
    return { type: "discussion", data: discussion };
}
export async function showCommand(numberStr, options) {
    const logger = createLogger(options.verbose);
    // --repo alias 検証
    if (options.repo) {
        const aliasError = validateCrossRepoAlias(options.repo);
        if (aliasError) {
            logger.error(aliasError);
            process.exit(1);
        }
    }
    if (!numberStr) {
        logger.error("Number required");
        logger.info("Usage: shirokuma-docs show <number>");
        process.exit(1);
    }
    if (!isIssueNumber(numberStr)) {
        logger.error(`Invalid number: ${numberStr}`);
        process.exit(1);
    }
    const repoInfo = resolveTargetRepo(options);
    if (!repoInfo) {
        logger.error("Could not determine repository");
        process.exit(1);
    }
    const { owner, name: repo } = repoInfo;
    const number = parseIssueNumber(numberStr);
    // 3 種別同時チェック（部分エラーは想定内）
    const result = await runGraphQL(GRAPHQL_QUERY_DETECT_TYPE, {
        owner,
        name: repo,
        number,
    }, { silent: true });
    if (!result.success) {
        logger.error(`Failed to query #${number}: ${result.error}`);
        process.exit(1);
    }
    const repoData = result.data?.data?.repository;
    const detected = detectItemType({
        issue: repoData?.issue ?? null,
        pullRequest: repoData?.pullRequest ?? null,
        discussion: repoData?.discussion ?? null,
    });
    if (!detected) {
        logger.error(`#${number} not found (checked Issue, PR, Discussion)`);
        process.exit(1);
    }
    // verbose 時に重複検出を報告
    if (options.verbose && detected.ambiguous) {
        logger.info(`Note: #${number} found as both ${detected.type} and ${detected.ambiguous.type}. Showing ${detected.type}.`);
    }
    // 既存コマンドに委任（オプションを構造的部分型で渡す）
    let exitCode = 0;
    const delegateOptions = {
        verbose: options.verbose,
        format: options.format,
        public: options.public,
        repo: options.repo,
    };
    switch (detected.type) {
        case "issue":
            exitCode = await cmdIssueShow(String(number), delegateOptions, logger);
            break;
        case "pr":
            exitCode = await cmdPrShow(String(number), delegateOptions, logger);
            break;
        case "discussion":
            exitCode = await cmdDiscussionShow(String(number), delegateOptions, logger);
            break;
    }
    if (exitCode !== 0) {
        process.exit(exitCode);
    }
}
//# sourceMappingURL=show.js.map
/**
 * session command - Unified session management
 *
 * Subcommands:
 * - start: Fetch session context (latest handover + active issues with project fields)
 * - end: Save handover discussion + update issue statuses
 * - check: Detect inconsistencies between Issue state and Project Status
 *
 * Design:
 * - Combines multiple API calls into a single command
 * - Excludes Done/Released items by default
 * - Used internally by starting-session / ending-session skills
 */
import { Logger } from "../utils/logger.js";
import { type MetricsConfig } from "../utils/gh-config.js";
import { OutputFormat } from "../utils/formatters.js";
export interface SessionOptions {
    owner?: string;
    verbose?: boolean;
    format?: OutputFormat;
    user?: string;
    all?: boolean;
    team?: boolean;
    title?: string;
    bodyFile?: string;
    done?: string[];
    review?: string[];
    fix?: boolean;
    setup?: boolean;
}
/** Statuses to exclude from session start results */
export declare const DEFAULT_EXCLUDE_STATUSES: string[];
/** Git repository state for session start */
export interface GitState {
    currentBranch: string | null;
    uncommittedChanges: string[];
    hasUncommittedChanges: boolean;
}
/** Extended git state for session preflight */
export interface PreflightGitState {
    branch: string | null;
    baseBranch: string | null;
    isFeatureBranch: boolean;
    uncommittedChanges: string[];
    hasUncommittedChanges: boolean;
    unpushedCommits: number | null;
    recentCommits: Array<{
        hash: string;
        message: string;
    }>;
}
/** Flattened issue info for preflight (not TableJSON) */
export interface PreflightIssue {
    number: number;
    title: string;
    status: string | null;
    hasMergedPr: boolean;
    labels: string[];
    priority: string | null;
}
/** Flattened PR info for preflight */
export interface PreflightPr {
    number: number;
    title: string;
    reviewDecision: string | null;
}
/** Full preflight output structure */
export interface PreflightOutput {
    repository: string;
    git: PreflightGitState;
    issues: PreflightIssue[];
    prs: PreflightPr[];
    sessionBackups: number;
    warnings: string[];
}
type InconsistencySeverity = "error" | "info";
/** A single detected inconsistency between Issue state and Project Status */
export interface Inconsistency {
    number: number;
    title: string;
    url: string;
    issueState: string;
    projectStatus: string | null;
    severity: InconsistencySeverity;
    description: string;
}
/** Result of fixing an inconsistency */
export interface FixResult {
    number: number;
    action: string;
    success: boolean;
    error?: string;
}
/** ワークフロー自動化チェック結果 (#250) */
export interface AutomationStatus {
    checked: boolean;
    workflows: Array<{
        name: string;
        enabled: boolean;
        recommended: boolean;
    }>;
    missing_recommended: string[];
}
/** Full check output structure */
export interface CheckOutput {
    repository: string;
    inconsistencies: Inconsistency[];
    fixes: FixResult[];
    automations?: AutomationStatus;
    summary: {
        total_checked: number;
        total_inconsistencies: number;
        errors: number;
        info: number;
        fixed: number;
        fix_failures: number;
    };
}
/**
 * Classify inconsistencies from a list of issues with project data.
 * Pure function - no API calls, fully testable.
 *
 * Detects two types of inconsistencies:
 * 1. OPEN issue with terminal status (Done/Released) → should be closed (error)
 * 2. CLOSED issue with work-started status (In Progress/Review/etc.) → status should be Done (error)
 * 3. CLOSED issue with pre-work status (Backlog/Icebox/etc.) → may be intentional (info)
 */
export declare function classifyInconsistencies(issues: IssueData[], doneStatuses?: string[]): Inconsistency[];
export interface IssueData {
    number: number;
    title: string;
    url: string;
    state: string;
    closedAt: string | null;
    labels: string[];
    assignees: string[];
    status: string | null;
    priority: string | null;
    size: string | null;
    projectItemId: string | null;
    projectId: string | null;
}
/**
 * Issue に紐づくマージ済み PR を検出する。
 *
 * 検出戦略:
 * 1. ブランチ名検索: 現在のブランチに対応する merged PR を探す
 * 2. Issue リンク逆引き: マージ済み PR の body から "Closes #N" 等を検索
 *
 * @returns マージ済み PR 番号。見つからない場合は null
 */
export declare function findMergedPrForIssue(owner: string, repo: string, issueNumber: number, logger: Logger): Promise<number | null>;
/**
 * Issue が CLOSED かどうかを REST API で確認する。
 * OPEN-only fetch で見つからない Issue 番号の判定に使用。
 * API 失敗時は false を返し、従来の warn 動作にフォールバック（安全側）。
 */
export declare function isIssueClosed(owner: string, repo: string, num: number): Promise<boolean>;
/**
 * Get current git repository state (branch + uncommitted changes).
 * Returns safe defaults if git commands fail.
 *
 * @returns ブランチ名と未コミット変更リスト。git 未使用時はデフォルト値を返す
 */
export declare function getGitState(logger?: Logger): Promise<GitState>;
/**
 * Get extended git state for session preflight.
 * Includes base branch detection, unpushed commit count, and recent commits.
 *
 * @returns 拡張 git 状態（ベースブランチ、未プッシュコミット数、最近のコミット含む）
 * @see getGitState 基本 git 状態の取得
 */
export declare function getPreflightGitState(logger?: Logger): Promise<PreflightGitState>;
/** Session backup metadata returned by getSessionBackups */
export interface SessionBackup {
    filename: string;
    timestamp: string;
    content: string;
}
/**
 * Check for PreCompact session backups in .claude/sessions/.
 * Returns backups sorted by timestamp (most recent first).
 */
export declare function getSessionBackups(): SessionBackup[];
/**
 * Remove all PreCompact session backups from .claude/sessions/.
 * Called after a successful handover to prevent stale backups.
 *
 * @returns Number of files cleaned up
 */
export declare function cleanupSessionBackups(): number;
/**
 * Generate preflight warnings from git state and backup count.
 * Pure function - no API calls, fully testable.
 */
export declare function generatePreflightWarnings(git: PreflightGitState, sessionBackups: number): string[];
/** Group issues by assignee for team view */
export declare function groupIssuesByAssignee(issues: IssueData[]): Record<string, IssueData[]>;
/**
 * Classify metrics-related inconsistencies.
 * Pure function - no API calls, fully testable.
 *
 * Detects:
 * 1. Done/Released issues missing Completed At timestamp
 * 2. In Progress issues that are stale (In Progress At older than threshold)
 */
export declare function classifyMetricsInconsistencies(issues: IssueData[], textFieldValues: Record<string, Record<string, string>>, metricsConfig: MetricsConfig, now?: Date): Inconsistency[];
export declare function sessionCommand(action: string, options: SessionOptions): Promise<void>;
export {};
//# sourceMappingURL=session.d.ts.map
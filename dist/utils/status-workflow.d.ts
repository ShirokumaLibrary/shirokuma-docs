/**
 * Status workflow constants and transition validation
 *
 * Provides type-safe Status values and validates transitions
 * against the project-items.md workflow definition.
 */
/**
 * All valid Project Status values.
 * Matches project-items.md workflow definition.
 */
export declare const STATUS_VALUES: {
    readonly ICEBOX: "Icebox";
    readonly BACKLOG: "Backlog";
    readonly PLANNING: "Planning";
    readonly SPEC_REVIEW: "Spec Review";
    readonly IN_PROGRESS: "In Progress";
    readonly REVIEW: "Review";
    readonly TESTING: "Testing";
    readonly PENDING: "Pending";
    readonly DONE: "Done";
    readonly RELEASED: "Released";
    readonly NOT_PLANNED: "Not Planned";
};
export type StatusValue = (typeof STATUS_VALUES)[keyof typeof STATUS_VALUES];
/** Terminal statuses — items in these states are typically excluded from active views */
export declare const TERMINAL_STATUSES: readonly string[];
/** Statuses indicating work has started — CLOSED issues with these are inconsistent */
export declare const WORK_STARTED_STATUSES: readonly string[];
/**
 * Valid status transitions (adjacency list).
 * Derived from project-items.md workflow:
 *
 * Main flow: Icebox → Backlog → Planning → Spec Review → In Progress → Review → Testing → Done → Released
 * Pending: bidirectional with In Progress, Review, Backlog
 * Not Planned: set via issues cancel (close + status update)
 *
 * Backward transitions are allowed for corrections (e.g., Review → In Progress).
 */
export declare const STATUS_TRANSITIONS: Record<string, readonly string[]>;
export interface TransitionResult {
    valid: boolean;
    warning?: string;
}
/**
 * Validate a Status transition.
 * Returns { valid: true } for valid transitions or unknown statuses.
 * Returns { valid: false, warning } for non-standard transitions.
 *
 * Warning mode only — never blocks, just warns.
 *
 * @param from - Current status (null/undefined skips validation)
 * @param to - Target status
 */
export declare function validateStatusTransition(from: string | null | undefined, to: string): TransitionResult;
//# sourceMappingURL=status-workflow.d.ts.map
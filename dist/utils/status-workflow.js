/**
 * Status workflow constants and transition validation
 *
 * Provides type-safe Status values and validates transitions
 * against the project-items.md workflow definition.
 */
// =============================================================================
// Status Constants
// =============================================================================
/**
 * All valid Project Status values.
 * Matches project-items.md workflow definition.
 */
export const STATUS_VALUES = {
    ICEBOX: "Icebox",
    BACKLOG: "Backlog",
    PLANNING: "Planning",
    SPEC_REVIEW: "Spec Review",
    IN_PROGRESS: "In Progress",
    REVIEW: "Review",
    TESTING: "Testing",
    PENDING: "Pending",
    DONE: "Done",
    RELEASED: "Released",
    NOT_PLANNED: "Not Planned",
};
/** Terminal statuses — items in these states are typically excluded from active views */
export const TERMINAL_STATUSES = [STATUS_VALUES.DONE, STATUS_VALUES.RELEASED, STATUS_VALUES.NOT_PLANNED];
/** Statuses indicating work has started — CLOSED issues with these are inconsistent */
export const WORK_STARTED_STATUSES = [
    STATUS_VALUES.IN_PROGRESS,
    STATUS_VALUES.REVIEW,
    STATUS_VALUES.PENDING,
    STATUS_VALUES.TESTING,
];
// =============================================================================
// Status Transitions
// =============================================================================
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
export const STATUS_TRANSITIONS = {
    [STATUS_VALUES.ICEBOX]: [STATUS_VALUES.BACKLOG, STATUS_VALUES.NOT_PLANNED],
    [STATUS_VALUES.BACKLOG]: [STATUS_VALUES.PLANNING, STATUS_VALUES.SPEC_REVIEW, STATUS_VALUES.IN_PROGRESS, STATUS_VALUES.ICEBOX, STATUS_VALUES.NOT_PLANNED],
    [STATUS_VALUES.PLANNING]: [STATUS_VALUES.SPEC_REVIEW, STATUS_VALUES.BACKLOG, STATUS_VALUES.NOT_PLANNED],
    [STATUS_VALUES.SPEC_REVIEW]: [STATUS_VALUES.IN_PROGRESS, STATUS_VALUES.BACKLOG, STATUS_VALUES.NOT_PLANNED],
    [STATUS_VALUES.IN_PROGRESS]: [
        STATUS_VALUES.REVIEW,
        STATUS_VALUES.TESTING,
        STATUS_VALUES.DONE,
        STATUS_VALUES.PENDING,
        STATUS_VALUES.NOT_PLANNED,
    ],
    [STATUS_VALUES.PENDING]: [
        STATUS_VALUES.IN_PROGRESS,
        STATUS_VALUES.REVIEW,
        STATUS_VALUES.BACKLOG,
        STATUS_VALUES.NOT_PLANNED,
    ],
    [STATUS_VALUES.REVIEW]: [
        STATUS_VALUES.TESTING,
        STATUS_VALUES.DONE,
        STATUS_VALUES.IN_PROGRESS,
        STATUS_VALUES.NOT_PLANNED,
    ],
    [STATUS_VALUES.TESTING]: [
        STATUS_VALUES.DONE,
        STATUS_VALUES.REVIEW,
        STATUS_VALUES.IN_PROGRESS,
        STATUS_VALUES.NOT_PLANNED,
    ],
    [STATUS_VALUES.DONE]: [STATUS_VALUES.RELEASED],
    [STATUS_VALUES.RELEASED]: [],
    [STATUS_VALUES.NOT_PLANNED]: [STATUS_VALUES.BACKLOG],
};
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
export function validateStatusTransition(from, to) {
    // Skip validation if current status is unknown
    if (!from)
        return { valid: true };
    const allowed = STATUS_TRANSITIONS[from];
    // Unknown current status — skip validation
    if (!allowed)
        return { valid: true };
    if (allowed.includes(to))
        return { valid: true };
    const expectedList = allowed.length > 0 ? allowed.join(", ") : "(terminal status)";
    return {
        valid: false,
        warning: `Status transition "${from}" → "${to}" is not standard. Expected: ${expectedList}`,
    };
}
//# sourceMappingURL=status-workflow.js.map
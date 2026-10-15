/** Workflow milestones, not a measurement of data completeness or technical quality. */
export const stageProgress = (status: string) =>
  ({ approved: 100, ready_for_review: 75, in_progress: 50 }[status] ?? 0);
export const workflowProgress = (rows: { status: string }[]) =>
  Math.round(rows.reduce((sum, row) => sum + stageProgress(row.status), 0) / 8 * 100) / 100;

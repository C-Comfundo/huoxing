export interface IssueSelectionInput {
  id: string;
  sortOrder: number;
  publishedAt: string | null;
  createdAt?: string | null;
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return Number.NaN;
  }

  return new Date(value).getTime();
}

function getIssueTimelineTimestamp(issue: Pick<IssueSelectionInput, "publishedAt" | "createdAt">) {
  const publishedAt = toTimestamp(issue.publishedAt);
  if (!Number.isNaN(publishedAt)) {
    return publishedAt;
  }

  return toTimestamp(issue.createdAt);
}

export function isIssuePublished(
  issue: Pick<IssueSelectionInput, "publishedAt">,
  nowMs = Date.now()
) {
  const publishedAt = toTimestamp(issue.publishedAt);
  return !Number.isNaN(publishedAt) && publishedAt <= nowMs;
}

export function sortIssuesNewestFirst<
  T extends Pick<IssueSelectionInput, "sortOrder" | "publishedAt" | "createdAt">
>(left: T, right: T) {
  if (left.sortOrder !== right.sortOrder) {
    return right.sortOrder - left.sortOrder;
  }

  const leftTime = getIssueTimelineTimestamp(left);
  const rightTime = getIssueTimelineTimestamp(right);

  if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
    return 0;
  }

  if (Number.isNaN(leftTime)) {
    return 1;
  }

  if (Number.isNaN(rightTime)) {
    return -1;
  }

  return rightTime - leftTime;
}

export function getLatestIssue<T extends IssueSelectionInput>(issues: readonly T[]) {
  if (issues.length === 0) {
    return null;
  }

  return [...issues].sort(sortIssuesNewestFirst)[0] ?? null;
}

export function getLatestPublishedIssue<T extends IssueSelectionInput>(
  issues: readonly T[],
  nowMs = Date.now()
) {
  return getLatestIssue(issues.filter((issue) => isIssuePublished(issue, nowMs)));
}

export function getCurrentOrLatestIssue<T extends IssueSelectionInput>(
  issues: readonly T[],
  nowMs = Date.now()
) {
  return getLatestPublishedIssue(issues, nowMs) ?? getLatestIssue(issues);
}

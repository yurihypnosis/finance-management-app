/**
 * Stable category → color assignment for the `--cat-1`..`--cat-10` palette
 * (defined in style.css). Shared across screens (予算・支出・レポート…) so
 * the same category always reads as the same color everywhere.
 *
 * Assignment is by position in the category's defining list (e.g.
 * `budgetCategories`), not a hash of `id` — categories are appended, never
 * reordered, so index-based assignment is already stable across renders and
 * across screens as long as callers pass the same index for the same
 * category. `id` is accepted (rather than deriving the color purely from
 * `index`) so call sites read clearly and so a future hash-based scheme can
 * replace the body without changing any call site.
 */
export function categoryColor(_id: string, index: number): string {
  return `var(--cat-${(index % 10) + 1})`;
}

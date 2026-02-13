/**
 * Search functionality for documentation portal
 */

export interface SearchItem {
  id: string;
  title: string;
  description: string;
  category: "screen" | "component" | "action" | "table" | "test" | "db";
  module?: string;
  path: string;
  keywords: string[];
}

export interface SearchIndex {
  items: SearchItem[];
  generatedAt: string;
}

/**
 * Simple fuzzy search scoring
 * Returns a score (higher = better match), or 0 for no match
 */
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Exact match gets highest score
  if (t === q) return 100;

  // Contains exact query
  if (t.includes(q)) {
    // Bonus for starting with query
    if (t.startsWith(q)) return 90;
    return 70;
  }

  // Check if all characters in query appear in order
  let qIdx = 0;
  let score = 0;
  let consecutiveBonus = 0;
  let lastMatchIdx = -2;

  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      score += 10;
      // Bonus for consecutive matches
      if (i === lastMatchIdx + 1) {
        consecutiveBonus += 5;
      }
      lastMatchIdx = i;
      qIdx++;
    }
  }

  // All query characters found in order
  if (qIdx === q.length) {
    return score + consecutiveBonus;
  }

  return 0;
}

/**
 * Search through items and return ranked results
 */
export function searchItems(
  index: SearchIndex,
  query: string,
  limit: number = 20
): SearchItem[] {
  if (!query.trim()) return [];

  const q = query.trim().toLowerCase();

  // Score each item
  const scored = index.items
    .map((item) => {
      // Score title (highest weight)
      let score = fuzzyScore(q, item.title) * 3;

      // Score description
      score += fuzzyScore(q, item.description) * 1.5;

      // Score module name
      if (item.module) {
        score += fuzzyScore(q, item.module) * 2;
      }

      // Score keywords
      for (const keyword of item.keywords) {
        score += fuzzyScore(q, keyword);
      }

      // Category boost for exact match
      if (item.category.toLowerCase().includes(q)) {
        score += 20;
      }

      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((x) => x.item);
}

/**
 * Get category display info
 */
export function getCategoryInfo(category: SearchItem["category"]): {
  label: string;
  color: string;
  bgColor: string;
} {
  const info: Record<SearchItem["category"], { label: string; color: string; bgColor: string }> = {
    screen: { label: "画面", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
    component: { label: "コンポーネント", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
    action: { label: "アクション", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
    table: { label: "テーブル", color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
    test: { label: "テスト", color: "text-cyan-600", bgColor: "bg-cyan-100 dark:bg-cyan-900/30" },
    db: { label: "DB", color: "text-rose-600", bgColor: "bg-rose-100 dark:bg-rose-900/30" },
  };
  return info[category];
}

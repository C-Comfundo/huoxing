export interface ArticleCategoryDefinition {
  value: string;
  label: string;
  subtitle: string;
  path: string;
}

export const ARTICLE_CATEGORY_DEFINITIONS = [
  {
    value: "人间剧场",
    label: "人间剧场",
    subtitle: "小说",
    path: "/theater",
  },
  {
    value: "有话漫谈",
    label: "有话漫谈",
    subtitle: "随笔",
    path: "/slow-talk",
  },
  {
    value: "胡说八道",
    label: "胡说八道",
    subtitle: "杂谈",
    path: "/nonsense",
  },
  {
    value: "三行两句",
    label: "三行两句",
    subtitle: "诗歌",
    path: "/poems",
  },
  {
    value: "见字如面",
    label: "见字如面",
    subtitle: "书信",
    path: "/letters",
  },
  {
    value: "把话说尽",
    label: "把话说尽",
    subtitle: "论文",
    path: "/papers",
  },
] as const satisfies readonly ArticleCategoryDefinition[];

export const ARTICLE_CATEGORY_OPTIONS = ARTICLE_CATEGORY_DEFINITIONS.map(
  ({ value, label }) => ({
    value,
    label,
  })
);

export const ARTICLE_CATEGORY_PATHS = Object.fromEntries(
  ARTICLE_CATEGORY_DEFINITIONS.map(({ value, path }) => [value, path])
) as Record<string, string>;

export const ARTICLE_CATEGORY_HEADINGS = Object.fromEntries(
  ARTICLE_CATEGORY_DEFINITIONS.map(({ value, label, subtitle }) => [
    value,
    { title: label, subtitle },
  ])
) as Record<string, { title: string; subtitle?: string }>;

export function normalizeArticleCategory(category: string): string {
  if (category === "有话慢谈") {
    return "有话漫谈";
  }

  return category;
}

export function getArticleCategoryAliases(category: string) {
  const normalized = normalizeArticleCategory(category);

  if (normalized === "有话漫谈") {
    return ["有话漫谈", "有话慢谈"];
  }

  return [normalized];
}

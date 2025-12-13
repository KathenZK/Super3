import { supabaseAdmin } from "./supabaseAdmin";

export type Lang = "en" | "zh" | "all";
export type Sort = "new" | "hot";

export type StoryListItem = {
  id: string;
  lang: "en" | "zh";
  title: string;
  first_seen_at: string;
  last_seen_at: string;
  source_count_24h?: number;
  hot_score_calc?: number;
  sources_preview: Array<{ name: string; url: string }>;
};

export type StoryDetail = {
  id: string;
  lang: "en" | "zh";
  title: string;
  first_seen_at: string;
  last_seen_at: string;
  sources: Array<{
    source_name: string;
    source_homepage: string;
    article_url: string;
    article_title: string;
    published_at: string | null;
  }>;
};

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

async function loadSourcesPreview(storyIds: string[]) {
  if (storyIds.length === 0) return new Map<string, Array<{ name: string; url: string }>>();
  const supabase = supabaseAdmin();

  type SourceJoin = { name: string; homepage_url: string | null; weight: number | null };
  type ArticleJoin = { url: string; published_at: string | null; sources: SourceJoin | null };
  type StoryArticleJoinRow = { story_id: string; articles: ArticleJoin | null };

  const { data, error } = await supabase
    .from("story_articles")
    .select(
      "story_id, articles:article_id(url, published_at, sources:source_id(name, homepage_url, weight))",
    )
    .in("story_id", storyIds);

  if (error) throw error;

  const out = new Map<string, Array<{ name: string; url: string }>>();
  for (const row of (data ?? []) as unknown as StoryArticleJoinRow[]) {
    const sid = row.story_id;
    const article = row.articles;
    const source = article?.sources;
    if (!sid || !source?.name || !article?.url) continue;
    const arr = out.get(sid) ?? [];
    arr.push({ name: source.name as string, url: article.url as string });
    out.set(sid, arr);
  }

  // Dedup and pick top 3 by occurrence order
  for (const [sid, arr] of out.entries()) {
    const seen = new Set<string>();
    const uniq: Array<{ name: string; url: string }> = [];
    for (const it of arr) {
      if (seen.has(it.name)) continue;
      seen.add(it.name);
      uniq.push(it);
      if (uniq.length >= 3) break;
    }
    out.set(sid, uniq);
  }

  return out;
}

export async function listStories(args: {
  sort: Sort;
  lang: Lang;
  limit: number;
  offset: number;
}): Promise<StoryListItem[]> {
  const supabase = supabaseAdmin();
  const limit = Math.min(Math.max(args.limit, 1), 100);
  const offset = Math.max(args.offset, 0);

  const langFilter = args.lang === "all" ? null : args.lang;

  const newWindowStart = isoHoursAgo(24 * 7);
  const hotWindowStart = isoHoursAgo(24);

  type NewRow = {
    id: string;
    lang: "en" | "zh";
    title: string;
    first_seen_at: string;
    last_seen_at: string;
  };
  type HotRow = NewRow & { source_count_24h: number; hot_score_calc: number };

  let rows: Array<NewRow | HotRow> = [];
  if (args.sort === "hot") {
    let q = supabase
      .from("stories_feed_hot_24h")
      .select("id,lang,title,first_seen_at,last_seen_at,source_count_24h,hot_score_calc")
      .gte("last_seen_at", hotWindowStart)
      .order("hot_score_calc", { ascending: false })
      .range(offset, offset + limit - 1);
    if (langFilter) q = q.eq("lang", langFilter);
    const { data, error } = await q;
    if (error) throw error;
    rows = (data ?? []) as HotRow[];
  } else {
    let q = supabase
      .from("stories")
      .select("id,lang,title,first_seen_at,last_seen_at")
      .gte("last_seen_at", newWindowStart)
      .order("last_seen_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (langFilter) q = q.eq("lang", langFilter);
    const { data, error } = await q;
    if (error) throw error;
    rows = (data ?? []) as NewRow[];
  }

  const storyIds = rows.map((r) => r.id);
  const previews = await loadSourcesPreview(storyIds);

  return rows.map((r) => ({
    id: r.id,
    lang: r.lang,
    title: r.title,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    source_count_24h: "source_count_24h" in r ? r.source_count_24h : undefined,
    hot_score_calc: "hot_score_calc" in r ? r.hot_score_calc : undefined,
    sources_preview: previews.get(r.id) ?? [],
  }));
}

export async function getStoryDetail(storyId: string): Promise<StoryDetail | null> {
  const supabase = supabaseAdmin();
  const { data: story, error: stErr } = await supabase
    .from("stories")
    .select("id,lang,title,first_seen_at,last_seen_at")
    .eq("id", storyId)
    .maybeSingle();
  if (stErr) throw stErr;
  if (!story) return null;

  type SourceJoin = { name: string; homepage_url: string | null; weight: number | null };
  type ArticleJoin = {
    url: string;
    title: string;
    published_at: string | null;
    sources: SourceJoin | null;
  };
  type StoryArticleJoinRow = { story_id: string; articles: ArticleJoin | null };

  const { data: rows, error: rowsErr } = await supabase
    .from("story_articles")
    .select(
      "story_id, articles:article_id(url,title,published_at, sources:source_id(name,homepage_url,weight))",
    )
    .eq("story_id", storyId);
  if (rowsErr) throw rowsErr;

  const sources =
    ((rows ?? []) as unknown as StoryArticleJoinRow[])
      .map((row) => {
        const a = row.articles;
        const s = a?.sources;
        if (!a?.url || !a?.title || !s?.name) return null;
        return {
          source_name: s.name,
          source_homepage: s.homepage_url ?? "",
          article_url: a.url,
          article_title: a.title,
          published_at: a.published_at ?? null,
        };
      })
      .filter(Boolean) as StoryDetail["sources"];

  sources.sort((x, y) => {
    const xt = x.published_at ? Date.parse(x.published_at) : 0;
    const yt = y.published_at ? Date.parse(y.published_at) : 0;
    return yt - xt;
  });

  return {
    id: story.id,
    lang: story.lang,
    title: story.title,
    first_seen_at: story.first_seen_at,
    last_seen_at: story.last_seen_at,
    sources,
  };
}

export async function searchStories(args: {
  q: string;
  lang: Lang;
  limit: number;
}): Promise<StoryListItem[]> {
  const supabase = supabaseAdmin();
  const q = args.q.trim();
  if (!q) return [];

  const limit = Math.min(Math.max(args.limit, 1), 50);
  const langFilter = args.lang === "all" ? null : args.lang;
  const windowStart = isoHoursAgo(24 * 30);

  let query = supabase
    .from("stories")
    .select("id,lang,title,first_seen_at,last_seen_at")
    .gte("last_seen_at", windowStart)
    .ilike("title", `%${q}%`)
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  if (langFilter) query = query.eq("lang", langFilter);

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];

  const storyIds = rows.map((r) => r.id);
  const previews = await loadSourcesPreview(storyIds);

  return rows.map((r) => ({
    id: r.id,
    lang: r.lang,
    title: r.title,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    sources_preview: previews.get(r.id) ?? [],
  }));
}



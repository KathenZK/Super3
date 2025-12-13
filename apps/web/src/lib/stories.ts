import { supabaseAdmin } from "./supabaseAdmin";

export type Lang = "en" | "zh" | "all";
export type Sort = "new" | "hot";

export type StoryListItem = {
  id: string;
  lang: "en" | "zh";
  title: string;
  excerpt?: string | null;
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
    excerpt: string | null;
  }>;
};

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

async function loadSourcesPreview(storyIds: string[]) {
  if (storyIds.length === 0) return new Map<string, Array<{ name: string; url: string }>>();
  const supabase = supabaseAdmin();

  // IMPORTANT:
  // Avoid PostgREST nested relationship syntax (e.g. sources:source_id(...))
  // because it depends on foreign key inference and schema cache; instead do
  // two-step queries and join in code for robustness.

  type StoryArticleRow = { story_id: string; article_id: string };
  const { data: saRows, error: saErr } = await supabase
    .from("story_articles")
    .select("story_id,article_id")
    .in("story_id", storyIds);
  if (saErr) throw saErr;

  const articleIds = Array.from(
    new Set((saRows ?? []).map((r) => (r as StoryArticleRow).article_id).filter(Boolean)),
  );
  if (articleIds.length === 0) return new Map<string, Array<{ name: string; url: string }>>();

  type ArticleRow = { id: string; url: string; source_id: string };
  const { data: articles, error: aErr } = await supabase
    .from("articles")
    .select("id,url,source_id")
    .in("id", articleIds);
  if (aErr) throw aErr;

  const sourceIds = Array.from(new Set((articles ?? []).map((a) => (a as ArticleRow).source_id)));
  type SourceRow = { id: string; name: string; homepage_url: string | null };
  const { data: sources, error: sErr } = await supabase
    .from("sources")
    .select("id,name,homepage_url")
    .in("id", sourceIds);
  if (sErr) throw sErr;

  const articleById = new Map<string, ArticleRow>(
    (articles ?? []).map((a) => [a.id, a as ArticleRow]),
  );
  const sourceById = new Map<string, SourceRow>((sources ?? []).map((s) => [s.id, s as SourceRow]));

  const out = new Map<string, Array<{ name: string; url: string }>>();
  for (const row of (saRows ?? []) as unknown as StoryArticleRow[]) {
    const sid = row.story_id;
    const art = articleById.get(row.article_id);
    if (!sid || !art?.url || !art?.source_id) continue;
    const src = sourceById.get(art.source_id);
    if (!src?.name) continue;
    const arr = out.get(sid) ?? [];
    arr.push({ name: src.name, url: art.url });
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

async function loadStoryExcerpts(storyIds: string[]) {
  const out = new Map<string, string | null>();
  if (storyIds.length === 0) return out;
  const supabase = supabaseAdmin();

  type StoryArticleRow = { story_id: string; article_id: string };
  const { data: saRows, error: saErr } = await supabase
    .from("story_articles")
    .select("story_id,article_id")
    .in("story_id", storyIds);
  if (saErr) throw saErr;

  const articleIds = Array.from(
    new Set((saRows ?? []).map((r) => (r as StoryArticleRow).article_id).filter(Boolean)),
  );
  if (articleIds.length === 0) return out;

  type ArticleRow = { id: string; excerpt: string | null; published_at: string | null };
  const { data: articles, error: aErr } = await supabase
    .from("articles")
    .select("id,excerpt,published_at")
    .in("id", articleIds);
  if (aErr) throw aErr;

  const articleById = new Map<string, ArticleRow>(
    (articles ?? []).map((a) => [a.id, a as ArticleRow]),
  );

  // Pick best excerpt per story: prefer non-empty excerpt, then latest published_at
  for (const row of (saRows ?? []) as unknown as StoryArticleRow[]) {
    const art = articleById.get(row.article_id);
    if (!art) continue;
    const ex = (art.excerpt ?? "").trim();
    if (!ex) continue;

    const cur = out.get(row.story_id);
    if (!cur) {
      out.set(row.story_id, ex);
      continue;
    }
    // keep existing; we don't have per-story ordering here, so first non-empty wins (stable enough for MVP)
  }

  for (const sid of storyIds) {
    if (!out.has(sid)) out.set(sid, null);
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
  const excerpts = await loadStoryExcerpts(storyIds);

  return rows.map((r) => ({
    id: r.id,
    lang: r.lang,
    title: r.title,
    excerpt: excerpts.get(r.id) ?? null,
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

  type StoryArticleRow = { story_id: string; article_id: string };
  const { data: saRows, error: saErr } = await supabase
    .from("story_articles")
    .select("story_id,article_id")
    .eq("story_id", storyId);
  if (saErr) throw saErr;

  const articleIds = Array.from(
    new Set((saRows ?? []).map((r) => (r as StoryArticleRow).article_id).filter(Boolean)),
  );
  if (articleIds.length === 0) {
    return {
      id: story.id,
      lang: story.lang,
      title: story.title,
      first_seen_at: story.first_seen_at,
      last_seen_at: story.last_seen_at,
      sources: [],
    };
  }

  type ArticleRow = {
    id: string;
    url: string;
    title: string;
    published_at: string | null;
    source_id: string;
    excerpt: string | null;
  };
  const { data: articles, error: aErr } = await supabase
    .from("articles")
    .select("id,url,title,published_at,source_id,excerpt")
    .in("id", articleIds);
  if (aErr) throw aErr;

  const sourceIds = Array.from(new Set((articles ?? []).map((a) => (a as ArticleRow).source_id)));
  type SourceRow = { id: string; name: string; homepage_url: string | null };
  const { data: sourcesRows, error: sErr } = await supabase
    .from("sources")
    .select("id,name,homepage_url")
    .in("id", sourceIds);
  if (sErr) throw sErr;

  const sourceById = new Map<string, SourceRow>(
    (sourcesRows ?? []).map((s) => [s.id, s as SourceRow]),
  );

  const sources = (articles ?? [])
    .map((a) => {
      const art = a as ArticleRow;
      const src = sourceById.get(art.source_id);
      if (!src?.name || !art.url || !art.title) return null;
      return {
        source_name: src.name,
        source_homepage: src.homepage_url ?? "",
        article_url: art.url,
        article_title: art.title,
        published_at: art.published_at ?? null,
        excerpt: art.excerpt ?? null,
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
  const excerpts = await loadStoryExcerpts(storyIds);

  return rows.map((r) => ({
    id: r.id,
    lang: r.lang,
    title: r.title,
    excerpt: excerpts.get(r.id) ?? null,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    sources_preview: previews.get(r.id) ?? [],
  }));
}



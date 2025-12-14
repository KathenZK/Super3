"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type FeedLang = "all" | "en" | "zh";
type FeedSort = "hot" | "new";

type StoryListItem = {
  id: string;
  lang: "en" | "zh" | "multi";
  title: string;
  excerpt?: string | null;
  first_seen_at: string;
  last_seen_at: string;
  sources_preview: Array<{ name: string; url: string }>;
};

function langLabel(lang: StoryListItem["lang"]) {
  return lang === "multi" ? "MIX" : lang.toUpperCase();
}

function fmt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function StoryFeed(props: {
  initialItems: StoryListItem[];
  sort: FeedSort;
  lang: FeedLang;
  pageSize?: number;
}) {
  const pageSize = Math.min(Math.max(props.pageSize ?? 30, 1), 100);

  const [items, setItems] = useState<StoryListItem[]>(props.initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(props.initialItems.length >= pageSize);

  const offsetRef = useRef<number>(props.initialItems.length);
  const loadingRef = useRef<boolean>(false);
  const hasMoreRef = useRef<boolean>(props.initialItems.length >= pageSize);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // If user changes sort/lang (full navigation), reset client state to match server payload.
  useEffect(() => {
    setItems(props.initialItems);
    setLoading(false);
    setError(null);
    setHasMore(props.initialItems.length >= pageSize);
    offsetRef.current = props.initialItems.length;
    loadingRef.current = false;
    hasMoreRef.current = props.initialItems.length >= pageSize;
  }, [props.initialItems, props.sort, props.lang, pageSize]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const key = useMemo(() => `${props.sort}::${props.lang}::${pageSize}`, [props.sort, props.lang, pageSize]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    if (!hasMoreRef.current) return;

    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        sort: props.sort,
        lang: props.lang,
        limit: String(pageSize),
        offset: String(offsetRef.current),
      });
      const res = await fetch(`/api/stories?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = (await res.json()) as { items?: StoryListItem[] };
      const next = json.items ?? [];

      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const dedup = next.filter((x) => !seen.has(x.id));
        return prev.concat(dedup);
      });

      offsetRef.current += next.length;
      if (next.length < pageSize) setHasMore(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [props.sort, props.lang, pageSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const ob = new IntersectionObserver(
      (entries) => {
        const ent = entries[0];
        if (!ent?.isIntersecting) return;
        void loadMore();
      },
      { root: null, rootMargin: "800px 0px", threshold: 0 },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [key, loadMore]);

  return (
    <div className="mt-6 space-y-3">
      {items.map((st) => (
        <Link
          key={st.id}
          href={`/story/${st.id}`}
          className="block rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-500">{langLabel(st.lang)}</div>
            <div className="text-xs text-zinc-500">{fmt(st.last_seen_at)}</div>
          </div>
          <div className="mt-2 text-sm font-medium text-zinc-900">{st.title}</div>
          {st.excerpt ? (
            <div className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-zinc-600">{st.excerpt}</div>
          ) : null}
          {st.sources_preview.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
              {st.sources_preview.map((s) => (
                <span key={s.name} className="rounded-full bg-zinc-100 px-2 py-1">
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </Link>
      ))}

      <div ref={sentinelRef} className="h-1" />

      {(loading || error || hasMore) && (
        <div className="py-4 text-center text-sm text-zinc-600">
          {error ? (
            <div className="space-x-3">
              <span>加载失败：{error}</span>
              <button
                type="button"
                onClick={() => void loadMore()}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-800 hover:border-zinc-300"
              >
                重试
              </button>
            </div>
          ) : loading ? (
            <span>加载中…</span>
          ) : hasMore ? (
            <button
              type="button"
              onClick={() => void loadMore()}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-800 hover:border-zinc-300"
            >
              加载更多
            </button>
          ) : (
            <span>没有更多了</span>
          )}
        </div>
      )}
    </div>
  );
}



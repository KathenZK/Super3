import Link from "next/link";
import { listStories, searchStories } from "@/lib/stories";
import { StoryFeed } from "./_components/StoryFeed";
import { StoryFilters } from "./_components/StoryFilters";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; lang?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const sort = (sp.sort ?? "new").toString() as "hot" | "new";
  const lang = (sp.lang ?? "all").toString() as "all" | "en" | "zh";
  const q = (sp.q ?? "").toString();

  const hasQuery = q.trim().length > 0;
  const items = hasQuery
    ? await searchStories({ q, lang, limit: 50 })
    : await listStories({ sort, lang, limit: 30, offset: 0 });

  function fmt(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold">Super3</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <StoryFilters key={`${sort}::${lang}::${q}`} sort={sort} lang={lang} q={q} />

        {hasQuery ? (
          <div className="mt-6">
            <div className="text-sm text-zinc-600">
              Results for &quot;{q.trim()}&quot; ({items.length})
            </div>
            <div className="mt-4 space-y-3">
              {items.map((st) => (
                <Link
                  key={st.id}
                  href={`/story/${st.id}`}
                  className="block rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-zinc-500">{st.lang.toUpperCase()}</div>
                    <div className="text-xs text-zinc-500">{fmt(st.last_seen_at)}</div>
                  </div>
                  <div className="mt-2 text-sm font-medium text-zinc-900">{st.title}</div>
                  {st.excerpt ? (
                    <div className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-zinc-600">
                      {st.excerpt}
                    </div>
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
            </div>
          </div>
        ) : (
          <StoryFeed initialItems={items} sort={sort} lang={lang} />
        )}
      </main>
    </div>
  );
}

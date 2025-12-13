import Link from "next/link";
import { searchStories } from "@/lib/stories";

function fmt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; lang?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").toString();
  const lang = (sp.lang ?? "all").toString() as "all" | "en" | "zh";

  const items = q ? await searchStories({ q, lang, limit: 50 }) : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← Back
        </Link>
      </div>

      <h1 className="mt-6 text-2xl font-semibold">Search</h1>
      <form action="/search" className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search keyword / project"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
        <select
          name="lang"
          defaultValue={lang}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="en">EN</option>
          <option value="zh">ZH</option>
        </select>
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Go
        </button>
      </form>

      <div className="mt-6 text-sm text-zinc-600">
        {q ? `Results for "${q}" (${items.length})` : "Enter a keyword to search stories."}
      </div>

      <div className="mt-6 space-y-3">
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
  );
}



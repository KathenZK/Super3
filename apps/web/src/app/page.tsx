import Link from "next/link";
import { listStories } from "@/lib/stories";
import { StoryFeed } from "./_components/StoryFeed";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; lang?: string }>;
}) {
  const sp = await searchParams;
  const sort = (sp.sort ?? "new").toString() as "hot" | "new";
  const lang = (sp.lang ?? "all").toString() as "all" | "en" | "zh";

  const items = await listStories({ sort, lang, limit: 30, offset: 0 });

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold">Super3</div>
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
              MVP
            </span>
          </div>
          <Link href="/search" className="text-sm text-zinc-700 hover:text-zinc-900">
            Search →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <form action="/" className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            <button
              name="sort"
              value="new"
              className={`rounded-lg px-3 py-2 text-sm ${
                sort === "new" ? "bg-zinc-900 text-white" : "bg-white text-zinc-800 border border-zinc-200"
              }`}
            >
              New
            </button>
            <button
              name="sort"
              value="hot"
              className={`rounded-lg px-3 py-2 text-sm ${
                sort === "hot" ? "bg-zinc-900 text-white" : "bg-white text-zinc-800 border border-zinc-200"
              }`}
            >
              Hot (24h)
            </button>
          </div>
          <select
            name="lang"
            defaultValue={lang}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="en">EN</option>
            <option value="zh">ZH</option>
          </select>
          <button className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-200">
            Apply
          </button>
        </form>

        <StoryFeed initialItems={items} sort={sort} lang={lang} />
      </main>
    </div>
  );
}

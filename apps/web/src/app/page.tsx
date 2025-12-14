import Link from "next/link";
import { listStories } from "@/lib/stories";
import { StoryFeed } from "./_components/StoryFeed";
import { StoryFilters } from "./_components/StoryFilters";

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
        <StoryFilters sort={sort} lang={lang} />

        <StoryFeed initialItems={items} sort={sort} lang={lang} />
      </main>
    </div>
  );
}

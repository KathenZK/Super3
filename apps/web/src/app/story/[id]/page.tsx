import Link from "next/link";
import { getStoryDetail } from "@/lib/stories";

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await getStoryDetail(id);
  if (!story) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← Back
        </Link>
        <h1 className="mt-6 text-xl font-semibold">Story not found</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← Back
        </Link>
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
          {story.lang.toUpperCase()}
        </span>
      </div>

      <h1 className="mt-6 text-2xl font-semibold leading-tight">{story.title}</h1>
      <div className="mt-3 text-sm text-zinc-600">
        First seen: {fmt(story.first_seen_at)} · Last update: {fmt(story.last_seen_at)} · Sources:{" "}
        {story.sources.length}
      </div>

      <div className="mt-8 space-y-3">
        {story.sources.map((s) => (
          <a
            key={s.article_url}
            href={s.article_url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-zinc-900">{s.source_name}</div>
              <div className="text-xs text-zinc-500">{fmt(s.published_at)}</div>
            </div>
            <div className="mt-2 text-sm text-zinc-700">{s.article_title}</div>
          </a>
        ))}
      </div>
    </div>
  );
}



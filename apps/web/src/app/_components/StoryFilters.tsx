"use client";

import { useRouter } from "next/navigation";

type FeedLang = "all" | "en" | "zh";
type FeedSort = "hot" | "new";

function homeUrl(args: { sort: FeedSort; lang: FeedLang }) {
  const qs = new URLSearchParams({ sort: args.sort, lang: args.lang });
  return `/?${qs.toString()}`;
}

export function StoryFilters(props: { sort: FeedSort; lang: FeedLang }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push(homeUrl({ sort: "new", lang: props.lang }))}
          className={`rounded-lg px-3 py-2 text-sm ${
            props.sort === "new"
              ? "bg-zinc-900 text-white"
              : "bg-white text-zinc-800 border border-zinc-200"
          }`}
        >
          New
        </button>
        <button
          type="button"
          onClick={() => router.push(homeUrl({ sort: "hot", lang: props.lang }))}
          className={`rounded-lg px-3 py-2 text-sm ${
            props.sort === "hot"
              ? "bg-zinc-900 text-white"
              : "bg-white text-zinc-800 border border-zinc-200"
          }`}
        >
          Hot (24h)
        </button>
      </div>

      <select
        name="lang"
        value={props.lang}
        onChange={(e) => router.push(homeUrl({ sort: props.sort, lang: e.target.value as FeedLang }))}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
      >
        <option value="all">All</option>
        <option value="en">EN</option>
        <option value="zh">ZH</option>
      </select>
    </div>
  );
}



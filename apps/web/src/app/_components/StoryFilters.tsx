"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FeedLang = "all" | "en" | "zh";
type FeedSort = "hot" | "new";

function homeUrl(args: { sort: FeedSort; lang: FeedLang; q?: string }) {
  const qs = new URLSearchParams({ sort: args.sort, lang: args.lang });
  const q = (args.q ?? "").trim();
  if (q) qs.set("q", q);
  return `/?${qs.toString()}`;
}

export function StoryFilters(props: { sort: FeedSort; lang: FeedLang; q?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(() => props.q ?? "");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {!props.q ? (
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
        ) : (
          <button
            type="button"
            onClick={() => router.push(homeUrl({ sort: props.sort, lang: props.lang }))}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 hover:border-zinc-300"
          >
            ← Back to feed
          </button>
        )}

        <select
          name="lang"
          value={props.lang}
          onChange={(e) => router.push(homeUrl({ sort: props.sort, lang: e.target.value as FeedLang, q: props.q }))}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="en">EN</option>
          <option value="zh">ZH</option>
        </select>
      </div>

      <form
        className="flex w-full gap-2 sm:w-auto"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(homeUrl({ sort: props.sort, lang: props.lang, q }));
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search keyword / project"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm sm:w-72"
        />
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Go
        </button>
      </form>
    </div>
  );
}



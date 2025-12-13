"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Application error</h1>
      <p className="mt-3 text-sm text-zinc-700">
        This is a server-side error. In most cases for this MVP, it is caused by missing Vercel
        environment variables or invalid Supabase credentials.
      </p>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800">
        <div className="font-medium">Checklist</div>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>
            In Vercel → Project → Settings → Environment Variables, set{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5">SUPABASE_URL</code> and{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            for the <b>Production</b> environment.
          </li>
          <li>
            After changing env vars, trigger a <b>Redeploy</b>.
          </li>
          <li>
            Check Vercel logs for the exact error message (search by digest).
          </li>
        </ul>
      </div>

      <div className="mt-6 text-sm text-zinc-700">
        <div>
          <span className="font-medium">Digest:</span> {error.digest ?? "—"}
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
          <Link href="/" className="rounded-lg border border-zinc-200 px-4 py-2 text-sm">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}



import RSSParser from "rss-parser";
import { createClient } from "@supabase/supabase-js";

const MERGE_WINDOW_HOURS = 48;
const HOT_WINDOW_HOURS = 24;
const MAX_STORY_CANDIDATES = 250;
const TITLE_SIM_THRESHOLD_EN = 0.78;
const TITLE_SIM_THRESHOLD_ZH = 0.72;

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function nowIso() {
  return new Date().toISOString();
}

function hoursAgoIso(hours) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchTextWithRetry(url, opts, retries = 2) {
  let lastErr = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutMs = 12000;
      const t = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { ...opts, signal: controller.signal });
      clearTimeout(t);
      if (res.ok) return await res.text();

      // Retry on typical transient responses
      const retryable = new Set([408, 429, 502, 503, 504]);
      if (!retryable.has(res.status) || i === retries) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      await sleep(800 * (i + 1));
    } catch (e) {
      lastErr = e;
      if (i === retries) break;
      await sleep(800 * (i + 1));
    }
  }
  throw lastErr ?? new Error("fetch failed");
}

function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    u.hash = "";
    // drop common tracking params
    const drop = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "utm_id",
      "utm_name",
      "utm_reader",
      "utm_viz_id",
      "utm_pubreferrer",
      "fbclid",
      "gclid",
      "mc_cid",
      "mc_eid",
      "ref",
      "referrer",
      "source",
    ]);
    for (const k of [...u.searchParams.keys()]) {
      if (drop.has(k)) u.searchParams.delete(k);
    }
    // normalize trailing slash
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    u.search = u.searchParams.toString() ? `?${u.searchParams.toString()}` : "";
    return u.toString();
  } catch {
    return raw;
  }
}

function stripPunct(s) {
  return s
    .replace(/[\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,\-.\/:;<=>?@[\\\]^_`{|}~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const EN_STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "at",
  "by",
  "from",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "it",
  "this",
  "that",
  "these",
  "those",
  "after",
  "before",
  "over",
  "under",
  "into",
  "about",
  "amid",
  "amidst",
  "via",
]);

function tokensEn(title) {
  const t = stripPunct(title.toLowerCase());
  const parts = t.split(" ").filter(Boolean);
  return parts.filter((w) => w.length >= 2 && !EN_STOP.has(w));
}

function tokensZh(title) {
  // Simple bigram tokenization over CJK+alnum (works reasonably for strict dedupe)
  const cleaned = title
    .replace(/\s+/g, "")
    .replace(/[^\p{Script=Han}a-zA-Z0-9]+/gu, "");
  const out = [];
  for (let i = 0; i < cleaned.length - 1; i++) out.push(cleaned.slice(i, i + 2));
  // also include full alnum runs (e.g. BTC, ETH, 2025)
  const alnums = cleaned.match(/[a-zA-Z0-9]{2,}/g) ?? [];
  return [...out, ...alnums];
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

async function discoverRssUrl(homepageUrl) {
  const html = await fetchTextWithRetry(
    homepageUrl,
    {
      redirect: "follow",
      headers: { "user-agent": "Super3MVP/1.0 (RSS discovery)" },
    },
    1,
  );
  const linkRe =
    /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const m = linkRe.exec(html);
  if (!m?.[1]) return null;
  try {
    return new URL(m[1], homepageUrl).toString();
  } catch {
    return null;
  }
}

async function fetchRssXml(rssUrl) {
  try {
    return await fetchTextWithRetry(
      rssUrl,
      {
        redirect: "follow",
        headers: { "user-agent": "Super3MVP/1.0 (RSS fetch)" },
      },
      2,
    );
  } catch (e) {
    const msg = e?.message ? String(e.message) : String(e);
    throw new Error(`RSS fetch failed: ${msg}`);
  }
}

function parseItemDate(item) {
  const d = item.isoDate || item.pubDate || item.published || item.date;
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

async function main() {
  const SUPABASE_URL = mustGetEnv("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const parser = new RSSParser({
    timeout: 20000,
    customFields: {
      item: [["content:encoded", "contentEncoded"]],
    },
  });

  const { data: sources, error: sourcesErr } = await supabase
    .from("sources")
    .select("id,name,homepage_url,rss_url,lang,weight,enabled")
    .eq("enabled", true)
    .order("weight", { ascending: false });

  if (sourcesErr) throw sourcesErr;
  console.log(`[${nowIso()}] sources=${sources.length}`);

  for (const source of sources) {
    const started = Date.now();
    try {
      let rssUrl = source.rss_url;
      if (!rssUrl) {
        rssUrl = await discoverRssUrl(source.homepage_url);
        if (rssUrl) {
          await supabase.from("sources").update({ rss_url: rssUrl }).eq("id", source.id);
        }
      }
      if (!rssUrl) {
        await supabase
          .from("sources")
          .update({ last_fetch_at: nowIso(), last_error: "No RSS/Atom link discovered" })
          .eq("id", source.id);
        console.log(`- ${source.name}: skip (no rss)`);
        continue;
      }

      const xml = await fetchRssXml(rssUrl);
      const feed = await parser.parseString(xml);
      const items = Array.isArray(feed.items) ? feed.items : [];
      let inserted = 0;

      // prefetch candidate stories (same lang, within 48h) once per source run
      const mergeWindowStart = hoursAgoIso(MERGE_WINDOW_HOURS);
      const { data: candidateStories, error: candErr } = await supabase
        .from("stories")
        .select("id,title,lang,first_seen_at,last_seen_at")
        .eq("lang", source.lang)
        .gte("last_seen_at", mergeWindowStart)
        .order("last_seen_at", { ascending: false })
        .limit(MAX_STORY_CANDIDATES);
      if (candErr) throw candErr;

      const candTokenCache = new Map();
      for (const st of candidateStories) {
        const toks =
          st.lang === "zh" ? tokensZh(st.title ?? "") : tokensEn(st.title ?? "");
        candTokenCache.set(st.id, toks);
      }

      for (const item of items.slice(0, 50)) {
        const link = item.link || item.guid;
        const title = (item.title || "").trim();
        if (!link || !title) continue;

        const url = link.toString();
        const canonical_url = normalizeUrl(url);
        const published_at = parseItemDate(item);
        const excerpt =
          (item.contentSnippet || item.summary || "").toString().slice(0, 500) || null;

        const { data: existing, error: exErr } = await supabase
          .from("articles")
          .select("id")
          .eq("canonical_url", canonical_url)
          .maybeSingle();
        if (exErr) throw exErr;
        if (existing?.id) continue;

        const { data: insertedArticle, error: insErr } = await supabase
          .from("articles")
          .insert({
            source_id: source.id,
            url,
            canonical_url,
            title,
            published_at,
            lang: source.lang,
            excerpt,
          })
          .select("id,title,lang,published_at")
          .single();
        if (insErr) throw insErr;

        const art = insertedArticle;
        inserted++;

        const artTokens = art.lang === "zh" ? tokensZh(art.title) : tokensEn(art.title);
        const threshold = art.lang === "zh" ? TITLE_SIM_THRESHOLD_ZH : TITLE_SIM_THRESHOLD_EN;

        let best = { storyId: null, score: 0 };
        for (const st of candidateStories) {
          const stTokens = candTokenCache.get(st.id) ?? [];
          const score = jaccard(artTokens, stTokens);
          if (score > best.score) best = { storyId: st.id, score };
        }

        let storyId = best.score >= threshold ? best.storyId : null;
        if (!storyId) {
          const fs = art.published_at ?? nowIso();
          const { data: newStory, error: stErr } = await supabase
            .from("stories")
            .insert({
              lang: art.lang,
              title: art.title,
              first_seen_at: fs,
              last_seen_at: fs,
            })
            .select("id,title,lang,first_seen_at,last_seen_at")
            .single();
          if (stErr) throw stErr;
          storyId = newStory.id;
          // add to in-memory candidates so later items can merge into it
          candidateStories.unshift(newStory);
          candTokenCache.set(newStory.id, artTokens);
        } else {
          // update story last_seen_at if this article is newer
          const latest = art.published_at ?? nowIso();
          await supabase
            .from("stories")
            .update({ last_seen_at: latest })
            .eq("id", storyId);
        }

        const { error: saErr } = await supabase
          .from("story_articles")
          .insert({ story_id: storyId, article_id: art.id });
        // ignore duplicate relationship
        if (saErr && !String(saErr.message || "").toLowerCase().includes("duplicate")) {
          throw saErr;
        }
      }

      await supabase
        .from("sources")
        .update({ last_fetch_at: nowIso(), last_error: null })
        .eq("id", source.id);

      // Recompute hot_score for stories updated in last 24h (cheap enough for MVP)
      const hotStart = hoursAgoIso(HOT_WINDOW_HOURS);
      const { data: hotStories, error: hsErr } = await supabase
        .from("stories_feed_hot_24h")
        .select("id,hot_score_calc,last_seen_at")
        .gte("last_seen_at", hotStart)
        .order("hot_score_calc", { ascending: false })
        .limit(500);
      if (hsErr) throw hsErr;

      // Batch update with small chunks
      const chunk = 100;
      for (let i = 0; i < hotStories.length; i += chunk) {
        const part = hotStories.slice(i, i + chunk);
        // Update one by one to avoid needing custom SQL
        for (const st of part) {
          await supabase.from("stories").update({ hot_score: st.hot_score_calc }).eq("id", st.id);
        }
      }

      const ms = Date.now() - started;
      console.log(`- ${source.name}: inserted=${inserted} (${ms}ms)`);
    } catch (e) {
      const msg = e?.message ? String(e.message) : String(e);
      await supabase
        .from("sources")
        .update({ last_fetch_at: nowIso(), last_error: msg.slice(0, 500) })
        .eq("id", source.id);
      console.log(`- ${source.name}: ERROR ${msg}`);
    }
  }

  console.log(`[${nowIso()}] done`);
}

await main();



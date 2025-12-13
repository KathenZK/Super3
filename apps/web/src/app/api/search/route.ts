import { NextResponse } from "next/server";
import { searchStories } from "@/lib/stories";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const lang = (searchParams.get("lang") ?? "all") as "en" | "zh" | "all";
  const limit = Number(searchParams.get("limit") ?? "30");

  if (!["en", "zh", "all"].includes(lang)) {
    return NextResponse.json({ error: "invalid lang" }, { status: 400 });
  }

  const items = await searchStories({ q, lang, limit });
  return NextResponse.json({ items });
}



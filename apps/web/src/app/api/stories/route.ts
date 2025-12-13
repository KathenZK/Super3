import { NextResponse } from "next/server";
import { listStories } from "@/lib/stories";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sort = (searchParams.get("sort") ?? "hot") as "hot" | "new";
  const lang = (searchParams.get("lang") ?? "all") as "en" | "zh" | "all";
  const limit = Number(searchParams.get("limit") ?? "30");
  const offset = Number(searchParams.get("offset") ?? "0");

  if (!["hot", "new"].includes(sort)) {
    return NextResponse.json({ error: "invalid sort" }, { status: 400 });
  }
  if (!["en", "zh", "all"].includes(lang)) {
    return NextResponse.json({ error: "invalid lang" }, { status: 400 });
  }

  const items = await listStories({ sort, lang, limit, offset });
  return NextResponse.json({ items });
}



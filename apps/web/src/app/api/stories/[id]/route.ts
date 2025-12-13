import { NextRequest, NextResponse } from "next/server";
import { getStoryDetail } from "@/lib/stories";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const story = await getStoryDetail(id);
  if (!story) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ story });
}



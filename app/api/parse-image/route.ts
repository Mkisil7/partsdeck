import { NextResponse } from "next/server";
import { parseImage } from "@/lib/anthropic";
import { enrichParsedParts, filterIgnoredParts } from "@/lib/master";
import { requireUser, jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedMedia = (typeof ALLOWED)[number];

export async function POST(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError("ANTHROPIC_API_KEY is not configured", 500);
  }

  let body: { image?: string; mediaType?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (!body.image) return jsonError("Missing 'image' (base64) field");

  // Strip a data URL prefix if present.
  const base64 = body.image.replace(/^data:[^;]+;base64,/, "");
  const mediaType: AllowedMedia = ALLOWED.includes(body.mediaType as AllowedMedia)
    ? (body.mediaType as AllowedMedia)
    : "image/jpeg";

  try {
    const parsed = await parseImage(base64, mediaType);
    parsed.parts = await enrichParsedParts(ctx.supabase, parsed.parts);
    parsed.parts = await filterIgnoredParts(ctx.supabase, parsed.parts);
    return NextResponse.json({ parsed });
  } catch (err) {
    console.error("parse-image failed", err);
    return jsonError(
      err instanceof Error ? err.message : "Failed to parse image",
      502,
    );
  }
}

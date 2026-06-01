import { NextResponse } from "next/server";
import { parseSpeech } from "@/lib/anthropic";
import { requireUser, jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { error: authError } = await requireUser();
  if (authError) return authError;

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError("ANTHROPIC_API_KEY is not configured", 500);
  }

  let body: { transcript?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const transcript = body.transcript?.trim();
  if (!transcript) return jsonError("Missing 'transcript' field");

  try {
    const parsed = await parseSpeech(transcript);
    return NextResponse.json({ parsed });
  } catch (err) {
    console.error("parse-speech failed", err);
    return jsonError(
      err instanceof Error ? err.message : "Failed to parse speech",
      502,
    );
  }
}

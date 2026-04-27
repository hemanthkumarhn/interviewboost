import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SaveResumeRequestBody = {
  resumeText?: string;
  jobDescription?: string;
};

export const runtime = "nodejs";

export async function GET() {
  const supabase = (await createSupabaseServerClient()) as any;
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("resumes")
    .select()
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Unable to load saved resume draft." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ draft: null });
  }

  const draftRow = data as unknown as {
    id: string;
    content: { resumeText?: string } | null;
    last_jd: string | null;
    updated_at: string;
  };
  const content = draftRow.content ?? null;

  return NextResponse.json({
    draft: {
      id: draftRow.id,
      resumeText: content?.resumeText ?? "",
      jobDescription: draftRow.last_jd ?? "",
      updatedAt: draftRow.updated_at
    }
  });
}

export async function POST(request: Request) {
  const supabase = (await createSupabaseServerClient()) as any;
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SaveResumeRequestBody;
  const resumeText = body.resumeText?.trim() ?? "";
  const jobDescription = body.jobDescription?.trim() ?? "";

  const savePayload = {
    title: "Primary Resume Draft",
    content: {
      resumeText
    },
    template_id: "modern",
    last_jd: jobDescription || null,
    is_primary: true
  };

  const { data: existingPrimary, error: selectError } = await supabase
    .from("resumes")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (selectError) {
    return NextResponse.json(
      { error: "Unable to inspect existing draft state." },
      { status: 500 }
    );
  }

  const { error } = existingPrimary
    ? await supabase
        .from("resumes")
        .update({
          ...savePayload
        })
        .eq("id", existingPrimary.id)
        .eq("user_id", user.id)
    : await supabase.from("resumes").insert({
        ...savePayload,
        user_id: user.id
      });

  if (error) {
    return NextResponse.json({ error: "Unable to save resume draft." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

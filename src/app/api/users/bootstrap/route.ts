import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = (await createSupabaseServerClient()) as any;
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const upsertPayload = {
    id: user.id,
    email: user.email ?? "",
    name: (user.user_metadata.full_name as string | undefined) ?? user.email ?? "User",
    avatar_url: (user.user_metadata.avatar_url as string | undefined) ?? null,
    plan: "free" as const,
    credits_left: 3
  };

  const { error } = await supabase.from("users").upsert(upsertPayload, {
    onConflict: "id",
    ignoreDuplicates: false
  });

  if (error) {
    return NextResponse.json(
      { error: "Unable to create user profile." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

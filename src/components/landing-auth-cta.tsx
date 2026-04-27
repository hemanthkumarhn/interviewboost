"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LandingAuthCtaProps = {
  compact?: boolean;
};

export function LandingAuthCta({ compact = false }: LandingAuthCtaProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      setUser(data.user ?? null);
      setIsLoading(false);
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleGoogleSignIn() {
    if (!supabase) {
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=/resume`;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo
      }
    });
  }

  if (isLoading) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-white/90 opacity-75"
      >
        Checking session...
      </button>
    );
  }

  if (user) {
    return (
      <Link
        href="/resume"
        className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-strong)]"
      >
        {compact ? "Dashboard" : "Open resume dashboard"}
      </Link>
    );
  }

  if (!supabase) {
    return (
      <Link
        href="/resume"
        className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-strong)]"
      >
        {compact ? "Open app" : "Open app"}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-strong)]"
    >
      {compact ? "Sign in" : "Sign in with Google"}
    </button>
  );
}

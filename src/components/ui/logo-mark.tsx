type LogoMarkProps = {
  compact?: boolean;
};

export function LogoMark({ compact = false }: LogoMarkProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-brand)] text-white shadow-[var(--shadow-soft)]">
        <span className="text-sm font-bold tracking-[0.18em]">IB</span>
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-accent)]" />
      </div>
      {!compact ? (
        <div>
          <p className="text-base font-semibold text-[var(--color-text)]">InterviewBoost</p>
          <p className="text-sm text-[var(--color-text-soft)]">Resume optimization for India</p>
        </div>
      ) : null}
    </div>
  );
}

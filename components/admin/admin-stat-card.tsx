type AdminStatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "accent" | "success" | "warning";
};

const toneClasses: Record<NonNullable<AdminStatCardProps["tone"]>, string> = {
  default: "border-slate-200 bg-white",
  accent: "border-[#615FFF]/15 bg-[#615FFF]/[0.06]",
  success: "border-emerald-200 bg-emerald-50",
  warning: "border-amber-200 bg-amber-50",
};

export default function AdminStatCard({
  label,
  value,
  hint,
  tone = "default",
}: AdminStatCardProps) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

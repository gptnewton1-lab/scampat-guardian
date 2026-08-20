import { ShieldCheck } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${className}`}>
      <span className="grid size-8 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/40">
        <ShieldCheck className="size-4 text-primary" />
      </span>
      <span className="text-base tracking-tight">
        Watch<span className="text-primary">man</span>
      </span>
    </span>
  );
}
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

import type { ScanStatus, ScanSignal } from "@/lib/detect";

export type ResultCardProps = {
  riskScore: number;
  status: ScanStatus | string;
  category: string;
  reason: string;
  confidence: number;
  signals: ScanSignal[];
};

const STATUS_META: Record<
  string,
  { label: string; text: string; ring: string; bar: string; Icon: typeof CheckCircle2 }
> = {
  safe: {
    label: "Safe",
    text: "text-success",
    ring: "ring-success/40 bg-success/10",
    bar: "bg-success",
    Icon: CheckCircle2,
  },
  warning: {
    label: "Warning",
    text: "text-warning",
    ring: "ring-warning/40 bg-warning/10",
    bar: "bg-warning",
    Icon: AlertTriangle,
  },
  dangerous: {
    label: "Dangerous",
    text: "text-danger",
    ring: "ring-danger/40 bg-danger/10",
    bar: "bg-danger",
    Icon: ShieldAlert,
  },
};

export function ResultCard(props: ResultCardProps) {
  const meta = STATUS_META[props.status] ?? STATUS_META["warning"]!;
  const { Icon } = meta;

  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`grid size-11 place-items-center rounded-xl ring-1 ${meta.ring}`}>
            <Icon className={`size-5 ${meta.text}`} />
          </span>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Status</p>
            <p className={`text-lg font-semibold ${meta.text}`}>{meta.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Risk score</p>
          <p className={`text-3xl font-semibold tabular-nums ${meta.text}`}>{props.riskScore}%</p>
        </div>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-700 ${meta.bar}`}
          style={{ width: `${props.riskScore}%` }}
        />
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-widest text-muted-foreground">Category</dt>
          <dd className="mt-1 font-medium">{props.category}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-widest text-muted-foreground">Confidence</dt>
          <dd className="mt-1 flex items-center gap-2 font-medium">
            <span className="tabular-nums">{props.confidence}%</span>
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${props.confidence}%` }}
              />
            </span>
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Why it was flagged</p>
        <p className="mt-1 text-sm leading-relaxed text-foreground/90">{props.reason}</p>
      </div>

      {props.signals.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Detected signals
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {props.signals.map((signal) => (
              <li
                key={signal.label}
                title={signal.detail}
                className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs"
              >
                {signal.label}
                <span className="ml-1.5 text-muted-foreground tabular-nums">+{signal.weight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
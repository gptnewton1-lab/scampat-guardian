import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  History,
  Link2Off,
  Lock,
  MessageSquareWarning,
  Smartphone,
  Sparkles,
} from "lucide-react";

import { Logo } from "@/components/Logo";
import { ResultCard } from "@/components/ResultCard";
import { Button } from "@/components/ui/button";
import { analyzeMessage, SAMPLE_MESSAGES } from "@/lib/detect";

const DEMO = analyzeMessage(SAMPLE_MESSAGES[0]!);

const FEATURES = [
  {
    icon: MessageSquareWarning,
    title: "OTP theft detection",
    body: "Flags any message asking you to send, share or confirm a one-time code or PIN — the single most common mobile money attack.",
  },
  {
    icon: Smartphone,
    title: "Mobile money aware",
    body: "Tuned for MTN MoMo, Orange Money, Airtel and Moov wording, including fake suspension and reactivation alerts.",
  },
  {
    icon: Link2Off,
    title: "Phishing link analysis",
    body: "Spots shortened URLs, look-alike domains and credential-harvesting calls to action hidden inside friendly text.",
  },
  {
    icon: Activity,
    title: "Scored, not guessed",
    body: "Every scan returns a weighted risk score, a category and a confidence level so you know how strong the verdict is.",
  },
  {
    icon: History,
    title: "Persistent history",
    body: "Each scan is stored against your account so you can revisit past verdicts from any device, any time.",
  },
  {
    icon: Lock,
    title: "Private by default",
    body: "Your scans are locked to your account with row-level security. Nobody else can read them.",
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Faro-Detect — Spot SMS scams before they cost you" },
      {
        name: "description",
        content:
          "Paste a suspicious SMS and get an instant risk score, scam category and plain-English explanation. Built for mobile money fraud in Cameroon and across Africa.",
      },
      { property: "og:title", content: "Faro-Detect — Spot SMS scams before they cost you" },
      {
        property: "og:description",
        content:
          "Instant risk scoring for suspicious SMS: OTP theft, fake mobile money alerts, phishing links and prize scams.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth" search={{ mode: "register" }}>
              Get started
            </Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-2 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              SMS fraud detection for mobile money users
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
              Know if that SMS is a <span className="text-gradient">scam</span> in one second.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Faro-Detect reads suspicious messages the way a fraud analyst would — checking for OTP
              requests, fake MoMo alerts, urgency pressure and phishing links — then tells you
              exactly why it is dangerous.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "register" }}>
                  Scan your first message
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">I already have an account</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                ["12", "detection rules"],
                ["6", "scam categories"],
                ["0", "data shared"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-2xl font-semibold text-primary tabular-nums">{value}</dt>
                  <dd className="text-xs text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="glass rounded-3xl p-4 sm:p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Live example</p>
            <p className="mt-2 rounded-xl border border-border bg-secondary/40 p-3 text-sm leading-relaxed">
              {SAMPLE_MESSAGES[0]}
            </p>
            <div className="mt-4">
              <ResultCard
                riskScore={DEMO.riskScore}
                status={DEMO.status}
                category={DEMO.category}
                reason={DEMO.reason}
                confidence={DEMO.confidence}
                signals={DEMO.signals}
              />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-16">
          <h2 className="text-3xl font-semibold sm:text-4xl">Built for the scams people actually get</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Not a generic spam filter. Every rule targets a real pattern used against mobile money
            and messaging users.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="glass rounded-2xl p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                  <Icon className="size-5 text-primary" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-24">
          <div className="glass flex flex-col items-start gap-6 rounded-3xl p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Stop guessing. Start verifying.
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Create a free account and keep a permanent record of every message you check.
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "register" }}>
                Create free account
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <Logo className="text-foreground" />
          <p>Faro-Detect — verify before you trust.</p>
        </div>
      </footer>
    </div>
  );
}

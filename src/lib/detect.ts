/**
 * Faro-Detect scam detection engine.
 *
 * Pure, dependency-free rule engine. Each rule contributes weight to a raw
 * score; the raw score is normalised to a 0-100 risk score. The dominant
 * matched category becomes the reported scam category.
 */

export type ScanStatus = "safe" | "warning" | "dangerous";

export type ScanSignal = {
  /** Short label shown as a chip in the UI. */
  label: string;
  /** Human readable explanation of what was found. */
  detail: string;
  /** How much this signal pushed the risk score up. */
  weight: number;
};

export type ScanResult = {
  riskScore: number;
  status: ScanStatus;
  category: string;
  reason: string;
  confidence: number;
  signals: ScanSignal[];
};

type Rule = {
  label: string;
  detail: string;
  weight: number;
  category: string;
  test: (text: string) => boolean;
};

const has = (patterns: RegExp[]) => (text: string) => patterns.some((p) => p.test(text));

const RULES: Rule[] = [
  {
    label: "OTP / PIN request",
    detail:
      "The message asks you to share a one-time code or PIN. No bank, telco or mobile money operator ever asks for these.",
    weight: 45,
    category: "OTP Theft",
    test: has([
      /\b(otp|o\.t\.p|one[-\s]?time (code|password|pin))\b/i,
      /\b(send|share|give|forward|confirm|enter|dial)\b[^.]{0,40}\b(code|pin|password|mot de passe)\b/i,
      /\bverify (your )?(pin|code|password)\b/i,
      /\bcode secret\b/i,
    ]),
  },
  {
    label: "Mobile money reference",
    detail:
      "The message references a mobile money service (MTN MoMo, Orange Money, Airtel Money) — a favourite cover story for scammers.",
    weight: 22,
    category: "Fake Mobile Money Alert",
    test: has([
      /\b(mtn|momo|mo\.?mo|orange money|om|airtel money|moov money|wave|mobile money)\b/i,
      /\b(cfa|xaf|fcfa|xof)\b/i,
    ]),
  },
  {
    label: "Account suspension threat",
    detail:
      "It threatens that your account will be blocked, suspended or deleted. Fear is used to stop you thinking clearly.",
    weight: 28,
    category: "Fake Mobile Money Alert",
    test: has([
      /\b(suspend(ed|ing)?|block(ed|ing)?|deactivat(ed|e)|desactiv|clos(ed|ure)|frozen|locked)\b/i,
      /\bcompte (bloqu|suspend)/i,
    ]),
  },
  {
    label: "Urgency pressure",
    detail:
      "Urgent wording pushes you to act before verifying. Legitimate services give you time.",
    weight: 18,
    category: "Social Engineering",
    test: has([
      /\b(urgent|immediately|right now|within \d+ (minutes|hours)|expire[sd]?|last chance|act now|asap|maintenant|urgence)\b/i,
      /!{2,}/,
    ]),
  },
  {
    label: "Prize or lottery claim",
    detail:
      "It claims you won money, a prize or a gift you never entered for. Classic advance-fee bait.",
    weight: 35,
    category: "Fake Prize / Lottery Scam",
    test: has([
      /\b(congratulation|felicitation|f[ée]licitations|you('ve| have) won|winner|gagn[ée]|prize|jackpot|lottery|reward|bonus gift)\b/i,
    ]),
  },
  {
    label: "Suspicious link",
    detail:
      "The message contains a link. Shortened or look-alike domains are used to capture credentials.",
    weight: 20,
    category: "Phishing Link",
    test: has([/https?:\/\/\S+/i, /\bwww\.\S+/i, /\b[a-z0-9-]+\.(xyz|top|click|link|info|ru|tk)\b/i]),
  },
  {
    label: "URL shortener",
    detail:
      "A shortened URL hides the real destination. Scammers use them to bypass suspicion.",
    weight: 25,
    category: "Phishing Link",
    test: has([
      /\b(bit\.ly|tinyurl|cutt\.ly|t\.co|is\.gd|rb\.gy|shorturl|goo\.gl|rebrand\.ly|bit\.do)\b/i,
    ]),
  },
  {
    label: "Credential harvesting",
    detail:
      "It asks you to log in, confirm identity or update details through a link instead of the official app.",
    weight: 24,
    category: "Phishing Link",
    test: has([
      /\b(login|log in|sign in|update your (details|account|information)|confirm your (identity|account)|click (here|below)|claim (your|the) (prize|reward)|verify your account)\b/i,
    ]),
  },
  {
    label: "Money transfer request",
    detail:
      "It asks you to send, transfer or refund money — often framed as a mistaken deposit.",
    weight: 26,
    category: "Advance Fee / Refund Scam",
    test: has([
      /\b(send|transfer|deposit|pay|refund|rembours|renvoy)\b[^.]{0,30}\b(money|amount|\d{3,}|cfa|xaf|fcfa)\b/i,
      /\bwrong number.{0,40}\b(send|return)\b/i,
    ]),
  },
  {
    label: "Impersonated authority",
    detail:
      "The sender claims to be customer service, an agent or an official body to borrow trust.",
    weight: 16,
    category: "Impersonation",
    test: has([
      /\b(customer (care|service)|support team|agent|helpdesk|service client|bank|police|government|admin)\b/i,
    ]),
  },
  {
    label: "Unsolicited phone number",
    detail: "It asks you to call or WhatsApp an unknown number to 'resolve' the issue.",
    weight: 12,
    category: "Social Engineering",
    test: has([/\b(call|whatsapp|dial|contact)\b[^.]{0,20}(\+?\d[\d\s-]{6,})/i]),
  },
  {
    label: "Secrecy request",
    detail: "It tells you not to tell anyone — a strong sign of manipulation.",
    weight: 20,
    category: "Social Engineering",
    test: has([/\b(do not (tell|share|inform)|keep (this|it) (secret|confidential)|don'?t tell)\b/i]),
  },
];

/** Maximum raw weight we treat as "certainly a scam". */
const SATURATION = 110;

export function analyzeMessage(rawMessage: string): ScanResult {
  const message = rawMessage.trim();

  if (!message) {
    return {
      riskScore: 0,
      status: "safe",
      category: "No Content",
      reason: "There was nothing to analyse. Paste the full SMS text and scan again.",
      confidence: 0,
      signals: [],
    };
  }

  const matched = RULES.filter((rule) => rule.test(message));
  const signals: ScanSignal[] = matched.map(({ label, detail, weight }) => ({
    label,
    detail,
    weight,
  }));

  // Combine weights, then add a small combo bonus: several independent
  // indicators together are far more meaningful than any single one.
  const rawWeight = matched.reduce((sum, rule) => sum + rule.weight, 0);
  const comboBonus = matched.length >= 3 ? (matched.length - 2) * 6 : 0;
  const riskScore = Math.min(100, Math.round(((rawWeight + comboBonus) / SATURATION) * 100));

  // The category with the highest accumulated weight wins.
  const categoryWeights = new Map<string, number>();
  for (const rule of matched) {
    categoryWeights.set(rule.category, (categoryWeights.get(rule.category) ?? 0) + rule.weight);
  }
  const category =
    [...categoryWeights.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    (riskScore === 0 ? "No Threat Detected" : "Unclassified");

  const status: ScanStatus = riskScore >= 70 ? "dangerous" : riskScore >= 35 ? "warning" : "safe";

  // Confidence rises with the number of corroborating signals and with how far
  // the score sits from the decision boundaries.
  const evidence = Math.min(1, matched.length / 4);
  const decisiveness = Math.min(1, Math.abs(riskScore - 50) / 50);
  const confidence = Math.round(
    matched.length === 0 ? 72 : 55 + evidence * 30 + decisiveness * 15,
  );

  return {
    riskScore,
    status,
    category,
    reason: buildReason(status, category, signals, message),
    confidence: Math.min(99, confidence),
    signals,
  };
}

function buildReason(
  status: ScanStatus,
  category: string,
  signals: ScanSignal[],
  message: string,
): string {
  if (signals.length === 0) {
    return "No known scam patterns were found in this message. It contains no links, no code or PIN requests, no urgency pressure and no payment demands. Stay alert anyway: verify anything unexpected through the official app or a number you already trust.";
  }

  const top = [...signals].sort((a, b) => b.weight - a.weight).slice(0, 3);
  const listed = top.map((s) => s.detail).join(" ");
  const count = signals.length;

  const verdict =
    status === "dangerous"
      ? `This message shows ${count} strong scam indicator${count > 1 ? "s" : ""} and matches the "${category}" pattern.`
      : status === "warning"
        ? `This message shows ${count} suspicious element${count > 1 ? "s" : ""} consistent with "${category}".`
        : `Only ${count} weak indicator${count > 1 ? "s were" : " was"} found, but it is worth noting.`;

  const advice =
    status === "dangerous"
      ? " Do not reply, do not click any link, and never share a code or PIN. Delete the message and report the sender to your operator."
      : status === "warning"
        ? " Do not act on it directly. Confirm through the official app or your operator's published customer-care line before doing anything."
        : " Treat it with normal caution and verify the sender if anything feels unexpected.";

  const lengthNote =
    message.length < 25 ? " Note: the message is very short, which limits how much can be assessed." : "";

  return `${verdict} ${listed}${advice}${lengthNote}`;
}

export const SAMPLE_MESSAGES = [
  "URGENT: Your MTN MoMo account has been suspended. Send OTP 123456 to reactivate immediately.",
  "Congratulations! You've won 5,000,000 CFA. Click here to claim your prize: http://bit.ly/fake-link",
  "Your Orange Money account will be blocked. Verify your PIN now.",
  "Hi mum, your parcel from DHL arrived at the depot. See you Saturday.",
];
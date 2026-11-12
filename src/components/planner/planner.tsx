"use client";

import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Input,
  LoadingLabel,
  SegmentedControl,
  Select,
  SkeletonCard,
  Textarea,
} from "@/components/ui";
import {
  CheckCircle,
  Info,
  Microphone,
  MicrophoneSlash,
} from "@/components/ui/icons";
import { COUNTRIES } from "@/lib/leads";
import {
  LANGUAGES,
  MAX_REQUEST,
  type ContactErrors,
  type Language,
  type PlanLine,
  type PricedPackage,
  type PricedPlan,
} from "@/lib/planner";
import {
  fill,
  LOCALE,
  PLANNER_COPY,
  type PlannerCopy,
} from "@/lib/planner-copy";
import { planHunt, sendPackage, type PlanError } from "@/lib/planner-actions";

// The hunter's side of the planner: describe the hunt (typed or spoken), see
// up to three priced packages, send the one they like to the outfitter.

type Props = { slug: string; outfitter: string; initialLanguage: Language };

type Stage =
  | { kind: "ask"; error?: PlanError }
  | { kind: "planning" }
  | { kind: "plan"; id: string; plan: PricedPlan }
  | { kind: "sent" };

// Speech recognition is in Chrome, Edge and Safari, under a prefix in some.
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult:
    | ((e: {
        results: ArrayLike<
          ArrayLike<{ transcript: string }> & { isFinal: boolean }
        >;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;
function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
const noSubscribe = () => () => {};

function money(amount: number, currency: string, language: Language) {
  try {
    return new Intl.NumberFormat(LOCALE[language], {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 ? 2 : 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

export function Planner({ slug, outfitter, initialLanguage }: Props) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const t = PLANNER_COPY[language];
  const name = { name: outfitter };
  const [request, setRequest] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "ask" });
  const [choosing, setChoosing] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const top = useRef<HTMLDivElement>(null);

  function scrollUp() {
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function plan(text = request) {
    setStage({ kind: "planning" });
    scrollUp();
    startTransition(async () => {
      const res = await planHunt(slug, language, text);
      setStage(
        res.ok
          ? { kind: "plan", id: res.id, plan: res.plan }
          : { kind: "ask", error: res.error },
      );
    });
  }

  return (
    <div ref={top} lang={language} className="flex scroll-mt-24 flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold tracking-wider text-olive uppercase">
            {t.eyebrow}
          </p>
          <h1 className="text-4xl sm:text-5xl">{fill(t.title, name)}</h1>
        </div>
        <SegmentedControl
          label="Language"
          hideLabel
          value={language}
          onValueChange={(v) => setLanguage(v as Language)}
          options={LANGUAGES.map((l) => ({ value: l, label: l.toUpperCase() }))}
        />
      </div>

      {stage.kind === "ask" && (
        <Ask
          t={t}
          language={language}
          outfitter={outfitter}
          request={request}
          setRequest={setRequest}
          error={stage.error}
          onPlan={plan}
        />
      )}

      {stage.kind === "planning" && (
        <div className="flex flex-col gap-6" aria-live="polite">
          <div className="flex flex-col gap-1">
            <LoadingLabel>{t.planning}</LoadingLabel>
            <p className="text-lg font-medium">{t.planning}</p>
            <p className="text-muted">{t.planningHint}</p>
          </div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {stage.kind === "plan" && (
        <Results
          t={t}
          language={language}
          outfitter={outfitter}
          plan={stage.plan}
          onChoose={setChoosing}
          onStartAgain={() => {
            setStage({ kind: "ask" });
            scrollUp();
          }}
        />
      )}

      {stage.kind === "sent" && (
        <Card>
          <div className="flex flex-col items-start gap-4">
            <CheckCircle className="size-10 text-success" />
            <h2 className="text-2xl">{fill(t.sentTitle, name)}</h2>
            <p className="text-muted">{fill(t.sentBody, name)}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setRequest("");
                setStage({ kind: "ask" });
              }}
            >
              {t.planAnother}
            </Button>
          </div>
        </Card>
      )}

      {stage.kind === "plan" && (
        <SendDialog
          key={choosing ?? -1}
          t={t}
          language={language}
          outfitter={outfitter}
          pkg={choosing === null ? null : stage.plan.packages[choosing]}
          onClose={() => setChoosing(null)}
          onSend={(form) => sendPackage(slug, stage.id, choosing ?? -1, form)}
          onSent={() => {
            setChoosing(null);
            setStage({ kind: "sent" });
            scrollUp();
          }}
        />
      )}
    </div>
  );
}

function Ask({
  t,
  language,
  outfitter,
  request,
  setRequest,
  error,
  onPlan,
}: {
  t: PlannerCopy;
  language: Language;
  outfitter: string;
  request: string;
  setRequest: (s: string) => void;
  error?: PlanError;
  onPlan: (text?: string) => void;
}) {
  const canSpeak = useSyncExternalStore(
    noSubscribe,
    () => recognitionCtor() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);

  function toggleSpeech() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = LOCALE[language];
    r.interimResults = false;
    r.continuous = true;
    const before = request.trim();
    let heard = "";
    r.onresult = (e) => {
      heard = Array.from(e.results)
        .filter((res) => res.isFinal)
        .map((res) => res[0].transcript)
        .join(" ");
      setRequest(
        [before, heard.trim()].filter(Boolean).join(" ").slice(0, MAX_REQUEST),
      );
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognition.current = r;
    setListening(true);
    r.start();
  }

  const message = error ? fill(t[error], { name: outfitter }) : undefined;

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        recognition.current?.stop();
        onPlan();
      }}
    >
      <p className="text-lg text-muted">{t.intro}</p>
      <Textarea
        label={t.label}
        name="request"
        rows={5}
        maxLength={MAX_REQUEST}
        placeholder={t.placeholder}
        value={request}
        onChange={(e) => setRequest(e.target.value)}
        error={
          error === "tooShort" || error === "tooLong" ? message : undefined
        }
        hint={t.privacy}
      />
      {message && error !== "tooShort" && error !== "tooLong" && (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-card border border-warning-tint bg-warning-tint px-6 py-4 text-warning"
        >
          <Info className="mt-1 size-5 shrink-0" />
          <span>{message}</span>
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" variant="cta">
          {t.submit}
        </Button>
        {canSpeak && (
          <Button
            type="button"
            variant="secondary"
            onClick={toggleSpeech}
            aria-pressed={listening}
          >
            {listening ? (
              <MicrophoneSlash className="size-5" />
            ) : (
              <Microphone className="size-5" />
            )}
            {listening ? t.stopSpeaking : t.speak}
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted">{t.examplesLabel}</p>
        <ul className="flex flex-col gap-3">
          {t.examples.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => setRequest(example)}
                className="w-full rounded-inner border border-line bg-card px-4 py-3 text-left transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] is-hover:border-olive"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-line bg-card p-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}

function Results({
  t,
  language,
  outfitter,
  plan,
  onChoose,
  onStartAgain,
}: {
  t: PlannerCopy;
  language: Language;
  outfitter: string;
  plan: PricedPlan;
  onChoose: (i: number) => void;
  onStartAgain: () => void;
}) {
  const m = (n: number) => money(n, plan.currency, language);
  return (
    <div className="flex flex-col gap-8">
      <Card title={t.understood}>
        <div className="flex flex-col gap-6">
          {plan.summary && <p>{plan.summary}</p>}
          {plan.packages.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Fact label={t.hunters} value={String(plan.trip.hunters)} />
              <Fact label={t.observers} value={String(plan.trip.observers)} />
              <Fact label={t.days} value={String(plan.trip.hunting_days)} />
              <Fact label={t.when} value={plan.trip.when ?? t.notSaid} />
              <Fact label={t.budget} value={plan.budgetText ?? t.notSaid} />
            </div>
          )}
          <div>
            <Button variant="secondary" size="sm" onClick={onStartAgain}>
              {t.startAgain}
            </Button>
          </div>
        </div>
      </Card>

      {plan.note && (
        <p className="flex items-start gap-3 rounded-card border border-line bg-sand-tint px-6 py-4 text-olive-dark">
          <Info className="mt-1 size-5 shrink-0" />
          <span>{plan.note}</span>
        </p>
      )}

      {plan.packages.length === 0 ? (
        <p className="text-muted">{t.noPackages}</p>
      ) : (
        plan.packages.map((p, i) => (
          <PackageCard
            key={i}
            t={t}
            pkg={p}
            plan={plan}
            money={m}
            onChoose={() => onChoose(i)}
          />
        ))
      )}

      <p className="text-sm text-muted">
        {fill(t.footnote, {
          name: outfitter,
          season: plan.season,
          currency: plan.currency,
        })}
      </p>
    </div>
  );
}

function Lines({
  title,
  lines,
  t,
  money,
}: {
  title: string;
  lines: PlanLine[];
  t: PlannerCopy;
  money: (n: number) => string;
}) {
  if (!lines.length) return null;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold tracking-wider text-muted uppercase">
        {title}
      </h3>
      <ul className="flex flex-col divide-y divide-line">
        {lines.map((l) => (
          <li
            key={l.id}
            className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-medium">{l.name}</span>
              {l.price_type === "fixed" &&
                (l.quantity > 1 || l.unit !== "per_item") && (
                  <span className="tabular text-sm text-muted">
                    {l.quantity > 1 ? `${l.quantity} × ` : ""}
                    {money(l.unit_price ?? 0)} {t.units[l.unit]}
                  </span>
                )}
            </div>
            <span className="tabular font-semibold whitespace-nowrap">
              {l.price_type === "fixed"
                ? money(l.total)
                : l.price_type === "cost_price"
                  ? t.atCost
                  : t.onRequest}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PackageCard({
  t,
  pkg,
  plan,
  money,
  onChoose,
}: {
  t: PlannerCopy;
  pkg: PricedPackage;
  plan: PricedPlan;
  money: (n: number) => string;
  onChoose: () => void;
}) {
  const over =
    plan.budget !== null && pkg.fitsBudget === false
      ? pkg.total - plan.budget
      : 0;
  return (
    <Card>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl">{pkg.title}</h2>
            {pkg.fitsBudget === true && <Badge tone="success">{t.fits}</Badge>}
            {pkg.fitsBudget === false && (
              <Badge tone="warning">
                {fill(t.over, { amount: money(over) })}
              </Badge>
            )}
          </div>
          {pkg.pitch && <p className="text-muted">{pkg.pitch}</p>}
        </div>

        <Lines title={t.ratesTitle} lines={pkg.rates} t={t} money={money} />
        <Lines
          title={t.trophiesTitle}
          lines={pkg.trophies}
          t={t}
          money={money}
        />

        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
          <span className="font-semibold">{t.total}</span>
          <span className="tabular text-3xl font-semibold">
            {money(pkg.total)}
          </span>
        </div>

        {pkg.wholeTrip && (
          <div className="flex flex-col gap-1 rounded-inner bg-sand-tint p-4">
            <span className="tabular font-medium text-olive-dark">
              {fill(t.wholeTrip, {
                low: money(pkg.wholeTrip.low),
                high: money(pkg.wholeTrip.high),
              })}
            </span>
            <span className="text-sm text-muted">{t.wholeTripHint}</span>
          </div>
        )}

        {pkg.itinerary.length > 0 && (
          <details className="group rounded-inner border border-line">
            <summary className="cursor-pointer list-none px-4 py-3 font-medium">
              {t.dayByDay}
            </summary>
            <ol className="flex flex-col gap-2 px-4 pb-4">
              {pkg.itinerary.map((day, i) => (
                <li key={i} className="flex gap-3">
                  <span className="tabular w-6 shrink-0 text-muted">
                    {i + 1}
                  </span>
                  <span>{day}</span>
                </li>
              ))}
            </ol>
          </details>
        )}

        <div>
          <Button variant="primary" onClick={onChoose}>
            {t.choose}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SendDialog({
  t,
  language,
  outfitter,
  pkg,
  onClose,
  onSend,
  onSent,
}: {
  t: PlannerCopy;
  language: Language;
  outfitter: string;
  pkg: PricedPackage | null;
  onClose: () => void;
  onSend: (
    form: FormData,
  ) => Promise<
    | { ok: true }
    | { ok: false; errors: ContactErrors; error?: "expired" | "failed" }
  >;
  onSent: () => void;
}) {
  const [errors, setErrors] = useState<ContactErrors>({});
  const [failure, setFailure] = useState<"expired" | "failed" | null>(null);
  const [pending, startTransition] = useTransition();
  const formId = "planner-send";
  const countries = useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([LOCALE[language]], { type: "region" });
    } catch {}
    return COUNTRIES.map((c) => ({
      value: c.code,
      label: names?.of(c.code) ?? c.name,
    })).sort((a, b) => a.label.localeCompare(b.label, LOCALE[language]));
  }, [language]);
  const p = t.problems;
  const name = { name: outfitter };

  return (
    <Dialog
      open={pkg !== null}
      onClose={onClose}
      title={fill(t.formTitle, name)}
      description={pkg ? `${pkg.title}. ${t.formIntro}` : t.formIntro}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="cta"
            loading={pending}
            loadingLabel={t.send}
          >
            {t.send}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await onSend(form);
            if (res.ok) return onSent();
            setErrors(res.errors);
            setFailure(res.error ?? null);
          });
        }}
      >
        <Input
          label={t.yourName}
          name="name"
          autoComplete="name"
          error={errors.name && p[errors.name]}
        />
        <Input
          label={t.email}
          name="email"
          type="email"
          autoComplete="email"
          error={errors.email && p[errors.email]}
        />
        <Select
          label={t.country}
          name="country"
          placeholder={t.chooseCountry}
          options={countries}
          autoComplete="country"
        />
        <Input
          label={t.phone}
          name="phone"
          type="tel"
          autoComplete="tel"
          error={errors.phone && p[errors.phone]}
        />
        <Checkbox label={fill(t.consent, name)} name="consent" />
        {(errors.form || failure) && (
          <p role="alert" className="text-error">
            {errors.form
              ? p[errors.form]
              : failure === "expired"
                ? t.expired
                : t.failed}
          </p>
        )}
      </form>
    </Dialog>
  );
}

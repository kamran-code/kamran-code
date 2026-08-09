import Link from "next/link";
import { SECTIONS } from "@/lib/esat";
import { getStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stats = await getStats();

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-12 text-white">
        <h1 className="max-w-2xl text-4xl font-bold leading-tight">
          Master the ESAT with a smart, AI-powered question engine.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-brand-50">
          Practice from a curated bank of exam-style questions, or generate
          brand-new ones on demand for any section, topic, and difficulty.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/generate"
            className="rounded-lg bg-white px-5 py-2.5 font-semibold text-brand-700 shadow hover:bg-brand-50"
          >
            Add content →
          </Link>
          <Link
            href="/practice"
            className="rounded-lg border border-white/40 px-5 py-2.5 font-semibold text-white hover:bg-white/10"
          >
            Browse the bank
          </Link>
          <Link
            href="/quiz"
            className="rounded-lg border border-white/40 px-5 py-2.5 font-semibold text-white hover:bg-white/10"
          >
            Start a quiz
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total questions" value={stats.total} />
        <StatCard label="AI-generated" value={stats.aiCount} />
        <StatCard label="Subject sections" value={SECTIONS.length} />
      </section>

      {/* Sections */}
      <section>
        <h2 className="mb-4 text-2xl font-bold text-slate-900">
          Explore by section
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={`/practice?section=${s.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.color}`}
                >
                  {s.name}
                </span>
                <span className="text-sm text-slate-400">
                  {stats.bySection[s.id] ?? 0} Qs
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{s.description}</p>
              <span className="mt-3 inline-block text-sm font-medium text-brand-600 group-hover:underline">
                Practice {s.short} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="mb-4 text-2xl font-bold text-slate-900">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Step
            n={1}
            title="Access stored content"
            body="Browse and filter a curated bank of exam-style ESAT questions with worked explanations."
          />
          <Step
            n={2}
            title="Add your own"
            body="Create questions in the Content Studio (or paste an AI-generated batch) and push them live through the ingest API — no redeploy."
          />
          <Step
            n={3}
            title="Test yourself"
            body="Run a timed-style quiz, answer questions, and get instant scoring with explanations."
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-2 grid h-8 w-8 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">
        {n}
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}

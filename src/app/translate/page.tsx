import { Suspense } from "react";
import { TranslatorForm } from "@/components/TranslatorForm";
import { requireSession } from "@/lib/auth/requireSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function TranslatePage() {
  const session = await requireSession();
  if (!session.ok) {
    return <div className="p-10 text-sm text-red-700">Unauthorized.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-10 py-10">
      <header className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-atea-red">
          Oversett
        </div>
        <h1 className="mt-1 text-3xl font-bold text-atea-navy">Oversett artikkel</h1>
        <p className="mt-2 max-w-2xl text-sm text-black/60">
          Oversett eksisterende norske artikler til engelsk, svensk, dansk og finsk parallelt.
          Executive-register og struktur bevares.
        </p>
      </header>

      <Suspense fallback={<div className="text-sm text-black/50">Laster…</div>}>
        <TranslatorForm />
      </Suspense>
    </div>
  );
}

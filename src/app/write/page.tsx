import { WriterForm } from "@/components/WriterForm";
import { requireSession } from "@/lib/auth/requireSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function WritePage() {
  const session = await requireSession();
  if (!session.ok) {
    return <div className="p-10 text-sm text-red-700">Unauthorized.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-10 py-10">
      <header className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-atea-red">Skriv</div>
        <h1 className="mt-1 text-3xl font-bold text-atea-navy">Ny CIO Analytics-artikkel</h1>
        <p className="mt-2 max-w-2xl text-sm text-black/60">
          Writer-agenten skriver en 600–900 ord norsk case-study i CIO Analytics-stil basert på
          brief og researchmateriale. Ukjente påstander merkes{" "}
          <code className="rounded bg-atea-navy/5 px-1">[KILDE MANGLER]</code>.
        </p>
      </header>

      <WriterForm />
    </div>
  );
}

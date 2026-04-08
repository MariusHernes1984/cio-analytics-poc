import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-10 py-20 text-center">
      <div className="text-5xl font-bold text-atea-navy">404</div>
      <div className="mt-2 text-lg text-black/60">Fant ikke siden.</div>
      <Link
        href="/"
        className="mt-6 inline-block rounded bg-atea-navy px-4 py-2 text-sm font-semibold text-white hover:bg-atea-navy/90"
      >
        Tilbake til dashboard
      </Link>
    </div>
  );
}

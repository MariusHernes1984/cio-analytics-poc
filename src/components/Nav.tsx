import Link from "next/link";

/**
 * Sidebar navigation. Deliberately simple — no active-route highlighting,
 * no collapse. PoC quality. Shown on every page via root layout.
 */
const NAV_ITEMS: Array<{ href: string; label: string; description: string }> = [
  { href: "/", label: "Dashboard", description: "Oversikt" },
  { href: "/write", label: "Skriv", description: "Ny artikkel" },
  { href: "/translate", label: "Oversett", description: "Til en/sv/da/fi" },
  { href: "/articles", label: "Artikler", description: "Alle" },
  { href: "/prompts", label: "Prompts", description: "Rediger agenter" },
];

export function Nav() {
  return (
    <nav className="flex h-full w-60 shrink-0 flex-col border-r border-black/10 bg-white">
      <div className="border-b border-black/10 px-5 py-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-atea-red">
          Atea
        </div>
        <div className="mt-0.5 text-lg font-bold leading-tight text-atea-navy">
          CIO Analytics
        </div>
        <div className="mt-0.5 text-[11px] text-black/50">AI Studio · PoC</div>
      </div>
      <ul className="flex-1 space-y-0.5 px-2 py-3">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-md px-3 py-2 hover:bg-atea-sand"
            >
              <div className="text-sm font-medium text-atea-navy">{item.label}</div>
              <div className="text-[11px] text-black/50">{item.description}</div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-black/10 px-5 py-3 text-[11px] text-black/40">
        Claude i Foundry · Sweden Central
      </div>
    </nav>
  );
}

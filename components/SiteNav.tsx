"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Growth & dosing" },
  { href: "/resistance", label: "Resistance & adaptive therapy" },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              active ? "bg-surface-1 font-medium text-primary ring-1 ring-border" : "text-secondary hover:text-primary"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

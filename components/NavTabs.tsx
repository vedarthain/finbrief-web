"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today's Paper" },
  { href: "/ipo", label: "IPO & Listings" },
];

export default function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {TABS.map((t) => {
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`text-[13px] font-medium px-3 py-1.5 rounded-full transition-colors ${
              active ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

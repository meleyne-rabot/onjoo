"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/games", label: "Nos jeux" },
  { href: "/players", label: "Joueurs" },
  { href: "/profil", label: "Profil" },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 px-4 pb-4 sm:hidden">
      <nav className="mx-auto flex max-w-md justify-around rounded-[20px] border border-[#eee] bg-white px-2 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.href === "/games" && pathname.startsWith("/matches/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-[10px] px-2.5 py-1.5 ${
                active ? "bg-onjoo-green-900/[0.08]" : ""
              }`}
            >
              <span
                className="h-5 w-5 rounded-[6px]"
                style={{ background: active ? "#163D2E" : "#c9c2b0" }}
              />
              <span
                className="font-quicksand text-[11px]"
                style={{
                  fontWeight: active ? 700 : 600,
                  color: active ? "#163D2E" : "#999",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

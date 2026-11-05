"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/site";

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="wrap">
        <Link className="brand" href="/" aria-label="PGC Nigeria home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-horizontal.svg"
            alt="PGC Nigeria — The People's Governance Compact"
            width={200}
            height={48}
          />
        </Link>
        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
        >
          Menu
        </button>
        <nav id="primary-nav" className={`primary-nav${open ? " is-open" : ""}`} aria-label="Primary">
          <ul>
            {NAV.map((item) => {
              const current = !item.href.includes("#") && item.href === pathname;
              return (
                <li key={item.href} className={current ? "current-menu-item" : undefined}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}

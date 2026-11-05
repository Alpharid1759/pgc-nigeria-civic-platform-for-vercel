"use client";

import Link from "next/link";
import { useState } from "react";

export interface FilterItem {
  name: string;
  href: string;
}

export default function FilterList({ items, placeholder = "Filter…" }: { items: FilterItem[]; placeholder?: string }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  return (
    <>
      <input
        className="dir-search"
        type="search"
        placeholder={placeholder}
        aria-label="Filter list"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="dir-list">
        {items.map((item) => (
          <li key={item.href} style={q && !item.name.toLowerCase().includes(q) ? { display: "none" } : undefined}>
            <Link href={item.href}>{item.name}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}

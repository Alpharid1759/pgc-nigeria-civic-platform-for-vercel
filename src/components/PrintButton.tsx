"use client";

export default function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button type="button" className="pgc-btn no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}

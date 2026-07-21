"use client";

export default function PrintButton({ label = "Print result" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
    >
      {label}
    </button>
  );
}

"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-coral-500/25 transition hover:bg-coral-600 print:hidden"
    >
      🖨 Print
    </button>
  );
}

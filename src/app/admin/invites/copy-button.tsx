"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

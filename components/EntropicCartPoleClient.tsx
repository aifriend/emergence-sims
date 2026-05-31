"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const Inner = dynamic(() => import("./EntropicCartPole"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-[16/10] w-full items-center justify-center rounded-2xl border border-white/10 bg-black text-sm text-[var(--color-muted)]">
      loading renderer…
    </div>
  ),
});

export default function EntropicCartPoleClient(): ReactNode {
  return <Inner />;
}

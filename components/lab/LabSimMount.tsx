"use client";

/* Mounts the live renderer for a given sim id (client-only via the registry). */
import type { ReactNode } from "react";
import { SIM_COMPONENTS } from "./registry";

export default function LabSimMount({ id }: { id: string }): ReactNode {
  const Comp = SIM_COMPONENTS[id];
  return Comp ? <Comp /> : null;
}

import type { ReactNode } from "react";
import "./lab.css";

// .lab-root takes over the viewport with the blueprint paper + scopes every
// lab.css rule, so the drafting aesthetic never leaks into the rest of the app.
export default function LabLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="lab-root">
      <div className="wrap">{children}</div>
    </div>
  );
}

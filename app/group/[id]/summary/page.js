import { Suspense } from "react";
import SummaryScreen from "./screen";

export default function Page() {
  return (
    <Suspense fallback={<p className="loading">እየተጫነ ነው…</p>}>
      <SummaryScreen />
    </Suspense>
  );
}

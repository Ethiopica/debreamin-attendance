import { Suspense } from "react";
import GroupScreen from "./screen";

export default function Page() {
  return (
    <Suspense fallback={<p className="loading">እየተጫነ ነው…</p>}>
      <GroupScreen />
    </Suspense>
  );
}

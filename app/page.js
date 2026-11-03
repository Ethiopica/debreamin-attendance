import { Suspense } from "react";
import HomeScreen from "./home";

export default function Page() {
  return (
    <Suspense fallback={<p className="loading">እየተጫነ ነው…</p>}>
      <HomeScreen />
    </Suspense>
  );
}

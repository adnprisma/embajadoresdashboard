import { Suspense } from "react";
import { DineroView } from "./DineroView";

// useSearchParams (para ?estado=) exige un límite de Suspense en build.
export default function DineroPage() {
  return (
    <Suspense fallback={null}>
      <DineroView />
    </Suspense>
  );
}

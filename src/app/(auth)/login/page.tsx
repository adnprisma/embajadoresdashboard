import { Suspense } from "react";
import { copy } from "@/config/copy";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">{copy.auth.login.title}</h1>
        <p className="text-sm text-text-secondary">{copy.auth.login.description}</p>
      </div>
      {/* useSearchParams (para ?next=) exige un límite de Suspense en build. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

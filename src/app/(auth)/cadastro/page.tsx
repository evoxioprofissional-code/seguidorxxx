import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function CadastroPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}

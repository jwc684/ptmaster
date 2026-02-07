import { Suspense } from "react";
import { AdminLoginForm } from "./admin-login-form";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}

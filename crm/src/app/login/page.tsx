import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />
      <div className="card card-pad relative w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-lg font-bold text-white shadow-glow">
            DA
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-white">Digital Aydin</h1>
            <p className="text-sm text-slate-400">Connexion au CRM</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}

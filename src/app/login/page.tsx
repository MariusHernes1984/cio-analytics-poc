import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-atea-sand">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-atea-red">
            Atea
          </div>
          <div className="mt-1 text-2xl font-bold text-atea-navy">
            CIO Analytics
          </div>
          <div className="mt-0.5 text-[11px] text-black/50">AI Studio · PoC</div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

import Link from "next/link";
import { requestPasswordReset } from "@/lib/account-actions";

export const metadata = { title: "Forgot Password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-center text-3xl font-bold">Forgot password</h1>

      {sent ? (
        <div className="mt-8 rounded-2xl border border-reef-500/40 bg-reef-500/10 p-6 text-center">
          <p className="text-3xl">📬</p>
          <p className="mt-3 text-slate-200">
            If that email has an account, a reset link is on its way.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            The link works once and expires in 1 hour. Check spam too.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-2 text-center text-slate-400">
            Enter your email and we&apos;ll send a reset link.
          </p>
          <form action={requestPasswordReset} className="mt-8 space-y-4">
            <input
              type="email"
              name="email"
              required
              placeholder="you@reef.com"
              autoComplete="email"
              className="w-full rounded-lg border border-abyss-700 bg-abyss-900 px-4 py-3 text-sm placeholder:text-slate-500 focus:border-reef-500 focus:outline-none"
            />
            <button className="w-full rounded-full bg-coral-500 py-3 font-semibold text-white transition hover:bg-coral-600">
              Send Reset Link
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-slate-400">
        Remembered it?{" "}
        <Link href="/login" className="text-reef-400 hover:text-reef-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}

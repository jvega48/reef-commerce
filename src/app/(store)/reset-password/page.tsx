import Link from "next/link";
import { resetPassword } from "@/lib/account-actions";

export const metadata = { title: "Reset Password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (error === "invalid" || !token) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-3xl font-bold">Link expired</h1>
        <p className="mt-3 text-slate-400">
          This reset link is invalid, already used, or older than 1 hour.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block rounded-full bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-center text-3xl font-bold">Choose a new password</h1>

      {error === "weak" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Password must be at least 8 characters.
        </p>
      )}

      <form action={resetPassword} className="mt-8 space-y-4">
        <input type="hidden" name="token" value={token} />
        <input
          type="password"
          name="password"
          required
          minLength={8}
          placeholder="New password (8+ characters)"
          autoComplete="new-password"
          className="w-full rounded-lg border border-abyss-700 bg-abyss-900 px-4 py-3 text-sm placeholder:text-slate-500 focus:border-reef-500 focus:outline-none"
        />
        <button className="w-full rounded-full bg-coral-500 py-3 font-semibold text-white transition hover:bg-coral-600">
          Set New Password
        </button>
      </form>
    </div>
  );
}

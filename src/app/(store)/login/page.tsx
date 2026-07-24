import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn, STAFF_ROLES } from "@/auth";

export const metadata = { title: "Sign In" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string; next?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect(STAFF_ROLES.includes(session.user.role) ? "/admin" : "/account");
  }
  const { error, reset, next } = await searchParams;
  // Only same-site paths — never an absolute URL (open-redirect guard).
  const nextPath = next && /^\/(?!\/)/.test(next) ? next : null;

  async function login(formData: FormData) {
    "use server";
    const to = String(formData.get("next") ?? "");
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: /^\/(?!\/)/.test(to) ? to : "/login",
      });
    } catch (e) {
      if (e instanceof AuthError) redirect("/login?error=1");
      throw e;
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <Image
        src="/brand/logo.png"
        alt="AquaVida365"
        width={110}
        height={140}
        priority
        className="mx-auto mb-8 h-auto w-28"
      />
      <h1 className="text-center text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 text-center text-slate-400">Sign in to your AquaVida365 account</p>

      {error && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Invalid email or password.
        </p>
      )}
      {reset && (
        <p className="mt-4 rounded-lg border border-reef-500/40 bg-reef-500/10 px-4 py-2 text-sm text-reef-300">
          Password updated — sign in with your new password.
        </p>
      )}

      <form action={login} className="mt-8 space-y-4">
        {nextPath && <input type="hidden" name="next" value={nextPath} />}
        <input
          type="email"
          name="email"
          required
          placeholder="Email"
          className="w-full rounded-lg border border-abyss-700 bg-abyss-900 px-4 py-3 text-sm placeholder:text-slate-500 focus:border-reef-500 focus:outline-none"
        />
        <input
          type="password"
          name="password"
          required
          placeholder="Password"
          className="w-full rounded-lg border border-abyss-700 bg-abyss-900 px-4 py-3 text-sm placeholder:text-slate-500 focus:border-reef-500 focus:outline-none"
        />
        <button
          type="submit"
          className="w-full rounded-full bg-coral-500 py-3 font-semibold text-white transition hover:bg-coral-600"
        >
          Sign In
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link href="/forgot-password" className="text-slate-400 hover:text-reef-300">
          Forgot your password?
        </Link>
      </p>

      <p className="mt-6 text-center text-sm text-slate-400">
        New here?{" "}
        <Link href="/register" className="text-reef-400 hover:text-reef-300">
          Create an account
        </Link>
      </p>
    </div>
  );
}

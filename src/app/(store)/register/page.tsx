import Link from "next/link";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";

export const metadata = { title: "Create Account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ref?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/account");
  const { error, ref } = await searchParams;

  async function register(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const password = String(formData.get("password") ?? "");
    const refCode = String(formData.get("ref") ?? "").trim();

    if (!email || password.length < 8) redirect("/register?error=weak");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) redirect("/register?error=exists");

    // Referral: credit the referrer once this account places a first order.
    const referrer = refCode
      ? await prisma.user.findUnique({ where: { referralCode: refCode } })
      : null;

    const passwordHash = await bcrypt.hash(password, 12);
    const referralCode = `AV${randomBytes(4).toString("hex").toUpperCase()}`;
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        passwordHash,
        role: "CUSTOMER",
        referralCode,
        referredById: referrer?.id ?? null,
        // 100 Reef Points signup bonus
        reefPoints: 100,
        pointsTransactions: {
          create: { points: 100, reason: "SIGNUP" },
        },
      },
    });

    const tpl = welcomeEmail({ name: user.name, referralCode });
    await sendEmail({ to: email, ...tpl, template: "welcome" });

    await signIn("credentials", { email, password, redirectTo: "/account" });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-center text-3xl font-bold">Create account</h1>
      <p className="mt-2 text-center text-slate-400">
        Get <span className="font-semibold text-reef-300">100 Reef Points</span> just for signing up
      </p>

      {error === "exists" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          An account with that email already exists.{" "}
          <Link href="/login" className="underline">Sign in</Link>
        </p>
      )}
      {error === "weak" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Password must be at least 8 characters.
        </p>
      )}

      {ref && (
        <p className="mt-4 rounded-lg border border-reef-500/40 bg-reef-500/10 px-4 py-2 text-center text-sm text-reef-300">
          🤝 You were referred by a friend — welcome to the reef!
        </p>
      )}

      <form action={register} className="mt-8 space-y-4">
        {ref && <input type="hidden" name="ref" value={ref} />}
        <input
          type="text"
          name="name"
          placeholder="Name"
          className="w-full rounded-lg border border-abyss-700 bg-abyss-900 px-4 py-3 text-sm placeholder:text-slate-500 focus:border-reef-500 focus:outline-none"
        />
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
          minLength={8}
          placeholder="Password (8+ characters)"
          className="w-full rounded-lg border border-abyss-700 bg-abyss-900 px-4 py-3 text-sm placeholder:text-slate-500 focus:border-reef-500 focus:outline-none"
        />
        <button
          type="submit"
          className="w-full rounded-full bg-coral-500 py-3 font-semibold text-white transition hover:bg-coral-600"
        >
          Create Account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="text-reef-400 hover:text-reef-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}

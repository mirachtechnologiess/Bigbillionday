import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/validators";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In",
  robots: { index: false, follow: true },
  alternates: { canonical: "/login" },
};

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const next = typeof sp?.next === "string" ? safeNext(sp.next) : "";
  if (await getCurrentUser()) redirect(next || "/account");
  return (
    <AuthShell
      title="Sign in to your account"
      quote={
        <>
          The two most powerful warriors are <em>patience</em> and time.
        </>
      }
      author="Leo Tolstoy"
    >
      <LoginForm
        next={next}
        initialError={
          { invalid: "That email/mobile and password don't match", blocked: "This account is disabled. Please contact support.", ratelimit: "Too many attempts — please wait a minute and try again" }[sp?.error] || ""
        }
      />
    </AuthShell>
  );
}

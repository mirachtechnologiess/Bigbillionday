import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/validators";
import AuthShell from "@/components/auth/AuthShell";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create Account",
  robots: { index: false, follow: true },
  alternates: { canonical: "/register" },
};

export default async function RegisterPage({ searchParams }) {
  const sp = await searchParams;
  const next = typeof sp?.next === "string" ? safeNext(sp.next) : "";
  if (await getCurrentUser()) redirect(next || "/account");
  return (
    <AuthShell
      title="Create your account"
      quote={
        <>
          Lost time is never <em>found</em> again.
        </>
      }
      author="Benjamin Franklin"
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}

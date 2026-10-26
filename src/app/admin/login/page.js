import { redirect } from "next/navigation";
import { getCurrentUser, isAdminRole } from "@/lib/auth";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function AdminLoginPage({ searchParams }) {
  const sp = await searchParams;
  const next = typeof sp?.next === "string" && sp.next.startsWith("/admin") && !sp.next.startsWith("//") ? sp.next : "/admin";
  const user = await getCurrentUser().catch(() => null);
  if (user && isAdminRole(user.role)) redirect(next);
  const ERRORS = {
    invalid: "Invalid email or password",
    noaccess: "This account does not have admin access",
    blocked: "This account is blocked",
    ratelimit: "Too many attempts — please wait a minute and try again",
  };
  return <AdminLoginForm next={next} initialError={ERRORS[sp?.error] || ""} />;
}

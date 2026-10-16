import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { firstName } from "@/components/commerce/format";
import AccountNav from "@/components/account/AccountNav";

export const metadata = {
  title: { default: "My Account", template: "%s · My Account" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  return (
    <div className="container-lux pb-16 pt-5 sm:pt-8">
      <header>
        <p className="text-[13px] text-mute">My Account</p>
        <p className="mt-0.5 text-2xl font-bold text-bone sm:text-3xl">Hello, {firstName(user.name)}</p>
      </header>
      <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
        <aside className="lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
          <AccountNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

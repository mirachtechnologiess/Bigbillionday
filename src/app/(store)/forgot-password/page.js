import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import AuthShell from "@/components/auth/AuthShell";

export const metadata = {
  title: "Reset Password",
  robots: { index: false, follow: true },
  alternates: { canonical: "/forgot-password" },
};

export default async function ForgotPasswordPage() {
  const { store } = await getSettings();
  const wa = String(store.whatsapp || "").replace(/\D/g, "");
  const waNumber = wa.length === 10 ? `91${wa}` : wa;
  const msg = encodeURIComponent(`Hi ${store.name}, I'd like to reset the password for my account.`);
  const channels = [
    waNumber && { href: `https://wa.me/${waNumber}?text=${msg}`, icon: MessageCircle, label: "WhatsApp", value: "Fastest · usually within the hour", ext: true },
    store.email && {
      href: `mailto:${store.email}?subject=${encodeURIComponent("Password reset request")}`,
      icon: Mail,
      label: "Email",
      value: store.email,
    },
    store.phone && { href: `tel:${store.phone.replace(/\s/g, "")}`, icon: Phone, label: "Call", value: store.phone },
  ].filter(Boolean);

  return (
    <AuthShell
      title="Reset your password"
      quote={
        <>
          The two most powerful warriors are <em>patience</em> and time.
        </>
      }
      author="Leo Tolstoy"
    >
      <p className="text-[15px] leading-relaxed text-bone-2">
        Message our support team from the email or mobile number on your account. We&apos;ll verify it&apos;s you and reset your
        password personally.
      </p>
      <ul className="mt-5 space-y-3">
        {channels.map(({ href, icon: Icon, label, value, ext }) => (
          <li key={label}>
            <a
              href={href}
              {...(ext && { target: "_blank", rel: "noopener noreferrer" })}
              className="group flex items-center gap-4 rounded-xl border border-line bg-white px-4 py-3 transition hover:border-gold hover:bg-gold-3"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-3 text-gold-2">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-mute">{label}</span>
                <span className="block truncate text-[15px] font-semibold text-bone group-hover:text-gold-2">{value}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[13px] text-mute">For your security we never ask for your password or OTPs.</p>
      <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-gold-2 hover:underline">
        <ArrowLeft className="size-4" strokeWidth={2} /> Back to sign in
      </Link>
    </AuthShell>
  );
}

import { requireAdminPage } from "@/lib/admin-api";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/settings";
import { aiEnabled } from "@/lib/ai";
import SettingsManager from "@/components/admin/settings/SettingsManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }) {
  const user = await requireAdminPage();
  const sp = await searchParams;
  const settings = await getSettings();
  const groups = Object.keys(DEFAULT_SETTINGS);
  const tab = groups.includes(sp.tab) ? sp.tab : "store";
  // only known keys, typed like the defaults — never leak anything else to the client
  const values = Object.fromEntries(groups.map((g) => [g, Object.fromEntries(Object.keys(DEFAULT_SETTINGS[g]).map((k) => [k, settings[g]?.[k] ?? DEFAULT_SETTINGS[g][k]]))]));
  return (
    <SettingsManager
      initial={values}
      defaults={DEFAULT_SETTINGS}
      tab={tab}
      isAdmin={user.role === "ADMIN"}
      razorpayReady={Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)}
      aiConfigured={aiEnabled()}
    />
  );
}

import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-api";
import { getSettings } from "@/lib/settings";
import MessagesInbox from "@/components/admin/messages/MessagesInbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }) {
  const user = await requireAdminPage();
  const sp = await searchParams;
  const filter = sp.filter === "unread" ? "unread" : "all";
  const q = String(sp.q || "").trim().slice(0, 80);
  const ci = { contains: q, mode: "insensitive" };
  const where = {
    ...(filter === "unread" ? { isRead: false } : {}),
    ...(q ? { OR: [{ name: ci }, { email: ci }, { phone: ci }, { message: ci }] } : {}),
  };
  const [rows, unread, total, settings] = await Promise.all([
    db.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
    db.contactMessage.count({ where: { isRead: false } }),
    db.contactMessage.count(),
    getSettings(),
  ]);
  const messages = rows.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));
  return (
    <MessagesInbox
      messages={messages}
      unread={unread}
      total={total}
      filter={filter}
      initialId={typeof sp.id === "string" ? sp.id : null}
      canDelete={user.role === "ADMIN"}
      storeName={settings.store.name}
    />
  );
}

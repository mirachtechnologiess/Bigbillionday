import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";

export const GET = adminRoute(async (req) => {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") || "").trim().slice(0, 80);
  const ci = { contains: q, mode: "insensitive" };
  const where = {
    ...(sp.get("filter") === "unread" ? { isRead: false } : {}),
    ...(q ? { OR: [{ name: ci }, { email: ci }, { phone: ci }, { message: ci }] } : {}),
  };
  const [messages, unread] = await Promise.all([
    db.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
    db.contactMessage.count({ where: { isRead: false } }),
  ]);
  return ok({ messages, unread });
});

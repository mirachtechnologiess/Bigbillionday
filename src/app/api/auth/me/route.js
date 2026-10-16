import { handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/auth/me → { user: {id,name,email,phone,role} | null } */
export const GET = handle(async () => {
  const u = await getCurrentUser();
  return ok(
    { user: u ? { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role } : null },
    { headers: { "Cache-Control": "no-store" } }
  );
});

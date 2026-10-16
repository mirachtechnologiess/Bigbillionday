import { handle, ok } from "@/lib/api";
import { destroySession } from "@/lib/auth";

/** POST /api/auth/logout → { ok: true } */
export const POST = handle(async () => {
  await destroySession();
  return ok({ ok: true });
});

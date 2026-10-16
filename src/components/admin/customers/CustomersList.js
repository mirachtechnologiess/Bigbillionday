"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, ShieldCheck, Trash2, UserPlus, Users, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { cn, formatINR } from "@/lib/utils";
import { api } from "../fetcher";
import { ConfirmButton, Empty, Field, Modal, PageHeader, Pagination, Pill, SearchInput, Spinner, Tabs, fmtDate, timeAgo, useQueryState } from "../ui";

export const ROLE_TONE = { ADMIN: "gold", STAFF: "info", CUSTOMER: "mute" };

export default function CustomersList({ tab, rows, counts, page, pages, total, me }) {
  const router = useRouter();
  const { sp, set } = useQueryState();
  const [creating, setCreating] = useState(false);
  const isAdmin = me.role === "ADMIN";
  const staff = tab === "staff";

  async function patch(u, body, msg) {
    try {
      await api(`/api/admin/customers/${u.id}`, { method: "PATCH", body });
      toast.success(msg);
      router.refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function remove(u) {
    await api(`/api/admin/customers/${u.id}`, { method: "DELETE" });
    toast.success(`${u.name} deleted`);
    router.refresh();
  }

  const blockBtn = (u) =>
    u.id !== me.id && (u.role === "CUSTOMER" || isAdmin) ? (
      u.isBlocked ? (
        <button className="a-btn a-btn-sm a-btn-ghost" onClick={() => patch(u, { isBlocked: false }, `${u.name} unblocked`)}>
          <UserCheck /> Unblock
        </button>
      ) : (
        <ConfirmButton
          className="a-btn a-btn-sm a-btn-ghost"
          title={`Block ${u.name}?`}
          message="Blocked accounts are signed out and cannot log in or place orders with this account."
          confirmLabel="Block"
          onConfirm={() => patch(u, { isBlocked: true }, `${u.name} blocked`)}
        >
          <Ban /> Block
        </ConfirmButton>
      )
    ) : null;

  const staffActions = (u) => (
    <div className="flex items-center justify-end gap-1.5">
      {isAdmin && u.id !== me.id ? (
        <select className="a-input a-input-sm !w-auto" value={u.role} onChange={(e) => patch(u, { role: e.target.value }, `Role changed to ${e.target.value}`)} aria-label="Role">
          <option value="ADMIN">Admin</option>
          <option value="STAFF">Staff</option>
          <option value="CUSTOMER">Customer (revoke)</option>
        </select>
      ) : (
        <Pill tone={ROLE_TONE[u.role]}>{u.role.toLowerCase()}{u.id === me.id ? " · you" : ""}</Pill>
      )}
      {blockBtn(u)}
      {isAdmin && u.id !== me.id && (
        <ConfirmButton
          className="a-btn a-btn-sm a-btn-ghost a-btn-icon"
          ariaLabel={`Delete ${u.name}`}
          title={`Delete ${u.name}?`}
          message={u.orders > 0 ? "This user has orders and cannot be deleted — block them instead." : "The account will be permanently removed."}
          confirmLabel="Delete"
          disabled={u.orders > 0}
          onConfirm={() => remove(u)}
        >
          <Trash2 />
        </ConfirmButton>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title={staff ? "Staff & admins" : "Customers"}
        description={staff ? "People who can sign in to this panel. Only admins can add, promote or remove them." : "Everyone who has an account. Lifetime value excludes cancelled and returned orders."}
        actions={
          staff && isAdmin ? (
            <button className="a-btn a-btn-gold" onClick={() => setCreating(true)}>
              <UserPlus /> Add staff
            </button>
          ) : null
        }
      />

      <Tabs
        className="mb-4"
        value={tab}
        onChange={(v) => set({ tab: v === "staff" ? "staff" : null, q: null, blocked: null })}
        tabs={[
          { value: "customers", label: "Customers", count: counts.customers },
          { value: "staff", label: "Staff & admins", count: counts.staff, icon: ShieldCheck },
        ]}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput className="w-full sm:w-80" placeholder="Name, email or phone" />
        <label className="flex items-center gap-2 text-[12.5px] text-bone-2">
          <input type="checkbox" className="a-check" checked={sp.get("blocked") === "1"} onChange={(e) => set({ blocked: e.target.checked ? "1" : null })} />
          Blocked only
        </label>
      </div>

      {rows.length === 0 ? (
        <Empty icon={Users} title={staff ? "No staff found" : "No customers found"}>
          {sp.get("q") ? "Nobody matches that search." : staff ? "Add a teammate to share the workload." : "Customers appear here once they create an account."}
        </Empty>
      ) : (
        <>
          <ul className="space-y-2 sm:hidden">
            {rows.map((u) => (
              <li key={u.id} className="a-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/admin/customers/${u.id}`} className="min-w-0">
                    <div className="truncate font-medium">{u.name}</div>
                    <div className="truncate text-[11.5px] text-mute">{u.email}</div>
                    {u.phone && <div className="a-num text-[11.5px] text-mute">{u.phone}</div>}
                  </Link>
                  <div className="text-right">
                    <div className="a-num">{formatINR(u.spent)}</div>
                    <div className="text-[11px] text-mute">{u.orders} order{u.orders === 1 ? "" : "s"}</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {u.isBlocked && <Pill tone="danger">Blocked</Pill>}
                  <span className="text-[11px] text-mute">Joined {fmtDate(u.createdAt)}</span>
                  <span className="flex-1" />
                  {staff ? staffActions(u) : blockBtn(u)}
                </div>
              </li>
            ))}
          </ul>

          <div className="a-table-wrap hidden sm:block">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="text-right">Orders</th>
                  <th className="text-right">Total spent</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/admin/customers/${u.id}`} className="flex items-center gap-2.5 hover:text-gold-2">
                        <span className={cn("grid h-7 w-7 flex-none place-items-center rounded-full border text-[11px] font-semibold", u.role === "CUSTOMER" ? "border-line-2 bg-ink-3 text-bone-2" : "border-gold/50 bg-gold/10 text-gold-2")}>
                          {u.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="max-w-[180px] truncate font-medium">{u.name}</span>
                      </Link>
                    </td>
                    <td className="max-w-[220px] truncate text-bone-2">{u.email}</td>
                    <td className="a-num text-bone-2">{u.phone || "—"}</td>
                    <td className="a-num text-right">{u.orders}</td>
                    <td className="a-num text-right">{formatINR(u.spent)}</td>
                    <td className="whitespace-nowrap text-[12px] text-mute" title={u.lastOrderAt ? `Last order ${timeAgo(u.lastOrderAt)}` : undefined}>{fmtDate(u.createdAt)}</td>
                    <td>{u.isBlocked ? <Pill tone="danger">Blocked</Pill> : <Pill tone="lume">Active</Pill>}</td>
                    <td className="text-right">{staff ? staffActions(u) : <div className="flex justify-end">{blockBtn(u)}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Pagination page={page} pages={pages} total={total} />

      <CreateStaffModal open={creating} onClose={() => setCreating(false)} onCreated={() => router.refresh()} />
    </div>
  );
}

function CreateStaffModal({ open, onClose, onCreated }) {
  const blank = { name: "", email: "", phone: "", password: "", role: "STAFF" };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const up = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e?.preventDefault();
    if (f.password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    try {
      await api("/api/admin/customers", { method: "POST", body: { ...f, phone: f.phone || undefined } });
      toast.success(`${f.name} can now sign in as ${f.role.toLowerCase()}`);
      setF(blank);
      onClose();
      onCreated();
    } catch (err) {
      const issues = err.data?.issues ? Object.values(err.data.issues).flat().join(" · ") : "";
      toast.error(issues || err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title="Add staff member"
      footer={
        <>
          <button className="a-btn a-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="a-btn a-btn-gold" onClick={submit} disabled={busy}>{busy && <Spinner />} Create account</button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2"><input className="a-input" value={f.name} onChange={up("name")} required autoFocus /></Field>
        <Field label="Email"><input className="a-input" type="email" value={f.email} onChange={up("email")} required /></Field>
        <Field label="Phone (optional)"><input className="a-input a-num" inputMode="numeric" value={f.phone} onChange={up("phone")} /></Field>
        <Field label="Password" hint="At least 8 characters. Share it securely."><input className="a-input" type="password" value={f.password} onChange={up("password")} minLength={8} required autoComplete="new-password" /></Field>
        <Field label="Role" hint="Staff can manage orders & catalog; admins can also delete and manage people.">
          <select className="a-input" value={f.role} onChange={up("role")}>
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
          </select>
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

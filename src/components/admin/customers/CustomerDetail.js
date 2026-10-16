"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Heart, Mail, MapPin, Phone, ShoppingBag, Star, Trash2, UserCheck, User } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";
import { api } from "../fetcher";
import { Card, ConfirmButton, CopyButton, Empty, OrderStatusPill, PageHeader, PAYMENT_TONE, Pill, Stat, fmtDate, timeAgo } from "../ui";
import { ROLE_TONE } from "./CustomersList";

export default function CustomerDetail({ user: u, me }) {
  const router = useRouter();
  const isAdmin = me.role === "ADMIN";
  const self = u.id === me.id;
  const canBlock = !self && (u.role === "CUSTOMER" || isAdmin);
  const s = u.stats;

  async function patch(body, msg) {
    await api(`/api/admin/customers/${u.id}`, { method: "PATCH", body });
    toast.success(msg);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        back={u.role === "CUSTOMER" ? "/admin/customers" : "/admin/customers?tab=staff"}
        eyebrow={u.role === "CUSTOMER" ? "Customer" : "Team member"}
        title={u.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone={ROLE_TONE[u.role]}>{u.role.toLowerCase()}</Pill>
            {u.isBlocked ? <Pill tone="danger">Blocked</Pill> : <Pill tone="lume">Active</Pill>}
            <span>Joined {fmtDate(u.createdAt)}</span>
          </span>
        }
        actions={
          <>
            {canBlock &&
              (u.isBlocked ? (
                <button className="a-btn" onClick={() => patch({ isBlocked: false }, "Account unblocked").catch((e) => toast.error(e.message))}>
                  <UserCheck /> Unblock
                </button>
              ) : (
                <ConfirmButton
                  className="a-btn a-btn-danger"
                  title={`Block ${u.name}?`}
                  message="They will be signed out and cannot log in or place orders with this account."
                  confirmLabel="Block"
                  onConfirm={() => patch({ isBlocked: true }, "Account blocked")}
                >
                  <Ban /> Block
                </ConfirmButton>
              ))}
            {isAdmin && !self && (
              <ConfirmButton
                className="a-btn a-btn-ghost"
                title={`Delete ${u.name}?`}
                message={s.orders > 0 ? "This account has orders and cannot be deleted — block it instead." : "The account, addresses and wishlist will be permanently removed."}
                confirmLabel="Delete"
                disabled={s.orders > 0}
                onConfirm={async () => {
                  await api(`/api/admin/customers/${u.id}`, { method: "DELETE" });
                  toast.success("Account deleted");
                  router.push("/admin/customers");
                }}
              >
                <Trash2 /> Delete
              </ConfirmButton>
            )}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders" value={s.orders} sub={s.lastOrderAt ? `last ${timeAgo(s.lastOrderAt)}` : "none yet"} />
        <Stat label="Lifetime value" value={formatINR(s.spent)} sub="excl. cancelled/returned" tone="lume" />
        <Stat label="Avg order" value={formatINR(s.aov)} />
        <Stat label="Engagement" value={`${s.wishlist} · ${s.reviews}`} sub="wishlist · reviews" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title={`Orders (${s.orders})`} icon={ShoppingBag} bodyClass="!p-0">
            {u.orders.length === 0 ? (
              <div className="p-4"><Empty icon={ShoppingBag} title="No orders yet" /></div>
            ) : (
              <>
                <ul className="divide-y divide-line sm:hidden">
                  {u.orders.map((o) => (
                    <li key={o.id}>
                      <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 p-3">
                        <div>
                          <div className="a-num text-gold-2">#{o.orderNumber}</div>
                          <div className="text-[11.5px] text-mute">{fmtDate(o.createdAt)} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="a-num">{formatINR(o.total)}</span>
                          <OrderStatusPill status={o.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="a-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Date</th>
                        <th>Items</th>
                        <th className="text-right">Total</th>
                        <th>Payment</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {u.orders.map((o) => (
                        <tr key={o.id}>
                          <td><Link href={`/admin/orders/${o.id}`} className="a-num text-gold-2 hover:underline">#{o.orderNumber}</Link></td>
                          <td className="whitespace-nowrap text-[12px] text-mute">{fmtDate(o.createdAt, true)}</td>
                          <td className="a-num">{o.itemCount}</td>
                          <td className="a-num text-right">{formatINR(o.total)}</td>
                          <td><Pill tone={PAYMENT_TONE[o.paymentStatus]} dot={false}>{o.paymentMethod === "COD" ? "COD" : "Prepaid"} · {o.paymentStatus.toLowerCase()}</Pill></td>
                          <td><OrderStatusPill status={o.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Contact" icon={User}>
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-mute" />
                <a href={`mailto:${u.email}`} className="min-w-0 flex-1 truncate hover:text-gold-2">{u.email}</a>
                <CopyButton text={u.email} className="a-btn a-btn-sm a-btn-ghost a-btn-icon" />
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-mute" />
                {u.phone ? (
                  <>
                    <a href={`tel:${u.phone}`} className="a-num flex-1 hover:text-gold-2">{u.phone}</a>
                    <a className="a-btn a-btn-sm a-btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/91${u.phone.replace(/\D/g, "").slice(-10)}`}>WhatsApp</a>
                  </>
                ) : (
                  <span className="text-mute">No phone</span>
                )}
              </div>
              <div className="flex items-center gap-4 pt-1 text-[12px] text-mute">
                <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {s.wishlist} wishlisted</span>
                <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" /> {s.reviews} reviews</span>
              </div>
            </div>
          </Card>

          <Card title={`Addresses (${u.addresses.length})`} icon={MapPin}>
            {u.addresses.length === 0 ? (
              <p className="text-[12.5px] text-mute">No saved addresses.</p>
            ) : (
              <ul className="space-y-3">
                {u.addresses.map((a) => {
                  const text = [a.name, a.line1, a.line2, a.landmark, `${a.city}, ${a.state} - ${a.pincode}`, a.phone].filter(Boolean).join("\n");
                  return (
                    <li key={a.id} className="rounded-xl border border-line bg-ink-3/50 p-3 text-[12.5px]">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-medium">{a.name}</span>
                        <span className="flex items-center gap-1">
                          {a.isDefault && <Pill tone="gold" dot={false}>default</Pill>}
                          <CopyButton text={text} className="a-btn a-btn-sm a-btn-ghost a-btn-icon" />
                        </span>
                      </div>
                      <div className="whitespace-pre-line text-bone-2">{text.split("\n").slice(1).join("\n")}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

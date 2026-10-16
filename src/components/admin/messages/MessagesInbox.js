"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Inbox, Mail, MailOpen, MessageCircle, Phone, Trash2 } from "lucide-react";
import { api } from "@/components/admin/fetcher";
import { ConfirmButton, CopyButton, Empty, PageHeader, SearchInput, Tabs, fmtDate, timeAgo, useQueryState } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

function waNumber(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  return d.length >= 11 ? d : null;
}

const firstName = (n) => String(n || "").trim().split(/\s+/)[0] || "there";

export default function MessagesInbox({ messages, unread, total, filter, initialId, canDelete, storeName }) {
  const router = useRouter();
  const { set } = useQueryState();
  const [items, setItems] = useState(messages);
  const [unreadCount, setUnreadCount] = useState(unread);
  const [openId, setOpenId] = useState(initialId);
  const marking = useRef(new Set());

  useEffect(() => setItems(messages), [messages]);
  useEffect(() => setUnreadCount(unread), [unread]);

  const current = items.find((m) => m.id === openId) || null;

  const setRead = async (m, isRead, { silent } = {}) => {
    if (m.isRead === isRead || marking.current.has(m.id)) return;
    marking.current.add(m.id);
    setItems((xs) => xs.map((x) => (x.id === m.id ? { ...x, isRead } : x)));
    setUnreadCount((c) => Math.max(0, c + (isRead ? -1 : 1)));
    try {
      await api(`/api/admin/messages/${m.id}`, { method: "PATCH", body: { isRead } });
      if (!silent) toast.success(isRead ? "Marked as read" : "Marked as unread");
      router.refresh();
    } catch (e) {
      setItems((xs) => xs.map((x) => (x.id === m.id ? { ...x, isRead: !isRead } : x)));
      setUnreadCount((c) => Math.max(0, c + (isRead ? 1 : -1)));
      toast.error(e.message);
    } finally {
      marking.current.delete(m.id);
    }
  };

  const open = (m) => {
    setOpenId(m.id);
    if (!m.isRead) setRead(m, true, { silent: true }); // auto-mark-read on open
  };

  // honour ?id= deep links (e.g. from the dashboard) once
  useEffect(() => {
    if (!initialId) return;
    const m = messages.find((x) => x.id === initialId);
    if (m && !m.isRead) setRead(m, true, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async (m) => {
    await api(`/api/admin/messages/${m.id}`, { method: "DELETE" });
    toast.success("Message deleted");
    const idx = items.findIndex((x) => x.id === m.id);
    const next = items.filter((x) => x.id !== m.id);
    setItems(next);
    if (!m.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    setOpenId(next[idx]?.id || next[idx - 1]?.id || null);
    router.refresh();
  };

  return (
    <div>
      <PageHeader eyebrow="Storefront" title="Messages" description="Enquiries from the contact page. Opening a message marks it read; reply by email or WhatsApp." />

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className={cn("min-w-0", current && "hidden lg:block")}>
          <div className="a-card overflow-hidden">
            <div className="grid gap-2 border-b border-line p-3">
              <SearchInput placeholder="Search name, email, phone, text…" />
              <Tabs
                value={filter}
                onChange={(v) => set({ filter: v === "all" ? null : v })}
                tabs={[
                  { value: "all", label: "All", count: total },
                  { value: "unread", label: "Unread", count: unreadCount },
                ]}
              />
            </div>
            {items.length === 0 ? (
              <div className="p-4">
                <Empty icon={Inbox} title={filter === "unread" ? "Inbox zero" : "No messages"}>
                  {filter === "unread" ? "Every message has been read." : "Messages sent from the contact page land here."}
                </Empty>
              </div>
            ) : (
              <ul className="max-h-[calc(100dvh-300px)] min-h-[300px] divide-y divide-line overflow-y-auto">
                {items.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => open(m)}
                      className={cn("relative block w-full px-4 py-3 text-left transition-colors hover:bg-ink-2", openId === m.id && "bg-gold-3")}
                    >
                      {openId === m.id && <span className="absolute inset-y-0 left-0 w-[2px] bg-gold" />}
                      <div className="flex items-center gap-2">
                        <span className={cn("h-1.5 w-1.5 flex-none rounded-full", m.isRead ? "bg-transparent" : "bg-gold shadow-[0_0_6px_rgb(242_96_12/.6)]")} />
                        <span className={cn("min-w-0 flex-1 truncate text-[13px]", m.isRead ? "text-bone-2" : "font-semibold text-bone")}>{m.name}</span>
                        <span className="a-num flex-none text-[10.5px] text-mute">{timeAgo(m.createdAt)}</span>
                      </div>
                      <div className={cn("mt-0.5 truncate pl-3.5 text-[11.5px]", m.isRead ? "text-mute" : "text-bone-2")}>{m.email}</div>
                      <div className={cn("mt-1 line-clamp-2 pl-3.5 text-[12px]", m.isRead ? "text-mute" : "text-bone-2")}>{m.message}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={cn("min-w-0", !current && "hidden lg:block")}>
          {current ? (
            <MessagePanel key={current.id} m={current} storeName={storeName} canDelete={canDelete} onBack={() => setOpenId(null)} onToggleRead={() => setRead(current, !current.isRead)} onDelete={() => remove(current)} />
          ) : (
            <div className="a-dots flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-line-2 p-8 text-center">
              <Mail className="mb-3 h-5 w-5 text-gold" />
              <div className="font-display text-2xl">Select a message</div>
              <p className="mt-1 text-[12px] text-mute">
                <span className="a-num text-gold-2">{unreadCount}</span> unread
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessagePanel({ m, storeName, canDelete, onBack, onToggleRead, onDelete }) {
  const subject = `Re: Your message to ${storeName}`;
  const quoted = m.message
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
  const mailto = `mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Hi ${firstName(m.name)},\n\nThank you for reaching out to ${storeName}.\n\n\n\nWarm regards,\n${storeName}\n\n---\nOn ${fmtDate(m.createdAt, true)}, ${m.name} wrote:\n${quoted}`)}`;
  const wa = waNumber(m.phone);
  const waHref = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${firstName(m.name)}, this is ${storeName} replying to your message. `)}` : null;

  return (
    <article className="a-card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-4">
        <div className="flex min-w-0 items-start gap-3">
          <button type="button" className="a-btn a-btn-ghost a-btn-sm a-btn-icon lg:hidden" onClick={onBack} aria-label="Back to inbox">
            <ChevronLeft />
          </button>
          <div className="grid h-11 w-11 flex-none place-items-center rounded-full border border-gold/40 bg-gold/10 font-display text-xl text-gold-2">{m.name.trim().slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold">{m.name}</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-mute">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" /> {m.email}
              </span>
              {m.phone && (
                <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 hover:text-bone">
                  <Phone className="h-3 w-3" /> {m.phone}
                </a>
              )}
            </div>
            <div className="a-num mt-0.5 text-[11px] text-mute">{fmtDate(m.createdAt, true)} IST · {timeAgo(m.createdAt)}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={onToggleRead}>
            {m.isRead ? <Mail /> : <MailOpen />} {m.isRead ? "Mark unread" : "Mark read"}
          </button>
          {canDelete && (
            <ConfirmButton className="a-btn a-btn-ghost a-btn-sm a-btn-icon" ariaLabel="Delete message" title="Delete this message?" message={`The message from ${m.name} will be permanently deleted.`} confirmLabel="Delete" onConfirm={onDelete}>
              <Trash2 />
            </ConfirmButton>
          )}
        </div>
      </header>

      <div className="whitespace-pre-wrap break-words p-5 text-[14px] leading-relaxed text-bone-2">{m.message}</div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-ink/40 p-4">
        <a href={mailto} className="a-btn a-btn-gold">
          <Mail /> Reply by email
        </a>
        {waHref ? (
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="a-btn">
            <MessageCircle className="text-lume" /> WhatsApp
          </a>
        ) : (
          <span className="text-[11.5px] text-mute">No phone number — WhatsApp unavailable</span>
        )}
        <CopyButton text={m.email} label="Copy email" className="a-btn a-btn-ghost ml-auto" />
      </footer>
    </article>
  );
}

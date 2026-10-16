"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { addressSchema, fieldErrors, issuesToErrors } from "@/lib/validators";
import { cn } from "@/lib/utils";
import AddressFields from "@/components/commerce/AddressFields";

const EASE = [0.22, 1, 0.36, 1];
const EMPTY = { name: "", phone: "", line1: "", line2: "", landmark: "", pincode: "", city: "", state: "", isDefault: false };

export default function AddressBook({ initial, defaults }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState(null); // null | "new" | id
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);

  const refresh = async () => {
    const res = await fetch("/api/account/addresses", { cache: "no-store" });
    if (res.ok) setList((await res.json()).addresses);
  };

  const open = (a) => {
    setErrors({});
    setError("");
    if (a) {
      setEditing(a.id);
      setForm({ ...EMPTY, ...a, line2: a.line2 || "", landmark: a.landmark || "" });
    } else {
      setEditing("new");
      setForm({ ...EMPTY, name: defaults?.name || "", phone: defaults?.phone || "", isDefault: list.length === 0 });
    }
  };

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  async function save(e) {
    e.preventDefault();
    setError("");
    const parsed = addressSchema.safeParse(form);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      document.getElementById(`ab-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const isNew = editing === "new";
      const res = await fetch(isNew ? "/api/account/addresses" : `/api/account/addresses/${editing}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.issues) setErrors(issuesToErrors(data.issues));
        throw new Error(data.error || "Couldn't save the address");
      }
      toast.success(isNew ? "Address saved" : "Address updated");
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function act(id, kind) {
    setPending(`${kind}:${id}`);
    try {
      const res = await fetch(`/api/account/addresses/${id}`, {
        method: kind === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: kind === "delete" ? undefined : JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Something went wrong");
      toast.success(kind === "delete" ? "Address removed" : "Default address updated");
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-bone sm:text-xl">My Addresses</h1>
        {editing === null && list.length < 10 && (
          <button type="button" onClick={() => open(null)} className="btn btn-ghost btn-sm">
            <Plus className="size-4" strokeWidth={2} /> Add new
          </button>
        )}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {editing !== null ? (
          <motion.form
            key="form"
            onSubmit={save}
            noValidate
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="mt-4 rounded-xl border border-line bg-white p-4 sm:p-5"
            aria-label={editing === "new" ? "New address" : "Edit address"}
          >
            <p className="mb-4 text-[16px] font-bold text-bone">{editing === "new" ? "Add a new address" : "Edit address"}</p>
            <AddressFields prefix="ab" values={form} errors={errors} set={set} withPhone />
            <label className="mt-6 flex cursor-pointer items-center gap-3 text-[14px] text-bone-2">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} className="size-4 accent-[#f2600c]" />
              Make this my default address
            </label>
            <p role="alert" aria-live="assertive" className={cn("mt-5 text-[13px] text-danger", !error && "sr-only")}>
              {error}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="submit" className="btn btn-gold" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" strokeWidth={1.5} /> : "Save address"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)} disabled={busy}>
                Cancel
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {list.length ? (
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {list.map((a) => (
                  <li key={a.id} className={cn("flex flex-col rounded-xl border border-line bg-white p-4 sm:p-5", a.isDefault && "border-gold")}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[15px] font-bold text-bone">{a.name}</p>
                      {a.isDefault && <span className="rounded bg-gold-3 px-2 py-0.5 text-[11px] font-semibold text-gold-2">Default</span>}
                    </div>
                    <address className="mt-2 flex-1 text-[14px] not-italic leading-relaxed text-bone-2">
                      {a.line1}
                      {a.line2 && <>, {a.line2}</>}
                      {a.landmark && (
                        <>
                          <br />
                          Near {a.landmark}
                        </>
                      )}
                      <br />
                      {a.city}, {a.state} {a.pincode}
                      <br />
                      <span>Phone: +91 {a.phone}</span>
                    </address>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3 text-[13px] font-semibold">
                      <button type="button" onClick={() => open(a)} className="text-gold-2 hover:underline">
                        Edit
                      </button>
                      {!a.isDefault && (
                        <button type="button" onClick={() => act(a.id, "default")} disabled={!!pending} className="text-bone-2 hover:text-bone hover:underline">
                          {pending === `default:${a.id}` ? "Saving…" : "Set default"}
                        </button>
                      )}
                      <button type="button" onClick={() => act(a.id, "delete")} disabled={!!pending} className="text-mute hover:text-ember">
                        {pending === `delete:${a.id}` ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-xl border border-line bg-white px-4 py-10 text-center">
                <p className="text-[15px] text-bone-2">No saved addresses yet. Add one for a faster checkout.</p>
                <button type="button" onClick={() => open(null)} className="btn btn-gold mt-6">
                  <Plus className="size-4" strokeWidth={2} /> Add address
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

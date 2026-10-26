"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, PlugZap, Trash2 } from "lucide-react";
import { api } from "@/components/admin/fetcher";
import { Pill, Spinner } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

const when = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

/**
 * NVIDIA API key manager (Settings → AI). The key is sent once to the server, verified against NVIDIA,
 * then stored encrypted; afterwards only its last 4 characters are ever shown.
 */
export default function NvidiaKeyCard({ isAdmin }) {
  const router = useRouter();
  const [st, setSt] = useState(null);
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState("");

  const load = () =>
    api("/api/admin/integrations/nvidia")
      .then(setSt)
      .catch((e) => toast.error(e.message));
  useEffect(() => {
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy("save");
    try {
      const res = await api("/api/admin/integrations/nvidia", { method: "PUT", body: { apiKey: key } });
      setSt(res);
      setKey("");
      toast.success(`Key verified and saved — ${res.test?.textModel} replied "${res.test?.reply || "OK"}"`);
      router.refresh(); // AI pills/buttons across the admin pick up the new state
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy("");
    }
  };

  const test = async () => {
    setBusy("test");
    try {
      const { test: t } = await api("/api/admin/integrations/nvidia", { method: "POST" });
      t.ok ? toast.success(`Connection OK — ${t.textModel} is responding`) : toast.error(t.error);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!confirm("Remove the saved NVIDIA key? AI features will stop unless a server key is set.")) return;
    setBusy("remove");
    try {
      setSt(await api("/api/admin/integrations/nvidia", { method: "DELETE" }));
      toast.success("Key removed");
      router.refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy("");
    }
  };

  const ok = st?.configured;
  return (
    <div className={cn("mx-4 mt-4 rounded-xl border p-4", ok ? "border-lume/25 bg-lume/[.04]" : "border-danger/30 bg-danger/[.04]")}>
      <div className="flex flex-wrap items-center gap-2">
        <KeyRound className={cn("h-4 w-4", ok ? "text-lume" : "text-danger")} />
        <span className="text-[13px] font-semibold">NVIDIA API key</span>
        {!st ? (
          <Spinner className="h-3.5 w-3.5" />
        ) : (
          <Pill tone={ok ? "lume" : "danger"}>{ok ? (st.source === "admin" ? "Active · set in admin" : "Active · server .env") : "Not configured"}</Pill>
        )}
      </div>

      {st?.stored && (
        <p className="mt-2 text-[12.5px] text-mute">
          Saved key ending <span className="font-mono text-bone">••••{st.stored.last4}</span>
          {st.stored.updatedAt && <> · updated {when(st.stored.updatedAt)}</>}
          {st.stored.updatedBy && <> by {st.stored.updatedBy}</>}
          {st.stored.unreadable && <span className="ml-1 text-danger">— can’t be decrypted (server secret changed); please re-enter it.</span>}
        </p>
      )}
      {st && !st.stored && st.envFallback && <p className="mt-2 text-[12.5px] text-mute">Using the key from the server’s .env file. Saving one here overrides it.</p>}
      {st && !ok && (
        <p className="mt-2 text-[12.5px] text-mute">
          AI features (photo → product, SEO, concierge, insights) are off. Create a key at{" "}
          <a href="https://build.nvidia.com" target="_blank" rel="noreferrer" className="font-medium text-gold underline">
            build.nvidia.com
          </a>{" "}
          and paste it below.
        </p>
      )}

      {isAdmin ? (
        <form method="post" onSubmit={save} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <input
              type={show ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={st?.stored ? "Paste a new key to replace the saved one" : "nvapi-…"}
              autoComplete="off"
              spellCheck={false}
              className="a-input w-full pr-10 font-mono text-[13px]"
              aria-label="NVIDIA API key"
            />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-mute hover:text-bone" aria-label={show ? "Hide key" : "Show key"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button type="submit" disabled={!key.trim() || !!busy} className="a-btn a-btn-gold whitespace-nowrap">
            {busy === "save" ? <Spinner className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />} Verify &amp; save
          </button>
        </form>
      ) : (
        <p className="mt-3 text-[12px] text-mute">Only an ADMIN can change the key.</p>
      )}

      {ok && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={test} disabled={!!busy} className="a-btn a-btn-ghost a-btn-sm">
            {busy === "test" ? <Spinner className="h-3.5 w-3.5" /> : <PlugZap className="h-3.5 w-3.5" />} Test connection
          </button>
          {isAdmin && st?.stored && (
            <button type="button" onClick={remove} disabled={!!busy} className="a-btn a-btn-ghost a-btn-sm text-danger">
              {busy === "remove" ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />} Remove saved key
            </button>
          )}
        </div>
      )}
      <p className="mt-3 text-[11.5px] text-mute">The key is checked with NVIDIA before saving, stored encrypted on the server, and never shown again after saving.</p>
    </div>
  );
}

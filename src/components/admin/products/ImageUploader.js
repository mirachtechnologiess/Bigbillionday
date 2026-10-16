"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, GripVertical, ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadImage } from "../fetcher";
import { Spinner } from "../ui";

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX = 10 * 1024 * 1024;
let tmpSeq = 0;

/**
 * Multi-image uploader: drag & drop / paste / pick, parallel uploads with local previews,
 * drag-to-reorder, set cover (= first), delete, alt text per image.
 * images: [{url, alt, width, height, blurData}]
 */
export default function ImageUploader({ images, onChange, onUploaded, analysing = false, aiAltKeys = new Set() }) {
  const [pending, setPending] = useState([]); // [{id, preview, name}]
  const [over, setOver] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const inputRef = useRef(null);
  const latest = useRef(images);
  latest.current = images;

  const addFiles = async (fileList) => {
    const files = [...(fileList || [])].filter((f) => {
      if (!ACCEPT.includes(f.type)) {
        toast.error(`${f.name}: use JPG, PNG, WebP or AVIF`);
        return false;
      }
      if (f.size > MAX) {
        toast.error(`${f.name}: larger than 10MB`);
        return false;
      }
      return true;
    });
    if (!files.length) return;
    const room = 20 - latest.current.length;
    const batch = files.slice(0, room);
    if (files.length > room) toast.warning("Max 20 images per product");
    const temps = batch.map((f) => ({ id: `t${++tmpSeq}`, preview: URL.createObjectURL(f), name: f.name, file: f }));
    setPending((p) => [...p, ...temps]);
    const results = await Promise.all(
      temps.map(async (t) => {
        try {
          const r = await uploadImage(t.file, "products");
          return { url: r.url, width: r.width, height: r.height, blurData: r.blurData, alt: "" };
        } catch (e) {
          toast.error(`${t.name}: ${e.message}`);
          return null;
        } finally {
          setPending((p) => p.filter((x) => x.id !== t.id));
          URL.revokeObjectURL(t.preview);
        }
      })
    );
    const added = results.filter(Boolean);
    if (added.length) {
      const next = [...latest.current, ...added];
      onChange(next);
      onUploaded?.(added, next);
    }
  };

  const move = (from, to) => {
    if (from === to || from === null) return;
    const next = [...images];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };

  return (
    <div
      onPaste={(e) => {
        const files = [...(e.clipboardData?.files || [])];
        if (files.length) addFiles(files);
      }}
    >
      {images.length === 0 && pending.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "a-dots group relative flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center transition-colors",
            over ? "border-gold bg-gold/5" : "border-line-2 hover:border-gold/60"
          )}
        >
          <span className="grid h-14 w-14 place-items-center rounded-full border border-gold/30 bg-gold/10 transition-transform group-hover:scale-105">
            <UploadCloud className="h-6 w-6 text-gold" />
          </span>
          <span className="font-display text-2xl leading-none">Drop watch photos here</span>
          <span className="max-w-sm text-[12.5px] text-mute">
            JPG, PNG, WebP or AVIF up to 10MB each. The first photo is the cover — AI reads it to fill in the whole listing.
          </span>
          <span className="a-btn a-btn-sm mt-1">
            <ImagePlus /> Choose files
          </span>
        </button>
      ) : (
        <div
          className={cn("grid grid-cols-3 gap-2 rounded-2xl p-1 transition-colors sm:grid-cols-4 xl:grid-cols-5", over && "bg-gold/5 outline outline-1 outline-dashed outline-gold")}
          onDragOver={(e) => {
            if (dragIdx === null) {
              e.preventDefault();
              setOver(true);
            }
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            if (dragIdx === null && e.dataTransfer.files?.length) {
              e.preventDefault();
              setOver(false);
              addFiles(e.dataTransfer.files);
            }
          }}
        >
          <AnimatePresence initial={false}>
            {images.map((im, i) => (
              <motion.div
                layout
                key={im.url}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                draggable
                onDragStart={(e) => {
                  setDragIdx(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnter={() => {
                  if (dragIdx !== null && dragIdx !== i) {
                    move(dragIdx, i);
                    setDragIdx(i);
                  }
                }}
                onDragOver={(e) => dragIdx !== null && e.preventDefault()}
                onDragEnd={() => setDragIdx(null)}
                className={cn("group relative", i === 0 && "col-span-2 row-span-2", dragIdx === i && "opacity-40")}
              >
                <div className={cn("relative aspect-square overflow-hidden rounded-xl border bg-ink-3", i === 0 ? "border-gold/50" : "border-line", i === 0 && analysing && "a-scan")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt={im.alt || ""} className="h-full w-full object-cover" draggable={false} />
                  <span className="absolute left-1.5 top-1.5 flex items-center gap-1">
                    <span className="grid h-6 w-6 cursor-grab place-items-center rounded-md bg-white/90 text-bone-2 opacity-0 shadow-sm backdrop-blur group-hover:opacity-100" title="Drag to reorder">
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                    {i === 0 && <span className="rounded-md bg-gold px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-white">Cover</span>}
                  </span>
                  <span className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {i !== 0 && (
                      <button type="button" className="a-btn a-btn-sm a-btn-icon !bg-white/90 backdrop-blur" title="Set as cover" aria-label="Set as cover" onClick={() => move(i, 0)}>
                        <Crown />
                      </button>
                    )}
                    <button type="button" className="a-btn a-btn-sm a-btn-icon !bg-white/90 backdrop-blur hover:!text-danger" title="Remove" aria-label="Remove image" onClick={() => onChange(images.filter((_, j) => j !== i))}>
                      <Trash2 />
                    </button>
                  </span>
                  {im.width && <span className="absolute bottom-1.5 right-1.5 rounded bg-white/90 px-1 font-mono text-[9.5px] text-bone-2 opacity-0 group-hover:opacity-100">{im.width}×{im.height}</span>}
                </div>
                <input
                  value={im.alt || ""}
                  onChange={(e) => onChange(images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                  placeholder="Alt text"
                  className={cn("a-input a-input-sm mt-1 !text-[11px]", aiAltKeys.has(im.url) && "ai-touched")}
                  aria-label={`Alt text for image ${i + 1}`}
                />
              </motion.div>
            ))}
            {pending.map((p) => (
              <motion.div key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative aspect-square overflow-hidden rounded-xl border border-line bg-ink-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="h-full w-full object-cover opacity-50 blur-[1px]" />
                <span className="absolute inset-0 grid place-items-center">
                  <Spinner className="text-gold" />
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {images.length + pending.length < 20 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-2 text-[11px] text-mute transition-colors hover:border-gold hover:text-gold-2"
            >
              <ImagePlus className="h-5 w-5" /> Add
            </button>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT.join(",")}
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

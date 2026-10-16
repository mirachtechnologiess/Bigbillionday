import s from "./marquee.module.css";

/**
 * Pure-CSS infinite marquee (server-component friendly, zero JS). Pauses on hover.
 * Content renders twice; the duplicate is aria-hidden + inert so it is read/focused once.
 */
export default function Marquee({ children, duration = 40, reverse = false, pauseOnHover = true, fade = true, gap = "0px", className = "" }) {
  const cls = [s.root, reverse && s.reverse, pauseOnHover && s.pause, fade && s.fade, className].filter(Boolean).join(" ");
  return (
    <div className={cls} style={{ "--duration": `${duration}s`, "--gap": gap }}>
      <div className={s.track}>{children}</div>
      <div className={s.track} aria-hidden="true" inert>
        {children}
      </div>
    </div>
  );
}

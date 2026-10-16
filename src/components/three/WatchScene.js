"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import WatchModel, { EXPLODE } from "./WatchModel";
import { COLORWAYS } from "./colorways";

const clamp01 = (x) => Math.min(1, Math.max(0, x));
/** smoothstep between a and b */
const ss = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const lerp = THREE.MathUtils.lerp;
const damp = THREE.MathUtils.damp;

const CAM_Z = 7.2;
const FOV = 30;
const LAYERS = ["crystal", "bezel", "hands", "dial", "case", "movement", "strap"];

/**
 * Scroll story, driven by progressRef.current (0..1) written by GSAP ScrollTrigger:
 *   0.00–0.08  hero: face-on, offset to the side, idle float
 *   0.08–0.30  turn to profile, then caseback (exhibition back, spinning rotor)
 *   0.30–0.46  swing round to a 3/4 front view, centre
 *   0.40–0.58  explode into layers, callouts fade in (0.50–0.60)
 *   0.72–0.86  reassemble
 *   0.82–1.00  settle to the side as closing copy appears
 * Plus an intro (lights fade up, dolly-in, edge-on → face-on, soft white rim sweep) on mount.
 * Lit for a WHITE page: neutral studio env, crisp key light, strong contact shadow, no gold glow.
 */
function Rig({ progressRef, pointer, mobile, onReady, intro }) {
  const outer = useRef();
  const tilt = useRef();
  const model = useRef();
  const key = useRef();
  const rim = useRef();
  const fill = useRef();
  const labels = useRef({ labels: 0 });
  const s = useRef({ p: 0, t0: null, frames: 0, mx: 0, my: 0 });
  const { camera, scene } = useThree();
  const colorway = intro.colorway;

  useFrame((state, dt) => {
    const st = s.current;
    const t = state.clock.elapsedTime;
    if (st.t0 == null) st.t0 = t;
    if (st.frames < 3 && ++st.frames === 3) onReady?.();
    dt = Math.min(dt, 0.05);

    // Intro 0..1 (skipped when `intro.skip`).
    const it = intro.skip ? 1 : clamp01((t - st.t0 - 0.1) / 2.6);
    const io = easeOutExpo(it);
    const sweep = intro.skip ? 1 : clamp01((t - st.t0 - 0.5) / 2.2);

    st.p = damp(st.p, progressRef.current || 0, 5, dt);
    const p = st.p;

    // Visible world width at the watch plane (for responsive placement).
    const H = 2 * Math.tan((FOV * Math.PI) / 360) * CAM_Z;
    const W = H * (state.size.width / Math.max(1, state.size.height));

    // Scroll phases.
    const turnBack = ss(0.08, 0.3, p);
    const turnFront = ss(0.3, 0.46, p);
    const explode = ss(0.4, 0.58, p) * (1 - ss(0.72, 0.86, p));
    const settle = ss(0.82, 1, p);
    labels.current.labels = ss(0.5, 0.6, p) * (1 - ss(0.68, 0.74, p));

    // Placement.
    const centre = Math.max(turnFront, ss(0.2, 0.4, p)) * (1 - settle);
    let x, y, scale;
    if (mobile) {
      x = 0;
      y = lerp(lerp(H * 0.13, 0, centre), H * 0.16, settle);
      scale = lerp(lerp(0.6, 0.48, explode), 0.52, settle);
    } else {
      x = lerp(lerp(W * 0.19, -W * 0.02, centre), W * 0.2, settle);
      y = lerp(0, 0.05, explode);
      scale = lerp(lerp(0.95, 0.74, explode), 0.88, settle);
    }

    // Rotation (edge-on → face-on during intro, then the scroll choreography).
    const rotIntro = (1 - io) * -Math.PI * 0.48;
    const rotY = rotIntro + turnBack * Math.PI + turnFront * (Math.PI - 0.72) + settle * (0.72 - 0.38 + (mobile ? 0.3 : 0));
    const rotX = (1 - io) * 0.35 + explode * 0.2 + Math.sin(t * 0.6) * 0.025;
    const rotZ = Math.sin(t * 0.45) * 0.02 - settle * 0.08;

    const o = outer.current;
    if (o) {
      o.position.x = damp(o.position.x, x, 6, dt);
      o.position.y = damp(o.position.y, y + Math.sin(t * 0.8) * 0.035, 6, dt);
      o.scale.setScalar(damp(o.scale.x, scale, 6, dt));
      o.rotation.set(rotX, rotY, rotZ);
    }

    // Mouse parallax tilt (desktop).
    st.mx = damp(st.mx, pointer.current.x, 3, dt);
    st.my = damp(st.my, pointer.current.y, 3, dt);
    if (tilt.current) tilt.current.rotation.set(-st.my * 0.16, st.mx * 0.26, 0);

    // Exploded layers.
    const m = model.current;
    if (m) {
      for (const k of LAYERS) {
        const g = m[k];
        if (!g) continue;
        g.position.z = EXPLODE[k] * explode + (k === "movement" ? -0.12 : 0);
        if (k === "strap") g.scale.setScalar(1 - explode * 0.12);
        if (k === "bezel") g.rotation.z = explode * 0.6;
        if (k === "dial") g.rotation.z = -explode * 0.12;
      }
    }

    // Camera dolly-in + subtle drift.
    camera.position.z = lerp(13, CAM_Z, io) - explode * 0.4;
    camera.position.x = st.mx * 0.15;
    camera.position.y = st.my * 0.1;
    camera.lookAt(0, 0, 0);

    // Lights fade up; a soft neutral rim light sweeps across once (gold rim looked muddy on white).
    scene.environmentIntensity = 0.35 + io * 0.5;
    if (key.current) key.current.intensity = io * 2.6;
    if (fill.current) fill.current.intensity = io * 0.6;
    if (rim.current) {
      const sx = lerp(-7, 7, sweep);
      rim.current.position.set(sx, 2.5, -2 + sweep * 3);
      rim.current.intensity = 3 * Math.sin(Math.PI * sweep) + 0.8 * io + turnBack * (1 - turnFront) * 1.5;
    }
  });

  return (
    <>
      <ambientLight intensity={0.22} />
      <directionalLight ref={key} position={[3, 4, 6]} intensity={0} color="#ffffff" />
      <directionalLight ref={fill} position={[-5, -2, 3]} intensity={0} color="#eef2f7" />
      <spotLight ref={rim} position={[-7, 2.5, -2]} angle={0.7} penumbra={1} intensity={0} color="#ffffff" distance={20} decay={0} />
      <group ref={outer}>
        <group ref={tilt}>
          <WatchModel ref={model} colorway={COLORWAYS[colorway] || COLORWAYS.steel} low={intro.low} brand={intro.brand} state={labels} />
        </group>
      </group>
    </>
  );
}

/** Studio reflections from Lightformers — no HDR download. Rendered once (frames=1). Neutral whites so steel reads clean on a white page. */
function Studio() {
  return (
    <Environment resolution={256} frames={1} environmentIntensity={1}>
      <group rotation={[-Math.PI / 3, 0, 1]}>
        <Lightformer form="circle" intensity={4} color="#ffffff" position={[0, 5, -9]} scale={2} />
        <Lightformer form="circle" intensity={2} position={[-5, 1, -1]} scale={2} />
        <Lightformer form="circle" intensity={1.6} color="#f3f4f6" position={[-5, -1, -1]} scale={2} />
        <Lightformer form="circle" intensity={2} position={[10, 1, 0]} scale={8} />
      </group>
      <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 6, 2]} scale={[10, 1, 1]} rotation={[Math.PI / 2, 0, 0]} />
      <Lightformer form="rect" intensity={2.2} color="#f5f5f4" position={[-6, 0, 2]} scale={[1, 10, 1]} rotation={[0, Math.PI / 2, 0]} />
      <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[6, 0, 2]} scale={[1, 10, 1]} rotation={[0, -Math.PI / 2, 0]} />
      <Lightformer form="ring" intensity={1.2} color="#ffffff" position={[0, 0, 8]} scale={6} />
    </Environment>
  );
}

/**
 * The hero canvas. Mount via next/dynamic({ ssr:false }) only.
 * Props: progressRef ({current:0..1}), colorway ('steel'|'gold'|'noir'), active (render loop on/off),
 * low (lighter geometry, no shadows), mobile, skipIntro, brand, onReady.
 */
export default function WatchScene({ progressRef, colorway = "steel", active = true, low = false, mobile = false, skipIntro = false, brand, onReady }) {
  const pointer = useRef({ x: 0, y: 0 });
  const fallbackProgress = useRef(0);

  useEffect(() => {
    if (mobile || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mobile]);

  return (
    <Canvas
      dpr={low ? [1, 1.4] : [1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
      camera={{ position: [0, 0, 13], fov: FOV, near: 0.1, far: 60 }}
      frameloop={active ? "always" : "never"}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <Studio />
      <Rig
        progressRef={progressRef || fallbackProgress}
        pointer={pointer}
        mobile={mobile}
        onReady={onReady}
        intro={{ skip: skipIntro, low, brand: brand || "BIGBILLIONDAY", colorway }}
      />
      {/* Stronger, slightly cool contact shadow grounds the steel on a white page (cheaper map on low-end). */}
      <ContactShadows position={[0, -2.15, 0]} opacity={0.72} scale={9} blur={2.4} far={4.5} resolution={low ? 128 : 256} color="#1f2430" />
    </Canvas>
  );
}

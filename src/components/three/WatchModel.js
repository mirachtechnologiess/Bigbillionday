"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { bezelGeometry, caseGeometry, crownGeometry, crystalGeometry, handGeometry, rotorGeometry, roundedBox } from "./geometry";
import { createDialTexture } from "./dialTexture";

const TAU = Math.PI * 2;
/** Applied indices: doubled baton at 12, none at 3 (date window). */
const INDICES = Array.from({ length: 12 }, (_, h) => h)
  .filter((h) => h !== 3)
  .flatMap((h) => {
    const a = (h / 12) * TAU;
    const r = 0.66;
    if (h === 0) return [-0.04, 0.04].map((ox) => ({ key: `0${ox}`, pos: [ox, r, 0.053], rot: 0 }));
    return [{ key: String(h), pos: [Math.sin(a) * r, Math.cos(a) * r, 0.053], rot: -a }];
  });

/** Explode offsets (local Z) per layer, used by the scroll rig. */
export const EXPLODE = {
  crystal: 1.55,
  bezel: 1.1,
  hands: 0.72,
  dial: 0.36,
  case: 0,
  movement: -0.78,
  strap: -1.3,
};

/**
 * Callout: thin saffron leader line + white label pill (light theme), fades with `state.labels` (0..1) owned by the rig.
 * Lives inside a layer group so it travels with that layer when exploded.
 */
function Callout({ state, anchor, dir = 1, reach = 0.9, drop = 0.32, title, sub }) {
  const html = useRef(null);
  const { line, mat } = useMemo(() => {
    const [ax, ay, az] = anchor;
    const pts = [new THREE.Vector3(ax, ay, az), new THREE.Vector3(ax + 0.22, ay + dir * drop, az), new THREE.Vector3(ax + reach, ay + dir * drop, az)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineBasicMaterial({ color: "#f2600c", transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    return { line: new THREE.Line(geo, m), mat: m };
  }, [anchor, dir, reach, drop]);
  useEffect(() => () => {
    line.geometry.dispose();
    mat.dispose();
  }, [line, mat]);

  useFrame(() => {
    const o = state.current.labels;
    mat.opacity = o * 0.9;
    line.visible = o > 0.01;
    if (html.current) {
      html.current.style.opacity = String(o);
      html.current.style.transform = `translate3d(${(1 - o) * -10}px, -50%, 0)`;
    }
  });

  return (
    <group>
      <primitive object={line} />
      <mesh position={anchor}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color="#f2600c" toneMapped={false} />
      </mesh>
      <Html position={[anchor[0] + reach, anchor[1] + dir * drop, anchor[2]]} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
        <div
          ref={html}
          style={{
            opacity: 0,
            whiteSpace: "nowrap",
            marginLeft: 8,
            padding: "7px 14px 8px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.94)",
            border: "1px solid rgba(17,24,39,0.12)",
            boxShadow: "0 6px 18px -8px rgba(17,24,39,0.25)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.2em",
            transform: "translate3d(0,-50%,0)",
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "#15171c" }}>{title}</div>
          {sub ? <div style={{ fontSize: 9.5, color: "#6b7280", marginTop: 3, letterSpacing: "0.12em" }}>{sub}</div> : null}
        </div>
      </Html>
    </group>
  );
}

function StrapLink({ i, n, dir, geo, mat, len, bend }) {
  if (i >= n) return null;
  return (
    <group position={[0, i === 0 ? 0 : dir * len, 0]} rotation={[-dir * bend * (i === 0 ? 0.3 : 1), 0, 0]}>
      <mesh geometry={geo} material={mat} position={[0, (dir * len) / 2, 0]} />
      <StrapLink i={i + 1} n={n} dir={dir} geo={geo} mat={mat} len={len} bend={bend} />
    </group>
  );
}

/**
 * Procedural luxury watch. Exposes its layer groups via ref:
 * { root, crystal, bezel, hands, dial, case, movement, strap } so a rig can explode it.
 */
const WatchModel = forwardRef(function WatchModel({ colorway, low = false, brand = "BIGBILLIONDAY", state }, ref) {
  const root = useRef();
  const crystal = useRef();
  const bezel = useRef();
  const hands = useRef();
  const dial = useRef();
  const caseG = useRef();
  const movement = useRef();
  const strap = useRef();
  const hourH = useRef();
  const minH = useRef();
  const secH = useRef();
  const rotor = useRef();
  const balance = useRef();

  useImperativeHandle(ref, () => ({
    root: root.current,
    crystal: crystal.current,
    bezel: bezel.current,
    hands: hands.current,
    dial: dial.current,
    case: caseG.current,
    movement: movement.current,
    strap: strap.current,
  }));

  const { caseColor, caseRoughness, dialColor, dialAccent, handColor, strapColor, caseLabel } = colorway;

  // ── Geometry (detail scales with device tier) ──
  const geo = useMemo(
    () => ({
      case: caseGeometry(low ? 72 : 160),
      bezel: bezelGeometry(low ? 180 : 360, low ? 45 : 60),
      crystal: crystalGeometry(low ? 32 : 64),
      dial: new THREE.CircleGeometry(0.9, low ? 48 : 96),
      index: new THREE.BoxGeometry(0.045, 0.13, 0.026),
      hour: handGeometry({ length: 0.46, width: 0.062, tail: 0.09 }),
      minute: handGeometry({ length: 0.72, width: 0.045, tail: 0.11 }),
      second: new THREE.BoxGeometry(0.011, 0.98, 0.006).translate(0, 0.31, 0),
      lumeH: handGeometry({ length: 0.34, width: 0.026, tail: -0.12, depth: 0.004 }),
      lumeM: handGeometry({ length: 0.6, width: 0.018, tail: -0.14, depth: 0.004 }),
      cap: new THREE.CylinderGeometry(0.035, 0.035, 0.03, 24).rotateX(Math.PI / 2),
      plate: new THREE.CylinderGeometry(0.84, 0.84, 0.05, low ? 48 : 96).rotateX(Math.PI / 2),
      rotor: rotorGeometry(low ? 24 : 56),
      gear: new THREE.CylinderGeometry(1, 1, 0.025, 18).rotateX(Math.PI / 2),
      balance: new THREE.TorusGeometry(0.15, 0.012, 8, 40),
      jewel: new THREE.SphereGeometry(0.022, 10, 10),
      backGlass: new THREE.CircleGeometry(0.62, 48),
      crown: crownGeometry(low ? 16 : 26),
      stem: new THREE.CylinderGeometry(0.04, 0.04, 0.1, 12).rotateZ(Math.PI / 2),
      lug: roundedBox(0.17, 0.44, 0.2, 0.05, low ? 2 : 4),
      strap: roundedBox(0.8, 0.38, 0.085, 0.035, low ? 2 : 3),
    }),
    [low]
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  const dialTex = useMemo(() => createDialTexture({ size: low ? 512 : 1024, dialColor, accent: dialAccent, brand }), [low, dialColor, dialAccent, brand]);
  useEffect(() => () => dialTex.dispose(), [dialTex]);

  // ── Materials ──
  const mat = useMemo(() => {
    const metal = new THREE.MeshPhysicalMaterial({ color: caseColor, metalness: 1, roughness: caseRoughness, clearcoat: 0.6, clearcoatRoughness: 0.12, side: THREE.DoubleSide });
    const polished = new THREE.MeshStandardMaterial({ color: caseColor, metalness: 1, roughness: Math.max(0.1, caseRoughness - 0.1), side: THREE.DoubleSide });
    const gold = new THREE.MeshStandardMaterial({ color: "#d9b876", metalness: 1, roughness: 0.24 });
    return {
      metal,
      polished,
      gold,
      dial: new THREE.MeshStandardMaterial({ map: dialTex, metalness: 0.45, roughness: 0.36 }),
      index: new THREE.MeshStandardMaterial({ color: dialAccent === "#1a1a1c" ? "#d9b876" : handColor, metalness: 1, roughness: 0.18 }),
      hand: new THREE.MeshStandardMaterial({ color: handColor, metalness: 1, roughness: 0.2 }),
      lume: new THREE.MeshStandardMaterial({ color: "#e9f7df", emissive: "#b8f2a0", emissiveIntensity: 0.35, roughness: 0.6 }),
      second: new THREE.MeshStandardMaterial({ color: "#c9a96e", metalness: 1, roughness: 0.25 }),
      crystal: new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        metalness: 0,
        roughness: 0.02,
        transparent: true,
        opacity: 0.16,
        clearcoat: 1,
        clearcoatRoughness: 0,
        envMapIntensity: 2.2,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      plate: new THREE.MeshStandardMaterial({ color: "#8e9096", metalness: 1, roughness: 0.42 }),
      jewel: new THREE.MeshPhysicalMaterial({ color: "#9e0f2c", roughness: 0.05, metalness: 0, clearcoat: 1 }),
      strap: new THREE.MeshStandardMaterial({ color: strapColor, roughness: 0.62, metalness: 0.05 }),
    };
  }, [caseColor, caseRoughness, dialTex, dialAccent, handColor, strapColor]);
  useEffect(() => () => Object.values(mat).forEach((m) => m.dispose()), [mat]);

  // ── Live time + movement animation ──
  useFrame((_, dt) => {
    const d = new Date();
    const s = d.getSeconds() + d.getMilliseconds() / 1000;
    const m = d.getMinutes() + s / 60;
    const h = (d.getHours() % 12) + m / 60;
    if (secH.current) secH.current.rotation.z = -(s / 60) * TAU;
    if (minH.current) minH.current.rotation.z = -(m / 60) * TAU;
    if (hourH.current) hourH.current.rotation.z = -(h / 12) * TAU;
    if (rotor.current) rotor.current.rotation.z += dt * 0.6;
    if (balance.current) balance.current.rotation.z = Math.sin(performance.now() * 0.018) * 1.4;
  });

  return (
    <group ref={root}>
      {/* Sapphire crystal */}
      <group ref={crystal}>
        <mesh geometry={geo.crystal} material={mat.crystal} renderOrder={10} />
        <Callout state={state} anchor={[-0.55, 0.62, 0.26]} dir={1} reach={1.05} title="SAPPHIRE CRYSTAL" sub="Domed · anti-reflective" />
      </group>

      {/* Fluted bezel */}
      <group ref={bezel}>
        <mesh geometry={geo.bezel} material={mat.polished} />
        <Callout state={state} anchor={[-0.3, -1.0, 0.24]} dir={-1} reach={1.0} drop={0.55} title="FLUTED BEZEL" sub="Hand-polished, 60 flutes" />
      </group>

      {/* Hands */}
      <group ref={hands} position={[0, 0, 0.065]}>
        <group ref={hourH}>
          <mesh geometry={geo.hour} material={mat.hand} />
          <mesh geometry={geo.lumeH} material={mat.lume} position={[0, 0, 0.012]} />
        </group>
        <group ref={minH} position={[0, 0, 0.016]}>
          <mesh geometry={geo.minute} material={mat.hand} />
          <mesh geometry={geo.lumeM} material={mat.lume} position={[0, 0, 0.012]} />
        </group>
        <group ref={secH} position={[0, 0, 0.034]}>
          <mesh geometry={geo.second} material={mat.second} />
          <mesh position={[0, 0.6, 0.004]} material={mat.lume}>
            <circleGeometry args={[0.022, 20]} />
          </mesh>
        </group>
        <mesh geometry={geo.cap} material={mat.second} position={[0, 0, 0.045]} />
        <Callout state={state} anchor={[0.05, 0.55, 0.04]} dir={1} reach={0.95} title="SWORD HANDS" sub="Super-LumiNova filled" />
      </group>

      {/* Dial + applied indices */}
      <group ref={dial}>
        <mesh geometry={geo.dial} material={mat.dial} position={[0, 0, 0.04]} />
        {INDICES.map(({ key, pos, rot }) => (
          <mesh key={key} geometry={geo.index} material={mat.index} position={pos} rotation={[0, 0, rot]} />
        ))}
        <Callout state={state} anchor={[0.35, -0.6, 0.05]} dir={-1} reach={1.45} drop={0.12} title="SUNBURST DIAL" sub="Applied hour markers" />
      </group>

      {/* Case, lugs, crown, exhibition back */}
      <group ref={caseG}>
        <mesh geometry={geo.case} material={mat.metal} />
        <mesh geometry={geo.backGlass} material={mat.crystal} position={[0, 0, -0.268]} rotation={[0, Math.PI, 0]} />
        {[-1, 1].map((dy) =>
          [-1, 1].map((dx) => (
            <mesh key={`${dx}${dy}`} geometry={geo.lug} material={mat.metal} position={[dx * 0.5, dy * 0.98, -0.07]} rotation={[-dy * 0.16, 0, 0]} />
          ))
        )}
        <group position={[1.16, 0, -0.04]}>
          <mesh geometry={geo.stem} material={mat.polished} position={[-0.06, 0, 0]} />
          <mesh geometry={geo.crown} material={mat.polished} position={[0.04, 0, 0]} />
        </group>
        <Callout state={state} anchor={[1.08, 0.05, -0.02]} dir={1} reach={0.7} title={caseLabel} sub="41 mm · 100 m water resistant" />
      </group>

      {/* Movement */}
      <group ref={movement} position={[0, 0, -0.12]}>
        <mesh geometry={geo.plate} material={mat.plate} />
        <group ref={rotor} position={[0, 0, -0.07]}>
          <mesh geometry={geo.rotor} material={mat.gold} rotation={[Math.PI, 0, 0]} />
        </group>
        {[
          [0.36, 0.3, 0.13],
          [-0.3, 0.42, 0.09],
          [-0.42, -0.18, 0.11],
          [0.18, -0.46, 0.07],
        ].map(([x, y, r], i) => (
          <mesh key={i} geometry={geo.gear} material={mat.gold} position={[x, y, -0.035]} scale={[r, r, 1]} />
        ))}
        <group ref={balance} position={[0.44, -0.24, -0.04]}>
          <mesh geometry={geo.balance} material={mat.gold} />
        </group>
        {[
          [0.36, 0.3],
          [-0.3, 0.42],
          [-0.42, -0.18],
          [0.18, -0.46],
          [0, 0],
          [0.44, -0.24],
        ].map(([x, y], i) => (
          <mesh key={i} geometry={geo.jewel} material={mat.jewel} position={[x, y, -0.05]} />
        ))}
        <Callout state={state} anchor={[-0.6, -0.55, -0.05]} dir={-1} reach={1.15} title="AUTOMATIC CALIBRE" sub="21,600 vph · 41 h reserve" />
      </group>

      {/* Strap */}
      <group ref={strap}>
        <group position={[0, 1.2, -0.12]}>
          <StrapLink i={0} n={low ? 5 : 7} dir={1} geo={geo.strap} mat={mat.strap} len={0.36} bend={0.24} />
        </group>
        <group position={[0, -1.2, -0.12]}>
          <StrapLink i={0} n={low ? 5 : 7} dir={-1} geo={geo.strap} mat={mat.strap} len={0.36} bend={0.24} />
        </group>
        <Callout state={state} anchor={[0.42, 1.4, -0.14]} dir={1} reach={0.8} title="ITALIAN LEATHER" sub="Quick-release spring bars" />
      </group>
    </group>
  );
});

export default WatchModel;

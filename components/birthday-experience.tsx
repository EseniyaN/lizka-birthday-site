"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Html,
  OrbitControls,
  RoundedBox,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gift,
  MailOpen,
  Mic,
  Music2,
  Rotate3D,
  Sparkles as SparklesIcon,
  VolumeX,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type SelectPhoto = 1 | 2 | null;
type WishStatus = "idle" | "requesting" | "listening" | "unavailable";
type SecretKind = "glass" | "flower" | "star";

const SECRET_MESSAGES: Record<SecretKind, string> = {
  glass: "За яркие события, добрых людей и счастье без повода 🥂",
  flower: "Пусть каждый новый день раскрывается красиво, как этот цветок 🌸",
  star: "Одна маленькая звезда уже знает твоё желание ✨",
};

const PHOTO_ALBUMS: Record<1 | 2, Array<{ title: string; note: string; tone: string }>> = {
  1: [
    { title: "Самый тёплый кадр", note: "Здесь можно разместить вашу любимую фотографию", tone: "rose" },
    { title: "День, который хочется повторить", note: "Второй снимок этого маленького альбома", tone: "sunset" },
    { title: "Улыбка на память", note: "Ещё один личный момент только для Лизки", tone: "pearl" },
  ],
  2: [
    { title: "Красивое воспоминание", note: "Фотография из особенного дня", tone: "ocean" },
    { title: "Наше маленькое приключение", note: "Сюда отлично подойдёт живой совместный кадр", tone: "night" },
    { title: "Впереди ещё столько прекрасного", note: "Финальная страница мини-альбома", tone: "gold" },
  ],
};

function useLowPowerMode() {
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const compact = window.matchMedia("(max-width: 720px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const genuinelyConstrained = nav.deviceMemory !== undefined && nav.deviceMemory <= 2;
    setLowPower(reduced || (compact && genuinelyConstrained));
  }, []);

  return lowPower;
}

function useAmbientMusic(finaleActive: boolean) {
  const [musicOn, setMusicOn] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);

  const playCelebration = useCallback((accent = false) => {
    const context = contextRef.current;
    const master = masterRef.current;
    if (!context || !master) return;
    const now = context.currentTime;

    // A bright, music-box birthday arrangement in a major key.
    const melody: Array<[number, number]> = [
      [392, .24], [392, .16], [440, .4], [392, .4], [523.25, .42], [493.88, .7],
      [392, .24], [392, .16], [440, .4], [392, .4], [587.33, .42], [523.25, .7],
      [392, .24], [392, .16], [783.99, .4], [659.25, .4], [523.25, .4], [493.88, .4], [440, .68],
      [698.46, .24], [698.46, .16], [659.25, .4], [523.25, .4], [587.33, .4], [523.25, .82],
    ];
    let cursor = 0;
    melody.forEach(([frequency, duration], index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index % 3 === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, now + cursor);
      gain.gain.exponentialRampToValueAtTime(accent ? .16 : .115, now + cursor + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, now + cursor + duration * .88);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(now + cursor);
      oscillator.stop(now + cursor + duration);
      cursor += duration;
    });

    const chords = [
      [261.63, 329.63, 392],
      [196, 246.94, 392],
      [174.61, 220, 349.23],
      [196, 261.63, 392],
    ];
    chords.forEach((chord, chordIndex) => {
      chord.forEach((frequency) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        const start = now + chordIndex * 2.05;
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(accent ? .04 : .027, start + .08);
        gain.gain.exponentialRampToValueAtTime(.0001, start + 1.75);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(start);
        oscillator.stop(start + 1.8);
      });
    });
  }, []);

  const stopMusic = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    const context = contextRef.current;
    if (context && context.state !== "closed") void context.close();
    contextRef.current = null;
    masterRef.current = null;
    setMusicOn(false);
  }, []);

  const toggleMusic = useCallback(async () => {
    if (musicOn) {
      stopMusic();
      return;
    }
    const BrowserAudioContext = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!BrowserAudioContext) return;
    const context = new BrowserAudioContext();
    const master = context.createGain();
    master.gain.value = 0.28;
    master.connect(context.destination);
    contextRef.current = context;
    masterRef.current = master;
    await context.resume();
    setMusicOn(true);
    playCelebration(false);
    timerRef.current = window.setInterval(() => playCelebration(false), 10200);
  }, [musicOn, playCelebration, stopMusic]);

  useEffect(() => {
    const context = contextRef.current;
    const master = masterRef.current;
    if (!musicOn || !context || !master) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.linearRampToValueAtTime(finaleActive ? .34 : .26, context.currentTime + .45);
    if (finaleActive) playCelebration(true);
  }, [finaleActive, musicOn, playCelebration]);

  useEffect(() => stopMusic, [stopMusic]);

  return { musicOn, toggleMusic };
}

function makePhotoTexture(index: 1 | 2) {
  const canvas = document.createElement("canvas");
  canvas.width = 560;
  canvas.height = 700;
  const ctx = canvas.getContext("2d")!;
  const palettes = index === 1
    ? ["#3f1c32", "#b26d73", "#f0c9b8"]
    : ["#13293c", "#566b8a", "#d8b58e"];
  const gradient = ctx.createLinearGradient(0, 0, 560, 700);
  gradient.addColorStop(0, palettes[0]);
  gradient.addColorStop(0.58, palettes[1]);
  gradient.addColorStop(1, palettes[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 560, 700);

  const glow = ctx.createRadialGradient(150, 125, 10, 150, 125, 360);
  glow.addColorStop(0, "rgba(255,242,215,.68)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 560, 700);

  ctx.strokeStyle = "rgba(255,238,204,.42)";
  ctx.lineWidth = 3;
  for (let ring = 0; ring < 5; ring += 1) {
    ctx.beginPath();
    ctx.arc(455, 585, 64 + ring * 25, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,249,238,.96)";
  ctx.font = "500 40px Georgia, serif";
  ctx.fillText(index === 1 ? "Наши тёплые моменты" : "Красивые воспоминания", 280, 318);
  ctx.fillStyle = "rgba(255,249,238,.76)";
  ctx.font = "23px Arial, sans-serif";
  ctx.fillText("мини-альбом · 3 фотографии", 280, 364);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function WebGLFallback({ onLetter }: { onLetter: () => void }) {
  return (
    <main className="fallback-card">
      <section>
        <span className="eyebrow">Виртуальная открытка</span>
        <h1>С днём рождения, Лизка!</h1>
        <p>Пусть этот день будет тёплым, красивым и наполненным счастливыми моментами.</p>
        <button type="button" onClick={onLetter}>
          <MailOpen size={20} aria-hidden="true" /> Открыть письмо
        </button>
      </section>
    </main>
  );
}

function Smoke({ position }: { position: [number, number, number] }) {
  const smoke = useRef<THREE.Mesh>(null);
  const born = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (!smoke.current) return;
    if (born.current === null) born.current = clock.elapsedTime;
    const phase = clock.elapsedTime - born.current;
    smoke.current.position.y = position[1] + phase * 0.22;
    smoke.current.position.x = position[0] + Math.sin(phase * 4.2) * 0.05;
    const material = smoke.current.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, 0.3 - phase * 0.1);
    smoke.current.scale.setScalar(1 + phase * 0.38);
  });
  return (
    <mesh ref={smoke} position={position}>
      <sphereGeometry args={[0.055, 10, 10]} />
      <meshBasicMaterial color="#d8d2cc" transparent opacity={0.24} depthWrite={false} />
    </mesh>
  );
}

function Candle({ x, z, lit, smoke }: { x: number; z: number; lit: boolean; smoke: boolean }) {
  const flame = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!flame.current || !lit) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 12 + x * 4) * 0.11;
    flame.current.scale.set(pulse, pulse * 1.22, pulse);
    flame.current.rotation.z = Math.sin(clock.elapsedTime * 7 + z) * 0.13;
    if (light.current) light.current.intensity = 1.05 + Math.sin(clock.elapsedTime * 9 + x) * 0.18;
  });

  return (
    <group position={[x, 1.82, z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.04, 0.045, 0.5, 16]} />
        <meshStandardMaterial color={x > 0 ? "#ead1b9" : "#d9a8a4"} roughness={0.56} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.008, 0.009, 0.1, 8]} />
        <meshStandardMaterial color="#2c2221" roughness={1} />
      </mesh>
      {lit ? (
        <>
          <mesh ref={flame} position={[0, 0.37, 0]}>
            <sphereGeometry args={[0.065, 12, 12]} />
            <meshBasicMaterial color="#fff0a9" toneMapped={false} />
          </mesh>
          <pointLight ref={light} position={[0, 0.39, 0]} color="#ffc66b" intensity={1.2} distance={3.2} decay={2} />
        </>
      ) : smoke ? <Smoke position={[0, 0.35, 0]} /> : null}
    </group>
  );
}

function FrostingDrips({ radius, y, color }: { radius: number; y: number; color: string }) {
  return (
    <group>
      {Array.from({ length: 16 }, (_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        const length = 0.1 + ((index * 7) % 5) * 0.025;
        return (
          <mesh
            key={angle}
            castShadow
            position={[Math.cos(angle) * radius, y - length * 0.48, Math.sin(angle) * radius]}
            scale={[1, 1 + length * 3.5, 1]}
          >
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshPhysicalMaterial color={color} roughness={0.31} clearcoat={0.24} />
          </mesh>
        );
      })}
    </group>
  );
}

function Cake({ lit, smoke, onWish }: { lit: boolean; smoke: boolean; onWish: () => void }) {
  const [hovered, setHovered] = useState(false);
  const cake = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!cake.current) return;
    const target = hovered ? 1.025 : 1;
    cake.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
    cake.current.rotation.y = Math.sin(clock.elapsedTime * 0.33) * 0.012;
  });

  return (
    <group
      ref={cake}
      position={[0, -0.145, 0]}
      onPointerDown={(event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onWish(); }}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
    >
      <mesh receiveShadow castShadow position={[0, 0.08, 0]}>
        <cylinderGeometry args={[1.38, 1.43, 0.15, 72]} />
        <meshStandardMaterial color="#c69b55" metalness={0.68} roughness={0.22} />
      </mesh>
      <mesh castShadow position={[0, 0.57, 0]}>
        <cylinderGeometry args={[1.14, 1.18, 0.82, 72]} />
        <meshPhysicalMaterial color="#f2d4c7" roughness={0.43} clearcoat={0.22} />
      </mesh>
      <mesh castShadow position={[0, 0.94, 0]}>
        <cylinderGeometry args={[1.16, 1.15, 0.14, 72]} />
        <meshPhysicalMaterial color="#fff2dc" roughness={0.33} clearcoat={0.31} />
      </mesh>
      <FrostingDrips radius={1.09} y={0.91} color="#fff0dd" />

      <mesh castShadow position={[0, 1.26, 0]}>
        <cylinderGeometry args={[0.77, 0.8, 0.54, 64]} />
        <meshPhysicalMaterial color="#f8ead9" roughness={0.39} clearcoat={0.24} />
      </mesh>
      <mesh castShadow position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.79, 0.78, 0.12, 64]} />
        <meshPhysicalMaterial color="#d9a2a3" roughness={0.3} clearcoat={0.34} />
      </mesh>
      <FrostingDrips radius={0.73} y={1.46} color="#d9a2a3" />

      {Array.from({ length: 13 }, (_, index) => {
        const angle = (index / 13) * Math.PI * 2;
        return (
          <group key={angle} position={[Math.cos(angle) * 0.64, 1.6, Math.sin(angle) * 0.64]}>
            <mesh castShadow scale={[1, 0.72, 1]}>
              <torusKnotGeometry args={[0.07, 0.026, 24, 5]} />
              <meshPhysicalMaterial color="#fff0dd" roughness={0.36} />
            </mesh>
          </group>
        );
      })}

      {[-0.37, 0, 0.37].map((x, index) => (
        <group key={x} position={[x, 1.68 + (index === 1 ? 0.05 : 0), index === 1 ? -0.08 : 0.03]}>
          <mesh castShadow scale={[1, 0.88, 1]}>
            <sphereGeometry args={[0.13, 18, 18]} />
            <meshPhysicalMaterial color={index === 1 ? "#7d1830" : "#b4233f"} roughness={0.38} clearcoat={0.35} />
          </mesh>
          <mesh position={[0.02, 0.12, 0]} rotation={[0.3, 0, 0.7]}>
            <coneGeometry args={[0.07, 0.15, 7]} />
            <meshStandardMaterial color="#42643f" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {Array.from({ length: 20 }, (_, index) => {
        const angle = (index / 20) * Math.PI * 2;
        return (
          <mesh key={angle} position={[Math.cos(angle) * 1.05, 0.24, Math.sin(angle) * 1.05]} castShadow>
            <sphereGeometry args={[0.045 + (index % 3) * 0.008, 10, 10]} />
            <meshStandardMaterial color={index % 2 ? "#c1846e" : "#e6bfa7"} roughness={0.82} />
          </mesh>
        );
      })}

      <Candle x={-0.31} z={-0.02} lit={lit} smoke={smoke} />
      <Candle x={0} z={0.11} lit={lit} smoke={smoke} />
      <Candle x={0.31} z={-0.02} lit={lit} smoke={smoke} />
    </group>
  );
}

function PhotoFrame({
  index,
  position,
  rotation,
  focused,
  onSelect,
}: {
  index: 1 | 2;
  position: [number, number, number];
  rotation: [number, number, number];
  focused: boolean;
  onSelect: (value: 1 | 2) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const texture = useMemo(() => makePhotoTexture(index), [index]);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    if (!group.current) return;
    const target = focused ? 1.13 : hovered ? 1.06 : 1;
    group.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, position[1] + (hovered && !focused ? 0.08 : 0), 0.1);
  });

  return (
    <group
      ref={group}
      position={position}
      rotation={rotation}
      onPointerDown={(event) => { event.stopPropagation(); onSelect(index); }}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = "zoom-in"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
    >
      <RoundedBox args={[1.65, 2.1, 0.16]} radius={0.08} smoothness={4} castShadow>
        <meshStandardMaterial color="#b88948" metalness={0.72} roughness={0.2} />
      </RoundedBox>
      <mesh position={[0, 0, 0.092]}>
        <planeGeometry args={[1.39, 1.83]} />
        <meshStandardMaterial map={texture} roughness={0.72} />
      </mesh>
      <mesh position={[0, -1.04, -0.4]} rotation={[0.48, 0, 0]} castShadow>
        <boxGeometry args={[0.62, 0.08, 0.88]} />
        <meshStandardMaterial color="#8f653d" metalness={0.28} roughness={0.45} />
      </mesh>
      {focused && <pointLight position={[0, 0.2, 1.2]} color="#ffdca5" intensity={2.1} distance={3.2} />}
    </group>
  );
}

function Envelope({ opening, onOpen }: { opening: boolean; onOpen: () => void }) {
  const group = useRef<THREE.Group>(null);
  const flap = useRef<THREE.Group>(null);
  const paper = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!group.current || !flap.current || !paper.current) return;
    const resting = new THREE.Vector3(1.5, -0.085 + (hovered ? 0.12 : 0), 1.04);
    const opened = new THREE.Vector3(0, 1.7, 2.25);
    group.current.position.lerp(opening ? opened : resting, opening ? 0.055 : 0.12);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, opening ? -0.05 : -Math.PI / 2, 0.06);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, opening ? 0 : 0.12, 0.06);
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, opening ? 0 : -0.15 + Math.sin(clock.elapsedTime * 1.1) * (hovered ? 0.02 : 0.005), 0.08);
    flap.current.rotation.x = THREE.MathUtils.lerp(flap.current.rotation.x, opening ? -2.55 : 0, 0.07);
    paper.current.position.y = THREE.MathUtils.lerp(paper.current.position.y, opening ? 0.7 : 0, 0.055);
    paper.current.position.z = THREE.MathUtils.lerp(paper.current.position.z, opening ? 0.12 : -0.025, 0.055);
  });

  return (
    <group
      ref={group}
      position={[1.5, -0.085, 1.04]}
      rotation={[-Math.PI / 2, 0.12, -0.15]}
      onPointerDown={(event) => { event.stopPropagation(); if (!opening) onOpen(); }}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
    >
      <mesh position={[0, .08, .02]}>
        <boxGeometry args={[1.72, 1.18, .28]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <RoundedBox args={[1.22, 0.8, 0.07]} radius={0.04} smoothness={3} castShadow>
        <meshStandardMaterial color="#f1dcc0" roughness={0.76} />
      </RoundedBox>
      <group ref={flap} position={[0, 0.39, 0.045]}>
        <mesh position={[0, -0.2, 0]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.72, 0.72]} />
          <meshStandardMaterial color="#e1c49f" roughness={0.86} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh ref={paper} position={[0, 0, -0.025]} castShadow>
        <boxGeometry args={[1.03, 0.7, 0.035]} />
        <meshStandardMaterial color="#fff8e8" roughness={0.9} />
      </mesh>
      {!opening && (
        <Html position={[0, 0, 0.22]} center transform sprite distanceFactor={5.2} style={{ pointerEvents: "auto" }}>
          <button className="envelope-label object-button" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
            <MailOpen size={13} aria-hidden="true" /> Открыть письмо
          </button>
        </Html>
      )}
    </group>
  );
}

function GiftBox({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const group = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const card = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (!group.current || !lid.current || !card.current) return;
    const targetScale = hovered ? 1.07 : 1;
    group.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    lid.current.rotation.z = THREE.MathUtils.lerp(lid.current.rotation.z, open ? -1.12 : 0, 0.075);
    lid.current.position.y = THREE.MathUtils.lerp(lid.current.position.y, open ? 0.73 : 0.49, 0.08);
    lid.current.position.x = THREE.MathUtils.lerp(lid.current.position.x, open ? -0.24 : 0, 0.08);
    card.current.position.y = THREE.MathUtils.lerp(card.current.position.y, open ? 1.12 : 0.16, 0.055);
    card.current.rotation.y = THREE.MathUtils.lerp(card.current.rotation.y, open ? 0 : -0.5, 0.06);
  });

  return (
    <group
      ref={group}
      position={[-1.38, 0.2, 1.18]}
      rotation={[0, 0.2, 0]}
      onPointerDown={(event) => { event.stopPropagation(); onToggle(); }}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
    >
      <mesh position={[0, .38, 0]}>
        <boxGeometry args={[1.35, 1.45, 1.18]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <RoundedBox args={[0.78, 0.64, 0.72]} radius={0.055} smoothness={4} castShadow>
        <meshPhysicalMaterial color="#8a3656" roughness={0.35} clearcoat={0.3} />
      </RoundedBox>
      <mesh position={[0, 0, 0.37]}>
        <boxGeometry args={[0.13, 0.66, 0.02]} />
        <meshStandardMaterial color="#d9b26e" metalness={0.52} roughness={0.28} />
      </mesh>
      <group ref={lid} position={[0, 0.49, 0]}>
        <RoundedBox args={[0.86, 0.16, 0.8]} radius={0.05} smoothness={4} castShadow>
          <meshPhysicalMaterial color="#a84f6e" roughness={0.31} clearcoat={0.34} />
        </RoundedBox>
        {!open && (
          <group position={[0, 0.12, 0]}>
            <mesh rotation={[0, 0, 0.68]} scale={[1, 0.5, 1]}>
              <torusGeometry args={[0.17, 0.045, 10, 24, Math.PI * 1.65]} />
              <meshStandardMaterial color="#e4c27f" metalness={0.5} roughness={0.28} />
            </mesh>
            <mesh rotation={[0, Math.PI, -0.68]} scale={[1, 0.5, 1]}>
              <torusGeometry args={[0.17, 0.045, 10, 24, Math.PI * 1.65]} />
              <meshStandardMaterial color="#e4c27f" metalness={0.5} roughness={0.28} />
            </mesh>
          </group>
        )}
      </group>
      <group ref={card} position={[0, 0.16, 0]} rotation={[0, -0.5, 0]}>
        <RoundedBox args={[0.9, 0.62, 0.055]} radius={0.04} smoothness={3} castShadow>
          <meshStandardMaterial color="#fff3d7" roughness={0.78} />
        </RoundedBox>
        <Html position={[0, 0, 0.05]} center transform distanceFactor={3.9} style={{ pointerEvents: "none" }}>
          <div className="gift-note">Самый ценный подарок — быть рядом 🤍</div>
        </Html>
      </group>
      {open && <Sparkles count={26} scale={[1.35, 1.8, 1.25]} position={[0, .9, 0]} size={2.8} speed={1.2} color="#fff2a8" />}
      {!open && (
        <Html position={[0, 0.79, 0]} center transform sprite distanceFactor={5.1} style={{ pointerEvents: "auto" }}>
          <button className="object-hint object-button" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onToggle(); }}>
            <Gift size={13} aria-hidden="true" /> Нажми: сюрприз
          </button>
        </Html>
      )}
    </group>
  );
}

function SecretGlass({ onDiscover }: { onDiscover: () => void }) {
  const [active, setActive] = useState(false);
  const discover = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setActive(true);
    onDiscover();
    window.setTimeout(() => setActive(false), 2400);
  };
  return (
    <group position={[2.04, 0.04, 1.55]} onPointerDown={discover} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = "default"; }}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.11, 0.46, 24, 1, true]} />
        <meshPhysicalMaterial color="#f8dca0" transparent opacity={0.34} roughness={0.08} transmission={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.18, 0.1, 0.28, 24]} />
        <meshPhysicalMaterial color="#efc86d" transparent opacity={0.66} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.025, 0.025, 0.32, 12]} /><meshPhysicalMaterial color="#f4e6d2" transparent opacity={0.65} /></mesh>
      <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[0.19, 0.19, 0.025, 20]} /><meshPhysicalMaterial color="#f4e6d2" transparent opacity={0.6} /></mesh>
      {active && <Sparkles count={18} scale={[0.35, 1.2, 0.35]} position={[0, 0.55, 0]} size={2.4} speed={1.1} color="#fff0a4" />}
    </group>
  );
}

function SecretFlower({ onDiscover }: { onDiscover: () => void }) {
  const [active, setActive] = useState(false);
  const discover = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setActive(true);
    onDiscover();
    window.setTimeout(() => setActive(false), 2200);
  };
  return (
    <group position={[-2.02, -0.01, 1.58]} onPointerDown={discover} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = "default"; }}>
      <mesh position={[0, 0.06, 0]} castShadow><cylinderGeometry args={[0.16, 0.21, 0.34, 20]} /><meshPhysicalMaterial color="#d8ad78" metalness={0.35} roughness={0.32} /></mesh>
      <mesh position={[0, 0.47, 0]}><cylinderGeometry args={[0.018, 0.022, 0.58, 9]} /><meshStandardMaterial color="#52714d" roughness={0.7} /></mesh>
      <group position={[0, 0.82, 0]}>
        {Array.from({ length: 7 }, (_, index) => {
          const angle = (index / 7) * Math.PI * 2;
          return (
            <mesh key={angle} position={[Math.cos(angle) * 0.12, Math.sin(angle) * 0.12, 0]} rotation={[0, 0, angle]} scale={[1.45, 0.72, 0.55]}>
              <sphereGeometry args={[0.105, 12, 12]} />
              <meshStandardMaterial color="#d8909d" roughness={0.62} />
            </mesh>
          );
        })}
        <mesh position={[0, 0, 0.08]}><sphereGeometry args={[0.09, 14, 14]} /><meshStandardMaterial color="#e7c06a" roughness={0.65} /></mesh>
      </group>
      {active && <Sparkles count={16} scale={[0.85, 1.1, 0.7]} position={[0, 0.82, 0]} size={2.2} speed={0.9} color="#f4acbd" />}
    </group>
  );
}

function SecretStar({ onDiscover }: { onDiscover: () => void }) {
  const star = useRef<THREE.Group>(null);
  const [active, setActive] = useState(false);
  useFrame(({ clock }) => {
    if (!star.current) return;
    star.current.rotation.y = clock.elapsedTime * 0.45;
    const scale = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.09;
    star.current.scale.setScalar(active ? scale * 1.25 : scale);
  });
  const discover = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setActive(true);
    onDiscover();
    window.setTimeout(() => setActive(false), 2200);
  };
  return (
    <group ref={star} position={[3.95, 3.65, -2.8]} onPointerDown={discover} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = "default"; }}>
      <mesh><octahedronGeometry args={[0.18, 0]} /><meshBasicMaterial color={active ? "#fff1a2" : "#e8c276"} toneMapped={false} /></mesh>
      <pointLight color="#ffd978" intensity={active ? 3.2 : 1.1} distance={2.8} />
    </group>
  );
}

function Firework({ position, color, delay, active, reduced, finale = false }: {
  position: [number, number, number];
  color: string;
  delay: number;
  active: boolean;
  reduced: boolean;
  finale?: boolean;
}) {
  const count = reduced ? (finale ? 30 : 20) : (finale ? 74 : 42);
  const points = useRef<THREE.Points>(null);
  const started = useRef<number | null>(null);
  const velocities = useMemo(() => Array.from({ length: count }, () => {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = (finale ? 0.9 : 0.58) + Math.random() * (finale ? 1.2 : 0.72);
    return new THREE.Vector3(Math.sin(phi) * Math.cos(theta) * speed, Math.cos(phi) * speed, Math.sin(phi) * Math.sin(theta) * speed);
  }), [count, finale]);
  const base = useMemo(() => new Float32Array(count * 3), [count]);

  useFrame(({ clock }) => {
    if (!points.current) return;
    const material = points.current.material as THREE.PointsMaterial;
    if (!active) {
      material.opacity = 0;
      started.current = null;
      return;
    }
    if (started.current === null) started.current = clock.elapsedTime;
    const elapsed = clock.elapsedTime - started.current;
    if (elapsed < delay) {
      material.opacity = 0;
      return;
    }
    const cycle = finale ? 3.25 : 5.8;
    const time = finale ? elapsed - delay : (elapsed - delay) % cycle;
    if (finale && time > 3.1) {
      material.opacity = 0;
      return;
    }
    const positions = points.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i += 1) {
      const velocity = velocities[i];
      positions[i * 3] = velocity.x * time;
      positions[i * 3 + 1] = velocity.y * time - 0.16 * time * time;
      positions[i * 3 + 2] = velocity.z * time;
    }
    points.current.geometry.attributes.position.needsUpdate = true;
    material.opacity = time < 0.2 ? time * 5 : Math.max(0, 1 - time / (finale ? 2.8 : 2.35));
  });

  return (
    <points ref={points} position={position} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[base, 3]} /></bufferGeometry>
      <pointsMaterial color={color} size={reduced ? 0.065 : finale ? 0.105 : 0.078} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </points>
  );
}

function Confetti({ active, token, reduced }: { active: boolean; token: number; reduced: boolean }) {
  const count = reduced ? 32 : 86;
  const points = useRef<THREE.Points>(null);
  const born = useRef<number | null>(null);
  const velocities = useMemo(() => Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.45;
    const speed = 0.9 + Math.random() * 1.65;
    return new THREE.Vector3(Math.cos(angle) * speed, 1.3 + Math.random() * 1.9, Math.sin(angle) * speed);
  }), [count, token]);
  const base = useMemo(() => new Float32Array(count * 3), [count, token]);

  useFrame(({ clock }) => {
    if (!points.current) return;
    const material = points.current.material as THREE.PointsMaterial;
    if (!active) {
      material.opacity = 0;
      born.current = null;
      return;
    }
    if (born.current === null) born.current = clock.elapsedTime;
    const time = clock.elapsedTime - born.current;
    const positions = points.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i += 1) {
      const velocity = velocities[i];
      positions[i * 3] = velocity.x * time;
      positions[i * 3 + 1] = velocity.y * time - 1.45 * time * time;
      positions[i * 3 + 2] = velocity.z * time;
    }
    points.current.geometry.attributes.position.needsUpdate = true;
    material.opacity = Math.max(0, 1 - time / 3.1);
  });

  return (
    <points key={token} ref={points} position={[0, 3.05, 0.15]} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[base, 3]} /></bufferGeometry>
      <pointsMaterial color="#ffd070" size={0.1} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </points>
  );
}

function GarlandBulb({ x, y, index, active }: { x: number; y: number; index: number; active: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  const bulb = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!light.current || !bulb.current) return;
    const target = active ? 0.34 + Math.sin(clock.elapsedTime * 2.1 + index) * 0.08 : 0;
    light.current.intensity = THREE.MathUtils.lerp(light.current.intensity, target, 0.055);
    const scale = active ? 1 + Math.sin(clock.elapsedTime * 2.3 + index * 0.6) * 0.07 : 0.25;
    bulb.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.055);
  });
  return (
    <group position={[x, y, 0]}>
      <mesh ref={bulb}><sphereGeometry args={[0.075, 12, 12]} /><meshBasicMaterial color={index % 3 === 0 ? "#ffdca0" : "#fff0c8"} toneMapped={false} /></mesh>
      <pointLight ref={light} color="#ffd59a" intensity={0} distance={2.5} />
    </group>
  );
}

function Garland({ active }: { active: boolean }) {
  const bulbs = Array.from({ length: 17 }, (_, index) => ({
    x: -6.4 + index * 0.8,
    y: 5.4 - Math.cos((index / 16) * Math.PI * 2) * 0.35,
  }));
  return (
    <group position={[0, 0, -3.8]}>
      <mesh position={[0, 5.33, -0.02]} rotation={[0, 0, -0.01]}>
        <boxGeometry args={[13.3, 0.012, 0.012]} />
        <meshStandardMaterial color="#3b2b31" roughness={0.9} />
      </mesh>
      {bulbs.map(({ x, y }, index) => <GarlandBulb key={x} x={x} y={y} index={index} active={active} />)}
    </group>
  );
}

function PearlBalloon({ position, color, seed }: { position: [number, number, number]; color: string; seed: number }) {
  const balloon = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!balloon.current) return;
    balloon.current.rotation.z = Math.sin(clock.elapsedTime * .55 + seed * .83) * .045;
    balloon.current.position.y = position[1] + Math.sin(clock.elapsedTime * .72 + seed) * .055;
  });
  return (
    <group ref={balloon} position={position}>
      <mesh castShadow scale={[1, 1.24, .88]}>
        <sphereGeometry args={[.48, 28, 28]} />
        <meshPhysicalMaterial color={color} roughness={.2} metalness={.08} clearcoat={.78} clearcoatRoughness={.16} sheen={.65} sheenColor="#ffffff" />
      </mesh>
      <mesh position={[-.16, .2, .4]} scale={[.32, .52, .16]}>
        <sphereGeometry args={[.2, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={.48} depthWrite={false} />
      </mesh>
      <mesh position={[0, -.64, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[.09, .19, 14]} />
        <meshStandardMaterial color={color} roughness={.36} />
      </mesh>
      <mesh position={[0, -1.48, 0]}>
        <cylinderGeometry args={[.009, .009, 1.55, 6]} />
        <meshStandardMaterial color="#a98ca8" roughness={.7} />
      </mesh>
    </group>
  );
}

function LivingBackdrop({ lightsOn }: { lightsOn: boolean }) {
  const balloons = useMemo<Array<{ position: [number, number, number]; color: string }>>(() => [
    { position: [-5.9, 3.1, -5.2], color: "#efbccd" },
    { position: [-5.1, 2.55, -5.45], color: "#c7dff1" },
    { position: [-4.55, 3.7, -5.6], color: "#d8c8ef" },
    { position: [-3.75, 3.05, -5.15], color: "#f4d9ac" },
    { position: [-2.9, 3.9, -5.65], color: "#c8e2d4" },
    { position: [-2.08, 3.18, -5.3], color: "#f3c9bd" },
    { position: [-1.18, 4.05, -5.85], color: "#e7c6df" },
    { position: [0, 3.45, -5.25], color: "#f3d5a9" },
    { position: [1.08, 4.06, -5.8], color: "#bfdde5" },
    { position: [2.02, 3.18, -5.25], color: "#dcc8ef" },
    { position: [2.92, 3.9, -5.62], color: "#f1bdcc" },
    { position: [3.75, 3.02, -5.15], color: "#c7e1d2" },
    { position: [4.55, 3.68, -5.58], color: "#f4d9ae" },
    { position: [5.15, 2.52, -5.38], color: "#d7c5ed" },
    { position: [5.92, 3.08, -5.2], color: "#efc3ba" },
  ], []);
  return (
    <group>
      <mesh position={[0, 2.1, -8.5]}>
        <planeGeometry args={[28, 16]} />
        <meshPhysicalMaterial color="#dfd2ed" roughness={.7} sheen={.42} sheenColor="#fff5ff" />
      </mesh>
      <mesh position={[0, -1.05, -7.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 18]} />
        <meshPhysicalMaterial color="#eadce8" roughness={.42} clearcoat={.28} />
      </mesh>
      {balloons.map((balloon, index) => <PearlBalloon key={`${balloon.position[0]}-${index}`} position={balloon.position} color={balloon.color} seed={index} />)}
      <Sparkles count={lightsOn ? 56 : 24} scale={[15, 8, 3]} position={[0, 2.6, -5.9]} size={1.7} speed={.16} opacity={.56} color="#fff7dc" />
    </group>
  );
}

function CameraDirector({ focusPhoto, letterOpening, lowPower, onIntroComplete }: {
  focusPhoto: SelectPhoto;
  letterOpening: boolean;
  lowPower: boolean;
  onIntroComplete: () => void;
}) {
  const { camera } = useThree();
  const started = useRef<number | null>(null);
  const completed = useRef(false);
  const introDuration = lowPower ? 1.1 : 2.55;

  useFrame(({ clock }) => {
    if (started.current === null) started.current = clock.elapsedTime;
    const elapsed = clock.elapsedTime - started.current;
    if (!completed.current) {
      const eased = 1 - Math.pow(1 - Math.min(1, elapsed / introDuration), 3);
      camera.position.lerpVectors(new THREE.Vector3(0, 5.35, 14.2), new THREE.Vector3(0, 4.15, 10.2), eased);
      camera.lookAt(0, 0.62, 0);
      if (elapsed >= introDuration) {
        completed.current = true;
        onIntroComplete();
      }
      return;
    }

    if (focusPhoto) {
      const side = focusPhoto === 1 ? -1 : 1;
      camera.position.lerp(new THREE.Vector3(side * 1.75, 1.75, 5.2), 0.055);
      camera.lookAt(side * 2.35, 0.85, 0.08);
    } else if (letterOpening) {
      camera.position.lerp(new THREE.Vector3(0, 2.45, 6.8), 0.045);
      camera.lookAt(0, 1.25, 1.15);
    }
  });
  return null;
}

function ParallaxGroup({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const group = useRef<THREE.Group>(null);
  const pointer = useThree((state) => state.pointer);
  useFrame(() => {
    if (!group.current) return;
    const targetY = enabled ? pointer.x * 0.026 : 0;
    const targetX = enabled ? -pointer.y * 0.012 : 0;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetY, 0.035);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetX, 0.035);
  });
  return <group ref={group}>{children}</group>;
}

function Scene({ candlesLit, smokeVisible, onCake, onLetter, onPhoto, focusPhoto, letterOpening, giftOpen, onGift, onSecret, lightsOn, ambientFireworks, finaleActive, finaleToken, introComplete, setIntroComplete, lowPower }: {
  candlesLit: boolean;
  smokeVisible: boolean;
  onCake: () => void;
  onLetter: () => void;
  onPhoto: (value: 1 | 2) => void;
  focusPhoto: SelectPhoto;
  letterOpening: boolean;
  giftOpen: boolean;
  onGift: () => void;
  onSecret: (kind: SecretKind) => void;
  lightsOn: boolean;
  ambientFireworks: boolean;
  finaleActive: boolean;
  finaleToken: number;
  introComplete: boolean;
  setIntroComplete: () => void;
  lowPower: boolean;
}) {
  const viewport = useThree((state) => state.viewport);
  const compact = viewport.width < 8;
  const scale = compact ? 0.78 : 1;
  const controlsEnabled = introComplete && focusPhoto === null && !letterOpening;

  return (
    <>
      <color attach="background" args={["#ddcfed"]} />
      <fog attach="fog" args={["#d9cbe8", 13, 30]} />
      <ambientLight intensity={1.04} color="#fff7f4" />
      <hemisphereLight color="#fff4f7" groundColor="#c8bad4" intensity={1.28} />
      <directionalLight castShadow position={[4, 8, 5]} intensity={2.6} color="#fff0cf" shadow-mapSize-width={lowPower ? 512 : 1024} shadow-mapSize-height={lowPower ? 512 : 1024} />
      <pointLight position={[-5, 4, 1]} color="#efa9c2" intensity={4.8} distance={13} />
      <pointLight position={[5, 3, -1]} color="#a9cfee" intensity={4.2} distance={13} />

      <LivingBackdrop lightsOn={lightsOn} />
      <Sparkles count={lowPower ? 20 : 48} scale={[14, 8, 7]} size={1.35} speed={0.09} opacity={0.33} color="#f7d5a2" />
      <Garland active={lightsOn} />
      <SecretStar onDiscover={() => onSecret("star")} />

      <Firework position={[-4.4, 4.15, -4]} color="#ffb7bd" delay={0.15} active={ambientFireworks} reduced={lowPower} />
      <Firework position={[4.1, 4.55, -4.6]} color="#ffdb86" delay={2.05} active={ambientFireworks} reduced={lowPower} />
      {!lowPower && <Firework position={[0.4, 5.1, -5.3]} color="#aebdff" delay={4.1} active={ambientFireworks} reduced={false} />}

      <Firework key={`final-a-${finaleToken}`} position={[-3.7, 3.85, -2.7]} color="#ff7598" delay={0} active={finaleActive} reduced={lowPower} finale />
      <Firework key={`final-b-${finaleToken}`} position={[3.65, 4.1, -2.9]} color="#ffd46e" delay={0.38} active={finaleActive} reduced={lowPower} finale />
      <Firework key={`final-c-${finaleToken}`} position={[0, 4.8, -3.8]} color="#c0c8ff" delay={0.72} active={finaleActive} reduced={lowPower} finale />

      <CameraDirector focusPhoto={focusPhoto} letterOpening={letterOpening} lowPower={lowPower} onIntroComplete={setIntroComplete} />

      <ParallaxGroup enabled={controlsEnabled}>
        <group scale={scale} position={[0, compact ? -0.34 : -0.05, 0]}>
          <mesh receiveShadow position={[0, -0.52, 0]}><cylinderGeometry args={[4.75, 4.56, 0.52, 72]} /><meshPhysicalMaterial color="#8b5f51" roughness={0.31} metalness={0.05} clearcoat={0.22} /></mesh>
          <mesh receiveShadow position={[0, -0.22, 0]}><cylinderGeometry args={[4.6, 4.6, 0.13, 72]} /><meshPhysicalMaterial color="#bd826f" roughness={0.27} clearcoat={0.42} /></mesh>
          <mesh receiveShadow position={[0, -0.14, 0]}><cylinderGeometry args={[1.85, 1.85, 0.035, 64]} /><meshStandardMaterial color="#a76f88" roughness={0.62} /></mesh>
          {[-2.9, 2.9].flatMap((x) => [-1.65, 1.65].map((z) => (
            <mesh key={`${x}-${z}`} castShadow position={[x, -2.22, z]}><cylinderGeometry args={[0.22, 0.32, 3.5, 22]} /><meshStandardMaterial color="#3c2a25" roughness={0.48} /></mesh>
          )))}
          <Cake lit={candlesLit} smoke={smokeVisible} onWish={onCake} />
          <PhotoFrame index={1} position={[-2.63, 0.86, 0.18]} rotation={[0, 0.31, -0.03]} focused={focusPhoto === 1} onSelect={onPhoto} />
          <PhotoFrame index={2} position={[2.67, 0.86, 0.08]} rotation={[0, -0.33, 0.035]} focused={focusPhoto === 2} onSelect={onPhoto} />
          <Envelope opening={letterOpening} onOpen={onLetter} />
          <GiftBox open={giftOpen} onToggle={onGift} />
          <SecretGlass onDiscover={() => onSecret("glass")} />
          <SecretFlower onDiscover={() => onSecret("flower")} />
          <Confetti active={finaleActive} token={finaleToken} reduced={lowPower} />
        </group>
      </ParallaxGroup>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.45, 0]}><planeGeometry args={[34, 34]} /><meshStandardMaterial color="#d7c8dd" roughness={0.82} /></mesh>
      <ContactShadows position={[0, -2.42, 0]} color="#70566f" opacity={0.28} scale={14} blur={3.2} far={7} resolution={lowPower ? 256 : 512} />

      <OrbitControls makeDefault enabled={controlsEnabled} enablePan={false} enableDamping dampingFactor={0.065} minDistance={compact ? 9.1 : 8.2} maxDistance={compact ? 13 : 12} minPolarAngle={0.88} maxPolarAngle={1.38} minAzimuthAngle={-0.66} maxAzimuthAngle={0.66} target={[0, 0.65, 0]} touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }} />
    </>
  );
}

function PhotoPreview({ selected, onClose }: { selected: SelectPhoto; onClose: () => void }) {
  const [slide, setSlide] = useState(0);
  useEffect(() => setSlide(0), [selected]);
  const album = selected ? PHOTO_ALBUMS[selected] : PHOTO_ALBUMS[1];
  const current = album[slide];
  const previous = () => setSlide((value) => (value - 1 + album.length) % album.length);
  const next = () => setSlide((value) => (value + 1) % album.length);

  return (
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={`photo-dialog photo-${selected ?? 1}`}>
        <DialogTitle>{selected === 1 ? "Наши тёплые моменты" : "Красивые воспоминания"}</DialogTitle>
        <DialogDescription>Листай фотографии — в каждой рамке спрятан мини-альбом</DialogDescription>
        <div className={`memory-slide memory-${current.tone}`} aria-live="polite">
          <Camera size={42} strokeWidth={1.25} aria-hidden="true" />
          <strong>{current.title}</strong>
          <span>{current.note}</span>
          <small>{slide + 1} / {album.length}</small>
        </div>
        <div className="album-controls">
          <button type="button" onClick={previous} aria-label="Предыдущая фотография"><ChevronLeft size={21} /></button>
          <div className="album-dots" aria-hidden="true">{album.map((_, index) => <span key={index} className={index === slide ? "is-active" : ""} />)}</div>
          <button type="button" onClick={next} aria-label="Следующая фотография"><ChevronRight size={21} /></button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LetterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="letter-dialog" showCloseButton={false}>
        <button className="letter-close" type="button" aria-label="Закрыть письмо" onClick={onClose}><X size={22} aria-hidden="true" /></button>
        <div className="letter-arrival" aria-hidden="true"><span /><i /></div>
        <div className="letter-sheet">
          <div className="letter-seal" aria-hidden="true">Л</div>
          <DialogTitle>Дорогая Лизка!</DialogTitle>
          <DialogDescription asChild>
            <div className="letter-copy">
              <p>Пусть новый год твоей жизни будет щедрым на счастливые события, красивые открытия и людей, рядом с которыми легко быть собой.</p>
              <p>Желаю, чтобы мечты становились планами, планы — реальностью, а поводов улыбаться было гораздо больше, чем свечей на этом торте.</p>
              <p>С днём рождения! С теплом и самыми добрыми пожеланиями 🤍</p>
            </div>
          </DialogDescription>
          <span className="letter-flourish" aria-hidden="true">✦</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BirthdayExperience() {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [lightsOn, setLightsOn] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [ambientFireworks, setAmbientFireworks] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [letterOpening, setLetterOpening] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<SelectPhoto>(null);
  const [focusPhoto, setFocusPhoto] = useState<SelectPhoto>(null);
  const [candlesLit, setCandlesLit] = useState(true);
  const [wishStatus, setWishStatus] = useState<WishStatus>("idle");
  const [finaleActive, setFinaleActive] = useState(false);
  const [finaleToken, setFinaleToken] = useState(0);
  const [finalLine, setFinalLine] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [secretMessage, setSecretMessage] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [micFallbackVisible, setMicFallbackVisible] = useState(false);
  const lowPower = useLowPowerMode();
  const { musicOn, toggleMusic } = useAmbientMusic(finaleActive);
  const streamRef = useRef<MediaStream | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micFrameRef = useRef<number | null>(null);
  const blowScoreRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const later = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
    return timer;
  }, []);

  const stopMicrophone = useCallback(() => {
    if (micFrameRef.current !== null) cancelAnimationFrame(micFrameRef.current);
    micFrameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = micContextRef.current;
    if (context && context.state !== "closed") void context.close();
    micContextRef.current = null;
    blowScoreRef.current = 0;
    setMicLevel(0);
    setMicFallbackVisible(false);
  }, []);

  const extinguishCandles = useCallback(() => {
    setCandlesLit(false);
    setWishStatus("idle");
    setFinaleToken((token) => token + 1);
    setFinaleActive(true);
    setFinalLine(false);
    stopMicrophone();
    later(() => setFinalLine(true), 1900);
    later(() => setFinaleActive(false), 5900);
  }, [later, stopMicrophone]);

  const beginWish = useCallback(async () => {
    if (!candlesLit) {
      setCandlesLit(true);
      setWishStatus("idle");
      setFinalLine(false);
      return;
    }
    if (wishStatus === "listening" || wishStatus === "requesting") return;
    if (wishStatus === "unavailable") {
      extinguishCandles();
      return;
    }

    setWishStatus("requesting");
    setMicLevel(0);
    setMicFallbackVisible(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone API unavailable");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const BrowserAudioContext = window.AudioContext
        ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!BrowserAudioContext) throw new Error("AudioContext unavailable");
      const context = new BrowserAudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.16;
      context.createMediaStreamSource(stream).connect(analyser);
      await context.resume();
      streamRef.current = stream;
      micContextRef.current = context;
      const timeData = new Uint8Array(analyser.fftSize);
      const startedAt = performance.now();
      let baselineSum = 0;
      let baselineSamples = 0;
      let lastVisualUpdate = 0;
      let fallbackShown = false;
      setWishStatus("listening");

      const listen = () => {
        analyser.getByteTimeDomainData(timeData);
        let sum = 0;
        for (let index = 0; index < timeData.length; index += 1) {
          const normalized = (timeData[index] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / timeData.length);
        const now = performance.now();
        const elapsed = now - startedAt;

        if (elapsed < 300) {
          if (rms < 0.035) {
            baselineSum += rms;
            baselineSamples += 1;
          }
          blowScoreRef.current = 0;
        } else {
          const baseline = baselineSamples > 0 ? baselineSum / baselineSamples : 0.008;
          const threshold = Math.max(0.018, baseline * 1.65);
          const blowing = rms > threshold;
          blowScoreRef.current = blowing
            ? blowScoreRef.current + 1
            : Math.max(0, blowScoreRef.current - 0.35);

          if (now - lastVisualUpdate > 85) {
            setMicLevel(Math.min(1, rms / Math.max(0.075, threshold * 3)));
            lastVisualUpdate = now;
          }

          if (elapsed > 2300 && !fallbackShown) {
            fallbackShown = true;
            setMicFallbackVisible(true);
          }
        }

        if (blowScoreRef.current >= 6) {
          extinguishCandles();
          return;
        }
        micFrameRef.current = requestAnimationFrame(listen);
      };
      micFrameRef.current = requestAnimationFrame(listen);
    } catch {
      stopMicrophone();
      setWishStatus("unavailable");
      setMicFallbackVisible(true);
    }
  }, [candlesLit, extinguishCandles, stopMicrophone, wishStatus]);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setWebgl(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      stopMicrophone();
    };
  }, [stopMicrophone]);

  useEffect(() => {
    if (!ready) return;
    later(() => setLightsOn(true), 280);
    later(() => setTitleVisible(true), lowPower ? 850 : 1900);
    later(() => setShowHint(true), lowPower ? 1100 : 2900);
    later(() => setAmbientFireworks(true), lowPower ? 2300 : 5100);
    later(() => setShowHint(false), lowPower ? 4800 : 8200);
  }, [later, lowPower, ready]);

  const openLetterScene = () => {
    if (letterOpening) return;
    setFocusPhoto(null);
    setLetterOpening(true);
    later(() => setLetterOpen(true), lowPower ? 260 : 1180);
  };

  const closeLetter = () => {
    setLetterOpen(false);
    later(() => setLetterOpening(false), 220);
  };

  const openPhoto = (index: 1 | 2) => {
    setLetterOpening(false);
    setFocusPhoto(index);
    later(() => setSelectedPhoto(index), lowPower ? 180 : 680);
  };

  const closePhoto = () => {
    setSelectedPhoto(null);
    later(() => setFocusPhoto(null), 180);
  };

  const discoverSecret = (kind: SecretKind) => {
    setSecretMessage(SECRET_MESSAGES[kind]);
    later(() => setSecretMessage(""), 4200);
  };

  const toggleGift = () => {
    const willOpen = !giftOpen;
    setGiftOpen(willOpen);
    if (willOpen) {
      setSecretMessage("Маленький подарок с большим пожеланием: будь счастлива 🤍");
      later(() => setSecretMessage(""), 4200);
    }
  };

  const wishLabel = candlesLit
    ? wishStatus === "requesting"
      ? "Включаем микрофон…"
      : wishStatus === "listening"
        ? "Дуй на свечи"
        : wishStatus === "unavailable"
          ? "Задуть без микрофона"
          : "Загадать желание"
    : "Зажечь снова";

  return (
    <main className="birthday-card">
      {webgl === false ? <WebGLFallback onLetter={() => setLetterOpen(true)} /> : (
        <>
          <div className="aurora" aria-hidden="true" />
          <div className="scene-vignette" aria-hidden="true" />
          <header className={`floating-title ${titleVisible ? "is-visible" : ""}`}>
            <div className="banner-string" aria-hidden="true" />
            <h1 aria-label="С днём рождения, Лизка!">
              {["С", "днём", "рождения,", "Лизка!"].map((word, index) => <span key={word} style={{ "--flag-index": index } as React.CSSProperties}>{word}</span>)}
            </h1>
            <p>Праздник, созданный только для тебя</p>
          </header>

          <button className={`music-toggle ${musicOn ? "is-on" : ""}`} type="button" onClick={() => void toggleMusic()} aria-label={musicOn ? "Выключить музыку" : "Включить музыку"}>
            {musicOn ? <Music2 size={19} aria-hidden="true" /> : <VolumeX size={19} aria-hidden="true" />}
            <span>{musicOn ? "Музыка играет" : "Включить музыку"}</span>
          </button>

          <Canvas className="three-canvas" shadows dpr={lowPower ? 1 : [1, 1.55]} camera={{ position: [0, 5.35, 14.2], fov: 39, near: 0.1, far: 50 }} gl={{ antialias: !lowPower, alpha: true, powerPreference: "high-performance" }} onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.08;
            window.setTimeout(() => setReady(true), 260);
          }}>
              <Scene candlesLit={candlesLit} smokeVisible={finaleActive} onCake={() => void beginWish()} onLetter={openLetterScene} onPhoto={openPhoto} focusPhoto={focusPhoto} letterOpening={letterOpening} giftOpen={giftOpen} onGift={toggleGift} onSecret={discoverSecret} lightsOn={lightsOn} ambientFireworks={ambientFireworks} finaleActive={finaleActive} finaleToken={finaleToken} introComplete={introComplete} setIntroComplete={() => setIntroComplete(true)} lowPower={lowPower} />
          </Canvas>

          <div className={`gesture-hint ${showHint && ready ? "is-visible" : ""}`} role="status">
            <Rotate3D size={19} aria-hidden="true" />
            <span>Осмотрись: некоторые предметы на столе хранят сюрпризы</span>
          </div>

          <div className={`mic-hint ${wishStatus === "listening" || wishStatus === "unavailable" ? "is-visible" : ""}`} role="status">
            {wishStatus === "listening" ? <Mic size={19} aria-hidden="true" /> : <Flame size={19} aria-hidden="true" />}
            <div className="mic-copy">
              <span>{wishStatus === "listening" ? "Микрофон слушает — дуй на свечи" : "Микрофон недоступен"}</span>
              {wishStatus === "listening" && (
                <div className="mic-meter" role="progressbar" aria-label="Сила выдоха" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(micLevel * 100)}>
                  <i style={{ width: `${Math.max(5, micLevel * 100)}%` }} />
                </div>
              )}
            </div>
            {(micFallbackVisible || wishStatus === "unavailable") && <button type="button" onClick={extinguishCandles}>Задуть кнопкой</button>}
          </div>

          <div className="interaction-dock" aria-label="Главные действия">
            <button type="button" className={`wish-action ${wishStatus === "listening" ? "is-listening" : ""}`} onClick={() => wishStatus === "listening" ? extinguishCandles() : void beginWish()} disabled={wishStatus === "requesting"}>
              {wishStatus === "listening" ? <Mic size={18} aria-hidden="true" /> : <Flame size={18} aria-hidden="true" />}
              {wishLabel}
            </button>
            <button type="button" className="secondary-action" onClick={openLetterScene}><MailOpen size={18} aria-hidden="true" /> Письмо</button>
            <button type="button" className={`secondary-action ${giftOpen ? "is-active" : ""}`} onClick={toggleGift}><Gift size={18} aria-hidden="true" /> Сюрприз</button>
          </div>

          <div className={`final-wish ${finalLine ? "is-visible" : ""}`} aria-live="polite">
            <SparklesIcon size={19} aria-hidden="true" /><span>Пусть сбудется самое заветное</span><SparklesIcon size={19} aria-hidden="true" />
          </div>

          <div className={`secret-toast ${secretMessage ? "is-visible" : ""}`} role="status">{secretMessage}</div>

          {!ready && <div className="loading-screen loading-overlay" aria-live="polite"><div className="loading-orbit" aria-hidden="true" /><p>Зажигаем огоньки…</p></div>}
        </>
      )}
      <PhotoPreview selected={selectedPhoto} onClose={closePhoto} />
      <LetterDialog open={letterOpen} onClose={closeLetter} />
    </main>
  );
}

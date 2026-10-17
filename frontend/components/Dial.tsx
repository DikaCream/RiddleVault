"use client";

import { useRef, useState } from "react";

/** A tactile combination dial. `spinning` runs the cracking animation; drag to turn it by hand. */
export function Dial({
  size = 200,
  angle = 0,
  spinning = false,
  draggable = false,
  label,
  tone = "brass",
}: {
  size?: number;
  angle?: number;
  spinning?: boolean;
  draggable?: boolean;
  label?: string;
  tone?: "brass" | "green" | "red";
}) {
  const [drag, setDrag] = useState(0);
  const start = useRef<{ a: number; base: number } | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const accent = tone === "green" ? "#5dffa0" : tone === "red" ? "#ff5d52" : "#e8c872";

  const pointerAngle = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const rot = angle + drag;
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <svg
      ref={ref}
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={spinning ? "dial-spin" : ""}
      style={{ touchAction: "none", cursor: draggable ? "grab" : "default", overflow: "visible" }}
      onPointerDown={(e) => {
        if (!draggable) return;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        start.current = { a: pointerAngle(e), base: drag };
      }}
      onPointerMove={(e) => {
        if (start.current) setDrag(start.current.base + pointerAngle(e) - start.current.a);
      }}
      onPointerUp={() => (start.current = null)}
      role="img"
      aria-label={label ?? "Vault combination dial"}
    >
      <defs>
        <radialGradient id="dg-body" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#3d4756" />
          <stop offset="0.55" stopColor="#1b222b" />
          <stop offset="1" stopColor="#0a0d11" />
        </radialGradient>
        <radialGradient id="dg-knob" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fbeab5" />
          <stop offset="0.5" stopColor="#c79d3f" />
          <stop offset="1" stopColor="#5b4416" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="#06080a" />
      <circle cx="100" cy="100" r="94" fill="url(#dg-body)" stroke="#000" strokeWidth="2" />
      <g className="dial-ring" style={{ transform: `rotate(${-rot * 0.5}deg)`, transition: start.current ? "none" : "transform 0.9s cubic-bezier(0.3,1.3,0.5,1)" }}>
        {ticks.map((i) => (
          <line
            key={i}
            x1="100"
            y1={i % 5 === 0 ? 10 : 14}
            x2="100"
            y2="20"
            stroke={i % 5 === 0 ? "#e8c872" : "#6e7c8f"}
            strokeWidth={i % 5 === 0 ? 2.2 : 1}
            transform={`rotate(${i * 6} 100 100)`}
          />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <text
            key={n}
            x="100"
            y="40"
            textAnchor="middle"
            fontSize="11"
            fontFamily="monospace"
            fill="#c9d2dc"
            transform={`rotate(${n * 36} 100 100)`}
          >
            {n * 10}
          </text>
        ))}
      </g>
      <circle cx="100" cy="100" r="58" fill="#0d1116" stroke="#000" strokeWidth="2" />
      <g className="dial-knob" style={{ transform: `rotate(${rot}deg)`, transition: start.current ? "none" : undefined }}>
        <circle cx="100" cy="100" r="46" fill="url(#dg-knob)" stroke="#3b2d0b" strokeWidth="2.5" />
        {Array.from({ length: 24 }, (_, i) => (
          <line key={i} x1="100" y1="58" x2="100" y2="64" stroke="#5b4416" strokeWidth="2" transform={`rotate(${i * 15} 100 100)`} />
        ))}
        <circle cx="100" cy="100" r="22" fill="#241a06" opacity="0.25" />
        <path d="M100 62 L106 80 L94 80 Z" fill="#251a05" />
      </g>
      <path d="M100 2 L108 -8 L92 -8 Z" fill={accent} style={{ filter: `drop-shadow(0 0 5px ${accent})` }} />
    </svg>
  );
}

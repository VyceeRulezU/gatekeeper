import React from "react";

export const Illustration: React.FC = () => {
  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full max-h-[460px] select-none"
    >
      <defs>
        {/* Core Radial Glow for Atmosphere */}
        <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Shield Border Gradient */}
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        {/* Hologram Ring Gradient */}
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
        </linearGradient>

        {/* Key Core Gradient */}
        <linearGradient id="keyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>

        {/* Access Granted Glow Grid */}
        <pattern id="dotGrid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#c7d2fe" opacity="0.08" />
        </pattern>
      </defs>

      <style>{`
        .animated-key {
          animation: floatKey 6s ease-in-out infinite;
          transform-origin: 250px 230px;
        }
        .animated-ring-outer {
          animation: rotateCW 20s linear infinite;
          transform-origin: 250px 250px;
        }
        .animated-ring-inner {
          animation: rotateCCW 15s linear infinite;
          transform-origin: 250px 250px;
        }
        .pulse-node {
          animation: pulseNode 3s ease-in-out infinite;
        }
        .pulse-core {
          animation: pulseCore 4s ease-in-out infinite;
        }
        .scan-line {
          animation: scanVertical 4s linear infinite;
        }

        @keyframes floatKey {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes rotateCW {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes rotateCCW {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        @keyframes pulseNode {
          0%, 100% { opacity: 0.3; r: 3px; }
          50% { opacity: 1; r: 5px; filter: drop-shadow(0 0 4px #06b6d4); }
        }
        @keyframes pulseCore {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(1.05); }
        }
        @keyframes scanVertical {
          0% { transform: translateY(-60px); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(140px); opacity: 0; }
        }
      `}</style>

      {/* Ambient background glow */}
      <circle cx="250" cy="250" r="220" fill="url(#glowGrad)" />

      {/* Cybernetic grid overlay */}
      <rect x="50" y="50" width="400" height="400" fill="url(#dotGrid)" rx="20" />

      {/* Futuristic scanning coordinate layout */}
      <circle cx="250" cy="250" r="200" stroke="#4f46e5" strokeWidth="1" strokeDasharray="4 12" opacity="0.2" />
      <circle cx="250" cy="250" r="170" stroke="#3b82f6" strokeWidth="1" opacity="0.1" />

      {/* --- BACKGROUND RINGS (Animated) --- */}
      {/* Outer spinning tech ring with telemetry markers */}
      <g className="animated-ring-outer">
        <circle cx="250" cy="250" r="150" stroke="url(#ringGrad)" strokeWidth="2" strokeDasharray="40 180 80 40" />
        <circle cx="250" cy="250" r="142" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 8" opacity="0.3" />
        {/* Ring nodes */}
        <circle cx="390" cy="200" r="3" fill="#06b6d4" />
        <circle cx="110" cy="300" r="3" fill="#6366f1" />
      </g>

      {/* Inner counter-spinning data ring */}
      <g className="animated-ring-inner">
        <circle cx="250" cy="250" r="120" stroke="url(#ringGrad)" strokeWidth="1.5" strokeDasharray="120 40 20 80" />
        <circle cx="250" cy="250" r="112" stroke="#3b82f6" strokeWidth="2" strokeDasharray="8 6" opacity="0.25" />
      </g>

      {/* --- CENTRAL SECURITY SHIELD (The Gatekeeper) --- */}
      <g>
        {/* Pulsing core glow behind the shield */}
        <path
          className="pulse-core"
          d="M250 120C280 120 330 135 330 195C330 255 285 305 250 330C215 305 170 255 170 195C170 135 220 120 250 120Z"
          fill="#3b82f6"
          opacity="0.15"
          style={{ transformOrigin: "250px 225px" }}
        />

        {/* Tech lines leading into the shield (Data Flow) */}
        <path d="M120 250H170" stroke="#3b82f6" strokeWidth="2" opacity="0.4" strokeDasharray="4 4" />
        <path d="M380 250H330" stroke="#06b6d4" strokeWidth="2" opacity="0.4" strokeDasharray="4 4" />
        <path d="M250 80V120" stroke="#6366f1" strokeWidth="2" opacity="0.4" strokeDasharray="4 4" />
        <path d="M250 370V330" stroke="#6366f1" strokeWidth="2" opacity="0.4" strokeDasharray="4 4" />

        {/* Main Solid Shield */}
        <path
          d="M250 130C275 130 320 145 320 195C320 245 280 290 250 315C220 290 180 245 180 195C180 145 225 130 250 130Z"
          fill="#0c101d"
          stroke="url(#shieldGrad)"
          strokeWidth="3.5"
          filter="drop-shadow(0 10px 25px rgba(0, 0, 0, 0.5))"
        />

        {/* Shield inner decorative circuit line */}
        <path
          d="M250 148C267 148 298 158 298 195C298 230 270 268 250 288C230 268 202 230 202 195C202 158 233 148 250 148Z"
          stroke="#3b82f6"
          strokeWidth="1.5"
          opacity="0.4"
        />

        {/* Biometric Scan Overlay Line */}
        <g style={{ clipPath: "url(#shieldClip)" }}>
          <clipPath id="shieldClip">
            <path d="M250 130C275 130 320 145 320 195C320 245 280 290 250 315C220 290 180 245 180 195C180 145 225 130 250 130Z" />
          </clipPath>
          <line
            className="scan-line"
            x1="150"
            y1="150"
            x2="350"
            y2="150"
            stroke="#06b6d4"
            strokeWidth="3"
            filter="drop-shadow(0 0 6px #06b6d4)"
          />
        </g>

        {/* Secure Keyhole Core */}
        <circle cx="250" cy="205" r="22" fill="#141b2d" stroke="#3b82f6" strokeWidth="2" />
        <path
          d="M246 205C246 202.8 247.8 201 250 201C252.2 201 254 202.8 254 205C254 206.8 252.6 208.2 251.2 209.5L252.5 221H247.5L248.8 209.5C247.4 208.2 246 206.8 246 205Z"
          fill="#06b6d4"
          filter="drop-shadow(0 0 3px #06b6d4)"
        />

        {/* Data Stream Nodes (Glowing Lights) */}
        <circle className="pulse-node" cx="250" cy="148" r="4" fill="#06b6d4" />
        <circle className="pulse-node" cx="202" cy="195" r="4" fill="#6366f1" />
        <circle className="pulse-node" cx="298" cy="195" r="4" fill="#6366f1" />
        <circle className="pulse-node" cx="250" cy="288" r="4" fill="#06b6d4" />
      </g>

      {/* --- THE FLOATING DIGITAL SECURITY KEY (Animated) --- */}
      <g className="animated-key">
        {/* Soft shadow under the key */}
        <path
          d="M230 250L290 220L320 280L260 310Z"
          fill="#000000"
          opacity="0.3"
          filter="blur(8px)"
          transform="translate(10, 20)"
        />

        {/* Key Body (Futuristic layout) */}
        {/* Glow of the key */}
        <path
          d="M335 155C310 135 272 140 252 165C232 190 238 228 262 248C268 253 275 256 282 258L310 330C312 335 318 338 322 335L338 322L325 290L345 275L332 245C352 225 358 190 335 155Z"
          fill="none"
          stroke="#4f46e5"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.2"
        />

        {/* Front Sharp Layer */}
        <path
          d="M335 155C310 135 272 140 252 165C232 190 238 228 262 248C268 253 275 256 282 258L310 330C312 335 318 338 322 335L338 322L325 290L345 275L332 245C352 225 358 190 335 155Z"
          fill="url(#keyGrad)"
          stroke="#0c101d"
          strokeWidth="3.5"
          strokeLinejoin="round"
          filter="drop-shadow(0 15px 25px rgba(6, 182, 212, 0.25))"
        />

        {/* Glowing circuit lines inside the key body */}
        <circle cx="295" cy="195" r="14" fill="#0c101d" stroke="#06b6d4" strokeWidth="2" />
        <circle cx="295" cy="195" r="5" fill="#06b6d4" filter="drop-shadow(0 0 3px #06b6d4)" />
        <line x1="295" y1="209" x2="295" y2="240" stroke="#06b6d4" strokeWidth="2.5" />
        <line x1="295" y1="240" x2="312" y2="280" stroke="#06b6d4" strokeWidth="2" />

        {/* Key teeth nodes */}
        <circle cx="325" cy="290" r="3.5" fill="#6366f1" />
        <circle cx="345" cy="275" r="3.5" fill="#6366f1" />
      </g>

      {/* Cybernetic details around the graphic */}
      <text x="60" y="80" fill="#6366f1" opacity="0.3" fontSize="10" fontFamily="monospace" letterSpacing="2">SYS.AUTH.ACTIVE</text>
      <text x="60" y="95" fill="#06b6d4" opacity="0.3" fontSize="8" fontFamily="monospace" letterSpacing="1">SECURE PORT: 443</text>
      <text x="350" y="420" fill="#6366f1" opacity="0.3" fontSize="10" fontFamily="monospace" letterSpacing="2">CTRL.LOCAL: 100%</text>
      <text x="350" y="435" fill="#06b6d4" opacity="0.3" fontSize="8" fontFamily="monospace" letterSpacing="1">NO_TRACKING_ON</text>

      {/* Corner crosshairs */}
      <path d="M50 70V50H70" stroke="#3b82f6" strokeWidth="2" opacity="0.3" />
      <path d="M450 70V50H430" stroke="#3b82f6" strokeWidth="2" opacity="0.3" />
      <path d="M50 430V450H70" stroke="#3b82f6" strokeWidth="2" opacity="0.3" />
      <path d="M450 430V450H430" stroke="#3b82f6" strokeWidth="2" opacity="0.3" />
    </svg>
  );
};

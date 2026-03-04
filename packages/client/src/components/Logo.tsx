interface LogoMarkProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export function LogoMark({ size = 40, className = '', animate = false }: LogoMarkProps) {
  const sq = (i: number) => animate
    ? { className: 'animate-logo-square', style: { animationDelay: `${i * 45}ms` } }
    : {};

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 110"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="110" height="110" rx="16" fill="#0A0D18"/>
      <rect x="3" y="3" width="104" height="104" rx="13" fill="none" stroke="#1A3028" strokeWidth="1" strokeDasharray="5 3"/>

      {/* Row 0: all green (top bar of C) */}
      <rect x={9}  y={9}  width={22} height={22} rx={3} fill="#4AE688" {...sq(0)}/>
      <rect x={34} y={9}  width={22} height={22} rx={3} fill="#4AE688" {...sq(1)}/>
      <rect x={59} y={9}  width={22} height={22} rx={3} fill="#4AE688" {...sq(2)}/>
      <rect x={84} y={9}  width={22} height={22} rx={3} fill="#4AE688" {...sq(3)}/>

      {/* Row 1: green spine, purple interior */}
      <rect x={9}  y={34} width={22} height={22} rx={3} fill="#4AE688" {...sq(4)}/>
      <rect x={34} y={34} width={22} height={22} rx={3} fill="#5A1F8A" {...sq(5)}/>
      <rect x={59} y={34} width={22} height={22} rx={3} fill="#4A1878" {...sq(6)}/>
      <rect x={84} y={34} width={22} height={22} rx={3} fill="#3D1566" {...sq(7)}/>

      {/* Row 2: green spine, purple interior */}
      <rect x={9}  y={59} width={22} height={22} rx={3} fill="#4AE688" {...sq(8)}/>
      <rect x={34} y={59} width={22} height={22} rx={3} fill="#4A1878" {...sq(9)}/>
      <rect x={59} y={59} width={22} height={22} rx={3} fill="#3D1566" {...sq(10)}/>
      <rect x={84} y={59} width={22} height={22} rx={3} fill="#311255" {...sq(11)}/>

      {/* Row 3: all green (bottom bar of C) */}
      <rect x={9}  y={84} width={22} height={22} rx={3} fill="#4AE688" {...sq(12)}/>
      <rect x={34} y={84} width={22} height={22} rx={3} fill="#4AE688" {...sq(13)}/>
      <rect x={59} y={84} width={22} height={22} rx={3} fill="#4AE688" {...sq(14)}/>
      <rect x={84} y={84} width={22} height={22} rx={3} fill="#4AE688" {...sq(15)}/>
    </svg>
  );
}

interface LogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export function Logo({ size = 40, className = '', animate = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark size={size} animate={animate} />
      <span
        style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: Math.round(size * 0.7),
          letterSpacing: '0.05em',
          lineHeight: 1,
          color: 'white',
        }}
      >
        COHESION
      </span>
    </div>
  );
}

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 40, className = '' }: LogoMarkProps) {
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
      <rect x={9}  y={9}  width={22} height={22} rx={3} fill="#4AE688"/>
      <rect x={34} y={9}  width={22} height={22} rx={3} fill="#4AE688"/>
      <rect x={59} y={9}  width={22} height={22} rx={3} fill="#4AE688"/>
      <rect x={84} y={9}  width={22} height={22} rx={3} fill="#4AE688"/>

      {/* Row 1: green spine, purple interior */}
      <rect x={9}  y={34} width={22} height={22} rx={3} fill="#4AE688"/>
      <rect x={34} y={34} width={22} height={22} rx={3} fill="#5A1F8A"/>
      <rect x={59} y={34} width={22} height={22} rx={3} fill="#4A1878"/>
      <rect x={84} y={34} width={22} height={22} rx={3} fill="#3D1566"/>

      {/* Row 2: green spine, purple interior */}
      <rect x={9}  y={59} width={22} height={22} rx={3} fill="#4AE688"/>
      <rect x={34} y={59} width={22} height={22} rx={3} fill="#4A1878"/>
      <rect x={59} y={59} width={22} height={22} rx={3} fill="#3D1566"/>
      <rect x={84} y={59} width={22} height={22} rx={3} fill="#311255"/>

      {/* Row 3: all green (bottom bar of C) */}
      <rect x={9}  y={84} width={22} height={22} rx={3} fill="#4AE688"/>
      <rect x={34} y={84} width={22} height={22} rx={3} fill="#4AE688"/>
      <rect x={59} y={84} width={22} height={22} rx={3} fill="#4AE688"/>
      <rect x={84} y={84} width={22} height={22} rx={3} fill="#4AE688"/>
    </svg>
  );
}

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark size={size} />
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

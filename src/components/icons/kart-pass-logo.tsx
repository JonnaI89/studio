import * as React from 'react';

export function FoererportalenLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="320"
      height="60"
      viewBox="0 0 320 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M20 30C20 18.9543 28.9543 10 40 10C51.0457 10 60 18.9543 60 30C60 41.0457 51.0457 50 40 50C28.9543 50 20 41.0457 20 30Z"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
      />
      <path d="M40 10V50" stroke="hsl(var(--primary))" strokeWidth="4" />
      <path
        d="M30 30H50"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="0" y="20" width="10" height="10" fill="hsl(var(--foreground))" />
      <rect x="10" y="30" width="10" height="10" fill="hsl(var(--foreground))" />
      <rect x="0" y="40" width="10" height="10" fill="hsl(var(--foreground))" />
      <rect x="10" y="10" width="10" height="10" fill="hsl(var(--foreground))" />
      <text
        x="75"
        y="40"
        fontFamily="Inter, sans-serif"
        fontSize="30"
        fontWeight="bold"
        fill="hsl(var(--foreground))"
      >
        Førerportalen
      </text>
    </svg>
  );
}

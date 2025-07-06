import * as React from 'react';

export function KnaVarnaLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="401" height="98" viewBox="0 0 401 98" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <g clipPath="url(#clip0_1_1)">
            <text style={{whiteSpace: "pre"}} fontFamily="Inter, sans-serif" fontSize="20" fontWeight="bold" fill="currentColor">
                <tspan x="111" y="81">Kongelig Norsk Automobilklub</tspan>
            </text>
            <text style={{whiteSpace: "pre"}} fontFamily="Inter, sans-serif" fontSize="56" fontWeight="bold" fill="currentColor">
                <tspan x="107" y="58">VARNA</tspan>
            </text>
            <path d="M50 97C22.9218 97 1 75.0782 1 48C1 20.9218 22.9218 -1 50 -1C77.0782 -1 99 20.9218 99 48C99 75.0782 77.0782 97 50 97Z" fill="currentColor" stroke="currentColor" strokeWidth="2"/>
            <path d="M30 76.5C21.4396 76.5 14.5 69.5604 14.5 61C14.5 52.4396 21.4396 45.5 30 45.5C38.5604 45.5 45.5 52.4396 45.5 61C45.5 69.5604 38.5604 76.5 30 76.5Z" transform="translate(20 15)" fill="currentColor" stroke="white" strokeWidth="3"/>
            <path d="M50 71V89" stroke="white" strokeWidth="2"/>
            <path d="M41 80H59" stroke="white" strokeWidth="2"/>
            <path d="M43.5756 73.5756L56.4244 86.4244" stroke="white" strokeWidth="2"/>
            <path d="M43.5756 86.4244L56.4244 73.5756" stroke="white" strokeWidth="2"/>
            <circle cx="50" cy="80" r="3.5" fill="white"/>
            <path d="M42 24V18L50 12L58 18V24H42Z" stroke="white" strokeWidth="2"/>
            <path d="M50 12V6" stroke="white" strokeWidth="2"/>
            <path d="M47.5 4H52.5" stroke="white" strokeWidth="2"/>
            <circle cx="45" cy="20" r="1.5" fill="white"/>
            <circle cx="50" cy="20" r="1.5" fill="white"/>
            <circle cx="55" cy="20" r="1.5" fill="white"/>
            <text style={{whiteSpace: "pre"}} fontFamily="Inter, sans-serif" fontSize="35" fontWeight="bold" fill="white">
                <tspan x="22" y="54">KNA</tspan>
            </text>
        </g>
        <defs>
            <clipPath id="clip0_1_1">
                <rect width="400" height="98" fill="white" transform="translate(0.5)"/>
            </clipPath>
        </defs>
    </svg>
  );
}

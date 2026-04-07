import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background */}
      <rect width="128" height="128" rx="24" fill="#0f172a" />

      {/* Left arc */}
      <path
        d="M24 84 A28 28 0 0 1 64 64"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* Right arc */}
      <path
        d="M64 64 A28 28 0 0 1 104 84"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Momentum dot */}
      <circle cx="103" cy="82" r="5" fill="#38bdf8" />
    </svg>
  );
}

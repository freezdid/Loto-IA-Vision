"use client";

import { useState } from 'react';

interface LevitatingBallProps {
  value: number;
  isChance?: boolean;
  index?: number;
  size?: 'md' | 'sm';
  /** Stagger (seconds) applied to the entrance animation. */
  revealDelay?: number;
  /** Set to false for static rows (lists, archives). */
  levitate?: boolean;
}

/**
 * The signature 3D ball: radial lighting, soft contact shadow and a click to
 * make it spin. This is the one playful gesture the whole interface allows.
 *
 * All motion is CSS-driven (entrance, float, spin) so server and client render
 * the exact same markup — framer-motion previously branched on
 * `prefers-reduced-motion` at render time, which broke hydration.
 */
export function LevitatingBall({
  value,
  isChance = false,
  index = 0,
  size = 'md',
  revealDelay = 0,
  levitate = false,
}: LevitatingBallProps) {
  const [spin, setSpin] = useState(0);
  const ballClass = size === 'md' ? 'number-ball' : 'number-ball-sm';

  return (
    <div className="ball-in flex flex-col items-center gap-1.5" style={{ animationDelay: `${revealDelay}s` }}>
      <div
        className={levitate ? 'ball-float' : undefined}
        style={levitate ? { animationDelay: `${0.35 + index * 0.28}s` } : undefined}
      >
        <button
          type="button"
          onClick={() => setSpin((previous) => previous + 360)}
          className={`${ballClass} ball-tap hover:scale-105 active:scale-95 ${isChance ? 'chance' : ''}`}
          style={{ transform: `rotateY(${spin}deg)` }}
          aria-label={isChance ? `Numéro Chance ${value}, cliquer pour faire tourner la boule` : `Numéro ${value}`}
        >
          {value}
        </button>
      </div>
      {levitate && (
        <span aria-hidden className="ball-pedestal ball-in" style={{ animationDelay: `${revealDelay + 0.1}s` }} />
      )}
    </div>
  );
}

interface BallGroupProps {
  numbers: number[];
  chance: number;
  size?: 'md' | 'sm';
  levitate?: boolean;
  /** Change this value to replay the entrance animation. */
  revealSeed?: string;
}

/** Five main numbers, one divider, one gold chance ball. */
export function BallGroup({ numbers, chance, size = 'md', levitate = false, revealSeed }: BallGroupProps) {
  const gap = size === 'md' ? 'gap-2.5 sm:gap-4' : 'gap-1.5';
  return (
    <div key={revealSeed} className={`flex items-center justify-center ${gap}`}>
      {numbers.map((value, index) => (
        <LevitatingBall
          key={`${index}-${value}`}
          value={value}
          index={index}
          size={size}
          levitate={levitate}
          revealDelay={index * 0.05}
        />
      ))}
      {size === 'md' && <span aria-hidden className="mx-0.5 hidden h-12 w-px bg-line sm:block" />}
      <LevitatingBall
        value={chance}
        isChance
        index={numbers.length}
        size={size}
        levitate={levitate}
        revealDelay={numbers.length * 0.05}
      />
    </div>
  );
}

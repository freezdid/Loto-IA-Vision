"use client";

import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface SpatialCardProps {
  children: React.ReactNode;
  className?: string;
  /** Cursor glow tint; keep it subtle, it is decoration around the content. */
  glow?: string;
  /** Accessible name; when set, the card is exposed as a named region. */
  ariaLabel?: string;
}

/**
 * Elevated panel with a light spatial tilt: depth follows the pointer, then
 * settles back. Disabled when the visitor asks for reduced motion.
 */
export function SpatialCard({
  children,
  className = '',
  glow = 'rgba(47, 125, 246, 0.14)',
  ariaLabel,
}: SpatialCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPointer({
      x: (event.clientX - rect.left) / rect.width - 0.5,
      y: (event.clientY - rect.top) / rect.height - 0.5,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMove}
      onMouseLeave={() => {
        setHovered(false);
        setPointer({ x: 0, y: 0 });
      }}
      animate={{
        rotateX: hovered && !reduceMotion ? -pointer.y * 3.5 : 0,
        rotateY: hovered && !reduceMotion ? pointer.x * 3.5 : 0,
        transformPerspective: 1400,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className={`panel ${className}`}
    >
      {hovered && !reduceMotion && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background: `radial-gradient(460px circle at ${(pointer.x + 0.5) * 100}% ${
              (pointer.y + 0.5) * 100
            }%, ${glow}, transparent 68%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

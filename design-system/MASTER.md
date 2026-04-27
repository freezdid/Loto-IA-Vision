# Design System: Loto IA Vision

## Overview
A premium, AI-driven dashboard for Loto prediction, using a Bento Grid layout and deep OLED dark mode aesthetics.

## Typography
- **Heading/Body**: DM Sans (Google Fonts)
- **CSS**:
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');

:root {
  --font-main: 'DM Sans', sans-serif;
}
```

## Color Palette (OLED Dark)
| Role | Hex | Tailwind Class |
|------|-----|----------------|
| **Background** | `#020617` | `bg-[#020617]` |
| **Primary (Panel)** | `#0F172A` | `bg-[#0F172A]` |
| **Secondary (Cards)** | `#1E293B` | `bg-[#1E293B]` |
| **Accent (Success/CTA)** | `#22C55E` | `text-[#22C55E]` / `bg-[#22C55E]` |
| **Accent (AI/Action)** | `#3B82F6` | `text-[#3B82F6]` / `bg-[#3B82F6]` |
| **Text (Primary)** | `#F8FAFC` | `text-[#F8FAFC]` |
| **Text (Muted)** | `#94A3B8` | `text-[#94A3B8]` |

## Components & Layout
- **Layout**: Bento Grid (Modular, scannable)
- **Cards**:
  - `bg-[#0F172A]/50` with `backdrop-blur-xl`
  - `border border-slate-800/50`
  - Hover: `scale-[1.02]` transition
- **Buttons**:
  - `bg-[#22C55E]` for positive actions (Luck/Win)
  - `bg-[#3B82F6]` for technical actions (AI/Scrape)
  - Subtle glow: `shadow-[0_0_20px_rgba(34,197,94,0.3)]`

## UI/UX Rules
- **Icons**: Lucide React (No Emojis)
- **Transitions**: 200ms ease-in-out
- **Empty States**: Animated skeletons or shimmer
- **Charts**: Custom Recharts with `#22C55E` (success) or `#EF4444` (loss)

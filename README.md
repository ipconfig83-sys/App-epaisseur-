# PRESBYTA — Lens Thickness Simulator

> Professional ophthalmic lens thickness calculator with real-time 3D visualization.

PRESBYTA is a production-grade web simulator for optical laboratories,
dispensing opticians and ECPs. It estimates lens centre / edge / final
thickness, weight and cosmetics from a complete prescription and frame
specification, and renders the result in a real-time WebGL scene.

## Features

- Realistic ophthalmic thickness estimation (sagitta-based geometry)
- Real-time 3D lens rendering with refraction & transmission
- Side-by-side index comparison (1.50 → 1.74)
- Multi-material database (CR-39, Polycarbonate, MR-7, MR-8)
- 7 frame shapes (round, oval, rectangular, aviator, cat-eye, square, panto)
- 3 frame types (full-rim, semi-rimless, rimless)
- Smart diagnostics (MBS check, brittleness, edge thickness warnings)
- PDF report + PNG screenshot export
- Patient mode / Laboratory mode
- Trilingual: English / French / Arabic (RTL)
- Dark / Light theme
- Persistent state (Zustand)

## Tech stack

- **React 18 + Vite + TypeScript**
- **Tailwind CSS** with a custom premium optical palette
- **Three.js / @react-three/fiber / @react-three/drei** for 3D
- **Framer Motion** for animations
- **Zustand** for state management
- **i18next + react-i18next** for translations
- **jsPDF + html2canvas** for export

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (http://localhost:5173)
npm run dev

# 3. Build for production
npm run build

# 4. Preview the production build
npm run preview
```

## Project structure

```
src/
├── App.tsx                  # Root shell, theme & language sync
├── main.tsx                 # Bootstrap
├── i18n/                    # Trilingual resources (en / fr / ar)
├── store/                   # Zustand store (persisted)
├── types/                   # TypeScript types
├── engine/                  # Optical calculation engine
│   ├── calculate.ts         # Sagitta, thickness, weight, comparison
│   └── materials.ts         # Material datasheet
├── three/
│   └── lensGeometry.ts      # Procedural lens BufferGeometry
├── components/
│   ├── brand/Logo.tsx
│   ├── layout/{Header,Footer}.tsx
│   ├── ui/{GlassCard,Field}.tsx
│   ├── forms/{FrameForm,LensForm}.tsx
│   ├── results/{ResultsPanel,ComparisonTable,Diagnostics}.tsx
│   └── three/{Scene,LensMesh,ProfileView}.tsx
├── pages/
│   ├── SimulatorPage.tsx
│   └── AboutPage.tsx
├── utils/export.ts          # PDF + PNG export
└── styles/index.css         # Tailwind layers + glass utilities
```

## Calculation engine

The thickness model uses standard ophthalmic conventions (Jalie, Brooks):

1. Recommend a base curve via Vogel's rule (`F1 = sphere + 6` for plus,
   `F1 = sphere/2 + 6` for minus).
2. Derive surface radii from `r = 1000·(n − 1) / F`.
3. Compute front/back sagittas at the lens semi-diameter
   (`s = R − √(R² − r²)`).
4. Plus lenses → centre is thicker: `Ct = Et + s1 − s2`.
   Minus lenses → edge is thicker: `Et = Ct + s2 − s1`.
5. Apply manufacturer minima from inputs.
6. Recompute on the cut diameter (`ED + 2·decentration`) for the final
   edged thickness.
7. Estimate weight as `π·r²·t̄·ρ` using density-by-index lookup.
8. Re-run for all 6 indices and pick the lowest meeting a 4 mm comfort
   target as the recommended index.

All formulas are documented inline in `src/engine/calculate.ts`.

## Branding

**PRESBYTA** is a professional ophthalmic lens brand owned by
**Lunette 15 Minutes**, specialised in premium lens optimisation for
opticians and optical laboratories. The simulator presented here is
the public interface of PRESBYTA's in-house dispensing intelligence
suite. The included logo is a placeholder SVG that can be replaced
with the official brand assets.

## License

Proprietary — PRESBYTA optical lab suite. All rights reserved.

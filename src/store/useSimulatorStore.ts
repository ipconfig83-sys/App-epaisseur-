import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppMode,
  FrameData,
  LensData,
  Language,
  Theme,
} from '@/types';

interface SimulatorState {
  frame: FrameData;
  lens: LensData;
  mode: AppMode;
  theme: Theme;
  language: Language;
  page: 'simulator' | 'about';
  setFrame: (patch: Partial<FrameData>) => void;
  setLens: (patch: Partial<LensData>) => void;
  setMode: (m: AppMode) => void;
  setTheme: (t: Theme) => void;
  setLanguage: (l: Language) => void;
  setPage: (p: 'simulator' | 'about') => void;
  resetToDefaults: () => void;
}

export const DEFAULT_FRAME: FrameData = {
  aSize: 52,
  bSize: 32,
  dbl: 18,
  ed: 56,
  shape: 'oval',
  type: 'full-rim',
  monocularPD: 32,
  fittingHeight: 18,
  decentration: 3,
};

export const DEFAULT_LENS: LensData = {
  sphere: -3.0,
  cylinder: -0.5,
  axis: 90,
  addition: 0,
  index: 1.5,
  material: 'CR39',
  diameter: 65,
  minCenterThickness: 1.5,
  minEdgeThickness: 1.0,
  type: 'single-vision',
};

export const useSimulatorStore = create<SimulatorState>()(
  persist(
    (set) => ({
      frame: DEFAULT_FRAME,
      lens: DEFAULT_LENS,
      mode: 'laboratory',
      theme: 'dark',
      language: 'en',
      page: 'simulator',
      setFrame: (patch) => set((s) => ({ frame: { ...s.frame, ...patch } })),
      setLens: (patch) => set((s) => ({ lens: { ...s.lens, ...patch } })),
      setMode: (mode) => set({ mode }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setPage: (page) => set({ page }),
      resetToDefaults: () =>
        set({ frame: DEFAULT_FRAME, lens: DEFAULT_LENS }),
    }),
    {
      name: 'presbyta-simulator',
      partialize: (s) => ({
        frame: s.frame,
        lens: s.lens,
        theme: s.theme,
        language: s.language,
        mode: s.mode,
      }),
    }
  )
);

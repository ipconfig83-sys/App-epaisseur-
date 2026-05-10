import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppMode,
  CustomShape,
  Currency,
  FrameData,
  LensData,
  Language,
  QuotationPreferences,
  Theme,
  ValidationMeasurement,
} from '@/types';

interface SimulatorState {
  frame: FrameData;
  lens: LensData;
  mode: AppMode;
  theme: Theme;
  language: Language;
  page: 'simulator' | 'about';
  currency: Currency;
  preferences: QuotationPreferences;
  validation: ValidationMeasurement;
  customShape: CustomShape | null;
  disclaimerAcknowledged: boolean;
  setFrame: (patch: Partial<FrameData>) => void;
  setLens: (patch: Partial<LensData>) => void;
  setMode: (m: AppMode) => void;
  setTheme: (t: Theme) => void;
  setLanguage: (l: Language) => void;
  setPage: (p: 'simulator' | 'about') => void;
  setCurrency: (c: Currency) => void;
  setPreferences: (p: Partial<QuotationPreferences>) => void;
  setValidation: (v: Partial<ValidationMeasurement>) => void;
  setCustomShape: (s: CustomShape | null) => void;
  acknowledgeDisclaimer: () => void;
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

export const DEFAULT_PREFS: QuotationPreferences = {
  progressive: false,
  blueBlock: false,
  photochromic: false,
  office: false,
};

export const DEFAULT_VALIDATION: ValidationMeasurement = {
  measuredCenterMm: 0,
  measuredEdgeMm: 0,
  batchNumber: '',
  technician: '',
  notes: '',
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
      currency: 'MAD',
      preferences: DEFAULT_PREFS,
      validation: DEFAULT_VALIDATION,
      customShape: null,
      disclaimerAcknowledged: false,
      setFrame: (patch) => set((s) => ({ frame: { ...s.frame, ...patch } })),
      setLens: (patch) => set((s) => ({ lens: { ...s.lens, ...patch } })),
      setMode: (mode) => set({ mode }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setPage: (page) => set({ page }),
      setCurrency: (currency) => set({ currency }),
      setPreferences: (patch) =>
        set((s) => ({ preferences: { ...s.preferences, ...patch } })),
      setValidation: (patch) =>
        set((s) => ({ validation: { ...s.validation, ...patch } })),
      setCustomShape: (customShape) => set({ customShape }),
      acknowledgeDisclaimer: () => set({ disclaimerAcknowledged: true }),
      resetToDefaults: () =>
        set({
          frame: DEFAULT_FRAME,
          lens: DEFAULT_LENS,
          preferences: DEFAULT_PREFS,
          validation: DEFAULT_VALIDATION,
          customShape: null,
        }),
    }),
    {
      name: 'presbyta-simulator',
      partialize: (s) => ({
        frame: s.frame,
        lens: s.lens,
        theme: s.theme,
        language: s.language,
        mode: s.mode,
        currency: s.currency,
        preferences: s.preferences,
        disclaimerAcknowledged: s.disclaimerAcknowledged,
      }),
    }
  )
);

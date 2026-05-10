import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, FileImage } from 'lucide-react';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { parseSvgShape } from '@/utils/svgImport';

export default function FrameShapeImport() {
  const { t } = useTranslation();
  const { customShape, setCustomShape, frame, setFrame } = useSimulatorStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const shape = await parseSvgShape(file, frame.aSize, frame.bSize);
      setCustomShape(shape);
      // Update frame A/B with imported bounding-box dimensions for
      // consistent decentration / MBS calculations.
      setFrame({ aSize: Math.round(shape.aMm), bSize: Math.round(shape.bMm) });
    } catch (e) {
      setError(t('shape.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => inputRef.current?.click()}
          className="btn-ghost text-xs"
          disabled={busy}
        >
          <Upload size={12} />
          {busy ? t('shape.importing') : t('shape.import')}
        </button>
        {customShape && (
          <button
            onClick={() => setCustomShape(null)}
            className="btn-ghost text-xs"
            title={t('shape.clear')}
          >
            <X size={12} />
            {t('shape.clear')}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".svg,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
      </div>
      {customShape && (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-gold-300/80">
          <FileImage size={10} />
          {t('shape.imported', { name: customShape.name })} ·{' '}
          {customShape.aMm.toFixed(0)} × {customShape.bMm.toFixed(0)} mm
        </div>
      )}
      {error && <div className="mt-2 text-[10px] text-red-300">{error}</div>}
      {!customShape && !error && (
        <div className="mt-1 text-[10px] text-white/40">{t('shape.hint')}</div>
      )}
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { Frame } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { Field, NumberInput, SelectInput } from '@/components/ui/Field';
import FrameShapeImport from './FrameShapeImport';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import type { FrameShape, FrameType } from '@/types';

export default function FrameForm() {
  const { t } = useTranslation();
  const { frame, setFrame } = useSimulatorStore();

  const shapeOptions: { value: FrameShape; label: string }[] = (
    ['round', 'oval', 'rectangular', 'aviator', 'cat-eye', 'square', 'panto'] as FrameShape[]
  ).map((s) => ({ value: s, label: t(`shapes.${s}`) }));

  const typeOptions: { value: FrameType; label: string }[] = (
    ['full-rim', 'semi-rimless', 'rimless'] as FrameType[]
  ).map((s) => ({ value: s, label: t(`frameTypes.${s}`) }));

  return (
    <GlassCard title={t('sections.frameData')} icon={<Frame size={14} />}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('fields.aSize')} unit={t('units.mm')}>
          <NumberInput value={frame.aSize} onChange={(v) => setFrame({ aSize: v })} step={0.5} min={30} max={70} />
        </Field>
        <Field label={t('fields.bSize')} unit={t('units.mm')}>
          <NumberInput value={frame.bSize} onChange={(v) => setFrame({ bSize: v })} step={0.5} min={20} max={60} />
        </Field>
        <Field label={t('fields.dbl')} unit={t('units.mm')}>
          <NumberInput value={frame.dbl} onChange={(v) => setFrame({ dbl: v })} step={0.5} min={10} max={30} />
        </Field>
        <Field label={t('fields.ed')} unit={t('units.mm')}>
          <NumberInput value={frame.ed} onChange={(v) => setFrame({ ed: v })} step={0.5} min={30} max={75} />
        </Field>
        <Field label={t('fields.shape')}>
          <SelectInput value={frame.shape} onChange={(v) => setFrame({ shape: v })} options={shapeOptions} />
        </Field>
        <Field label={t('fields.frameType')}>
          <SelectInput value={frame.type} onChange={(v) => setFrame({ type: v })} options={typeOptions} />
        </Field>
        <Field label={t('fields.monocularPD')} unit={t('units.mm')}>
          <NumberInput value={frame.monocularPD} onChange={(v) => setFrame({ monocularPD: v })} step={0.5} min={20} max={40} />
        </Field>
        <Field label={t('fields.fittingHeight')} unit={t('units.mm')}>
          <NumberInput value={frame.fittingHeight} onChange={(v) => setFrame({ fittingHeight: v })} step={0.5} min={10} max={30} />
        </Field>
        <Field label={t('fields.decentration')} unit={t('units.mm')}>
          <NumberInput value={frame.decentration} onChange={(v) => setFrame({ decentration: v })} step={0.1} min={0} max={10} />
        </Field>
      </div>
      <FrameShapeImport />
    </GlassCard>
  );
}

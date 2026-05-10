import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { Field, NumberInput, SelectInput } from '@/components/ui/Field';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { AVAILABLE_INDICES } from '@/engine/materials';
import type { LensMaterial, LensType, RefractiveIndex } from '@/types';

export default function LensForm() {
  const { t } = useTranslation();
  const { lens, setLens } = useSimulatorStore();

  const indexOptions = AVAILABLE_INDICES.map((i) => ({
    value: String(i),
    label: i.toFixed(2),
  }));

  const materialOptions: { value: LensMaterial; label: string }[] = [
    { value: 'CR39', label: 'CR-39' },
    { value: 'Polycarbonate', label: 'Polycarbonate' },
    { value: 'MR8', label: 'MR-8 (1.60)' },
    { value: 'MR7', label: 'MR-7 (1.67)' },
  ];

  const lensTypeOptions: { value: LensType; label: string }[] = (
    ['single-vision', 'progressive', 'office'] as LensType[]
  ).map((s) => ({ value: s, label: t(`lensTypes.${s}`) }));

  return (
    <GlassCard title={t('sections.lensData')} icon={<Eye size={14} />}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('fields.sphere')} unit={t('units.diopters')}>
          <NumberInput value={lens.sphere} onChange={(v) => setLens({ sphere: v })} step={0.25} min={-25} max={25} />
        </Field>
        <Field label={t('fields.cylinder')} unit={t('units.diopters')}>
          <NumberInput value={lens.cylinder} onChange={(v) => setLens({ cylinder: v })} step={0.25} min={-8} max={8} />
        </Field>
        <Field label={t('fields.axis')} unit={t('units.deg')}>
          <NumberInput value={lens.axis} onChange={(v) => setLens({ axis: v })} step={1} min={0} max={180} />
        </Field>
        <Field label={t('fields.addition')} unit={t('units.diopters')}>
          <NumberInput value={lens.addition} onChange={(v) => setLens({ addition: v })} step={0.25} min={0} max={4} />
        </Field>
        <Field label={t('fields.index')}>
          <SelectInput
            value={String(lens.index)}
            onChange={(v) => setLens({ index: parseFloat(v) as RefractiveIndex })}
            options={indexOptions}
          />
        </Field>
        <Field label={t('fields.material')}>
          <SelectInput
            value={lens.material}
            onChange={(v) => setLens({ material: v })}
            options={materialOptions}
          />
        </Field>
        <Field label={t('fields.diameter')} unit={t('units.mm')}>
          <NumberInput value={lens.diameter} onChange={(v) => setLens({ diameter: v })} step={1} min={50} max={80} />
        </Field>
        <Field label={t('fields.lensType')}>
          <SelectInput value={lens.type} onChange={(v) => setLens({ type: v })} options={lensTypeOptions} />
        </Field>
        <Field label={t('fields.minCenter')} unit={t('units.mm')}>
          <NumberInput value={lens.minCenterThickness} onChange={(v) => setLens({ minCenterThickness: v })} step={0.1} min={0.5} max={5} />
        </Field>
        <Field label={t('fields.minEdge')} unit={t('units.mm')}>
          <NumberInput value={lens.minEdgeThickness} onChange={(v) => setLens({ minEdgeThickness: v })} step={0.1} min={0.5} max={5} />
        </Field>
      </div>
    </GlassCard>
  );
}

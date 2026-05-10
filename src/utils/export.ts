import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { FrameData, LensData, ThicknessResult } from '@/types';

// =====================================================================
// Export utilities — PDF report and screenshot
// =====================================================================

export async function exportScreenshot(elementId = 'presbyta-3d-canvas'): Promise<void> {
  const wrapper = document.getElementById(elementId);
  // R3F sets the id on the outer wrapper; the actual <canvas> is its first child.
  const canvas =
    wrapper instanceof HTMLCanvasElement
      ? wrapper
      : (wrapper?.querySelector('canvas') as HTMLCanvasElement | null) ??
        (document.querySelector('canvas') as HTMLCanvasElement | null);
  if (!canvas) return;
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `presbyta-lens-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

export async function exportReportPdf(
  lens: LensData,
  frame: FrameData,
  result: ThicknessResult,
  reportElementId = 'presbyta-report'
): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  let y = 18;

  // Header
  pdf.setFillColor(10, 26, 51);
  pdf.rect(0, 0, pageW, 28, 'F');
  pdf.setTextColor(236, 193, 84);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('PRESBYTA', 14, 18);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Lens Thickness Simulation Report', 14, 24);

  y = 36;
  pdf.setTextColor(60, 60, 70);
  pdf.setFontSize(9);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, y);

  y += 10;

  // Try to attach a screenshot of the report area
  const node = document.getElementById(reportElementId);
  if (node) {
    try {
      const canvas = await html2canvas(node, {
        backgroundColor: '#0a1a33',
        scale: 1.5,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const ratio = canvas.height / canvas.width;
      const imgW = pageW - 28;
      const imgH = imgW * ratio;
      pdf.addImage(imgData, 'PNG', 14, y, imgW, Math.min(imgH, 130));
      y += Math.min(imgH, 130) + 6;
    } catch {
      // ignore screenshot failure, fall back to text
    }
  }

  // Tabular data
  pdf.setTextColor(10, 26, 51);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Frame', 14, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  y += 6;
  pdf.text(
    `A ${frame.aSize} mm · B ${frame.bSize} mm · DBL ${frame.dbl} mm · ED ${frame.ed} mm · ${frame.shape} · ${frame.type}`,
    14, y
  );
  y += 5;
  pdf.text(`Monocular PD ${frame.monocularPD} mm · Fitting height ${frame.fittingHeight} mm · Decentration ${frame.decentration} mm`, 14, y);

  y += 10;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Lens', 14, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  y += 6;
  pdf.text(
    `Sphere ${lens.sphere.toFixed(2)} D · Cyl ${lens.cylinder.toFixed(2)} D · Axis ${lens.axis}° · Add ${lens.addition.toFixed(2)} D`,
    14, y
  );
  y += 5;
  pdf.text(
    `Index n=${lens.index} · Material ${lens.material} · Diameter ${lens.diameter} mm · ${lens.type}`,
    14, y
  );

  y += 10;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Results', 14, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  y += 6;
  pdf.text(`Centre thickness:           ${result.centerThickness.toFixed(2)} mm`, 14, y); y += 5;
  pdf.text(`Edge (uncut, worst):        ${result.edgeThickness.toFixed(2)} mm`, 14, y); y += 5;
  pdf.text(`Final edge (after edging):  ${result.finalEdgeThickness.toFixed(2)} mm`, 14, y); y += 5;
  pdf.text(`Edge min / max:             ${result.edgeThicknessMin.toFixed(2)} / ${result.edgeThicknessMax.toFixed(2)} mm`, 14, y); y += 5;
  pdf.text(`Base / back curve:          ${result.baseCurve.toFixed(2)} / ${result.backCurve.toFixed(2)} D`, 14, y); y += 5;
  pdf.text(`Estimated weight:           ${result.weight.toFixed(1)} g`, 14, y); y += 5;
  pdf.text(`Recommended index:          ${result.optimalIndex}`, 14, y); y += 5;

  // Meridians
  y += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Principal meridians', 14, y);
  pdf.setFont('helvetica', 'normal');
  for (const m of result.meridians) {
    y += 5;
    pdf.text(
      `  M @ ${m.axis.toFixed(0)}°  F=${m.power.toFixed(2)} D · F1=${m.frontPower.toFixed(2)} F2=${m.backPower.toFixed(2)} · Et=${m.edgeThickness.toFixed(2)} mm`,
      14, y
    );
  }

  // Blank analysis
  y += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Blank optimization', 14, y);
  pdf.setFont('helvetica', 'normal');
  y += 5;
  pdf.text(`MBS: ${result.blank.minimumBlankSize.toFixed(1)} mm  ·  Ø used: ${result.blank.uncutDiameterUsed.toFixed(0)} mm  ·  fits: ${result.blank.fits ? 'YES' : 'NO'}`, 14, y);
  y += 5;
  pdf.text(`Decentration H/V/total: ${result.blank.effectiveDecentrationH.toFixed(2)} / ${result.blank.effectiveDecentrationV.toFixed(2)} / ${result.blank.totalDecentration.toFixed(2)} mm`, 14, y);

  // ANSI
  y += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text('ANSI Z80.1 compliance', 14, y);
  pdf.setFont('helvetica', 'normal');
  y += 5;
  pdf.text(`Min Ct: ${result.ansi.ansiCenterMin.toFixed(2)} mm (${result.ansi.centerOk ? 'OK' : 'BELOW'}) · Min Et: ${result.ansi.ansiEdgeMin.toFixed(2)} mm (${result.ansi.edgeOk ? 'OK' : 'BELOW'})`, 14, y);

  // Prism thinning
  if (result.prismThinning.applied) {
    y += 8;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Prism thinning', 14, y);
    pdf.setFont('helvetica', 'normal');
    y += 5;
    pdf.text(
      `${result.prismThinning.prismDiopters.toFixed(2)} Δ ${result.prismThinning.base} · saves ${result.prismThinning.thicknessReductionMm.toFixed(2)} mm`,
      14, y
    );
  }

  if (result.warnings.length) {
    y += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Diagnostics', 14, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    for (const w of result.warnings) {
      y += 5;
      const text = `• [${w.severity.toUpperCase()}] ${w.message}`;
      const lines = pdf.splitTextToSize(text, pageW - 28);
      pdf.text(lines, 14, y);
      y += (lines.length - 1) * 4;
    }
  }

  // Disclaimer block (always present)
  y += 10;
  pdf.setFillColor(252, 244, 220);
  pdf.rect(10, y - 4, pageW - 20, 14, 'F');
  pdf.setTextColor(120, 80, 0);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ESTIMATION ONLY', 14, y);
  pdf.setFont('helvetica', 'normal');
  const disclaimer =
    'This document is an estimation produced by the PRESBYTA simulator. Final lens values must be validated by an optical laboratory before manufacturing.';
  pdf.text(pdf.splitTextToSize(disclaimer, pageW - 28), 14, y + 4);

  // Footer
  pdf.setTextColor(120, 120, 130);
  pdf.setFontSize(8);
  pdf.text(
    'PRESBYTA · A Lunette 15 Minutes brand · Confidential lens estimation report',
    14,
    290
  );

  pdf.save(`presbyta-report-${Date.now()}.pdf`);
}

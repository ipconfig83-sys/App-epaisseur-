import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { FrameData, LensData, ThicknessResult } from '@/types';

// =====================================================================
// Export utilities — PDF report and screenshot
// =====================================================================

export async function exportScreenshot(elementId = 'presbyta-3d-canvas'): Promise<void> {
  const el = document.getElementById(elementId) as HTMLCanvasElement | null;
  if (!el) return;
  // For Three.js canvases, the buffer is preserved (we set preserveDrawingBuffer)
  const dataUrl = el.toDataURL('image/png');
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
  pdf.text(`Centre thickness:        ${result.centerThickness.toFixed(2)} mm`, 14, y); y += 5;
  pdf.text(`Edge thickness:          ${result.edgeThickness.toFixed(2)} mm`, 14, y); y += 5;
  pdf.text(`Final edge (after edging): ${result.finalEdgeThickness.toFixed(2)} mm`, 14, y); y += 5;
  pdf.text(`Base curve:              ${result.baseCurve.toFixed(1)} D`, 14, y); y += 5;
  pdf.text(`Estimated weight:        ${result.weight.toFixed(1)} g`, 14, y); y += 5;
  pdf.text(`Recommended index:       ${result.optimalIndex}`, 14, y);

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

  // Footer
  pdf.setTextColor(120, 120, 130);
  pdf.setFontSize(8);
  pdf.text('PRESBYTA · Confidential lens estimation report · presbyta.optical', 14, 290);

  pdf.save(`presbyta-report-${Date.now()}.pdf`);
}

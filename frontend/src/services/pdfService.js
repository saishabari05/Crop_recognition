import jsPDF from 'jspdf';

function safeText(value, fallback = 'N/A') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text ? text : fallback;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return safeText(dateString);
  }
}

function formatCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return 'Lat, Long';
  }

  const [lat, lon] = coordinates;
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return 'Lat, Long';
  }

  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

function addKeyValueRows(doc, rows, startY, options = {}) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = options.margin ?? 15;
  const labelOffset = options.labelOffset ?? 50;
  const lineHeight = options.lineHeight ?? 5;
  let yPosition = startY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  rows.forEach(([label, value]) => {
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(safeText(label), margin, yPosition);
    doc.setFont('helvetica', 'normal');

    const wrappedValue = doc.splitTextToSize(safeText(value), pageWidth - margin * 2 - labelOffset);
    doc.text(wrappedValue, margin + labelOffset, yPosition);
    yPosition += wrappedValue.length > 1 ? wrappedValue.length * 4 : lineHeight;
  });

  return yPosition;
}

function addWrappedLines(doc, lines, startY, options = {}) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = options.margin ?? 15;
  let yPosition = startY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  lines.forEach((line) => {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = margin;
    }

    const wrappedLine = doc.splitTextToSize(safeText(line), pageWidth - margin * 2);
    doc.text(wrappedLine, margin, yPosition);
    yPosition += wrappedLine.length * 4;
  });

  return yPosition;
}

function loadImageForPdf(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      resolve(null);
      return;
    }

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext('2d');

      if (!context) {
        resolve(null);
        return;
      }

      context.drawImage(image, 0, 0);
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        width: canvas.width,
        height: canvas.height,
      });
    };
    image.onerror = reject;
    image.src = src;
  });
}

function addReportImage(doc, image, imageName, startY, options = {}) {
  if (!image) return startY;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = options.margin ?? 15;
  const frameWidth = options.frameWidth ?? 72;
  const frameHeight = options.frameHeight ?? 58;
  let yPosition = startY;

  if (yPosition + frameHeight + 20 > pageHeight - 15) {
    doc.addPage();
    yPosition = margin;
  }

  const xPosition = pageWidth - margin - frameWidth;
  doc.setFillColor(252, 249, 243);
  doc.setDrawColor(205, 192, 174);
  doc.roundedRect(xPosition, yPosition, frameWidth, frameHeight, 4, 4, 'FD');

  const imageRatio = image.width / image.height;
  const frameRatio = frameWidth / frameHeight;
  let drawWidth = frameWidth - 6;
  let drawHeight = frameHeight - 6;

  if (imageRatio > frameRatio) {
    drawHeight = drawWidth / imageRatio;
  } else {
    drawWidth = drawHeight * imageRatio;
  }

  const imageX = xPosition + (frameWidth - drawWidth) / 2;
  const imageY = yPosition + (frameHeight - drawHeight) / 2;
  doc.addImage(image.dataUrl, 'JPEG', imageX, imageY, drawWidth, drawHeight);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  const caption = doc.splitTextToSize(safeText(imageName, 'uploaded-image'), frameWidth);
  doc.text(caption, xPosition + frameWidth / 2, yPosition + frameHeight + 6, { align: 'center' });

  return yPosition + frameHeight + caption.length * 3 + 6;
}

export async function downloadReportPdf(report) {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = 15;
    const reportImage = await loadImageForPdf(report?.imagePreviewUrl).catch(() => null);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(45, 105, 65);
    doc.text('CROP DISEASE INTELLIGENCE REPORT', pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Powered by AgriVision AI | EfficientNet-B3 + LLM Advisory', pageWidth / 2, yPosition, {
      align: 'center',
    });

    yPosition += 5;
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(45, 105, 65);
    doc.text('1. Report Information', margin, yPosition);
    yPosition += 7;

    yPosition = addKeyValueRows(
      doc,
      [
        ['Report ID:', report?.id || 'AUTO-GENERATED UUID'],
        ['Date & Time:', formatDate(report?.reportDate)],
        ['Farm/Field:', report?.locationName || 'Farm Name / Plot ID'],
        ['Location (Geocoded):', report?.locationName || 'Village, District, State'],
        ['GPS Coordinates:', formatCoordinates(report?.coordinates)],
        ['Image Source:', 'Mobile Camera / Drone'],
        ['Image Name:', safeText(report?.imageName, 'Not available')],
      ],
      yPosition,
    );

    if (reportImage) {
      yPosition += 2;
      yPosition = addReportImage(doc, reportImage, report?.imageName, yPosition, { margin });
    }

    yPosition += 3;
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(45, 105, 65);
    doc.text('2. AI Prediction Results', margin, yPosition);
    yPosition += 7;

    yPosition = addKeyValueRows(
      doc,
      [
        ['Crop Type:', report?.crop || 'Tomato / Apple / Grape'],
        ['Disease Detected:', report?.disease || 'Disease Name'],
        ['Confidence Score:', `${Number(report?.confidence ?? 0).toFixed(2)}%`],
        ['Severity Level:', report?.severity || 'Mild / Moderate / Severe'],
        ['Health Score:', `${Number(report?.healthScore ?? 0).toFixed(0)}%`],
      ],
      yPosition,
    );

    yPosition += 3;
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(45, 105, 65);
    doc.text('3. AI Treatment Plan & Recommendations', margin, yPosition);
    yPosition += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    const recommendationText = safeText(report?.summary || report?.recommendation, 'No recommendations available.');
    const wrappedRec = doc.splitTextToSize(recommendationText, pageWidth - margin * 2);
    doc.text(wrappedRec, margin, yPosition);
    yPosition += wrappedRec.length * 4 + 5;

    if (report?.weather) {
      yPosition += 3;
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(45, 105, 65);
      doc.text('4. Weather & Conditions', margin, yPosition);
      yPosition += 6;

      yPosition = addKeyValueRows(
        doc,
        [
          ['Temperature:', `${safeText(report.weather.temp)} C`],
          ['Humidity:', `${safeText(report.weather.humidity)}%`],
          ['Rainfall (24h):', `${safeText(report.weather.rainfall)} mm`],
          ['Wind Speed:', `${safeText(report.weather.windSpeed)} km/h`],
        ],
        yPosition,
        { labelOffset: 45 },
      );
    }

    yPosition += 3;
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(45, 105, 65);
    doc.text('5. Immediate Actions (Do Today)', margin, yPosition);
    yPosition += 6;

    yPosition = addWrappedLines(
      doc,
      [
        '- Remove and destroy infected plant parts immediately',
        '- Isolate affected areas to prevent spread',
        '- Avoid overhead watering to reduce spore dispersal',
      ],
      yPosition,
    );

    yPosition += 3;
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(45, 105, 65);
    doc.text('6. Preventive Measures for Future', margin, yPosition);
    yPosition += 6;

    addWrappedLines(
      doc,
      [
        '- Maintain proper plant spacing for air circulation',
        '- Rotate crops to break disease cycles',
        '- Remove crop residue promptly after harvest',
        '- Monitor crops weekly during high-risk seasons',
      ],
      yPosition,
    );

    const totalPages = doc.internal.getNumberOfPages();
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);

    for (let i = 1; i <= totalPages; i += 1) {
      doc.setPage(i);
      doc.text('Confidential - For Agronomist and Farmer Use Only', margin, pageHeight - 10);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    doc.save(`${safeText(report?.id, 'disease-report')}.pdf`);
    return true;
  } catch (error) {
    console.error('PDF generation failed:', error);
    window.alert('PDF download failed. Please try again.');
    return false;
  }
}

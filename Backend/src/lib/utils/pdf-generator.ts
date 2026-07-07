// OASIS - PDF Generation Utility
// Generates thermal receipts (POS) and standard A4 reports (Analytics) in memory

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

export interface PDFReceiptData {
  id: string;
  date: Date;
  pharmacyName: string;
  pharmacyAddress: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  totalAmount: number;
  isDelivery: boolean;
  deliveryFee?: number;
}

/**
 * Genera el ticket térmico (POS) en PDF (formato 80mm de ancho)
 */
export async function generateReceiptPDF(data: PDFReceiptData): Promise<Buffer> {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 180]
  });

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('OASIS NICARAGUA', 40, 10, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text((data.pharmacyName || 'Farmacia').toUpperCase(), 40, 15, { align: 'center' });
  doc.text(data.pharmacyAddress || 'Dirección de Farmacia', 40, 19, { align: 'center' });
  
  doc.setFontSize(7);
  doc.text(`Comprobante: #${(data.id || '').slice(-8).toUpperCase()}`, 10, 26);
  doc.text(`Fecha: ${data.date ? new Date(data.date).toLocaleString('es-NI') : 'N/A'}`, 10, 30);

  // Tabla de Artículos
  const tableData = data.items.map(item => [
    item.name.slice(0, 24),
    item.quantity.toString(),
    `C$${(item.unitPrice * item.quantity).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 34,
    margin: { left: 5, right: 5 },
    body: tableData,
    head: [['Descripción', 'Cant', 'Total']],
    theme: 'plain',
    styles: { fontSize: 7, cellPadding: 1, font: 'helvetica' },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 20, halign: 'right' }
    }
  });

  const finalTableY = (doc as any).lastAutoTable.finalY || 45;

  // Lógica de totales
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(10, finalTableY + 2, 70, finalTableY + 2);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  if (data.isDelivery && data.deliveryFee) {
    doc.text('Envío:', 10, finalTableY + 6);
    doc.text(`C$${data.deliveryFee.toFixed(2)}`, 70, finalTableY + 6, { align: 'right' });
  }

  doc.setFontSize(9);
  doc.text('TOTAL GENERAL', 10, finalTableY + 11);
  doc.text(`C$${data.totalAmount.toFixed(2)}`, 70, finalTableY + 11, { align: 'right' });

  // Generar código QR de verificación de Oasis
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oasis-nicaragua.vercel.app';
    const verifyUrl = `${appUrl}/receipt/${data.id}`;
    
    const qrBase64 = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 120
    });
    
    doc.addImage(qrBase64, 'PNG', 28, finalTableY + 14, 24, 24);
  } catch (err) {
    console.error('Fallo en la generación de código QR del PDF:', err);
  }

  // Pie de Página
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('¡Gracias por elegir Oasis Nicaragua!', 40, finalTableY + 42, { align: 'center' });
  doc.text('www.oasisnicaragua.com', 40, finalTableY + 46, { align: 'center' });

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Genera reportes clínicos o comerciales en formato estándar A4
 */
export async function generateReportPDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: string[][]
): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title.toUpperCase(), 14, 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(subtitle, 14, 26);
  doc.text(`Fecha de reporte: ${new Date().toLocaleString('es-NI')}`, 14, 31);

  // Tabla
  autoTable(doc, {
    startY: 36,
    margin: { left: 14, right: 14 },
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 8, font: 'helvetica', cellPadding: 2 },
    headStyles: { fillColor: [41, 121, 255], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

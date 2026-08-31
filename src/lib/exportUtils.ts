import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, WidthType } from 'docx';
import { saveAs } from 'file-saver';

// Extend jsPDF interface to include autoTable plugin
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ExportDataPayload {
  title: string;
  subtitle?: string;
  generatedDate: string;
  headers: string[];
  rows: (string | number)[][];
  summaryStats?: { label: string; value: string | number }[];
}

/**
 * Generate and trigger download of a stylized PDF document
 */
export function exportToPDF(payload: ExportDataPayload, fileName: string = 'GRADit_Report.pdf'): void {
  const doc = new jsPDF();

  // Primary Header Banner
  doc.setFillColor(115, 82, 255); // GRADit purple
  doc.rect(0, 0, 210, 32, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('GRADit! College Management Suite', 14, 15);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(payload.title, 14, 24);

  // Metadata Sub-banner
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Generated on: ${payload.generatedDate} | Technical Team College`, 14, 40);

  // Optional Summary Stats
  let startY = 46;
  if (payload.summaryStats && payload.summaryStats.length > 0) {
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, startY, 182, 14, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    let statX = 18;
    payload.summaryStats.forEach((stat) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${stat.label}: `, statX, startY + 9);
      const labelWidth = doc.getTextWidth(`${stat.label}: `);
      doc.setFont('helvetica', 'normal');
      doc.text(`${stat.value}`, statX + labelWidth, startY + 9);
      statX += 58;
    });
    startY += 20;
  }

  // Data Table
  doc.autoTable({
    startY: startY,
    head: [payload.headers],
    body: payload.rows,
    headStyles: {
      fillColor: [115, 82, 255],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: [248, 249, 252],
    },
    margin: { left: 14, right: 14 },
    theme: 'grid',
  });

  doc.save(fileName);
}

/**
 * Generate and trigger download of an Excel (.xlsx) spreadsheet
 */
export function exportToExcel(payload: ExportDataPayload, fileName: string = 'GRADit_Report.xlsx'): void {
  const worksheetData = [
    [payload.title],
    [`Technical Team College - Generated: ${payload.generatedDate}`],
    [],
    payload.headers,
    ...payload.rows,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  const colWidths = payload.headers.map((h) => ({ wch: Math.max(h.length + 6, 16) }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  XLSX.writeFile(workbook, fileName);
}

/**
 * Generate and trigger download of a Word (.docx) document
 */
export async function exportToWord(payload: ExportDataPayload, fileName: string = 'GRADit_Report.docx'): Promise<void> {
  const tableRows: TableRow[] = [];

  // Header Row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: payload.headers.map(
        (header) =>
          new TableCell({
            width: { size: Math.floor(100 / payload.headers.length), type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: header, bold: true, color: 'FFFFFF' })],
              }),
            ],
            shading: { fill: '7352FF' },
          })
      ),
    })
  );

  // Data Rows
  payload.rows.forEach((row, rowIndex) => {
    tableRows.push(
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [new Paragraph({ text: String(cell) })],
              shading: rowIndex % 2 === 1 ? { fill: 'F8F9FC' } : undefined,
            })
        ),
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'GRADit! College Management Report',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: `${payload.title} | Technical Team College`,
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: `Generated on: ${payload.generatedDate}`,
          }),
          new Paragraph({ text: '' }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
}

'use client';

import React, { useState } from 'react';
import { ExportDataPayload, exportToPDF, exportToExcel, exportToWord } from '../../lib/exportUtils';
import { ExportFormatType } from '../../lib/agents/feeAgent';
import { FileText, FileSpreadsheet, Download, CheckCircle2 } from 'lucide-react';

interface ExportActionProps {
  payload: ExportDataPayload;
  format?: ExportFormatType;
  agentType?: string;
}

export const ExportAction: React.FC<ExportActionProps> = ({ payload, format = 'PDF', agentType = 'Report' }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async (targetFormat: 'PDF' | 'XLSX' | 'DOCS') => {
    setDownloading(true);
    try {
      const sanitizedTitle = payload.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      if (targetFormat === 'PDF') {
        exportToPDF(payload, `${sanitizedTitle}.pdf`);
      } else if (targetFormat === 'XLSX') {
        exportToExcel(payload, `${sanitizedTitle}.xlsx`);
      } else if (targetFormat === 'DOCS') {
        await exportToWord(payload, `${sanitizedTitle}.docx`);
      }
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 4000);
    } catch (err) {
      console.error('Export download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-3 p-3 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-xl border border-indigo-100/90 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-semibold text-indigo-950">
            {payload.title}
          </span>
        </div>
        {downloaded && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3" /> Downloaded
          </span>
        )}
      </div>

      <p className="text-[11px] text-gray-600 mb-2.5">
        Generated institutional record with {payload.rows.length} verified rows ready for audit.
      </p>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => handleDownload('PDF')}
          disabled={downloading}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <Download className="w-3 h-3" />
          <span>Download PDF</span>
        </button>

        <button
          onClick={() => handleDownload('XLSX')}
          disabled={downloading}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <FileSpreadsheet className="w-3 h-3" />
          <span>Export Excel</span>
        </button>

        <button
          onClick={() => handleDownload('DOCS')}
          disabled={downloading}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <FileText className="w-3 h-3" />
          <span>Word Doc</span>
        </button>
      </div>
    </div>
  );
};

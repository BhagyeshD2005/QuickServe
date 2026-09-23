import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface ExportOption {
  label: string;
  format: 'pdf' | 'excel' | 'csv';
  description?: string;
  onExport: () => Promise<void> | void;
}

interface ExportDropdownProps {
  options: ExportOption[];
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  options,
  label = 'Export',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { success, error } = useToast();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExport = async (option: ExportOption) => {
    try {
      setExportingFormat(option.format);
      await option.onExport();
      success(`${option.label} generated successfully!`);
      setIsOpen(false);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setExportingFormat(null);
    }
  };

  const getFormatIcon = (format: 'pdf' | 'excel' | 'csv') => {
    switch (format) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-600" />;
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
      case 'csv':
        return <Download className="w-4 h-4 text-blue-600" />;
      default:
        return <Download className="w-4 h-4 text-neutral-600" />;
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled || exportingFormat !== null}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 hover:border-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exportingFormat ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
        ) : (
          <Download className="w-3.5 h-3.5 text-neutral-600" />
        )}
        <span>{exportingFormat ? 'Exporting...' : label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-30 mt-1.5 w-60 origin-top-right rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-black/5 focus:outline-hidden border border-neutral-200/80 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 border-b border-neutral-100 mb-1">
            <p className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">Select Format</p>
          </div>
          <div className="space-y-0.5">
            {options.map((opt) => (
              <button
                key={opt.format}
                type="button"
                disabled={exportingFormat !== null}
                onClick={() => handleExport(opt)}
                className="w-full flex items-center gap-3 px-2.5 py-2 text-left rounded-lg text-xs hover:bg-neutral-50 transition-colors group cursor-pointer"
              >
                <div className="p-1 rounded-md bg-neutral-100/70 group-hover:bg-white border border-neutral-200/60 shadow-2xs">
                  {getFormatIcon(opt.format)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-800 flex items-center justify-between">
                    <span>{opt.label}</span>
                    {exportingFormat === opt.format ? (
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                    ) : (
                      <span className="text-2xs font-mono text-neutral-400 uppercase">.{opt.format === 'excel' ? 'xlsx' : opt.format}</span>
                    )}
                  </div>
                  {opt.description && (
                    <p className="text-2xs text-neutral-400 truncate">{opt.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default ExportDropdown;

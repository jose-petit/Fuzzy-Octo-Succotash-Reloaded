
import React from 'react';
import {
    Sparkles,
    FileText,
    ShieldAlert,
    ArrowRight,
    Database
} from 'lucide-react';

interface ActionButtonsProps {
    onGenerateSummary: () => void;
    isSummaryDisabled: boolean;
    onExportPDF?: () => void;
    isExportDisabled?: boolean;
    role?: 'admin' | 'lectura';
    hasSummary?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
    onGenerateSummary,
    isSummaryDisabled,
    onExportPDF,
    isExportDisabled,
    role = 'lectura',
    hasSummary
}) => {
    const isAdmin = role === 'admin';

    return (
        <div className="flex flex-col h-full justify-between gap-6">
            <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-primary/10 border border-indigo-500/10 mb-2">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-relaxed">
                        Este módulo utiliza algoritmos de <span className="text-indigo-500 dark:text-indigo-400 font-black italic">Gemini Pro IA</span> para sintetizar el historial de atenuaciones y detectar anomalías críticas.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onGenerateSummary}
                        disabled={isSummaryDisabled || !isAdmin}
                        className={`group relative overflow-hidden flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-500 active:scale-95 ${isSummaryDisabled || !isAdmin
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed'
                                : 'bg-primary dark:bg-primary hover:bg-black dark:hover:bg-white text-white dark:hover:text-black shadow-glow hover:shadow-primary/40'
                            }`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <Sparkles size={18} className={!isSummaryDisabled ? "animate-pulse" : ""} />
                        <span>{isSummaryDisabled && !isAdmin ? 'IA Bloqueada' : 'Generar Análisis IA'}</span>
                    </button>

                    {onExportPDF && hasSummary && isAdmin && (
                        <button
                            onClick={onExportPDF}
                            disabled={isExportDisabled}
                            className="group flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-primary/50 text-gray-900 dark:text-white font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 active:scale-95 shadow-glass"
                        >
                            <FileText size={18} className="text-primary transition-transform group-hover:scale-110" />
                            <span>Exportar Resumen PDF</span>
                        </button>
                    )}
                </div>
            </div>

            {!isAdmin && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50">
                    <ShieldAlert size={16} className="text-gray-400" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Acceso restringido: Solo Administradores
                    </p>
                </div>
            )}
        </div>
    );
};

export default ActionButtons;

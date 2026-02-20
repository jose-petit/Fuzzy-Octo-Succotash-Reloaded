import React, { useRef, useEffect } from 'react';
import {
    X,
    FileText,
    Sparkles,
    Download,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react';

interface AnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
    isLoading: boolean;
    onExportPDF?: () => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({
    isOpen,
    onClose,
    title,
    content,
    isLoading,
    onExportPDF
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Manual Markdown-ish conversion for the "Premium" look
    const renderContent = () => {
        if (!content) return null;
        return content.split('\n').map((line, i) => {
            if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-black text-white mt-6 mb-2 uppercase italic tracking-tight">{line.replace('### ', '')}</h3>;
            if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-black text-primary mt-8 mb-4 uppercase italic tracking-tighter border-b border-primary/20 pb-2">{line.replace('## ', '')}</h2>;
            if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
                return <div key={i} className="flex gap-3 mb-2 items-start bg-white/5 p-3 rounded-xl border border-white/5 group hover:border-primary/20 transition-all">
                    <span className="text-primary font-black mt-0.5">{line.substring(0, 2)}</span>
                    <span className="text-gray-300 font-medium">{line.substring(3)}</span>
                </div>;
            }
            if (line.trim().startsWith('- ')) {
                return <div key={i} className="flex gap-3 mb-2 items-start pl-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-gray-400 font-medium">{line.replace('- ', '')}</span>
                </div>;
            }
            if (line.trim() === '') return <div key={i} className="h-4" />;
            return <p key={i} className="text-gray-400 font-medium leading-relaxed mb-2">{line}</p>;
        });
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-md animate-fade-in" />

            <div
                ref={modalRef}
                className="relative w-full max-w-3xl bg-white/5 dark:bg-gray-900/40 backdrop-blur-2xl border border-white/10 dark:border-gray-800 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary animate-pulse">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">{title}</h2>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1 italic">Analítica Predictiva por Gemini Pro</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 rounded-full hover:bg-white/10 text-gray-400 transition-all active:scale-95"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-6">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                                <div className="relative p-6 rounded-full bg-primary/10 text-primary">
                                    <Loader2 size={48} className="animate-spin" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h4 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">Procesando Información</h4>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                                    Gemini está analizando los tramos críticos y generando recomendaciones estratégicas...
                                </p>
                            </div>
                        </div>
                    ) : content ? (
                        <div className="animate-fade-in">
                            <div className="flex items-center gap-2 mb-8 p-4 rounded-2xl bg-status-success/10 border border-status-success/20 w-fit">
                                <CheckCircle2 size={16} className="text-status-success" />
                                <span className="text-[10px] font-black text-status-success uppercase tracking-widest">Análisis Completado con Éxito</span>
                            </div>
                            <div className="space-y-1">
                                {renderContent()}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-status-error">
                            <AlertCircle size={48} />
                            <p className="font-black uppercase tracking-widest italic">No se pudo generar el análisis</p>
                            <button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl bg-status-error/10 border border-status-error/20 text-[10px] font-black uppercase tracking-widest">Cerrar y Reintentar</button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-white/5 bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Motor de IA v2.4 Activo</span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {onExportPDF && content && !isLoading && (
                            <button
                                onClick={onExportPDF}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-white text-black hover:bg-primary hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 group"
                            >
                                <Download size={16} className="group-hover:-translate-y-1 transition-transform" />
                                Exportar PDF
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                        >
                            Finalizar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisModal;

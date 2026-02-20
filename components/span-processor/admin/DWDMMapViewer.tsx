import React, { useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RefreshCw, FileText } from 'lucide-react';

const PDF_URL = '/mapadwdm.pdf';

const DWDMMapViewer: React.FC = () => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [zoom, setZoom] = useState(1);

    const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 3));
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5));
    const handleReset = () => setZoom(1);

    return (
        <div className="animate-fade-in flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between bg-white/50 dark:bg-gray-800/50 backdrop-blur-md p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Mapa de Red DWDM</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Visualización de topología y enlaces</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleZoomOut}
                        className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all text-gray-600 dark:text-gray-300 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 shadow-sm active:scale-95"
                        title="Reducir Zoom"
                    >
                        <ZoomOut size={18} />
                    </button>
                    <span className="px-3 py-1 bg-white dark:bg-gray-900 rounded-lg text-xs font-black text-gray-700 dark:text-gray-300 min-w-[60px] text-center border border-gray-100 dark:border-gray-800">
                        {(zoom * 100).toFixed(0)}%
                    </span>
                    <button
                        onClick={handleZoomIn}
                        className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all text-gray-600 dark:text-gray-300 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 shadow-sm active:scale-95"
                        title="Aumentar Zoom"
                    >
                        <ZoomIn size={18} />
                    </button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1"></div>
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 rounded-xl transition-all text-xs font-black uppercase tracking-widest shadow-lg active:scale-95"
                    >
                        <RefreshCw size={14} />
                        Restablecer
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full bg-gray-100 dark:bg-gray-900/50 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-inner overflow-hidden relative">
                <div className="absolute inset-0 overflow-auto flex items-center justify-center p-8">
                    <iframe
                        ref={iframeRef}
                        src={PDF_URL}
                        title="Mapa DWDM"
                        className="transition-transform duration-300 ease-out origin-center shadow-2xl rounded-xl"
                        style={{
                            width: `${zoom * 100}%`,
                            height: `${zoom * 100}%`,
                            minHeight: '800px',
                            minWidth: '100%',
                            border: 'none'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default DWDMMapViewer;


import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface FileUploadProps {
    onUpload: (file: File) => void;
    isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, isProcessing }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };
    
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    }, []);


    const handleSubmit = async () => {
        if (selectedFile && !isProcessing) {
            await onUpload(selectedFile);
            // Limpiar selección de archivo tras procesamiento
            setSelectedFile(null);
            if (inputRef.current) inputRef.current.value = '';
            setDragActive(false);
        }
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-4">1. Cargar Archivo CSV</h2>
            <label 
                htmlFor="file-upload" 
                onDragEnter={handleDrag}
                className={`flex flex-col items-center justify-center w-full h-40 px-4 transition bg-gray-800 border-2 ${dragActive ? 'border-cyan-400' : 'border-gray-600'} border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none`}>
                <div className="flex items-center space-x-2">
                    <UploadIcon className="w-8 h-8 text-gray-500" />
                    <span className="font-medium text-gray-400">
                       {selectedFile ? selectedFile.name : 'Arrastre un archivo o haga clic para seleccionar'}
                    </span>
                </div>
                 <input ref={inputRef} id="file-upload" name="file-upload" type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </label>
            {dragActive && <div className="absolute inset-0 w-full h-full" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}></div>}


            <button
                onClick={handleSubmit}
                disabled={!selectedFile || isProcessing}
                className="mt-4 w-full flex justify-center items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
            >
                {isProcessing ? (
                    <>
                        <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                        Procesando...
                    </>
                ) : 'Procesar Archivo'}
            </button>
        </div>
    );
};

export default FileUpload;

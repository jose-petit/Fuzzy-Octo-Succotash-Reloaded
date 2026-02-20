import React, { useRef, useState } from 'react';

const PDF_URL = '/mapadwdm.pdf';

const DWDMMapViewer: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5));
  const handleReset = () => setZoom(1);

  return (
    <div className="flex flex-col items-center w-full h-full">
      <div className="flex gap-2 mb-2">
        <button onClick={handleZoomOut} className="bg-gray-700 text-white px-3 py-1 rounded">-</button>
        <span className="text-white">Zoom: {(zoom * 100).toFixed(0)}%</span>
        <button onClick={handleZoomIn} className="bg-gray-700 text-white px-3 py-1 rounded">+</button>
        <button onClick={handleReset} className="bg-gray-700 text-white px-3 py-1 rounded">Restablecer</button>
      </div>
      <div className="w-full flex-1 overflow-auto bg-black rounded shadow border border-cyan-700" style={{ minHeight: 400 }}>
        <iframe
          ref={iframeRef}
          src={PDF_URL}
          title="Mapa DWDM"
          style={{ width: `${zoom * 100}%`, height: 800, border: 'none', background: '#222' }}
        />
      </div>
    </div>
  );
};

export default DWDMMapViewer;

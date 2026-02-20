import React, { useRef, useEffect, useState } from 'react';


interface MiniSparklineProps {
  data: { value: number; date: string }[];
  width?: number;
  height?: number;
  tooltipPosition?: 'left' | 'right';
}

// Determina el color según el último valor
function getColor(last: number, min = 20, max = 30) {
  if (last >= max) return '#ef4444'; // rojo
  if (last >= min) return '#facc15'; // amarillo
  return '#22c55e'; // verde
}

const MiniSparkline: React.FC<MiniSparklineProps> = ({ data, width = 60, height = 24, tooltipPosition = 'right' }) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data.map(d => d.value));
  const max = Math.max(...data.map(d => d.value));
  const range = max - min || 1;
  const color = getColor(data[data.length - 1].value);
  // Animación: pathLength
  const [pathLength, setPathLength] = useState(0);
  const pathRef = useRef<SVGPolylineElement>(null);
  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, [data]);
  // Tooltip
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number } | null>(null);
  // Puntos para la línea
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.value - min) / range) * (height - 4) - 2;
    return { x, y };
  });
  const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
  // Área bajo la curva
  const areaStr = [
    `0,${height}`,
    ...points.map(p => `${p.x},${p.y}`),
    `${width},${height}`
  ].join(' ');
  return (
    <div style={{ background: 'rgba(6,182,212,0.07)', borderRadius: 8, padding: 2, display: 'inline-block', minWidth: width }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', borderRadius: 8 }}>
        {/* Área sombreada */}
        <polygon points={areaStr} fill={color + '22'} />
        {/* Línea animada */}
        <polyline
          ref={pathRef}
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={pointsStr}
          style={{
            strokeDasharray: pathLength,
            strokeDashoffset: pathLength,
            animation: 'sparkline-draw 0.7s ease-out forwards'
          }}
        />
        {/* Punto final */}
        {points.length > 0 && (
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2.5} fill={color} stroke="#fff" strokeWidth="1" />
        )}
        {/* Puntos hover */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hoverIdx === i ? 4 : 2}
            fill={hoverIdx === i ? color : color + '99'}
            opacity={hoverIdx === i ? 1 : 0.5}
            style={{ cursor: 'pointer', transition: 'r 0.1s' }}
            onMouseEnter={e => {
              setHoverIdx(i);
              const rect = (e.target as SVGCircleElement).getBoundingClientRect();
              setTooltip({
                x: rect.left + window.scrollX + (tooltipPosition === 'left' ? -40 : 20),
                y: rect.top + window.scrollY - 10,
                value: data[i].value
              });
            }}
            onMouseLeave={() => { setHoverIdx(null); setTooltip(null); }}
          />
        ))}
        <style>{`
        @keyframes sparkline-draw {
          to { stroke-dashoffset: 0; }
        }
        `}</style>
      </svg>
      {/* Tooltip flotante fuera del SVG */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            background: '#222',
            color: '#fff',
            border: `1px solid ${color}`,
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 12,
            fontFamily: 'monospace',
            pointerEvents: 'none',
            zIndex: 9999,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
          }}
        >
          {tooltip.value.toFixed(2)}
        </div>
      )}
    </div>
  );
};

export default MiniSparkline;

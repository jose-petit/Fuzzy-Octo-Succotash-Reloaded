import React, { useState, useEffect, useMemo, useRef } from 'react';

interface ComboBoxProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export const ComboBox: React.FC<ComboBoxProps> = ({
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = String(value || '')
      .toLowerCase()
      .trim();
    const arr = Array.isArray(options) ? options : [];
    const res = q ? arr.filter((o) => String(o).toLowerCase().includes(q)) : arr;
    return res.slice(0, 200);
  }, [options, value]);

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <div className="flex">
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="bg-graylight text-graydark border border-graymed px-2 py-1 rounded-l w-64 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          className="bg-primary text-white px-2 rounded-r border border-l-0 hover:bg-primary-dark"
          onClick={() => setOpen((o) => !o)}
        >
          ▼
        </button>
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute mt-1 max-h-60 w-full overflow-auto bg-white border border-graymed rounded shadow-lg z-50 text-graydark">
          {filtered.map((opt) => (
            <li
              key={opt}
              className="px-2 py-1 hover:bg-graylight cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(opt);
                setOpen(false);
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ComboBox;

import React, { useState, useEffect, useMemo, useRef } from 'react';
import moment from 'moment';
import debounce from 'lodash.debounce';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from 'components/Layout';
import ComboBox from 'components/ComboBox';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface Enlace {
  id?: number;
  nombre?: string;
  name1?: string;
  name2?: string;
  enlace1: number;
  enlace2: number;
  raman1: number;
  raman2: number;
  umbral: number;
  edfaO?: number;
  edfaD?: number;
}

interface BusData {
  bus: number;
  ne: string;
  card: string;
  type: string;
  value: number;
  serial: number;
}

interface Span {
  id?: number;
  fecha_lote?: string;
  name1: string;
  name2: string;
  serial1: number;
  serial2: number | null;
  raman1: number;
  raman2: number;
  umbral: number;
  perdida: number;
  raman_offset1?: number;
  hoa_rx_gain1?: number;
  edfa_gain1?: number;
  raman_offset2?: number;
  hoa_rx_gain2?: number;
  edfa_gain2?: number;
  is_single?: boolean | number;
  line_initial1?: number;
  loss_reference?: number;
  diff_line1?: number;
  diff_loss?: number;
  details?: any;
}

interface PivotItem {
  bus: number;
  card: string;
  ne: string;
  serial: number;
  entries: BusData[];
  [key: string]: any;
}

export default function HistorialTarjetasPage() {
  const [perfBase] = useState('/api/nms-proxy');
  /* 
     REMOVED: Old logic trying to guess port 5000.
     Now we always use the Next.js Proxy to avoid CORS and Docker networking issues.
  */
  const [showDiag, setShowDiag] = useState(false);
  const [diagProcessing, setDiagProcessing] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<Span | null>(null);

  const {
    data: enlaces = [],
    refetch: refetchEnlaces,
    isFetching: enlacesLoading,
  } = useQuery(
    ['enlaces'],
    async () => {
      const res = await fetch('/api/enlace', { cache: 'no-store' });
      const json = await res.json();
      return (json.enlaces || []).map(
        (e: any): Enlace => ({
          ...e,
          enlace1: Number(e.enlace1),
          enlace2: Number(e.enlace2),
          raman1: Number(e.raman1),
          raman2: Number(e.raman2),
          umbral: Number(e.umbral),
        })
      );
    },
    {
      refetchOnWindowFocus: true,
      refetchOnMount: 'always',
      staleTime: 0,
      cacheTime: 0,
    }
  );

  useEffect(() => {
    console.log('Enlaces loaded in UI:', enlaces);
  }, [enlaces]);

  // Keep performance-backend enlaces in sync
  useEffect(() => {
    const syncEnlaces = async () => {
      try {
        if (!enlaces || enlaces.length === 0) return;
        if (!enlaces || enlaces.length === 0 || !perfBase) return;
        await fetch(`${perfBase}/api/enlaces`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enlaces }),
        });
      } catch (e: any) {
        console.warn('No se pudo sincronizar enlaces con backend-performance:', e?.message);
      }
    };
    syncEnlaces();
  }, [perfBase, enlaces]);

  const [interval, setIntervalState] = useState(1800000);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/settings/interval');
        const json = await res.json();
        const val = Number(json?.value);
        if (!cancelled && Number.isFinite(val) && val > 0) {
          setIntervalState(val);
          if (typeof window !== 'undefined') {
            localStorage.setItem('intervalMs', String(val));
          }
        }
      } catch { }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const [selectedFecha, setSelectedFecha] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [editingCell, setEditingCell] = useState<{ id: number, field: string } | null>(null);
  const [tempValue, setTempValue] = useState('');
  const qc = useQueryClient();

  const dateFormatter = useRef(new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }));

  function normalizeFechaKey(iso?: string) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const parts = dateFormatter.current
        .formatToParts(d)
        .reduce((acc: any, p) => ((acc[p.type] = p.value), acc), {});
      return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
    } catch {
      return String(iso).replace('T', ' ').substring(0, 16);
    }
  }

  const getValueByType = (meta: any, typeName: string) => {
    if (!meta) return undefined;
    for (let i = 1; i <= 10; i++) {
      const typeStr = String(meta[`type${i}`] || '');
      if (typeStr.toLowerCase().includes(typeName.toLowerCase())) return meta[`value${i}`];
    }
    return undefined;
  };


  const normalizeMutation = useMutation({
    mutationFn: async ({ serial1, field, newValue }: { serial1: number, field: string, newValue: number }) => {
      const res = await fetch(`${perfBase}/api/spans/normalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial1, field, newValue }),
      });
      if (!res.ok) throw new Error('Normalization failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Historia normalizada correctamente 📊');
      qc.invalidateQueries(['spans']);
      setEditingCell(null);
    },
    onError: () => toast.error('Error al normalizar datos'),
  });

  const {
    data: spans = [],
    isFetching: spansLoading,
    refetch: refetchSpans,
  } = useQuery(
    ['spans', enlaces, desde, hasta],
    async () => {
      // PERSISTENCE SYNC: The Navbar's central timer emits 'persistDue' or 'intervalMsChanged'.
      // We no longer manually calculate 'due' here to prevent double-persistence or drift.

      let url = `${perfBase}/api/spans?`;
      if (desde) url += `desde=${encodeURIComponent(desde)}&`;
      if (hasta) url += `hasta=${encodeURIComponent(hasta)}&`;

      const res = await fetch(url.slice(0, -1), { cache: 'no-store' });
      const json = await res.json();
      const raw = (json.spans || []) as Span[];

      // OPTIMIZATION: Pre-calculate normalized keys and parts to avoid repeating Intl.DateTimeFormat
      return raw.map(s => {
        const norm = normalizeFechaKey(s.fecha_lote);
        const [d, t] = norm.split(' ');
        return {
          ...s,
          _normFecha: norm,
          _dateOnly: d,
          _timeOnly: t
        };
      }) as any[];
    },
    {
      enabled: enlaces.length > 0,
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
      staleTime: 0,
      cacheTime: 0,
    }
  );

  // LISTEN FOR GLOBAL PERSIST EVENT (NAVBAR TIMER)
  useEffect(() => {
    const handleCompleted = async () => {
      console.log('🔔 [Historial] sync completed event received');
      await refetchSpans();
    };
    window.addEventListener('persistCompleted', handleCompleted);
    return () => window.removeEventListener('persistCompleted', handleCompleted);
  }, [refetchSpans]);

  const { data: busData = [], isLoading: busDataLoading } = useQuery(
    ['busdata', perfBase],
    async () => {
      if (!perfBase) return [];
      const res = await fetch(`${perfBase}/api/busdata`, { cache: 'no-store' });
      const json = await res.json();
      return (json.busData || []) as BusData[];
    },
    { refetchOnWindowFocus: false, staleTime: 0 }
  );

  const makePivot = (filtered: BusData[]) => {
    const groups: { [key: string]: PivotItem } = {};
    filtered.forEach((rec) => {
      const key = `${rec.bus}|${rec.ne}|${rec.serial}`;
      if (!groups[key]) {
        groups[key] = { bus: rec.bus, ne: rec.ne, card: '', serial: rec.serial, entries: [] };
      }
      groups[key].entries.push(rec);
    });
    return Object.values(groups).map((grp) => {
      const obj: any = { bus: grp.bus, card: grp.entries[0].card, ne: grp.ne, serial: grp.serial };
      grp.entries.forEach((e, i) => {
        obj[`type${i + 1}`] = e.type;
        obj[`value${i + 1}`] = e.value;
      });
      return obj as PivotItem;
    });
  };

  const getCardPrefix = (card = '') => {
    if (!card) return null;
    const c = String(card).toUpperCase().trim();
    if (c.startsWith('EOA2')) return 'EOA2';
    if (c.startsWith('HOA2')) return 'HOA2';
    return null;
  };

  const isAmplifier = (card = '') => {
    const p = getCardPrefix(card);
    return p === 'EOA2' || p === 'HOA2';
  };

  const busSerialSet = useMemo(() => {
    const set = new Set();
    for (const r of busData) {
      if (r && r.serial != null) set.add(String(r.serial));
    }
    return set;
  }, [busData]);

  // Lazy pivot processing to avoid UI freeze
  const pivots = useMemo(() => {
    if (!showDiag) return [];
    setDiagProcessing(true);
    try {
      const result = makePivot(busData);
      setTimeout(() => setDiagProcessing(false), 100);
      return result;
    } catch (error) {
      console.error('Error processing diagnostic data:', error);
      setDiagProcessing(false);
      return [];
    }
  }, [busData, showDiag]);

  const pivotMap = useMemo(() => {
    if (!showDiag) return new Map();
    const m = new Map();
    pivots.forEach((p) => m.set(String(p.serial), p));
    return m;
  }, [pivots, showDiag]);


  const fechasLote = useMemo(() => {
    if (!spans.length) return [];
    const set = new Set(spans.map((s: any) => s._normFecha).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [spans]);

  const spansFiltrados = useMemo(() => {
    if (selectedFecha) {
      return spans.filter((s: any) => s._normFecha === selectedFecha);
    }
    return spans;
  }, [spans, selectedFecha]);

  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [selectedFecha, spans.length]);

  const [filterOrigen, setFilterOrigen] = useState('');
  const [filterDestino, setFilterDestino] = useState('');
  const [inputOrigen, setInputOrigen] = useState('');
  const [inputDestino, setInputDestino] = useState('');

  const debouncedSetOrigen = useMemo(
    () =>
      debounce((v) => {
        setFilterOrigen(v);
        setPage(1);
      }, 300),
    [setPage]
  );
  const debouncedSetDestino = useMemo(
    () =>
      debounce((v) => {
        setFilterDestino(v);
        setPage(1);
      }, 300),
    [setPage]
  );

  useEffect(() => {
    return () => {
      debouncedSetOrigen.cancel();
      debouncedSetDestino.cancel();
    };
  }, [debouncedSetOrigen, debouncedSetDestino]);

  const enlaceLabel = (s: Span) => `${s.name1 || ''} -> ${s.name2 || ''}`;
  const contains = (value: any, needle: any) =>
    String(value || '')
      .toLowerCase()
      .includes(String(needle || '').toLowerCase());

  const filteredByFields = useMemo(() => {
    return spansFiltrados.filter(
      (s) =>
        (!filterOrigen || contains(s.name1, filterOrigen)) &&
        (!filterDestino || contains(s.name2, filterDestino))
    );
  }, [spansFiltrados, filterOrigen, filterDestino]);

  const uniqueOrigenes = useMemo(() => {
    const set = new Set(spansFiltrados.map((s) => s.name1 || '').filter(Boolean));
    return Array.from(set).sort();
  }, [spansFiltrados]);

  const uniqueDestinos = useMemo(() => {
    const set = new Set(spansFiltrados.map((s) => s.name2 || '').filter(Boolean));
    return Array.from(set).sort();
  }, [spansFiltrados]);

  const [sortKey, setSortKey] = useState('fecha_lote');
  const [sortDir, setSortDir] = useState('desc');

  const toggleSort = (key: string) => {
    setPage(1);
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'fecha_lote' ? 'desc' : 'asc');
    }
  };

  const sortedList = useMemo(() => {
    const arr = [...filteredByFields];
    const dir = sortDir === 'asc' ? 1 : -1;
    const val = (s: any) => {
      switch (sortKey) {
        case 'fecha_lote':
          return s.fecha_lote || '';
        case 'name1':
          return s.name1 || '';
        case 'serial1':
          return Number(s.serial1) || 0;
        case 'name2':
          return s.name2 || '';
        case 'serial2':
          return Number(s.serial2) || 0;
        case 'umbral':
          return Number(s.umbral) || 0;
        case 'perdida':
          return Number(s.perdida) || 0;
        default:
          return '';
      }
    };
    arr.sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filteredByFields, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedList.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => sortedList.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE),
    [sortedList, page]
  );

  const [viewportH, setViewportH] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const virtualFlag = (process.env.NEXT_PUBLIC_SPAN_VIRTUAL || 'auto').toLowerCase();
  const useVirtual =
    virtualFlag === 'on' ? true : virtualFlag === 'off' ? false : sortedList.length > 200;
  const virtRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 64; // Increased for better readability

  useEffect(() => {
    if (!useVirtual) return;
    const el = virtRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop || 0);
    const measure = () => setViewportH(el.clientHeight || 0);
    measure();
    el.addEventListener('scroll', onScroll);
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
    };
  }, [useVirtual]);

  const buffer = 8;
  const totalRows = sortedList.length;
  const startIndex = useVirtual ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - buffer) : 0;
  const visibleCount = useVirtual
    ? Math.min(totalRows - startIndex, Math.ceil((viewportH || 0) / ROW_HEIGHT) + buffer * 2)
    : pageItems.length;
  const endIndex = useVirtual
    ? Math.min(totalRows, startIndex + visibleCount)
    : (page - 1) * PAGE_SIZE + pageItems.length;
  const topPadding = useVirtual ? startIndex * ROW_HEIGHT : 0;
  const bottomPadding = useVirtual ? Math.max(0, (totalRows - endIndex) * ROW_HEIGHT) : 0;

  const [updatingSpans, setUpdatingSpans] = useState(false);
  const handleActualizar = async () => {
    setUpdatingSpans(true);
    try {
      // Backend now loads enlaces from DB anyway, but we pass current state for parity
      const { data: freshEnlaces } = await refetchEnlaces();
      await fetch(`${perfBase}/api/spans/persist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enlaces: freshEnlaces || enlaces }),
      });
      await refetchSpans();
      toast.success('Lote de spans guardado correctamente');
    } catch (e) {
      console.error('Error al actualizar spans:', e);
      toast.error('Error al guardar el lote de spans');
    } finally {
      setUpdatingSpans(false);
    }
  };

  const MetricCard = ({ label, value, unit, color, secondary }: any) => {
    const valStr = value != null ? Number(value).toFixed(2) : '--.--';
    const colorMap: any = {
      blue: 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
      cyan: 'text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20',
      amber: 'text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-500/20',
      emerald: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    };

    return (
      <div className={`bg-gray-50/50 dark:bg-gray-900/50 p-4 rounded-2xl border ${colorMap[color]} group/metric transition-all hover:bg-white dark:hover:bg-gray-800 shadow-sm`}>
        <div className="text-[8px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 group-hover/metric:text-blue-600 dark:group-hover/metric:text-blue-400 transition-colors">{label}</div>
        <div className="flex items-baseline gap-1">
          <div className="text-xl font-black font-mono tracking-tighter text-gray-900 dark:text-white">{valStr}</div>
          <div className="text-[10px] font-bold opacity-30 text-gray-500 dark:text-gray-400">{unit}</div>
        </div>
        {secondary && <div className="text-[8px] text-gray-500 dark:text-gray-600 font-bold mt-1 tracking-wider uppercase italic">{secondary}</div>}
      </div>
    );
  };

  const TrendChart = ({ data }: { data: Span[] }) => {
    const chartData = useMemo(() => {
      const groups: { [key: string]: { time: string; loss: number; count: number } } = {};
      data.forEach((s) => {
        const key = (s as any)._normFecha || '00:00';
        if (!groups[key]) {
          groups[key] = { time: key.split(' ')[1], loss: 0, count: 0 };
        }
        groups[key].loss += s.perdida;
        groups[key].count++;
      });
      return Object.values(groups)
        .sort((a, b) => a.time.localeCompare(b.time))
        .map((g) => ({
          time: g.time,
          loss: Number((g.loss / g.count).toFixed(2)),
        }));
    }, [data]);

    if (!chartData.length) return null;

    return (
      <div className="bg-white dark:bg-[#0a0c10]/40 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 mb-8 backdrop-blur-2xl shadow-xl shadow-blue-500/5 overflow-hidden group">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic flex items-center gap-3">
              <span className="w-1.5 h-6 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"></span>
              Análisis de Tendencia de Red
            </h3>
            <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1 opacity-80">Fluctuaciones de atenuación óptica en tiempo real</p>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 px-5 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.4)]"></div>
              <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Global Loss Average</span>
            </div>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.1} />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 900 }}
                minTickGap={40}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 900 }}
                unit="dB"
              />
              <Tooltip
                cursor={{ stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '4 4' }}
                contentStyle={{
                  backgroundColor: 'rgba(10, 12, 16, 0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '1.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
                itemStyle={{ color: '#60a5fa', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 'black', marginBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '4px' }}
              />
              <Area
                type="monotone"
                dataKey="loss"
                stroke="#2563eb"
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#colorLoss)"
                animationDuration={2500}
                activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const AuditModal = ({ span, onClose }: { span: Span; onClose: () => void }) => {
    if (!span) return null;
    const isCrit = span.perdida >= (span.loss_reference || 0) + (span.umbral || 0);
    const isSingle = !!span.is_single;

    const origin = span.details?.origin;
    const target = span.details?.target;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
        <div className="relative bg-white dark:bg-[#0a0c10] w-full max-w-4xl rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-gray-50/50 dark:bg-gray-900/50 px-10 py-8 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest italic">Análisis Profundo</span>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Detalle de Registro Histórico</h2>
              </div>
              <p className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.3em]">BATCH: {span.fecha_lote} | ID: {span.id || 'N/A'}</p>
            </div>
            <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center text-xl">✕</button>
          </div>

          <div className="p-10 overflow-y-auto max-h-[70vh] custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Nodo A (Origen) */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-blue-500/20 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-black">A</div>
                  <h3 className="text-lg font-black text-blue-600 dark:text-blue-400 uppercase italic">Nodo Origen: {span.name1}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <MetricCard label="Potencia IN Line" value={getValueByType(origin, 'IN Line Power')} unit="dBm" color="blue" secondary={`Ref: ${span.line_initial1}dBm | Diff: ${span.diff_line1}dB`} />
                  <MetricCard label="Potencia OUT Data" value={getValueByType(origin, 'OUT Data Power')} unit="dBm" color="cyan" />
                  <MetricCard label="Ganancia Raman" value={span.raman_offset1} unit="dB" color="amber" secondary={`Set: ${span.raman1}dB`} />
                  <MetricCard label="Ganancia EDFA" value={span.edfa_gain1} unit="dB" color="emerald" />
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Serial Hardware</div>
                  <div className="text-sm font-mono text-gray-700 dark:text-gray-300 font-bold">{span.serial1}</div>
                </div>
              </div>

              {/* Nodo B (Destino) */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-emerald-500/20 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-black">B</div>
                  <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 uppercase italic">Nodo Destino: {span.name2}</h3>
                </div>
                {isSingle ? (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-10 bg-gray-50 dark:bg-gray-900/10">
                    <p className="text-gray-500 font-black uppercase tracking-widest text-center italic">Modo Single-Node<br /><span className="text-[10px] not-italic opacity-50">SIN PAREJA REMOTA</span></p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <MetricCard label="Potencia IN Data" value={getValueByType(target, 'IN Data Power')} unit="dBm" color="blue" />
                      <MetricCard label="Potencia OUT Line" value={getValueByType(target, 'OUT Line Power')} unit="dBm" color="cyan" />
                      <MetricCard label="Ganancia Peer" value={span.edfa_gain2} unit="dB" color="emerald" />
                      <MetricCard label="Raman Offset B" value={span.raman_offset2} unit="dB" color="amber" />
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Serial Hardware (Peer)</div>
                      <div className="text-sm font-mono text-gray-700 dark:text-gray-300 font-bold">{span.serial2}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Overall Assessment */}
            <div className={`mt-10 p-8 rounded-[2rem] border flex md:flex-row flex-col items-center justify-between gap-6 ${isCrit ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]'}`}>
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg ${isCrit ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                  {isCrit ? '⚠️' : '✓'}
                </div>
                <div>
                  <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Pérdida de Fibra (Acumulada)</h4>
                  <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">Validación de umbral: {(span.loss_reference || 0) + (span.umbral || 0)}dB</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-black italic tracking-tighter ${isCrit ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {isSingle ? 'STANDALONE' : `${span.perdida.toFixed(2)} dB`}
                </div>
                <div className="flex flex-col items-end gap-1 mt-1">
                  <div className={`text-[10px] font-black uppercase tracking-widest ${isCrit ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-500/50'}`}>
                    {isCrit ? 'Status: CRITICAL_DEGRADATION' : 'Status: OPTIMAL_CONNECTION'}
                  </div>
                  {!isSingle && (
                    <div className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
                      Ref: {span.loss_reference}dB | <span className={span.diff_loss! > 1 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>Diff: {span.diff_loss}dB</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-4 py-8 animate-fade-in">
        {/* HEADER INDUSTRIAL */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-8 border-b border-gray-200/60 dark:border-gray-800/60 gap-8">
          <div className="relative group">
            <div className="absolute -left-4 top-0 w-1 h-full bg-emerald-500 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]"></div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-4 italic uppercase">
              <span className="bg-emerald-600 text-white px-3 py-1 rounded-lg shadow-lg not-italic">LOG</span>
              Historial de Tarjetas
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.3em] leading-none">Archived Performance Metrics v2.4_HIST</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-gray-50/80 dark:bg-gray-900/80 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-md">
            <button
              onClick={async () => {
                const html2pdf = (await import('html2pdf.js')).default;
                const element = document.getElementById('trend-report-template');
                element.style.display = 'block';
                const opt = {
                  margin: 10,
                  filename: `Reporte_Tendencias_${moment().format('YYYY-MM-DD')}.pdf`,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2, useCORS: true },
                  jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
                };
                await html2pdf().from(element).set(opt).save();
                element.style.display = 'none';
              }}
              className="px-6 py-2.5 rounded-xl font-black text-[10px] tracking-[0.2em] bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 uppercase transition-all flex items-center gap-3 border border-blue-500 active:scale-95"
            >
              <span>📊</span> Reporte de Tendencias
            </button>

            <button
              onClick={handleActualizar}
              className={`px-6 py-2.5 rounded-xl font-black text-[10px] tracking-[0.2em] uppercase transition-all flex items-center gap-3 shadow-sm border ${updatingSpans
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed border-gray-200 dark:border-gray-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-95 border-emerald-500'
                }`}
              disabled={spansLoading || updatingSpans}
            >
              <span className={`text-lg ${updatingSpans ? 'animate-spin' : ''}`}>
                {updatingSpans ? '⚙️' : '📥'}
              </span>
              {updatingSpans ? 'Ingesting...' : 'Ingestar Lote Actual'}
            </button>

            <button
              onClick={() => setShowDiag((v) => !v)}
              className={`px-4 py-2.5 rounded-xl font-black text-[10px] tracking-[0.1em] uppercase transition-all border relative group ${showDiag ? 'bg-gray-900 dark:bg-blue-600 text-cyan-400 dark:text-white border-gray-800 dark:border-blue-500 shadow-inner' : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}`}
              title="Muestra datos de diagnóstico detallados de todas las tarjetas (puede tardar en cargar)"
            >
              {diagProcessing ? (
                <span className="animate-pulse">⌛ Procesando...</span>
              ) : (
                <>{showDiag ? 'Ocultar Diag' : 'Mostrar Diag'}</>
              )}
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                <div className="font-bold mb-1">🔍 Datos de Diagnóstico</div>
                <div className="font-normal">Muestra información técnica detallada de cada tarjeta</div>
                <div className="font-normal text-amber-400 mt-1">⚠️ Puede tardar en datasets grandes</div>
              </div>
            </button>
          </div>
        </div>

        {/* TREND ANALYSIS CHART */}
        <TrendChart data={spans} />

        {/* TOOLBAR FILTROS */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-[0_10px_40px_rgba(0,0,0,0.03)] mb-8 flex flex-col lg:flex-row items-center gap-6">
          <div className="flex flex-col gap-1 w-full lg:w-48">
            <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Fecha de Lote</label>
            <select
              value={selectedFecha}
              onChange={(e) => setSelectedFecha(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all cursor-pointer"
            >
              <option value="">LOTES EN MEMORIA</option>
              {fechasLote.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className="h-10 w-[1px] bg-gray-100 dark:bg-gray-800 hidden lg:block"></div>

          <div className="flex flex-col gap-1 w-full lg:w-48">
            <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Fecha Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1 w-full lg:w-48">
            <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Fecha Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="h-10 w-[1px] bg-gray-100 dark:bg-gray-800 hidden lg:block"></div>

          <div className="flex flex-col gap-1 w-full lg:w-64">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Filtrar por Origen</label>
            <ComboBox
              value={inputOrigen}
              onChange={(v) => { setInputOrigen(v); debouncedSetOrigen(v); }}
              onSelect={(v) => { setInputOrigen(v); debouncedSetOrigen(v); }}
              options={uniqueOrigenes as string[]}
              placeholder="BUSCAR NODO..."
            />
          </div>

          <div className="flex flex-col gap-1 w-full lg:w-64">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Filtrar por Destino</label>
            <ComboBox
              value={inputDestino}
              onChange={(v) => { setInputDestino(v); debouncedSetDestino(v); }}
              onSelect={(v) => { setInputDestino(v); debouncedSetDestino(v); }}
              options={uniqueDestinos as string[]}
              placeholder="BUSCAR NODO..."
            />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="flex flex-col items-end mr-4">
              <span className="text-[10px] font-black text-gray-900 uppercase tracking-tighter">Inventario Filtrado</span>
              <span className="text-2xl font-black text-emerald-600 leading-none tracking-tighter italic">{sortedList.length} <span className="text-[10px] not-italic text-gray-400">REG</span></span>
            </div>

            {selectedFecha && (
              <button
                className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
                onClick={async () => {
                  if (confirm(`¿Eliminar el lote [${selectedFecha}] de forma permanente?`)) {
                    try {
                      const res = await fetch(`${perfBase}/api/spans/by-fecha?fechaKey=${encodeURIComponent(selectedFecha)}`, { method: 'DELETE' });
                      const json = await res.json();
                      if (json.status === 'ok') {
                        toast.success(`Lote eliminado: ${json.deleted} registros`);
                        setSelectedFecha('');
                        refetchSpans();
                      }
                    } catch (e) {
                      toast.error('Error al eliminar lote');
                    }
                  }
                }}
              >
                Borrar Lote Actual
              </button>
            )}

            <button
              className="px-6 py-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 font-bold transition-all text-[10px] uppercase tracking-widest border border-transparent hover:border-red-200/50"
              onClick={() => {
                setFilterOrigen('');
                setFilterDestino('');
                setSelectedFecha('');
                setDesde('');
                setHasta('');
                setInputOrigen('');
                setInputDestino('');
                setPage(1);
              }}
            >
              Reseteo
            </button>
          </div>
        </div>

        {/* TABLA INDUSTRIAL VIRTUALIZADA */}
        <div className="bg-[#0a0c10] rounded-[2.5rem] border border-gray-800 shadow-2xl overflow-hidden relative">
          {/* Header de Tabla */}
          <div className="grid grid-cols-[80px_160px_120px_repeat(4,85px)_110px_85px_120px_repeat(2,85px)_85px_110px_85px_85px_40px] bg-gray-900/80 backdrop-blur-md px-4 py-5 border-b border-gray-800 text-[8px] font-black text-gray-500 uppercase tracking-widest sticky top-0 z-30 whitespace-nowrap overflow-x-auto">
            <div className="cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('fecha_lote')}>Fecha</div>
            <div className="cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('name1')}>Enlace</div>
            <div>Origen</div>
            <div className="text-center text-blue-400/70">Pot IN Line</div>
            <div className="text-center text-cyan-400/70">Pot OUT Data</div>
            <div className="text-center text-amber-500/70">Gan Raman</div>
            <div className="text-center text-emerald-400/70">Gan EDFA</div>
            <div className="text-center text-blue-500">LINE Init</div>
            <div className="text-center text-blue-300 italic">Diff Line</div>
            <div>Destino</div>
            <div className="text-center text-blue-400/70">Pot IN Data</div>
            <div className="text-center text-cyan-400/70">Pot OUT Line</div>
            <div className="text-center text-emerald-400/70">Gan Peer</div>
            <div className="text-center text-red-500">Loss Ref</div>
            <div className="text-center text-white">Loss Act</div>
            <div className="text-center italic underline">Diff Loss</div>
            <div className="text-center">STS</div>
          </div>

          <div ref={virtRef} className="h-[600px] overflow-auto custom-scrollbar">
            <div style={{ height: totalRows * ROW_HEIGHT, position: 'relative' }}>
              <div style={{ transform: `translateY(${topPadding}px)` }}>
                {sortedList.slice(startIndex, startIndex + visibleCount).map((s, i) => {
                  const idx = startIndex + i;
                  const isSingle = !!s.is_single;
                  const isCrit = s.perdida >= (s.umbral || 40);

                  return (
                    <div
                      key={s.id || `${s.fecha_lote}-${s.serial1}`}
                      onClick={() => setSelectedAudit(s)}
                      className={`grid grid-cols-[80px_160px_120px_repeat(4,85px)_110px_85px_120px_repeat(2,85px)_85px_110px_85px_85px_40px] px-4 items-center border-b border-gray-800/50 hover:bg-blue-600/[0.05] cursor-pointer transition-colors group active:scale-[0.99] font-mono text-[10px] ${isCrit ? 'bg-red-500/[0.02]' : ''}`}
                      style={{ height: ROW_HEIGHT }}
                    >
                      {/* FECHA */}
                      <div className="text-[9px] font-bold text-gray-500">{(s as any)._timeOnly}</div>

                      {/* ENLACE */}
                      <div className="text-[10px] font-black text-white truncate pr-2 uppercase italic tracking-tighter">
                        {s.name1}
                        {!isSingle && <span className="text-gray-600 not-italic mx-1">-</span>}
                        {!isSingle && <span className="text-gray-400">{s.name2}</span>}
                      </div>

                      {/* ORIGEN */}
                      <div className="text-[9px] font-bold text-blue-400 truncate">{s.name1}</div>

                      {/* METRICS A */}
                      <div className="text-center text-blue-400">
                        {((s as any).details?.components?.inLineA ?? getValueByType((s as any).details?.origin, 'IN Line'))?.toFixed(2) || '--'}
                      </div>
                      <div className="text-center text-cyan-400">
                        {((s as any).details?.components?.outDataA ?? getValueByType((s as any).details?.origin, 'OUT Data'))?.toFixed(2) || '--'}
                      </div>
                      <div className="text-center text-amber-500">{s.raman_offset1?.toFixed(1) || '0.0'}</div>
                      <div className="text-center text-emerald-400">{s.edfa_gain1?.toFixed(1) || '0.0'}</div>

                      {/* BASELINE A (INTERACTIVE) */}
                      <div className="text-center group/cell relative" onClick={(e) => { e.stopPropagation(); setEditingCell({ id: s.id!, field: 'line_initial1' }); setTempValue(String(s.line_initial1 || 0)); }}>
                        {editingCell?.id === s.id && editingCell?.field === 'line_initial1' ? (
                          <input
                            autoFocus
                            type="number"
                            step="any"
                            className="w-full bg-blue-900/50 text-blue-400 font-black border border-blue-500 rounded outline-none px-1 text-center"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => {
                              if (tempValue !== String(s.line_initial1)) {
                                normalizeMutation.mutate({ serial1: s.serial1, field: 'line_initial1', newValue: Number(tempValue) });
                              } else {
                                setEditingCell(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                          />
                        ) : (
                          <span className="text-blue-600 font-black cursor-pointer hover:bg-blue-500/10 rounded px-2 py-1 transition-all">
                            {s.line_initial1?.toFixed(2) || '0.00'}
                          </span>
                        )}
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[6px] font-bold text-blue-500 opacity-0 group-hover/cell:opacity-100 transition-opacity">EDIT_REF</span>
                      </div>
                      <div className={`text-center font-black ${s.diff_line1! < -2 || s.diff_line1! > 2 ? 'text-red-400' : 'text-blue-300'}`}>{s.diff_line1?.toFixed(2) || '0.00'}</div>

                      {/* DESTINO */}
                      <div className="text-[9px] font-bold text-emerald-400 truncate">{isSingle ? 'N/A' : s.name2}</div>

                      {/* METRICS B */}
                      <div className="text-center text-blue-400">
                        {isSingle ? '--' : ((s as any).details?.components?.inDataB ?? getValueByType((s as any).details?.target, 'IN Data'))?.toFixed(2) || '--'}
                      </div>
                      <div className="text-center text-cyan-400">
                        {isSingle ? '--' : ((s as any).details?.components?.outLineB ?? getValueByType((s as any).details?.target, 'OUT Line'))?.toFixed(1) || '--'}
                      </div>
                      <div className="text-center text-emerald-400">{isSingle ? '--' : s.edfa_gain2?.toFixed(1) || '0.0'}</div>

                      {/* LOSS EVAL (INTERACTIVE) */}
                      <div className="text-center group/cell relative" onClick={(e) => { e.stopPropagation(); if (isSingle) return; setEditingCell({ id: s.id!, field: 'loss_reference' }); setTempValue(String(s.loss_reference || 0)); }}>
                        {editingCell?.id === s.id && editingCell?.field === 'loss_reference' ? (
                          <input
                            autoFocus
                            type="number"
                            step="any"
                            className="w-full bg-red-900/50 text-red-400 font-black border border-red-500 rounded outline-none px-1 text-center"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => {
                              if (tempValue !== String(s.loss_reference)) {
                                normalizeMutation.mutate({ serial1: s.serial1, field: 'loss_reference', newValue: Number(tempValue) });
                              } else {
                                setEditingCell(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                          />
                        ) : (
                          <span className="text-red-500 font-black cursor-pointer hover:bg-red-500/10 rounded px-2 py-1 transition-all">
                            {isSingle ? '--' : (s.loss_reference?.toFixed(2) || '0.00')}
                          </span>
                        )}
                        {!isSingle && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[6px] font-bold text-red-500 opacity-0 group-hover/cell:opacity-100 transition-opacity">FIX_LOSS</span>}
                      </div>

                      <div className="text-center text-white font-black">{isSingle ? 'N/A' : (s.perdida?.toFixed(2) || '0.00')}</div>
                      <div className={`text-center font-black italic underline ${s.diff_loss! < -2 ? 'text-red-500' : 'text-emerald-400'}`}>{isSingle ? '--' : s.diff_loss?.toFixed(2) || '0.00'}</div>

                      {/* STS */}
                      <div className="flex justify-center">
                        <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px] ${isCrit ? 'bg-red-500 shadow-red-500/50 animate-pulse' : 'bg-emerald-500 shadow-emerald-500/50'}`}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Empty State */}
            {sortedList.length === 0 && (
              <div className="py-32 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center text-3xl animate-pulse">📁</div>
                <div>
                  <p className="text-gray-400 font-black uppercase tracking-widest italic">Inventory Empty</p>
                  <p className="text-[10px] text-gray-600 font-bold tracking-[0.3em]">WAITING_FOR_DATA_BATCH_STREAM</p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* MODAL DE AUDITORIA */}
        {selectedAudit && (
          <AuditModal span={selectedAudit} onClose={() => setSelectedAudit(null)} />
        )}

        {/* Hidden Trend Report Template */}
        <div id="trend-report-template" style={{ display: 'none' }} className="p-10 bg-white text-black font-sans">
          <div className="flex justify-between items-center border-b-2 border-blue-600 pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-blue-600">Reporte de Tendencias Ópticas</h1>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Análisis de Degradación en Red de Transporte</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Generado el</p>
              <p className="text-sm font-bold text-black">{moment().format('DD MMMM, YYYY · HH:mm')}</p>
            </div>
          </div>

          <div className="mb-10 p-6 bg-gray-50 border border-gray-100 rounded-2xl">
            <h3 className="text-sm font-black text-gray-900 uppercase italic mb-4">Resumen Ejecutivo de Salud</h3>
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase">Total de Enlaces analizados</p>
                <p className="text-xl font-black text-blue-600 font-mono">{enlaces.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase">Alertas Críticas detectadas</p>
                <p className="text-xl font-black text-red-600 font-mono">{spans.filter(s => s.perdida > (s.loss_reference || 0) + (s.umbral || 0)).length}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase">Pérdida Promedio de Red</p>
                <p className="text-xl font-black text-gray-900 font-mono">
                  {(spans.reduce((acc, s) => acc + s.perdida, 0) / (spans.length || 1)).toFixed(2)} dB
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase">Fecha del Snapshot</p>
                <p className="text-base font-bold text-gray-900">{selectedFecha || 'Corte Actual'}</p>
              </div>
            </div>
          </div>

          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-blue-600 text-white uppercase font-black tracking-widest">
                <th className="p-3 border border-blue-700">Enlace (Tramo)</th>
                <th className="p-3 border border-blue-700">Pot. IN (Ref)</th>
                <th className="p-3 border border-blue-700 text-center">Loss Ref</th>
                <th className="p-3 border border-blue-700 text-center">Loss Act</th>
                <th className="p-3 border border-blue-700 text-center">Diff</th>
                <th className="p-3 border border-blue-700">Estado</th>
              </tr>
            </thead>
            <tbody>
              {sortedList.slice(0, 40).map((s) => {
                const isCrit = s.perdida >= (s.loss_reference || 0) + (s.umbral || 0);
                return (
                  <tr key={s.id} className={`${isCrit ? 'bg-red-50' : ''} border-b border-gray-100`}>
                    <td className="p-3 font-bold border-x border-gray-100">
                      {s.name1} <span className="text-gray-400">→</span> {s.name2}
                    </td>
                    <td className="p-3 font-mono border-x border-gray-100">
                      {s.line_initial1?.toFixed(2)} dBm
                    </td>
                    <td className="p-3 text-center font-mono border-x border-gray-100">{s.loss_reference?.toFixed(2)} dB</td>
                    <td className="p-3 text-center font-black border-x border-gray-100 text-blue-600">{s.perdida?.toFixed(2)} dB</td>
                    <td className={`p-3 text-center font-black border-x border-gray-100 ${s.diff_loss > 1 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {s.diff_loss?.toFixed(2)} dB
                    </td>
                    <td className="p-3 border-x border-gray-100">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${isCrit ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isCrit ? 'CRITICAL_DEGRADATION' : 'OPTIMAL'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-12 text-center border-t border-gray-100 pt-6">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">Propiedad de Inter · División de Transporte Óptico</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </Layout>
  );
}

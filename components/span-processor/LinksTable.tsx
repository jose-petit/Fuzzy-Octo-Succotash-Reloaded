import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import {
  Search,
  Filter,
  Download,
  Activity,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  BarChart2,
  AlertCircle,
  Database,
  Clock
} from 'lucide-react';
import { SpanLink } from './types';
import MiniSparkline from './MiniSparkline';
import md5 from 'blueimp-md5';

interface LinksTableProps {
  links: SpanLink[];
  isLoading: boolean;
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
  role?: 'admin' | 'operador' | 'lectura';
}

interface LinkAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  isLoading?: boolean;
}

const LinkAnalysisModal: React.FC<LinkAnalysisModalProps> = ({ isOpen, onClose, title, content, isLoading }) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
      onClick={() => { if (!isLoading) onClose(); }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-glass w-full max-w-2xl relative max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileText size={20} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-hide">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Activity className="w-12 h-12 text-primary animate-pulse" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Generando análisis experto...</p>
            </div>
          ) : content && content.trim() ? (
            <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-base leading-relaxed">
              <ReactMarkdown>
                {content.length > 12000 ? content.slice(0, 12000) + '\n\n**[El análisis fue truncado por longitud]**' : content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-status-error font-bold justify-center py-12">
              <AlertCircle size={20} />
              <span>No se pudo obtener el análisis. Intenta nuevamente.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const Shimmer: React.FC = () => (
  <div className="animate-pulse flex space-x-4">
    <div className="flex-1 space-y-4 py-1">
      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-700 rounded"></div>
        <div className="h-4 bg-gray-700 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

const LinksTable: React.FC<LinksTableProps> = ({ links, isLoading, showNotification, role = 'admin' }) => {
  const [analysisModal, setAnalysisModal] = useState<{ open: boolean; content: string; loading: boolean; title: string }>({ open: false, content: '', loading: false, title: '' });
  // State to hold the list of available dashboards (UIDs)
  const [dashboardsList, setDashboardsList] = useState<string[] | null>(null);
  // Fetch dashboards_list.json on mount
  React.useEffect(() => {
    fetch('/dashboards_list.json')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setDashboardsList(data);
        else setDashboardsList([]);
      })
      .catch(() => setDashboardsList([]));
  }, []);
  // Análisis real por enlace usando Gemini IA vía backend
  const handleAnalyzeLink = async (link: SpanLink) => {
    // Siempre abrir el modal y bloquear cierre accidental
    setAnalysisModal({ open: true, content: '', loading: true, title: `Análisis de ${link.dest_node}` });
    try {
      const response = await axios.post('/api/span-processor/analyze', link);
      // Solo actualizar si el modal sigue abierto (evita race conditions)
      setAnalysisModal(prev =>
        prev.open ? {
          open: true,
          content: response.data.result,
          loading: false,
          title: `Análisis de ${link.dest_node}`
        } : prev
      );
    } catch (error) {
      setAnalysisModal(prev =>
        prev.open ? {
          open: true,
          content: 'Error al obtener el análisis de Gemini IA.',
          loading: false,
          title: `Análisis de ${link.dest_node}`
        } : prev
      );
    }
  };
  // Exportar a CSV
  const exportToCSV = () => {
    const headers = [
      'ID',
      'LINK_IDENTIFIER',
      'SOURCE_NODE',
      'DEST_NODE',
      'LAST_SPAN',
      'MIN_SPAN',
      'MAX_SPAN',
      'LAST_UPDATED',
      'UPLOAD_BATCH_ID'
    ];
    const rows = filteredLinks.map(l => [
      l.id,
      l.link_identifier,
      l.source_node,
      l.dest_node,
      l.last_span,
      l.min_span,
      l.max_span,
      l.last_updated,
      l.upload_batch_id
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.setAttribute('download', 'historial_enlaces.csv');
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);
    if (showNotification) {
      showNotification('Exportación a CSV completada.', 'success');
    }
  };

  // Exportar a PDF (Historial de Enlaces)
  const exportToPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    const rowsHtml = sortedLinks.map(l => {
      const isCrit = l.last_span >= l.max_span;
      const isWarn = !isCrit && l.last_span > (l.min_span + (l.max_span - l.min_span) * 0.75);
      const status = isCrit ? 'CRÍTICO' : isWarn ? 'PRECAUCIÓN' : 'OK';
      const color = isCrit ? '#ef4444' : isWarn ? '#facc15' : '#22c55e';

      return `
        <tr>
          <td>${l.link_identifier}</td>
          <td>${l.source_node}</td>
          <td>${l.dest_node}</td>
          <td style="font-weight: bold; color: ${color}">${l.last_span.toFixed(2)} dB</td>
          <td>${l.min_span} / ${l.max_span}</td>
          <td><span style="background: ${color}22; color: ${color}; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold">${status}</span></td>
          <td>${l.last_updated}</td>
        </tr>
      `;
    }).join('');

    win.document.write(`
      <html>
        <head>
          <title>Historial de Enlaces DWDM - Span Cisco</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
            .header-info { font-size: 12px; color: #666; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { text-align: left; background: #f9fafb; padding: 10px; border-bottom: 2px solid #eee; text-transform: uppercase; font-weight: 900; color: #999; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            .footer { margin-top: 30px; font-size: 9px; text-align: center; color: #ccc; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>REPORTE DE ESTADO DE ENLACES</h1>
          <div class="header-info">
            Módulo Span Cisco - web-notifications-combined<br/>
            Fecha de Reporte: ${new Date().toLocaleString()}<br/>
            Total Registros: ${sortedLinks.length}
          </div>
          <table>
            <thead>
              <tr>
                <th>Identificador</th>
                <th>Origen</th>
                <th>Destino</th>
                <th>Atenuación</th>
                <th>Umbrales</th>
                <th>Estado</th>
                <th>Sincronización</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">Este documento fue generado automáticamente por el sistema de monitoreo.</div>
          <script>setTimeout(() => { window.print(); }, 500);</script>
        </body>
      </html>
    `);
    win.document.close();
    if (showNotification) {
      showNotification('Generando vista de impresión PDF...', 'info');
    }
  };
  // Ordenar siempre descendente por fecha de última actualización
  // Construir la URL de Grafana usando el hostname actual y puerto 3003
  const { protocol, hostname } = window.location;
  const GRAFANA_URL = `${protocol}//${hostname}:3003`;

  // Formatear fecha como hora local de Venezuela (GMT-4)

  const getSpanColor = (link: SpanLink) => {
    if (link.last_span >= link.max_span) {
      return 'text-red-400';
    }
    if (link.last_span > (link.min_span + (link.max_span - link.min_span) * 0.75)) {
      return 'text-yellow-400';
    }
    return 'text-green-400';
  }

  // Estados para filtros avanzados
  const [filterDate, setFilterDate] = useState('');
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [srcNode, setSrcNode] = useState('');
  // Eliminados filtros de atenuación
  const [status, setStatus] = useState('NO'); // 'NO', 'ok', 'warn', 'out'
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Identificadores únicos para los combobox
  const [searchTerm, setSearchTerm] = useState('');
  const uniqueLinks = useMemo(() => Array.from(new Set(links.map(l => l.dest_node))), [links]);
  const uniqueSrcNodes = useMemo(() => Array.from(new Set(links.map(l => l.source_node))), [links]);

  // Memo para agrupar por último registro de cada enlace
  const latestLinksMap = useMemo(() => {
    const map = new Map();
    for (const link of links) {
      const existing = map.get(link.link_identifier);
      if (!existing || new Date(link.last_updated) > new Date(existing.last_updated)) {
        map.set(link.link_identifier, link);
      }
    }
    return map;
  }, [links]);

  // Filtrar por lote seleccionado si existe
  const filteredLinks = useMemo(() => {
    let filtered = links;
    // Si hay un lote seleccionado, filtrar por upload_batch_id
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const batchParam = urlParams.get('batch');
      if (batchParam) {
        filtered = filtered.filter(link => link.upload_batch_id === batchParam);
      }
    }
    if (status === 'NO') {
      return filtered.filter(link => {
        const matchLink = selectedLinkId === '' || link.dest_node === selectedLinkId;
        const matchSrc = srcNode === '' || link.source_node === srcNode;
        const matchDate = filterDate === '' || link.last_updated.toLowerCase().includes(filterDate.toLowerCase());
        const matchSearch = searchTerm === '' ||
          link.link_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
          link.dest_node.toLowerCase().includes(searchTerm.toLowerCase());
        return matchLink && matchSrc && matchDate && matchSearch;
      });
    }
    // Si se selecciona un estado, mostrar solo la última carga global y filtrar por estado
    let latestLinks = Array.from(latestLinksMap.values());
    const maxDate = latestLinks.reduce((max, l) => {
      const d = new Date(l.last_updated).getTime();
      return d > max ? d : max;
    }, 0);
    let linksToShow = latestLinks.filter(l => new Date(l.last_updated).getTime() === maxDate);
    return linksToShow.filter(link => {
      const matchSearch = searchTerm === '' ||
        link.link_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.dest_node.toLowerCase().includes(searchTerm.toLowerCase());
      let matchStatus = true;
      if (status === 'ok') {
        matchStatus = link.last_span < (link.min_span + (link.max_span - link.min_span) * 0.75);
      } else if (status === 'warn') {
        matchStatus = link.last_span >= (link.min_span + (link.max_span - link.min_span) * 0.75) && link.last_span < link.max_span;
      } else if (status === 'out') {
        matchStatus = link.last_span >= link.max_span;
      }
      const matchLink = selectedLinkId === '' || link.dest_node === selectedLinkId;
      const matchSrc = srcNode === '' || link.source_node === srcNode;
      const matchDate = filterDate === '' || link.last_updated.toLowerCase().includes(filterDate.toLowerCase());

      return matchLink && matchSrc && matchDate && matchStatus && matchSearch;
    });
  }, [links, latestLinksMap, selectedLinkId, srcNode, filterDate, status]);
  // Ordenar siempre descendente por fecha
  const sortedLinks = useMemo(() => {
    return [...filteredLinks].sort(
      (a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
    );
  }, [filteredLinks]);
  const totalPages = Math.ceil(filteredLinks.length / pageSize);
  const paginatedLinks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLinks.slice(start, start + pageSize);
  }, [sortedLinks, currentPage]);

  // Pre-calcular historias para el sparkline (Optimización crítica para evitar O(N^2))
  const linkHistories = useMemo(() => {
    const histories = new Map<string, { value: number; date: string }[]>();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Agrupar por link_identifier
    const grouped = new Map<string, SpanLink[]>();
    for (const l of links) {
      if (!grouped.has(l.link_identifier)) grouped.set(l.link_identifier, []);
      grouped.get(l.link_identifier)!.push(l);
    }

    // Procesar cada grupo
    for (const [id, items] of grouped.entries()) {
      const sorted = [...items].sort((a, b) => new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime());
      const last7d = sorted.filter(l => new Date(l.last_updated) >= sevenDaysAgo);
      const historyItems = (last7d.length > 0 ? last7d : sorted).slice(-10).map(l => ({
        value: l.last_span,
        date: l.last_updated
      }));
      histories.set(id, historyItems);
    }
    return histories;
  }, [links]);


  if (isLoading) {
    return (
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-glass animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-xl w-48 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <Shimmer key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl shadow-glass overflow-hidden animate-fade-in">
      <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Database size={20} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase italic">Historial de Enlaces</h2>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 italic">Monitorea y filtra el historial de atenuación en tiempo real.</p>
        </div>

        <div className="flex items-center gap-3">
          {role === 'admin' ? (
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest py-3 px-6 rounded-2xl transition-all border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95"
              >
                <Download size={16} />
                CSV
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 bg-gray-900 dark:bg-primary hover:bg-black dark:hover:bg-primary-dark text-white font-black text-xs uppercase tracking-widest py-3 px-6 rounded-2xl transition-all shadow-lg active:scale-95"
              >
                <FileText size={16} />
                Exportar PDF
              </button>
            </div>
          ) : role === 'lectura' ? (
            <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">Lectura Únicamente</span>
          ) : null}
        </div>
      </div>
      <div className="px-8 py-6 bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Buscar tramo..."
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white w-full focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 font-medium"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
              <Search size={16} />
            </div>
            <input
              list="links-list"
              placeholder="Enlace Destino..."
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white w-full focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 font-medium"
              value={selectedLinkId}
              onChange={e => setSelectedLinkId(e.target.value)}
              aria-label="Buscar Enlace Destino"
            />
            <datalist id="links-list">
              {uniqueLinks.map(id => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
              <Filter size={16} />
            </div>
            <input
              list="src-list"
              placeholder="Nodo Origen..."
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white w-full focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 font-medium"
              value={srcNode}
              onChange={e => setSrcNode(e.target.value)}
              aria-label="Buscar Nodo Origen"
            />
            <datalist id="src-list">
              {uniqueSrcNodes.map(id => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
              <BarChart2 size={16} />
            </div>
            <input
              type="text"
              placeholder="Filtrar por Fecha..."
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white w-full focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 font-medium"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              aria-label="Filtrar por Fecha"
            />
          </div>
          <div className="relative group">
            <select
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-2.5 text-sm text-gray-900 dark:text-white w-full focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold appearance-none cursor-pointer"
              value={status}
              onChange={e => setStatus(e.target.value)}
              aria-label="Filtrar por Estado"
            >
              <option value="NO" className="font-bold">TODOS LOS REGISTROS</option>
              <option value="ok" className="font-bold text-status-success">✓ EN RANGO</option>
              <option value="warn" className="font-bold text-status-warning">! ADVERTENCIA</option>
              <option value="out" className="font-bold text-status-error">!! FUERA DE RANGO</option>
            </select>
          </div>
        </div>
      </div>
      {paginatedLinks.length === 0 ? (
        <div className="text-center py-24 px-8">
          <div className="inline-flex p-6 rounded-3xl bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-700 mb-4 shadow-inner">
            <Database size={48} />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight italic uppercase">Sin registros históricos</h3>
          <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">Cargue archivos CSV para visualizar el comportamiento de sus enlaces.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" role="table">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800">
                <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Enlace DWDM</th>
                <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Atenuación (dB)</th>
                <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Estado Operativo</th>
                <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Tendencia (7d)</th>
                <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Sincronización</th>
                <th scope="col" className="px-8 py-5 text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Herramientas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedLinks.map((link) => {
                // UID igual al backend: spans_<hash8> (hash MD5 real del link_identifier)
                const uid = `spans_${md5(link.link_identifier).slice(0, 8)}`;
                const slug = `span-${link.link_identifier.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
                // Always use the short UID for the link
                let dashboardFile: string | undefined = undefined;
                if (Array.isArray(dashboardsList)) {
                  dashboardFile = dashboardsList.find((name: string) => name === uid);
                }
                const dashboardUrl = dashboardFile ? `${GRAFANA_URL}/d/${uid}/${slug}?orgId=1&from=now-2y&to=now&timezone=browser&refresh=5s` : undefined;
                const history = linkHistories.get(link.link_identifier) || [];
                return (
                  <tr key={link.id} className="group hover:bg-primary/5 transition-all duration-300" role="row">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-tight">{link.dest_node}</span>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                          {link.link_identifier}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <div className={`text-xl font-black italic tracking-tighter ${getSpanColor(link).replace('text-', 'text-status-')}`}>
                          {link.last_span.toFixed(2)} <span className="text-[10px] not-italic font-bold opacity-60 ml-0.5 uppercase tracking-normal">dB</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 border border-gray-100 dark:border-gray-800 w-fit px-2 py-0.5 rounded-full bg-gray-50/50 dark:bg-gray-800/30">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Lim:</span>
                          <span className="text-[9px] font-black text-gray-900 dark:text-white">{link.min_span} - {link.max_span}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-left">
                      {(() => {
                        const isCrit = link.last_span >= link.max_span;
                        const isWarn = !isCrit && link.last_span > (link.min_span + (link.max_span - link.min_span) * 0.75);
                        const statusLabel = isCrit ? 'CRÍTICO' : isWarn ? 'PRECAUCIÓN' : 'OK';
                        return (
                          <div className={`text-[10px] font-black px-4 py-1.5 rounded-full w-fit flex items-center gap-2 ${isCrit ? 'bg-status-error/10 text-status-error' : isWarn ? 'bg-status-warning/10 text-status-warning' : 'bg-status-success/10 text-status-success'}`}>
                            <div className={`w-2 h-2 rounded-full animate-pulse ${isCrit ? 'bg-status-error' : isWarn ? 'bg-status-warning' : 'bg-status-success'}`} />
                            {statusLabel}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-24">
                          <MiniSparkline data={history} />
                        </div>
                        {/* Traffic Light Diagram (Stability Indicators) */}
                        <div className="flex gap-1">
                          {history.slice(-5).map((h, i) => {
                            const isCrit = h.value >= (link.max_span || 30);
                            const isWarn = !isCrit && h.value > ((link.min_span || 20) + ((link.max_span || 30) - (link.min_span || 20)) * 0.75);
                            return (
                              <div
                                key={i}
                                title={`${new Date(h.date).toLocaleString()}: ${h.value}dB`}
                                className={`w-2 h-2 rounded-full ${isCrit ? 'bg-status-error' : isWarn ? 'bg-status-warning' : 'bg-status-success'} shadow-sm`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400">
                          <Clock size={14} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          {(() => {
                            if (!link.last_updated) return '';
                            const raw = link.last_updated.replace(' ', 'T');
                            const date = new Date(raw);
                            return isNaN(date.getTime()) ? link.last_updated : date.toLocaleString('es-VE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
                          })()}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 translate-x-2 group-hover:translate-x-0 transition-transform duration-300">
                        <a
                          href={dashboardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-accent hover:text-white transition-all shadow-sm"
                          title="Ver Gráfica Detallada"
                        >
                          <BarChart2 size={18} />
                        </a>
                        {role === 'admin' && (
                          <button
                            onClick={() => handleAnalyzeLink(link)}
                            className="p-2.5 rounded-xl bg-gray-900 dark:bg-primary text-white hover:bg-black dark:hover:bg-primary-dark transition-all shadow-md active:scale-90 flex items-center gap-2 px-4"
                          >
                            <Activity size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">IA</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* Controles de paginación */}
      <div className="flex flex-col sm:flex-row justify-between items-center p-8 bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800 gap-4">
        <div className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] italic">
          Página {currentPage} / {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shadow-sm group"
            aria-label="Página anterior"
          >
            <ChevronLeft size={20} className="group-active:-translate-x-1 transition-transform" />
          </button>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shadow-sm group"
            aria-label="Página siguiente"
          >
            <ChevronRight size={20} className="group-active:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
      {/* Modal de análisis, movido fuera de cada fila */}
      <LinkAnalysisModal
        isOpen={analysisModal.open}
        onClose={() => setAnalysisModal(prev => ({ ...prev, open: false }))}
        title={analysisModal.title}
        content={analysisModal.content}
        isLoading={analysisModal.loading}
      />
    </div>
  );
}

export default LinksTable;

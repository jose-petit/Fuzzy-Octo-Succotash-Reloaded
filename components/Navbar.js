import Link from 'next/link';
import React, { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Menu, Transition } from '@headlessui/react';
import {
  Bell,
  CheckCheck,
  Info,
  AlertTriangle,
  Activity,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  Mail,
  ShieldCheck,
  Package
} from 'lucide-react';
import axios from 'axios';
import moment from 'moment';

function Navbar() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.rol === 'admin';
  const isLoggedIn = status === 'authenticated';

  const [countdown, setCountdown] = useState('--:--');
  const intervalMsRef = useRef(1800000);
  const nextAnchorRef = useRef(Date.now() + intervalMsRef.current);

  const [editing, setEditing] = useState(false);
  const [newIntervalMin, setNewIntervalMin] = useState('');
  const [loadingInterval, setLoadingInterval] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        setIsDark(true);
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (async () => {
      try {
        const res = await fetch('/api/settings/interval');
        const json = await res.json();
        const val = Number(json.value);
        const nextAt = Number(json.nextAt);
        if (Number.isFinite(val) && Number.isFinite(nextAt)) {
          intervalMsRef.current = val;
          nextAnchorRef.current = nextAt;
          setNewIntervalMin(String(Math.floor(val / 60000)));
        }
      } catch (e) {
        console.warn('Failed to init interval settings', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const formatMs = (ms) => {
      if (ms <= 0) return '00:00';
      const totalSec = Math.floor(ms / 1000);
      const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const s = String(totalSec % 60).padStart(2, '0');
      return `${m}:${s}`;
    };
    const tick = async () => {
      const now = Date.now();
      const diff = nextAnchorRef.current - now;
      setCountdown(formatMs(diff));
      if (diff <= 0) {
        try {
          const res = await fetch('/api/settings/interval', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: intervalMsRef.current }),
          });
          const json = await res.json();
          const newNext = Number(json.nextAt);
          nextAnchorRef.current = newNext;
          window.dispatchEvent(new Event('persistDue'));
        } catch (e) {
          console.error('Error reprogramming interval', e);
        }
      }
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, []);

  const saveInterval = async () => {
    setLoadingInterval(true);
    try {
      const minutes = Number(newIntervalMin) || 0;
      const ms = minutes * 60000;
      const res = await fetch('/api/settings/interval', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: ms }),
      });
      const json = await res.json();
      intervalMsRef.current = Number(json.value) || ms;
      nextAnchorRef.current = Number(json.nextAt) || Date.now() + intervalMsRef.current;
      window.dispatchEvent(new Event('intervalMsChanged'));
    } catch (err) {
      console.error('Error setting interval:', err);
    } finally {
      setLoadingInterval(false);
      setEditing(false);
    }
  };

  // GLOBAL AUTO-PERSIST LOGIC
  useEffect(() => {
    const handleDue = async () => {
      // 1. Calculate perfBase
      const host = window.location.hostname;
      const port = window.location.port;
      const bPort = (port === '3000' || port === '3010' || port === '3005') ? '5001' : '5000';
      const perfBase = `${window.location.protocol}//${host}:${bPort}`;

      // 2. Tab locking (Only one tab executes)
      const now = Date.now();
      const lastAutoPersist = Number(localStorage.getItem('lastAutoPersist') || 0);
      if (now - lastAutoPersist < 30000) return;
      localStorage.setItem('lastAutoPersist', String(now));

      console.log("💾 [Navbar] Sync Timer Reached 0 - Auto-persisting...");

      try {
        // We notify all tabs that a persist is starting (optional)
        const toast = (await import('react-hot-toast')).toast;

        // Trigger the persist endpoint
        await fetch(`${perfBase}/api/spans/persist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}) // Let backend use its DB fallback for enlaces
        });

        toast.success('Sincronización automática de lote completada 💾', {
          icon: '✅',
          style: { borderRadius: '12px', background: '#1e293b', color: '#fff', fontSize: '12px', fontWeight: 'bold' }
        });

        // Notify pages to refetch
        window.dispatchEvent(new Event('persistCompleted'));
      } catch (err) {
        console.error("Auto-persist error:", err);
      }
    };

    window.addEventListener('persistDue', handleDue);
    return () => window.removeEventListener('persistDue', handleDue);
  }, []);

  // Notifications logic
  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get('/api/notifications?limit=5');
      if (data.status === 'success') {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const markAsRead = async (id) => {
    try {
      await axios.patch('/api/notifications', { id });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.patch('/api/notifications', { markAllAsRead: true });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'WARNING': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'CRITICAL_LOSS': return <AlertTriangle size={14} />;
      case 'USER': return < ShieldCheck size={14} />;
      default: return <Info size={14} />;
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300 h-20 flex items-center">
      <div className="container mx-auto px-6 flex items-center justify-between h-full">
        {/* Logos Group */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center group">
            <img src="/img/logo_inter_azul.png" alt="Inter Logo" className="h-8 transition-transform group-hover:scale-105 dark:brightness-200" />
          </Link>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />
          <Link href="/performance" className="flex items-center group">
            <img src="/img/padtec_small.png" alt="Padtec Logo" className="h-5 opacity-60 dark:opacity-40 group-hover:opacity-100 transition-all dark:invert" />
          </Link>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center space-x-2">
          {/* Padtec View Dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="px-4 py-2 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center gap-2">
              Padtec View
              <svg className="w-4 h-4 opacity-40 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.23 7.21l4.77 4.77 4.77-4.77a.75.75 0 10-1.06-1.06L10 9.94 6.29 6.15a.75.75 0 10-1.06 1.06z" />
              </svg>
            </Menu.Button>
            <Transition
              as={React.Fragment}
              enter="transition ease-out duration-200"
              enterFrom="transform opacity-0 scale-95 translate-y-2"
              enterTo="transform opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="transform opacity-100 scale-100 translate-y-0"
              leaveTo="transform opacity-0 scale-95 translate-y-2"
            >
              <Menu.Items className="absolute left-0 mt-3 w-56 p-2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 focus:outline-none ring-1 ring-black/5 z-[110]">
                <Menu.Item>
                  {({ active }) => (
                    <Link href="/performance" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      Performance Monitor
                    </Link>
                  )}
                </Menu.Item>
                {isAdmin && (
                  <>
                    <Menu.Item>
                      {({ active }) => (
                        <Link href="/admin/enlaces" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          Gestión de Enlaces
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <Link href="/admin/maintenance" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          Mantenimiento y Eventos
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <Link href="/admin/settings" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          Ajustes de Sistema
                        </Link>
                      )}
                    </Menu.Item>
                  </>
                )}
                <Menu.Item>
                  {({ active }) => (
                    <Link href="/historial-tarjetas" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      Historial de Tarjetas
                    </Link>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* Almacén Dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="px-4 py-2 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center gap-2">
              Almacén
              <svg className="w-4 h-4 opacity-40 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.23 7.21l4.77 4.77 4.77-4.77a.75.75 0 10-1.06-1.06L10 9.94 6.29 6.15a.75.75 0 10-1.06 1.06z" />
              </svg>
            </Menu.Button>
            <Transition
              as={React.Fragment}
              enter="transition ease-out duration-200"
              enterFrom="transform opacity-0 scale-95 translate-y-2"
              enterTo="transform opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="transform opacity-100 scale-100 translate-y-0"
              leaveTo="transform opacity-0 scale-95 translate-y-2"
            >
              <Menu.Items className="absolute left-0 mt-3 w-56 p-2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 focus:outline-none ring-1 ring-black/5 z-[110]">
                {[
                  { label: 'Productos', href: '/products' },
                  { label: 'Usuarios', href: '/users' },
                  { label: 'Inventario', href: '/equipos' },
                  { label: 'Proyectos', href: '/projects' },
                  { label: 'Sub-Proyectos', href: '/subprojects' },
                  { label: 'Depósitos', href: '/deposits' },
                ].map((item) => (
                  <Menu.Item key={item.href}>
                    {({ active }) => (
                      <Link href={item.href} className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {item.label}
                      </Link>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>

          {/* Análisis Cisco Dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="px-4 py-2 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center gap-2">
              Análisis Cisco
              <svg className="w-4 h-4 opacity-40 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.23 7.21l4.77 4.77 4.77-4.77a.75.75 0 10-1.06-1.06L10 9.94 6.29 6.15a.75.75 0 10-1.06 1.06z" />
              </svg>
            </Menu.Button>
            <Transition
              as={React.Fragment}
              enter="transition ease-out duration-200"
              enterFrom="transform opacity-0 scale-95 translate-y-2"
              enterTo="transform opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="transform opacity-100 scale-100 translate-y-0"
              leaveTo="transform opacity-0 scale-95 translate-y-2"
            >
              <Menu.Items className="absolute left-0 mt-3 w-56 p-2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 focus:outline-none ring-1 ring-black/5 z-[110]">
                <Menu.Item>
                  {({ active }) => (
                    <Link href="/span-processor" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      Procesador de Spans
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <Link href="/span-processor/view-map" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      Mapa de DWDM
                    </Link>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>

        {/* Right Section: Timer & Profile */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-3 pr-4 border-r border-gray-100 dark:border-gray-800">
            {/* Dynamic Timer Control */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-full border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-600">Sync</span>
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{countdown}</span>
              {editing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={newIntervalMin}
                    onChange={(e) => setNewIntervalMin(e.target.value)}
                    className="w-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 text-[10px] font-bold outline-none dark:text-gray-200"
                  />
                  <button onClick={saveInterval} className="text-emerald-500 hover:text-emerald-600">
                    {loadingInterval ? '...' : <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="text-gray-300 dark:text-gray-700 hover:text-blue-500 transition-colors">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                </button>
              )}
            </div>
            <div className="text-sm font-bold text-gray-400 dark:text-gray-600">
              {Math.floor(intervalMsRef.current / 60000)} min
            </div>
          </div>

          {/* Notification Bell */}
          {isLoggedIn && (
            <Menu as="div" className="relative">
              <Menu.Button className="relative p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white ring-2 ring-white dark:ring-gray-950 animate-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Menu.Button>
              <Transition
                as={React.Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95 translate-y-2"
                enterTo="transform opacity-100 scale-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100 translate-y-0"
                leaveTo="transform opacity-0 scale-95 translate-y-2"
              >
                <Menu.Items className="absolute right-0 mt-3 w-80 bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 focus:outline-none z-[110] overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-2">
                      Centro de Alertas
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline"
                      >
                        Limpiar Todo
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="px-6 py-10 text-center">
                        <Package className="mx-auto h-8 w-8 text-gray-300 mb-2 opacity-50" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sin notificaciones</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <Menu.Item key={notif.id}>
                          {({ active }) => (
                            <div
                              onClick={() => markAsRead(notif.id)}
                              className={`px-5 py-4 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group ${!notif.is_read ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}
                            >
                              <div className="flex gap-4">
                                <div className={`mt-1 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${getSeverityStyles(notif.severity)}`}>
                                  {getNotifIcon(notif.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase italic tracking-tighter truncate">
                                      {notif.title}
                                    </span>
                                    <span className="text-[8px] font-bold text-gray-400 uppercase shrink-0">
                                      {moment(notif.fecha).fromNow()}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium line-clamp-2 leading-relaxed">
                                    {notif.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </Menu.Item>
                      ))
                    )}
                  </div>
                  <Link href="/admin/notifications" className="block px-5 py-3 text-center text-[10px] font-black text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 uppercase tracking-[.2em] bg-gray-50/50 dark:bg-gray-800/50 transition-colors">
                    Ver Todo el Historial
                  </Link>
                </Menu.Items>
              </Transition>
            </Menu>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95"
            title={isDark ? 'Activar Modo Claro' : 'Activar Modo Oscuro'}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {isLoggedIn && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-gray-900 dark:text-white uppercase italic tracking-tighter">{session.user.name || session.user.email}</span>
                <span className="text-[9px] font-black uppercase tracking-tighter text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 rounded leading-none py-0.5 border border-blue-100 dark:border-blue-800 italic">{session.user.rol}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all shadow-sm hover:shadow-red-500/20 active:scale-95 border border-red-100 dark:border-red-900/30"
                title="Cerrar Sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

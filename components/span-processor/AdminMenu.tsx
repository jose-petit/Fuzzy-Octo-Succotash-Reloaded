import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SpanLink } from './types';
import {
  X,
  Settings,
  LogOut,
  Home,
  Map,
  Shield,
  User,
  ChevronRight,
  Zap,
  Flame,
  ShieldCheck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export interface AdminMenuProps {
  links: SpanLink[];
  onUpdateThreshold: (id: number, min: number, max: number) => void;
  onClose: () => void;
  role: 'lectura' | 'admin';
  onLogin: () => void;
  onLogout: () => void;
  showLogin: boolean;
  setShowLogin: (v: boolean) => void;
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigate?: (route: 'home' | 'admin-thresholds' | 'admin-map') => void;
}

const AdminMenu: React.FC<AdminMenuProps> = ({
  links = [],
  onClose,
  role,
  onLogout,
  onNavigate,
  showNotification
}) => {
  const [isSimulating, setIsSimulating] = useState<string | null>(null);

  useEffect(() => {
    if (role === 'admin' && !isSimulating) {
      const timer = setTimeout(() => {
        onClose();
      }, 30000); // Aumentado a 30s si el usuario es admin para permitir interactuar
      return () => clearTimeout(timer);
    }
  }, [role, onClose, isSimulating]);

  const handleSimulate = async (type: string) => {
    setIsSimulating(type);
    try {
      await axios.post('/api/span-processor/simulate', { type });
      showNotification(`Simulacro de ${type} enviado exitosamente.`, 'success');
    } catch (error) {
      showNotification('Error al enviar el simulacro.', 'error');
    } finally {
      setIsSimulating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      {/* Background Overlay */}
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-500 animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-over Menu */}
      <aside
        className="relative h-full w-full max-w-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border-l border-gray-200 dark:border-gray-800 shadow-glass flex flex-col animate-slide-up"
        style={{ animationDuration: '0.4s' }}
      >
        {/* Header */}
        <div className="px-8 py-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <Settings size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase italic leading-tight">Ajustes</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Módulo Span Cisco</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all active:scale-95"
          >
            <X size={24} />
          </button>
        </div>

        {/* User Context Area */}
        <div className="px-8 py-6">
          <div className={`p-5 rounded-3xl border transition-all duration-300 ${role === 'admin'
            ? 'bg-primary/5 border-primary/20'
            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'
            }`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${role === 'admin' ? 'bg-primary text-white shadow-glow' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                {role === 'admin' ? <Shield size={20} /> : <User size={20} />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-0.5">Rol Actual</p>
                <p className={`text-sm font-black uppercase italic ${role === 'admin' ? 'text-primary' : 'text-gray-900 dark:text-white'
                  }`}>
                  {role === 'admin' ? 'Administrador' : 'Lectura'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-6 overflow-y-auto scrollbar-hide py-4">
          <div className="space-y-2">
            <div className="px-4 py-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Navegación</p>
            </div>

            <button
              onClick={() => { if (onNavigate) onNavigate('home'); onClose(); }}
              className="w-full flex items-center justify-between px-4 py-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 group transition-all"
            >
              <div className="flex items-center gap-3">
                <Home size={18} className="group-hover:text-primary transition-colors" />
                <span className="text-sm font-bold">Inicio Dashboard</span>
              </div>
              <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-gray-400" />
            </button>

            <button
              onClick={() => { if (onNavigate) onNavigate('admin-thresholds'); onClose(); }}
              className="w-full flex items-center justify-between px-4 py-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 group transition-all"
            >
              <div className="flex items-center gap-3">
                <Settings size={18} className="group-hover:text-primary transition-colors" />
                <span className="text-sm font-bold">Configuración Umbrales</span>
              </div>
              <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-gray-400" />
            </button>

            <button
              onClick={() => { if (onNavigate) onNavigate('admin-map'); onClose(); }}
              className="w-full flex items-center justify-between px-4 py-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 group transition-all"
            >
              <div className="flex items-center gap-3">
                <Map size={18} className="group-hover:text-primary transition-colors" />
                <span className="text-sm font-bold">Explorador de Mapa</span>
              </div>
              <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-gray-400" />
            </button>
          </div>

          {role === 'admin' && (
            <div className="space-y-4">
              <div className="px-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
                    <Zap size={14} />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Centro de Simulacros</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'critical', icon: Flame, label: 'Crítico', color: 'red', bg: 'bg-red-500/10', text: 'text-red-500', hover: 'hover:bg-red-500' },
                      { id: 'warning', icon: AlertTriangle, label: 'Alerta', color: 'yellow', bg: 'bg-yellow-500/10', text: 'text-yellow-500', hover: 'hover:bg-yellow-500' },
                      { id: 'recovery', icon: ShieldCheck, label: 'Resuelto', color: 'green', bg: 'bg-green-500/10', text: 'text-green-500', hover: 'hover:bg-green-500' },
                      { id: 'maintenance', icon: Settings, label: 'Prog', color: 'blue', bg: 'bg-blue-500/10', text: 'text-blue-500', hover: 'hover:bg-blue-500' },
                    ].map((sim) => (
                      <button
                        key={sim.id}
                        onClick={() => handleSimulate(sim.id)}
                        disabled={!!isSimulating}
                        className={`flex flex-col items-center justify-center p-5 rounded-[2rem] ${sim.bg} border border-${sim.color}-500/20 ${sim.text} ${sim.hover} hover:text-white transition-all duration-300 group relative overflow-hidden backdrop-blur-md active:scale-95 disabled:grayscale disabled:opacity-50`}
                      >
                        <sim.icon size={22} className={`mb-2 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-6 ${isSimulating === sim.id ? 'animate-pulse' : ''}`} />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">{sim.label}</span>

                        {isSimulating === sim.id && (
                          <div className={`absolute inset-0 ${sim.hover.replace('hover:', '')} flex items-center justify-center`}>
                            <RefreshCw size={20} className="animate-spin" />
                          </div>
                        )}

                        {/* Subtle Glow Effect on Hover */}
                        <div className={`absolute -inset-4 bg-${sim.color}-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 px-4 pb-4">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-3xl bg-gray-900 dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                >
                  <LogOut size={16} />
                  Finalizar Sesión Admin
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[9px] font-bold text-gray-400 text-center uppercase tracking-widest">
            web-notifications-combined v2.0
          </p>
        </div>
      </aside>
    </div>
  );
};

export default AdminMenu;

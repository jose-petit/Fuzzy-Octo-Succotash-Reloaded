import { Activity } from 'lucide-react';

interface HeaderProps {
    spanCount: number;
}

const Header: React.FC<HeaderProps> = ({ spanCount }) => {
    return (
        <header className="text-center mb-8 animate-fade-in">
            <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-3xl bg-primary/10 border border-primary/20 shadow-glow mb-2">
                    <Activity className="w-12 h-12 text-primary" />
                </div>
                <h1 className="text-4xl sm:text-6xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic">
                    <span className="text-primary-dark dark:text-primary-light">Span</span> DWDM Cisco
                </h1>
            </div>
            <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed">
                Gestión avanzada de atenuación y análisis inteligente de enlaces de fibra óptica.
            </p>
            <div className="mt-8 flex justify-center">
                <div className="px-8 py-3 rounded-full bg-gradient-to-r from-primary to-accent text-white shadow-lg text-sm font-black uppercase tracking-widest flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Enlaces cargados: {spanCount}
                </div>
            </div>
        </header>
    );
};

export default Header;

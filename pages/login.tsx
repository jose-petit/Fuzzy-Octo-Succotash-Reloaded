import { getCsrfToken, signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

interface Props {
    csrfToken: string | undefined;
}

export default function LoginPage({ csrfToken }: Props) {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        const res = await signIn('credentials', {
            redirect: false,
            email,
            password,
        });

        if (res?.ok) {
            router.push('/performance');
        } else {
            setErrorMsg('Credenciales inválidas. Intente nuevamente.');
            setLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Login | Padtec View</title>
            </Head>
            <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900 font-sans">

                {/* Dynamic Background */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                </div>

                {/* Glassmorphism Card */}
                <div className="relative z-10 w-full max-w-md p-8 sm:p-10 mx-4 bg-surface-glass backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl animate-fade-in">

                    <div className="flex flex-col items-center mb-10">
                        <div className="p-3 bg-white/90 rounded-2xl shadow-lg mb-4">
                            <img src="/img/padtec_small.png" alt="Padtec Logo" className="h-8 w-auto object-contain" />
                        </div>
                        <h2 className="text-gray-800 text-xl font-bold tracking-tight">Bienvenido de nuevo</h2>
                        <p className="text-gray-500 text-sm mt-1">Ingrese sus credenciales para continuar</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {errorMsg && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl text-center animate-bounce">
                                {errorMsg}
                            </div>
                        )}

                        <input name="csrfToken" type="hidden" defaultValue={csrfToken || ''} />

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Correo Electrónico</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-graydark"
                                placeholder="ejemplo@padtec.com"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-graydark"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3.5 rounded-xl text-white font-bold shadow-lg shadow-primary/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-none
                  ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-primary to-primary-dark hover:brightness-110'}
                `}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Validando...
                                    </span>
                                ) : 'Ingresar al Portal'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center border-t border-gray-100 pt-6">
                        <p className="text-xs text-gray-400 font-medium">© {new Date().getFullYear()} Padtec | Transporte Óptico</p>
                    </div>
                </div>
            </div>
        </>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    return {
        props: {
            csrfToken: await getCsrfToken(context) || null,
        },
    };
};

import React, { useState } from 'react';

interface AdminLoginProps {
  onLogin: () => void;
  showNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSuccessLogin?: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, showNotification, onSuccessLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      // Usuarios admin permitidos: jpetit/666 y dwdm/t0pt1c0
      if ((username === 'jpetit' && password === '666') || (username === 'dwdm' && password === 't0pt1c0')) {
        onLogin();
        if (onSuccessLogin) onSuccessLogin();
        if (showNotification) showNotification('Login exitoso. Modo admin activado.', 'success');
      } else {
        if (showNotification) showNotification('Usuario o contraseña incorrectos.', 'error');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-lg flex flex-col gap-4 w-full max-w-xs">
      <h2 className="text-lg font-semibold text-white mb-2">Login Admin</h2>
      <input
        type="text"
        placeholder="Usuario"
        className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
        value={username}
        onChange={e => setUsername(e.target.value)}
        autoComplete="username"
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      <button
        type="submit"
        className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold py-2 px-4 rounded disabled:bg-gray-600"
        disabled={loading}
      >
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  );
};

export default AdminLogin;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Leaf } from 'lucide-react';
import logo from '../assets/rumileaf.png';

const USERNAME = 'admin';
const PASSWORD = 'rumileaf2025';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === USERNAME && password === PASSWORD) {
      localStorage.setItem('rumileaf_auth', 'true');
      localStorage.setItem('rumileaf_user', username);
      navigate('/');
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-emerald-100 to-green-300 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 relative overflow-hidden">
      {/* Fondo decorativo animado */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-green-400/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl animate-pulse" />
      </div>
  <form onSubmit={handleSubmit} className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm border border-green-200 dark:border-green-700 backdrop-blur-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-xl bg-green-100 flex items-center justify-center shadow-lg ring-2 ring-green-200 mb-3 overflow-hidden">
            <img src={logo} alt="RumiLeaf Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-extrabold text-green-800 dark:text-green-100 mb-1 text-center">Bienvenido</h2>
          <p className="text-green-600 dark:text-green-300 text-center text-sm font-medium mb-1">Accede a tu panel inteligente de plantas</p>
        </div>
  <div className="mb-4">
          <label className="block text-green-700 dark:text-green-200 font-semibold mb-2" htmlFor="username">Usuario</label>
          <div className="flex items-center border-2 border-green-200 dark:border-green-700 rounded-xl px-3 py-2 bg-green-50 dark:bg-gray-800 focus-within:ring-2 focus-within:ring-green-400">
            <User size={22} className="text-green-600 mr-2" />
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="flex-1 bg-transparent outline-none text-lg text-green-900 dark:text-green-100"
              autoFocus
              required
              placeholder="Tu usuario..."
            />
          </div>
        </div>
  <div className="mb-5">
          <label className="block text-green-700 dark:text-green-200 font-semibold mb-2" htmlFor="password">Contraseña</label>
          <div className="flex items-center border-2 border-green-200 dark:border-green-700 rounded-xl px-3 py-2 bg-green-50 dark:bg-gray-800 focus-within:ring-2 focus-within:ring-green-400">
            <Lock size={22} className="text-green-600 mr-2" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="flex-1 bg-transparent outline-none text-lg text-green-900 dark:text-green-100"
              required
              placeholder="Tu contraseña..."
            />
          </div>
        </div>
        {error && <div className="mb-4 text-red-600 text-center font-semibold animate-shake">{error}</div>}
        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-green-800 text-white font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Leaf size={18} className="text-white" />
          Acceder
        </button>
        <div className="mt-4 text-center text-green-700 dark:text-green-300 text-xs opacity-80">
          <span>¿Olvidaste tu contraseña? Contacta al administrador.</span>
        </div>
      </form>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Menu, Sun, Moon, Bell, User, CalendarDays, Clock } from 'lucide-react';

const Panel = ({ pageTitle, theme, setTheme, setSidebarOpen }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const loggedUser = localStorage.getItem('rumileaf_user') || 'Usuario';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm border-b border-green-200/50 dark:border-green-700/50 shadow-sm">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Lado Izquierdo: Menú y Título */}
        <div className="flex items-center space-x-4">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
            onClick={() => setSidebarOpen(prev => !prev)}
          >
            <Menu size={24} className="text-green-700 dark:text-green-200" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-green-900 dark:text-green-100">{pageTitle}</h1>
          </div>
        </div>

        {/* Lado Derecho: Controles y Usuario */}
        <div className="flex items-center space-x-4">
          {/* Fecha y Hora */}
          <div className="hidden md:flex items-center space-x-2 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 px-4 py-2 rounded-lg">
            <CalendarDays size={16} />
            <span className="text-sm font-medium">{formatDate(currentTime)}</span>
            <span className="text-gray-400">|</span>
            <Clock size={16} />
            <span className="text-sm font-semibold">{formatTime(currentTime)}</span>
          </div>

          {/* Selector de Tema */}
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
            title={`Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}`}
          >
            {theme === 'light' ? <Moon size={20} className="text-green-700" /> : <Sun size={20} className="text-yellow-400" />}
          </button>

          {/* Perfil de Usuario */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {loggedUser.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Panel;
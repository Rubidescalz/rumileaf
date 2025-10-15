// src/components/Sidebar.jsx
import React from 'react';
import { Home, MessageSquare, History, Menu, X, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/rumileaf.png';

const Sidebar = ({ theme, setTheme, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isOpen = sidebarOpen;
  const toggleSidebar = () => setSidebarOpen && setSidebarOpen(!sidebarOpen);

  const activeRoute = location.pathname;
  // ✅ Removí loggedUser que no se usaba

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-green-900 via-green-800 to-green-700 text-white shadow-2xl transition-all duration-300 ease-in-out ${
          isOpen ? 'w-72' : 'w-20'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className={`p-8 text-center border-b border-green-600/30 relative ${!isOpen && 'p-4'}`}>
            <button
              onClick={toggleSidebar}
              className="absolute top-6 left-6 p-2 hover:bg-green-700/50 rounded-lg transition-all duration-200"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {isOpen && (
              <>
                <div className="flex justify-center mb-6 mt-8">
                  <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-xl ring-4 ring-green-200">
                    <img src={logo} alt="RumiLeaf Logo" className="w-full h-full object-cover" />
                  </div>
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">
                  Bienvenido a<br />
                  <span className="text-2xl">RumiLeaf</span>
                </h2>
                <p className="text-green-200 text-sm mt-2">Análisis inteligente de plantas</p>
              </>
            )}

            {!isOpen && (
              <div className="flex justify-center mt-12">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-xl">
                  <img src={logo} alt="RumiLeaf Logo" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>

          <nav className="flex-1 p-6 space-y-3">
            <button
              className={`w-full flex items-center ${
                isOpen ? 'space-x-4 px-6' : 'justify-center px-2'
              } py-4 rounded-xl transition-all duration-200 mb-4 border border-green-600/20 ${
                activeRoute === '/' ? 'bg-green-700/30' : 'hover:bg-green-700/50'
              }`}
              onClick={() => navigate('/')}
              title={!isOpen ? 'Inicio' : ''}
            >
              <Home size={24} className="text-green-200" />
              {isOpen && <span className="text-lg font-medium">Inicio</span>}
            </button>

            <button
              className={`w-full flex items-center ${
                isOpen ? 'space-x-4 px-6' : 'justify-center px-2'
              } py-4 rounded-xl transition-all duration-200 border border-green-600/20 ${
                activeRoute === '/consultas' ? 'bg-green-700/30' : 'hover:bg-green-700/50'
              }`}
              onClick={() => navigate('/consultas')}
              title={!isOpen ? 'Consultas' : ''}
            >
              <MessageSquare size={24} className="text-green-200" />
              {isOpen && <span className="text-lg font-medium">Consultas</span>}
            </button>

            <button
              className={`w-full flex items-center ${
                isOpen ? 'space-x-4 px-6' : 'justify-center px-2'
              } py-4 rounded-xl transition-all duration-200 border border-green-600/20 ${
                activeRoute === '/historial' ? 'bg-green-700/30' : 'hover:bg-green-700/50'
              }`}
              onClick={() => navigate('/historial')}
              title={!isOpen ? 'Historial' : ''}
            >
              <History size={24} className="text-green-200" />
              {isOpen && <span className="text-lg font-medium">Historial</span>}
            </button>
          </nav>

          <div className={`p-4 border-t border-green-600/30 ${!isOpen ? 'p-2' : ''}`}>
            <button
              onClick={() => {
                localStorage.removeItem('rumileaf_auth');
                localStorage.removeItem('rumileaf_user');
                window.location.href = '/login';
              }}
              className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-all shadow-lg ${!isOpen && 'p-3'}`}
              title={!isOpen ? 'Cerrar sesión' : ''}
            >
              <LogOut size={isOpen ? 20 : 22} />
              {isOpen && <span>Cerrar sesión</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
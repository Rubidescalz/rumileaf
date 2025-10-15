import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth } from './firebase'; // Asegúrate de que la ruta sea correcta
import { Loader2 } from 'lucide-react'; // Importa Loader2
import Home from './pages/Home';
import Consultas from './pages/Consultas';
import Login from './pages/Login';
import Historial from './pages/Historial';
import Sidebar from './components/Sidebar';
import './App.css';

// Verificar autenticación (sincronizada con Firebase)
function isAuthenticated() {
  return !!auth.currentUser || localStorage.getItem('rumileaf_auth') === 'true';
}

// Rutas protegidas
function PrivateLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const location = useLocation();

  // Determina la ruta activa para pasarla al Sidebar
  const getActiveRoute = () => {
    const path = location.pathname;
    if (path.startsWith('/consultas')) return 'consultas';
    if (path.startsWith('/historial')) return 'historial';
    return 'home';
  };

  // Actualiza el tema en localStorage
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Sidebar 
        active={getActiveRoute()} 
        theme={theme} 
        setTheme={setTheme} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
      />
      <div 
        id="main-content"
        className={`flex flex-col min-h-screen bg-transparent transition-all duration-500 ease-in-out w-full overflow-y-auto ${sidebarOpen ? 'lg:pl-72' : 'lg:pl-20'}`}
      >
        {children}
      </div>
    </div>
  );
}

function PrivateRoute({ children, location }) { // Añade location como prop
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        localStorage.setItem('rumileaf_auth', 'true');
      } else {
        localStorage.removeItem('rumileaf_auth');
      }
      setIsAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  if (!isAuthChecked) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 size={48} className="text-green-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />; // Usa la prop location
  }

  return <PrivateLayout>{children}</PrivateLayout>;
}

function App() {
  const location = useLocation(); // Pasa location al PrivateRoute

  return (
    <Routes location={location}> {/* Pasa location al Routes */}
      {/* Ruta pública */}
      <Route path="/login" element={<Login />} />

      {/* Rutas privadas envueltas por PrivateRoute que provee el Layout (Sidebar + contenido) */}
      <Route path="/" element={<PrivateRoute location={location}><Home /></PrivateRoute>} />
      <Route path="/consultas" element={<PrivateRoute location={location}><Consultas /></PrivateRoute>} />
      <Route path="/historial" element={<PrivateRoute location={location}><Historial /></PrivateRoute>} />

      {/* Redirecciones */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
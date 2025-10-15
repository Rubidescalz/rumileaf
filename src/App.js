import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Consultas from './pages/Consultas';
import Historial from './pages/Historial';

function App() {
  return (
    <Routes>
      {/* Redirige la ruta raíz a /consultas por defecto */}
      <Route path="/" element={<Navigate to="/consultas" replace />} />
      
      {/* Define las rutas para tus páginas */}
      <Route path="/consultas" element={<Consultas />} />
      <Route path="/historial" element={<Historial />} />
    </Routes>
  );
}

export default App;

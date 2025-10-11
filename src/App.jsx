import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Consultas from './pages/Consultas';
import './App.css';

// Router principal de la aplicación
// Define rutas: "/" (Home) y "/consultas" (Consultas), con fallback a Home.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/consultas" element={<Consultas />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
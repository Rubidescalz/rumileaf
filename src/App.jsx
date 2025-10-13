import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Consultas from './pages/Consultas';
import Login from './pages/Login';
import './App.css';

// Router principal de la aplicación
// Define rutas: "/" (Home) y "/consultas" (Consultas), con fallback a Home.
function isAuthenticated() {
  return localStorage.getItem('rumileaf_auth') === 'true';
}

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        } />
        <Route path="/consultas" element={
          <PrivateRoute>
            <Consultas />
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
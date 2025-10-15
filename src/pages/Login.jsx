import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import logo from '../assets/rumileaf.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user) {
        localStorage.setItem('rumileaf_auth', 'true');
        localStorage.setItem('rumileaf_user', user.email);

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            createdAt: serverTimestamp(),
          });
        }

        navigate('/');
      }
    } catch (err) {
      setError('Error al iniciar sesión: ' + err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 dark:from-gray-900 dark:to-gray-950 transition-all">
      <div className="w-full max-w-md bg-white/90 dark:bg-gray-900/80 rounded-3xl shadow-2xl backdrop-blur-md p-8 border border-green-100 dark:border-green-800">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img 
            src={logo} 
            alt="RumiLeaf Logo" 
            className="w-20 h-20 mb-2 animate-[float_3s_ease-in-out_infinite]" 
          />
          <h1 className="text-3xl font-bold text-green-800 dark:text-green-100 tracking-tight">
            RumiLeaf
          </h1>
          <p className="text-sm text-green-600 dark:text-green-300">
            Análisis inteligente de plantas 🌿
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <p className="text-red-500 text-center text-sm bg-red-50 border border-red-200 p-2 rounded-md">
              {error}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-green-200 dark:border-green-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 dark:focus:ring-green-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 transition-all"
              placeholder="usuario@correo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-green-200 dark:border-green-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 dark:focus:ring-green-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl text-white font-semibold shadow-md transition-all ${
              loading
                ? 'bg-green-400 cursor-not-allowed'
                : 'bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
            }`}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Pie de página */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} RumiLeaf. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Animación flotante sutil */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
};

export default Login;

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, MessageSquare, Menu, Sun, Moon, User, Send, Loader2, Sparkles, CalendarDays, Clock } from 'lucide-react';
import logo from '../assets/rumileaf.png';
import Spline from '@splinetool/react-spline';
import '../styles/animations.css';
import Sidebar from '../components/Sidebar';

/*
Página: Consultas
- Chat IA con Gemini con fallback entre modelos y timeout (AbortController)
- UI: tema persistente, auto-scroll, warm-up del modelo y asistente 3D (Spline)
- Decisiones clave: limitar historial para reducir latencia; reintentos automáticos; formato semántico de mensajes para accesibilidad
*/

// --- Gemini Chat config ---
// Secuencia de modelos para fallback automático (del más capaz al más rápido)
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.5-pro'
];

// Se lee desde REACT_APP_GEMINI_API_KEY; si falta, usa valor por defecto (solo para desarrollo)
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'AIzaSyBkFlnHIv-rIPglK8tLgjUrcsftufuUmbI';

// Límite de historial para reducir payload y latencia
const MAX_HISTORY = 6;
// Timeout por request (ms) para hacer fallback rápido si un modelo tarda
const TIMEOUT_MS = 10000;

// Función mejorada que prueba múltiples modelos
// Envía el historial al endpoint Gemini y hace retry rotando modelos.
// history: array de mensajes [{ role, text }]
// modelIndex: índice del modelo a usar para el intento actual
// Devuelve: Promise<string> con la respuesta del modelo o lanza error si todos fallan
async function fetchGeminiChat(history, modelIndex = 0) {
  if (!GEMINI_API_KEY) {
    throw new Error('Falta configurar REACT_APP_GEMINI_API_KEY');
  }

  if (modelIndex >= GEMINI_MODELS.length) {
    throw new Error('No hay modelos disponibles que funcionen');
  }

  const currentModel = GEMINI_MODELS[modelIndex];
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent`;

  // Construye el payload 'contents' esperado por la API de Gemini a partir del historial (limitado)
  // Limitar historial reduce payload y latencia
  const recent = history.slice(-MAX_HISTORY);
  const contents = recent.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }]
  }));

  let controller;
  let timeoutId;
  try {
    controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: 256,
          temperature: 0.7
        }
      })
    });

    // Si falla el modelo actual, reintenta con el siguiente (fallback)
    if (!res.ok) {
      clearTimeout(timeoutId);
      console.warn(`Modelo ${currentModel} falló, probando siguiente...`);
      return await fetchGeminiChat(history, modelIndex + 1);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || 
                 data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!text) {
      throw new Error('No se recibió respuesta del modelo');
    }

    console.log(`✓ Usando modelo: ${currentModel}`);
    clearTimeout(timeoutId);
    return text;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    console.warn(`Error con modelo ${currentModel}:`, error.message);
    
    if (modelIndex < GEMINI_MODELS.length - 1) {
      return await fetchGeminiChat(history, modelIndex + 1);
    }
    throw error;
  }
}

// Utilidades UI
// Formatea fecha DD/MM/YYYY para mostrar en UI
// date: Date -> 'DD/MM/YYYY'
const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Formatea hora HH:MM:SS (24h)
// date: Date -> 'HH:MM:SS' (24h)
const formatTime = (date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

// Componente para formatear mensajes con mejor estructura
// Props: message (string), isUser (boolean) para estilo y estructura
// Estructura semántica: genera <ul>, <h4> o <p> según el contenido para mejorar legibilidad y accesibilidad
const MessageBubble = ({ message, isUser }) => {
  // Función para formatear el texto del bot con mejor estructura
  const formatBotMessage = (text) => {
    // Dividir en párrafos
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    const stripMd = (s) => s.replace(/\*\*/g, '').trim();

    return paragraphs.map((paragraph, idx) => {
      const lines = paragraph.split('\n').filter(l => l.trim() !== '');
      // Reconoce bullets '*' '-' o numerados '1.' al inicio de línea
      const bulletRe = /^\s*(?:[*-]|\d+\.)\s+/;
      const bulletCount = lines.filter(l => bulletRe.test(l)).length;

      // Tratar como lista cuando la mayoría de líneas son bullets o hay al menos 2
      if (bulletCount >= Math.max(2, Math.ceil(lines.length / 2))) {
        return (
          <ul key={idx} className="space-y-2 my-3">
            {lines.map((line, i) => {
              const content = bulletRe.test(line) ? line.replace(bulletRe, '') : line;
              const cleanItem = stripMd(content);
              if (!cleanItem) return null;
              return (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span className="flex-1">{cleanItem}</span>
                </li>
              );
            })}
          </ul>
        );
      }
      
      // Detectar títulos (línea única con mayúsculas o delimitada por **)
      if (lines.length === 1 && (lines[0] === lines[0].toUpperCase() || /^\s*\*\*.*\*\*\s*$/.test(lines[0]))) {
        const cleanTitle = stripMd(lines[0]);
        return (
          <h4 key={idx} className="font-semibold text-green-800 mt-3 mb-2">
            {cleanTitle}
          </h4>
        );
      }
      
      // Párrafo normal (sin marcas **)
      return (
        <p key={idx} className="mb-3 leading-relaxed">
          {stripMd(paragraph)}
        </p>
      );
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5 ml-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-base font-medium text-green-700 dark:text-green-300">Asistente RumiLeaf</span>
          </div>
        )}
        
        <div className={`rounded-2xl px-4 py-3 ${
          isUser 
            ? 'bg-gradient-to-br from-green-600 to-green-700 text-white rounded-br-md shadow-lg' 
            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-2 border-green-100 dark:border-green-800/50 rounded-bl-md shadow-sm'
        }`}>
          <div className="text-lg">
            {isUser ? message : formatBotMessage(message)}
          </div>
        </div>
        
        {isUser && (
          <div className="text-xs text-green-600 mt-1 mr-1 text-right">
            {formatTime(new Date())}
          </div>
        )}
      </div>
    </div>
  );
};

// Página de consultas con chat IA (Gemini) y panel lateral informativo
export default function Consultas() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const loggedUser = localStorage.getItem('rumileaf_user') || 'Usuario';
  const messagesEndRef = useRef(null);

  // Tema (claro/oscuro) persistente
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Estado del chatbot
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'model', 
      text: '¡Hola! Soy tu asistente especializado en RumiLeaf.\n\n¿En qué puedo ayudarte hoy?\n\n* Diagnosticar enfermedades en plantas\n* Identificar síntomas y causas\n* Recomendar tratamientos\n* Responder consultas sobre cuidado de plantas\n\nDescribe los síntomas que observas o pregúntame lo que necesites.' 
    }
  ]);

  // Auto-scroll al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reloj UI
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Warm-up para reducir latencia del primer mensaje
  useEffect(() => {
    fetchGeminiChat([{ role: 'user', text: 'ping' }]).catch(() => {});
  }, []);

  
  // Enviar mensaje al asistente
  const sendMessage = async () => {
    const input = chatInput.trim();
    if (!input) return;

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const replyText = await fetchGeminiChat([...messages, userMsg]);
      setMessages(prev => [...prev, { role: 'model', text: replyText }]);
    } catch (err) {
      console.error('Error al contactar Gemini:', err);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: '❌ Error de conexión\n\nNo pude conectar con el asistente. Por favor:\n\n* Verifica tu conexión a internet\n* Confirma que la API key sea válida\n* Intenta nuevamente en unos momentos' 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Sugerencias rápidas
  const quickSuggestions = [
    "¿Qué enfermedad tiene mi planta con manchas amarillas?",
    "¿Cómo tratar el mildiu?",
    "¿Por qué se caen las hojas?",
    "Síntomas de exceso de riego"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex w-screen overflow-x-hidden">
      {/* Sidebar fijo */}
      <div className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <Sidebar active="consultas" theme={theme} setTheme={setTheme} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      {/* Main Content */}
      <div id="main-content"
        className="flex flex-col min-h-screen transition-all duration-500 ease-in-out w-full overflow-y-auto"
        style={{ paddingLeft: sidebarOpen ? '18rem' : '5rem', transition: 'padding-left 0.5s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm border-b border-green-200/50 dark:border-green-700/50 shadow-sm">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                className="lg:hidden p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu size={24} className="text-green-700 dark:text-green-200" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-green-900 dark:text-green-100">Asistente Inteligente</h1>
                <p className="text-green-600 text-sm dark:text-green-300">Diagnóstico y recomendaciones personalizadas</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-gray-700 transition-colors"
                title="Cambiar tema"
              >
                {theme === 'light' ? <Moon size={20} className="text-green-700" /> : <Sun size={20} className="text-green-200" />}
              </button>

              <div className="hidden lg:block w-px h-8 bg-green-200 dark:bg-green-700/50"></div>

              <div className="group relative hidden lg:flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center ring-2 ring-green-200 dark:ring-green-700">
                  <User size={20} className="text-green-600 dark:text-green-300" />
                </div>
                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 shadow-lg border border-green-200 dark:border-green-700 rounded-lg px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  <p className="font-semibold text-sm text-green-700 dark:text-green-200 text-center">Administrador</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 px-4 py-2 rounded-lg">
                <CalendarDays size={16} className="text-green-600 dark:text-green-300" />
                <span className="text-sm font-medium">{formatDate(currentTime)}</span>
              </div>
              <div className="flex items-center space-x-2 bg-green-500 dark:bg-green-600 text-white px-4 py-2 rounded-lg">
                <Clock size={16} />
                <span className="text-sm font-semibold">{formatTime(currentTime)}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-[1920px] mx-auto">
            <div className="bg-white/90 dark:bg-gray-900/70 backdrop-blur-sm rounded-3xl shadow-2xl border border-green-200/50 dark:border-green-700/40 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-6 gap-0">
                {/* Chat Panel - Ocupa más espacio */}
                <div className="lg:col-span-5 flex flex-col h-[calc(100vh-12rem)]">
                  {/* Header del Chat */}
                  <div className="px-6 py-4 border-b border-green-100 dark:border-green-900/40 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
                        <Sparkles size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-green-800 dark:text-green-100">Chat con IA</p>
                        <p className="text-base text-green-600 dark:text-green-300">Gemini 2.5 - Respuestas en tiempo real</p>
                      </div>
                    </div>
                  </div>

                  {/* Mensajes */}
                  <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900">
                    {messages.map((m, idx) => (
                      <MessageBubble 
                        key={idx} 
                        message={m.text} 
                        isUser={m.role === 'user'} 
                      />
                    ))}
                    
                    {chatLoading && (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                          <Sparkles size={12} className="text-white" />
                        </div>
                        <div className="bg-white dark:bg-gray-800 border-2 border-green-100 dark:border-green-800/50 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Analizando y generando respuesta...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t border-green-100 dark:border-green-900/40 bg-white dark:bg-gray-900">
                    {messages.length <= 1 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {quickSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => setChatInput(suggestion)}
                            className="text-base px-3 py-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-200 rounded-full border border-green-200 dark:border-green-700 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <form
                      onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                      className="flex items-end gap-2"
                    >
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { 
                          if (e.key === 'Enter' && !e.shiftKey) { 
                            e.preventDefault(); 
                            sendMessage(); 
                          } 
                        }}
                        placeholder="Describe los síntomas de tu planta o hazme una consulta..."
                        className="flex-1 text-lg px-4 py-3 rounded-xl border-2 border-green-200 dark:border-green-700 focus:outline-none focus:border-green-400 dark:focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800/50 resize-none dark:bg-gray-800 dark:text-gray-100"
                        rows="2"
                        disabled={chatLoading}
                      />
                      <button
                        type="submit"
                        disabled={chatLoading || !chatInput.trim()}
                        className="p-3 rounded-xl bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
                        title="Enviar mensaje"
                      >
                        <Send size={20} />
                      </button>
                    </form>
                  </div>
                </div>

                {/* Panel de Información - Más compacto */}
                <div className="lg:col-span-1 bg-gradient-to-b from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-900 p-6 border-l border-green-200 dark:border-green-900/40">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-green-800 mb-3 flex items-center gap-2">
                        <span className="text-lg">💡</span>
                        Consejos Útiles
                      </h3>
                      <ul className="text-base text-green-700 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>Menciona edad y tipo de planta</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>Describe color y ubicación de síntomas</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>Incluye condiciones de riego y luz</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>Comenta cambios recientes</span>
                        </li>
                      </ul>
                    </div>

                    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-green-200 dark:border-green-900/40 shadow-sm">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-1">
                        <Sparkles size={12} />
                        IA Avanzada
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-200 leading-relaxed">
                        Usando los modelos más recientes de Gemini 2.5 para diagnósticos precisos y recomendaciones basadas en conocimiento actualizado.
                      </p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-gray-900 dark:to-gray-900 rounded-xl border border-green-200 dark:border-green-900/40">
                      <p className="text-sm font-semibold text-green-800 dark:text-green-100 mb-2">📸 ¿Tienes una foto?</p>
                      <p className="text-sm text-green-700 dark:text-green-200 leading-relaxed mb-2">
                        Para análisis visual, usa la función de diagnóstico por imagen en la pantalla de Inicio.
                      </p>
                      <button 
                        onClick={() => navigate('/')}
                        className="w-full text-xs px-3 py-2 bg-white dark:bg-gray-900 hover:bg-green-50 dark:hover:bg-green-900/40 text-green-700 dark:text-green-200 rounded-lg border border-green-300 dark:border-green-800 transition-colors"
                      >
                        Ir a Diagnóstico Visual
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>


      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
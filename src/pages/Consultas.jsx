import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, Sparkles, Leaf, Brain, MessageSquare, Image } from 'lucide-react';
import Panel from '../components/Panel';
import '../styles/animations.css';

/* 
Página: Consultas — RumiLeaf AI
Chat interactivo con IA (Gemini) — diseño limpio y moderno 🌱
*/

// --- Configuración de modelos Gemini ---
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.5-pro'
];

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'AIzaSyBkFlnHIv-rIPglK8tLgjUrcsftufuUmbI';
const MAX_HISTORY = 6;
const TIMEOUT_MS = 10000;

// --- Función para comunicación con Gemini ---
async function fetchGeminiChat(history, modelIndex = 0) {
  if (!GEMINI_API_KEY) throw new Error('Falta configurar REACT_APP_GEMINI_API_KEY');
  if (modelIndex >= GEMINI_MODELS.length) throw new Error('No hay modelos disponibles');

  const currentModel = GEMINI_MODELS[modelIndex];
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent`;

  const recent = history.slice(-MAX_HISTORY);
  const contents = recent.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }]
  }));

  let controller, timeoutId;
  try {
    controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: 256, temperature: 0.7 }
      })
    });

    if (!res.ok) {
      clearTimeout(timeoutId);
      console.warn(`Modelo ${currentModel} falló, probando siguiente...`);
      return await fetchGeminiChat(history, modelIndex + 1);
    }

    const data = await res.json();
    clearTimeout(timeoutId);
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    if (!text) throw new Error('Sin respuesta del modelo');
    console.log(`✓ Usando modelo: ${currentModel}`);
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

// --- Componente visual de burbujas de mensaje ---
const MessageBubble = ({ message, isUser }) => (
  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5`}>
    <div
      className={`max-w-[80%] px-5 py-3 rounded-2xl shadow-lg transition-all duration-200 ${
        isUser
          ? 'bg-gradient-to-br from-green-600 to-green-700 text-white rounded-br-md'
          : 'bg-white/90 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-green-100 dark:border-green-800/40 backdrop-blur-md rounded-bl-md'
      }`}
    >
      {!isUser && (
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <Brain size={14} className="text-white" />
          </div>
          <span className="font-semibold text-green-700 dark:text-green-300 text-sm">RumiLeaf AI</span>
        </div>
      )}
      <p className="leading-relaxed text-[15px] whitespace-pre-line">{message}</p>
    </div>
  </div>
);

export default function Consultas() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // --- Estados principales ---
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'model', 
      text: '🌿 ¡Hola! Soy **RumiLeaf AI**, tu asistente para diagnosticar y cuidar tus plantas.\n\nPuedes preguntarme sobre:\n\n• Enfermedades y plagas\n• Síntomas visibles\n• Fertilización y riego\n• Prevención de hongos y deficiencias nutricionales 🌱'
    }
  ]);

  useEffect(() => { fetchGeminiChat([{ role: 'user', text: 'ping' }]).catch(() => {}); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- Enviar mensaje ---
  const sendMessage = async () => {
    const input = chatInput.trim();
    if (!input) return;
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const reply = await fetchGeminiChat([...messages, userMsg]);
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: '❌ Error de conexión.\nVerifica tu red o la clave de API e intenta nuevamente.'
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- Sugerencias rápidas ---
  const suggestions = [
    "🌾 ¿Qué enfermedad causa manchas cafés?",
    "🍃 ¿Cómo tratar hojas amarillas?",
    "💧 ¿Por qué se pudren las raíces?",
    "☀️ ¿Qué hacer si mi planta se quema con el sol?"
  ];

  return (
    <>
      <Panel 
        pageTitle="Consultas con IA" 
        theme={theme} 
        setTheme={setTheme} 
        setSidebarOpen={() => {}} // No se necesita si Sidebar es global
      />

      {/* Contenido principal */}
      <main className="flex-1 mt-16 p-6 lg:p-10 bg-gradient-to-b from-green-50/40 to-emerald-50/30 dark:from-gray-900 dark:to-gray-950 transition-colors min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Cabecera */}
          <div className="flex items-center gap-4 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md p-5 rounded-2xl border border-green-200/50 dark:border-green-800/40 shadow-md">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
              <MessageSquare size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-green-900 dark:text-green-100">Chat Inteligente</h1>
              <p className="text-green-600 dark:text-green-300 text-sm">
                Diagnósticos en tiempo real con Gemini 2.5
              </p>
            </div>
          </div>

          {/* Chat */}
          <div className="bg-white/90 dark:bg-gray-900/70 backdrop-blur-sm border border-green-200/40 dark:border-green-800/40 rounded-3xl shadow-lg overflow-hidden flex flex-col h-[75vh]">
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-2 scrollbar-thin scrollbar-thumb-green-300/50 dark:scrollbar-thumb-green-700/50">
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m.text} isUser={m.role === 'user'} />
              ))}
              {chatLoading && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                    <Sparkles size={12} className="text-white" />
                  </div>
                  <div className="text-green-700 dark:text-green-300 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Analizando tu consulta...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Zona de entrada */}
            <div className="border-t border-green-100 dark:border-green-900/40 bg-white/80 dark:bg-gray-900/70 p-5">
              {messages.length <= 1 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setChatInput(s)}
                      className="px-3 py-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-800 dark:text-green-200 rounded-full border border-green-200 dark:border-green-800 text-sm transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-end gap-3">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Describe los síntomas de tu planta o haz una consulta..."
                  rows="2"
                  className="flex-1 text-base px-4 py-3 rounded-2xl border-2 border-green-200 dark:border-green-700 focus:border-green-400 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800/50 resize-none bg-white/90 dark:bg-gray-800 dark:text-gray-100 transition-all"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="p-4 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg transition-all disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </div>

          {/* Tarjetas informativas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-green-200 dark:border-green-800 shadow-sm">
              <h3 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                <Leaf size={18} /> Cuidado Preventivo
              </h3>
              <p className="text-green-700 dark:text-green-300 text-sm mt-2">
                Mantén tus plantas saludables observando síntomas tempranos y cuidando el riego y la luz. 
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-green-200 dark:border-green-800 shadow-sm">
              <h3 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                <Image size={18} /> Diagnóstico Visual
              </h3>
              <p className="text-green-700 dark:text-green-300 text-sm mt-2 mb-3">
                ¿Tienes una foto de la hoja afectada? Usa el detector visual en la pantalla de Inicio.
              </p>
              <button
                onClick={() => navigate('/')}
                className="w-full text-sm px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:opacity-90 transition-all"
              >
                Ir al Analizador de Imagen
              </button>
            </div>

            <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-green-200 dark:border-green-800 shadow-sm">
              <h3 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                <Brain size={18} /> IA Actualizada
              </h3>
              <p className="text-green-700 dark:text-green-300 text-sm mt-2">
                RumiLeaf AI usa Gemini 2.5, con conocimientos agrícolas recientes y soporte multilingüe.
              </p>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}

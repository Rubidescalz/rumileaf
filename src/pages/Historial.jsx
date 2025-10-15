import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { Clock, MessageSquare, Loader2, AlertCircle, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Panel from '../components/Panel';

const formatDate = (timestamp) => {
  if (!timestamp?.toDate) return 'Fecha desconocida';
  try {
    const date = timestamp.toDate();
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Fecha no válida';
  }
};

const Historial = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setError('Debes iniciar sesión para ver tu historial');
      setLoading(false);
      return;
    }

    try {
      const consultationsRef = collection(db, 'consultations');
      const q = query(
        consultationsRef,
        where('userEmail', '==', user.email),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            formattedDate: formatDate(doc.data().createdAt),
          }));
          setHistory(data);
          setLoading(false);
        },
        (err) => {
          console.error('Error cargando Firestore:', err);
          setError('Error al cargar datos: ' + err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error inicializando consulta:', err);
      setError('Error al inicializar: ' + err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const exportToExcel = () => {
    if (history.length === 0) return;
    const data = history.map((item) => ({
      Fecha: item.formattedDate,
      Tipo: item.sourceType || 'Desconocido',
      Diagnóstico: item.detections?.[0]?.className || 'No detectado',
      Confianza: item.detections?.[0]?.confidence ? `${item.detections[0].confidence}%` : 'N/A',
      Total: item.totalDetections || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    XLSX.writeFile(wb, 'Historial_RumiLeaf.xlsx');
  };

  const exportToPDF = () => {
    if (history.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18);
    doc.text('Historial de Consultas - RumiLeaf 🌿', 14, 15);

    const tableData = history.map((item) => [
      item.formattedDate,
      item.sourceType || 'Desconocido',
      item.detections?.[0]?.className || 'No detectado',
      item.detections?.[0]?.confidence ? `${item.detections[0].confidence}%` : 'N/A',
      item.totalDetections || 0,
    ]);

    doc.autoTable({
      head: [['Fecha', 'Fuente', 'Diagnóstico', 'Confianza', 'Total']],
      body: tableData,
      startY: 25,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [16, 122, 64] },
      alternateRowStyles: { fillColor: [235, 250, 235] },
    });

    doc.save('Historial_RumiLeaf.pdf');
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <Loader2 size={48} className="text-green-600 animate-spin" />
        <p className="text-gray-600">Cargando tu historial...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle size={48} className="text-red-500" />
        <p className="text-red-600 text-center">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <>
      <Panel 
        pageTitle="Historial de Consultas" 
        theme={theme} 
        setTheme={setTheme} 
        setSidebarOpen={setSidebarOpen} 
      />

      <main className="p-6 lg:p-10 mt-16 bg-gradient-to-b from-green-50/40 to-emerald-50/30 dark:from-gray-900 dark:to-gray-950 min-h-screen transition-colors">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-green-900 dark:text-green-100">
                Mi Historial
              </h1>
              <p className="text-green-700 dark:text-green-300 text-sm">
                Visualiza tus consultas y diagnósticos guardados por RumiLeaf 🌱
              </p>
            </div>

            {history.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md transition-all"
                >
                  <FileSpreadsheet size={18} />
                  Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-md transition-all"
                >
                  <FileText size={18} />
                  PDF
                </button>
              </div>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-800/70 rounded-2xl shadow-lg border border-green-200/50">
              <MessageSquare size={48} className="mx-auto text-green-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                No hay consultas registradas
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Cuando realices análisis con la cámara o imágenes, se mostrarán aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl shadow-md border border-green-200/40 dark:border-green-800/40 bg-white dark:bg-gray-900/70">
              <table className="w-full text-left border-collapse">
                <thead className="bg-green-100 dark:bg-green-800/60">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-green-900 dark:text-green-100">Fecha</th>
                    <th className="px-6 py-3 font-semibold text-green-900 dark:text-green-100">Fuente</th>
                    <th className="px-6 py-3 font-semibold text-green-900 dark:text-green-100">Diagnóstico</th>
                    <th className="px-6 py-3 font-semibold text-green-900 dark:text-green-100">Confianza</th>
                    <th className="px-6 py-3 font-semibold text-green-900 dark:text-green-100">Imagen</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`border-t border-green-100 dark:border-green-800/50 hover:bg-green-50/40 dark:hover:bg-gray-800/60 transition-colors ${
                        index % 2 === 0 ? 'bg-white/80 dark:bg-gray-900/70' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-gray-800 dark:text-gray-200">{item.formattedDate}</td>
                      <td className="px-6 py-4 text-green-700 dark:text-green-300 capitalize">
                        {item.sourceType || 'Desconocido'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {item.detections?.[0]?.className || 'No detectado'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {item.detections?.[0]?.confidence ? `${item.detections[0].confidence}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt="Consulta" 
                            className="w-14 h-14 object-cover rounded-lg border border-green-300 dark:border-green-800 shadow-sm hover:scale-110 transition-transform cursor-pointer" 
                          />
                        ) : (
                          <span className="text-gray-400 text-sm">Sin imagen</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default Historial;

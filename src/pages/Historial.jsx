import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { MessageSquare, Loader2, AlertCircle, FileSpreadsheet, FileText, Zap, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

    const consultationsRef = collection(db, 'consultations');
    const q = query(
      consultationsRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          formattedDate: formatDate(doc.data().createdAt),
        }));
        setHistory(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error Firestore:', err);
        setError('Error al cargar datos: ' + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    theme === 'dark' ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 📤 Exportar a Excel
  const exportToExcel = () => {
    if (history.length === 0) return;
    const data = history.map((item) => ({
      Fecha: item.formattedDate,
      Tipo: item.sourceType || 'Desconocido',
      Diagnóstico: item.detections?.[0]?.className || 'No detectado',
      Confianza: item.detections?.[0]?.confidence
        ? `${item.detections[0].confidence}%`
        : 'N/A',
      Total: item.totalDetections || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    XLSX.writeFile(wb, 'Historial_RumiLeaf.xlsx');
  };

  // 📄 Exportar a PDF
  const exportToPDF = () => {
    if (history.length === 0) return;
    const user = auth.currentUser;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18);
    doc.text('Historial de Consultas - RumiLeaf 🌿', 14, 15);
    if (user?.email) {
      doc.setFontSize(11);
      doc.text(`Usuario: ${user.email}`, 14, 23);
    }
    const tableData = history.map((item) => [
      item.formattedDate,
      item.sourceType || 'Desconocido',
      item.detections?.[0]?.className || 'No detectado',
      item.detections?.[0]?.confidence ? `${item.detections[0].confidence}%` : 'N/A',
      item.totalDetections || 0,
    ]);
    autoTable(doc, {
      head: [['Fecha', 'Fuente', 'Diagnóstico', 'Confianza', 'Total']],
      body: tableData,
      startY: 30,
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
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Encabezado */}
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

          {/* Listado como tarjetas */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {history.map((item) => {
                const confidence = item.detections?.[0]?.confidence || 0;
                const className = item.detections?.[0]?.className || 'No detectado';
                const color =
                  confidence >= 80
                    ? 'bg-green-500'
                    : confidence >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500';

                return (
                  <div
                    key={item.id}
                    className="group relative bg-white/90 dark:bg-gray-900/70 border border-green-200 dark:border-green-800 rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden"
                  >
                    {/* Borde decorativo */}
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-green-400 rounded-2xl transition-all"></div>

                    <div className="p-5 flex flex-col gap-3 relative z-10">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={14} /> {item.formattedDate}
                        </span>
                        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-lg capitalize">
                          {item.sourceType || 'Desconocido'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt="Consulta"
                            className="w-20 h-20 object-cover rounded-xl border border-green-200 dark:border-green-700 shadow"
                          />
                        ) : (
                          <div className="w-20 h-20 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-300 text-gray-500 text-xs">
                            Sin imagen
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                            {className}
                          </h3>
                          <div className="flex items-center mt-1 gap-2">
                            <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                              <div
                                className={`h-2 ${color} rounded-full transition-all`}
                                style={{ width: `${confidence}%` }}
                              ></div>
                            </div>
                            <span
                              className={`text-xs font-bold ${
                                confidence >= 80
                                  ? 'text-green-700'
                                  : confidence >= 50
                                  ? 'text-yellow-700'
                                  : 'text-red-700'
                              }`}
                            >
                              {confidence ? `${confidence}%` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {item.totalDetections || 0} detecciones registradas
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default Historial;

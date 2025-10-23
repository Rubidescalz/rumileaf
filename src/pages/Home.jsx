import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Image, Upload, Play, Square, AlertCircle, TrendingUp, Zap, CheckCircle, Loader2, Activity, BarChart3, Timer } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import '../styles/animations.css';
import Panel from '../components/Panel';


const MODEL_PATH = '/cafe_yolo_model_final_web_model/model.json';
let YOLO_MODEL_CACHE = null;
let YOLO_WARMED_UP = false;

const CLASS_NAMES = [
  'Deficiencia-Boro',
  'Deficiencia-Calcio',
  'Deficiencia-Fósforo',
  'Deficiencia-Hierro',
  'Deficiencia-Magnesio',
  'Deficiencia-Manganeso',
  'Deficiencia-Nitrógeno',
  'Deficiencia-Potasio',
  'Enfermedad-Antracnosis',
  'Enfermedad-Mancha de Hierro',
  'Enfermedad-Roya',
  'Plaga-Araña Roja',
  'Plaga-Minador',
  'Sanas'
];

const CLASS_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', // Deficiencias (colores cálidos/medios)
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B739', '#52B788', '#E63946', '#457B9D', // Enfermedades/Plagas (colores de advertencia)
  '#1D3557', '#06D6A0' // Sanas (verde)
];

const hexToRgba = (hex, alpha = 1) => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};


const CLASS_INFO = {
  'Deficiencia-Boro': {
    severity: 'Media',
    icon: '🧪',
    recommendation: 'Aplicar un fertilizante foliar con alto contenido de Boro. Monitorear los brotes nuevos.',
    description: 'Los síntomas incluyen brotes terminales muertos o deformados y hojas jóvenes gruesas o enrolladas.'
  },
  'Deficiencia-Calcio': {
    severity: 'Alta',
    icon: '🦴',
    recommendation: 'Ajustar el pH del suelo y aplicar Calcio soluble. Evitar la salinidad excesiva.',
    description: 'Se manifiesta como necrosis en los puntos de crecimiento y hojas jóvenes pequeñas y distorsionadas.'
  },
  'Deficiencia-Fósforo': {
    severity: 'Media',
    icon: '💡',
    recommendation: 'Usar fertilizantes ricos en Fósforo de liberación lenta. Mejorar la aireación del suelo.',
    description: 'Las hojas se vuelven de un color verde oscuro o morado, especialmente en el envés de las hojas viejas.'
  },
  'Deficiencia-Hierro': {
    severity: 'Baja',
    icon: '⚙️',
    recommendation: 'Aplicar quelatos de Hierro al suelo o foliarmente. Corregir suelos muy alcalinos.',
    description: 'Clorosis intervenal en las hojas más jóvenes, las nervaduras permanecen verdes.'
  },
  'Deficiencia-Magnesio': {
    severity: 'Media',
    icon: '✨',
    recommendation: 'Aplicar Sulfato de Magnesio (sal de Epsom) o Dolomita. Mejorar el drenaje.',
    description: 'Manchas amarillas que comienzan en el borde de las hojas más viejas y progresan hacia el centro (clorosis marginal).'
  },
  'Deficiencia-Manganeso': {
    severity: 'Baja',
    icon: '⚗️',
    recommendation: 'Aplicación foliar de Sulfato de Manganeso. Mantener el pH del suelo ligeramente ácido.',
    description: 'Clorosis reticular o intervenal similar al Hierro, pero a menudo en hojas un poco más maduras.'
  },
  'Deficiencia-Nitrógeno': {
    severity: 'Alta',
    icon: '💨',
    recommendation: 'Aplicación urgente de un fertilizante nitrogenado. Asegurar un riego adecuado.',
    description: 'Coloración verde pálido o amarillo generalizada (clorosis) en las hojas viejas, con crecimiento lento.'
  },
  'Deficiencia-Potasio': {
    severity: 'Alta',
    icon: '⚡',
    recommendation: 'Aplicar Cloruro o Sulfato de Potasio. Asegurar un balance adecuado con otros nutrientes.',
    description: 'Necrosis y quemaduras en los bordes y puntas de las hojas más viejas, a menudo con un color bronceado.'
  },
  'Enfermedad-Antracnosis': {
    severity: 'Alta',
    icon: '🍄',
    recommendation: 'Podar ramas afectadas. Aplicar fungicidas a base de cobre. Mejorar la ventilación.',
    description: 'Manchas negras o marrones hundidas en hojas, tallos y frutos. Puede causar caída de frutos.'
  },
  'Enfermedad-Mancha de Hierro': {
    severity: 'Media',
    icon: '🟠',
    recommendation: 'Fungicidas preventivos. Retirar y destruir las hojas muy afectadas. Reducir la humedad foliar.',
    description: 'Pequeñas manchas circulares de color rojizo u óxido en el envés de las hojas.'
  },
  'Enfermedad-Roya': {
    severity: 'Alta',
    icon: '🚨',
    recommendation: 'Aplicar fungicidas sistémicos. Utilizar variedades resistentes. Controlar malezas.',
    description: 'Pústulas polvorientas de color naranja brillante o amarillo en el envés de las hojas.'
  },
  'Plaga-Araña Roja': {
    severity: 'Media',
    icon: '🕷️',
    recommendation: 'Aplicar acaricidas específicos o aceites. Aumentar la humedad ambiental. Usar depredadores naturales.',
    description: 'Telarañas finas en el envés. Puntos amarillos o plateados en las hojas por la alimentación.'
  },
  'Plaga-Minador': {
    severity: 'Baja',
    icon: '🐛',
    recommendation: 'Retirar y destruir hojas afectadas. Aplicar insecticidas sistémicos en casos severos.',
    description: 'Túneles o galerías blancas y sinuosas creadas por las larvas dentro del tejido foliar.'
  },
  'Sanas': {
    severity: 'N/A',
    icon: '✅',
    recommendation: '¡Excelente! Mantén tu rutina de cuidado y monitoreo preventivo.',
    description: 'La hoja presenta un color y textura uniforme, sin signos visibles de estrés o daño.'
  }
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('camara');
  const [model, setModel] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true); // Inicia como true
  const [modelError, setModelError] = useState(null); // Nuevo estado para error de carga
  const [isDetecting, setIsDetecting] = useState(false);
  const [deteccionFinalizada, setDeteccionFinalizada] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detections, setDetections] = useState([]);
  const [analysisCount, setAnalysisCount] = useState(() => {
    const saved = localStorage.getItem('analysisCount');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [avgInferenceMs, setAvgInferenceMs] = useState(0);
  const [avgConfidence, setAvgConfidence] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const showToast = useCallback((message, type = 'info') => {

    if (toast) return;

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const saveAnalysis = useCallback(async (predictions, imageData, sourceType, inferenceTime) => {
    try {
      if (!auth.currentUser) {
        console.log('Usuario no autenticado, omitiendo guardado');
        return;
      }
  
      const processedDetections = predictions
        .map(det => {
          const className = CLASS_NAMES[det.class];
          if (!className || className === 'Sanas') return null;
          return {
            className,
            confidence: Number((det.confidence * 100).toFixed(1)),
            bbox: det.bbox.map(coord => Math.round(coord))
          };
        })
        .filter(Boolean);
  
      const analysisData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        sourceType,
        imageUrl: imageData, 
        detections: processedDetections,
        totalDetections: processedDetections.length,
        inferenceTimeMs: inferenceTime,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'consultations'), analysisData);
      showToast('Análisis guardado en tu historial', 'success');
    } catch (error) {
      console.error('Error guardando análisis:', error);
      showToast('Error al guardar análisis', 'error');
    }
  }, [showToast]);


  const loadModel = useCallback(async () => {
    try {
      if (YOLO_MODEL_CACHE) {
        setModel(YOLO_MODEL_CACHE);
        setIsModelLoading(false);
        setModelError(null);
        return;
      }
      setIsModelLoading(true);
      // Asegura backend acelerado por GPU y prepara el runtime
      await tf.ready();
      try { await tf.setBackend('webgl'); } catch {}
      await tf.ready();

      const loadedModel = await tf.loadGraphModel(MODEL_PATH);

      if (!YOLO_WARMED_UP) {
        const warmupInput = tf.zeros([1, 640, 640, 3]);
        try {
          const warm = loadedModel.executeAsync
            ? await loadedModel.executeAsync(warmupInput)
            : loadedModel.execute(warmupInput);
          if (Array.isArray(warm)) {
            warm.forEach(t => t && t.dispose && t.dispose());
          } else if (warm && warm.dispose) {
            warm.dispose();
          }
          YOLO_WARMED_UP = true;
        } catch {}
        warmupInput.dispose();
      }

      YOLO_MODEL_CACHE = loadedModel;
      setModel(loadedModel);
      setIsModelLoading(false);
      setModelError(null);
      console.log('Modelo YOLO cargado y calentado exitosamente');
    } catch (error) {
      console.error('Error cargando el modelo:', error);
      setIsModelLoading(false);
      setModelError('No se pudo cargar el modelo. Verifica la ruta en la carpeta /public.');
    }
  }, []);

  useEffect(() => {
    loadModel();
  }, [loadModel]);


  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStream(stream);
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      alert('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };


  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsDetecting(false);
      setDeteccionFinalizada(false);
      setDetections([]);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const preprocessImage = (source, modelWidth = 640, modelHeight = 640) => {
    return tf.tidy(() => {
      // Dibuja en un canvas temporal al tamaño del modelo para evitar redimensionado costoso en tensor
      const off = document.createElement('canvas');
      off.width = modelWidth;
      off.height = modelHeight;
      const ctx = off.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source, 0, 0, modelWidth, modelHeight);

      const imageTensor = tf.browser.fromPixels(off).toFloat().div(255.0).expandDims(0);
      return imageTensor;
    });
  };

  const processYOLOOutput = (output, imgWidth, imgHeight, confThreshold = 0.5, iouThreshold = 0.4) => {
    const detections = [];
    const boxes = [];
    const scores = [];
    const classIds = [];
    let outputData;
    if (output instanceof tf.Tensor) {
      outputData = output.dataSync();
    } else if (Array.isArray(output)) {
      outputData = output[0].dataSync();
    } else {
      throw new Error('Formato de salida de modelo no soportado');
    }
    const numDetections = 8400; 
    const numClasses = 14;

    for (let i = 0; i < numDetections; i++) {
      const x_center = outputData[i];
      const y_center = outputData[numDetections + i];
      const width = outputData[2 * numDetections + i];
      const height = outputData[3 * numDetections + i];
      
      let maxScore = 0;
      let maxClassId = 0;
      
      for (let c = 0; c < numClasses; c++) {
        const score = outputData[(4 + c) * numDetections + i];
        if (score > maxScore) {
          maxScore = score;
          maxClassId = c;
        }
      }
      
      if (maxScore > confThreshold) {
        const x1 = (x_center - width / 2) * imgWidth / 640;
        const y1 = (y_center - height / 2) * imgHeight / 640;
        const w = width * imgWidth / 640;
        const h = height * imgHeight / 640;
        
        boxes.push([x1, y1, w, h]); 
        scores.push(maxScore);
        classIds.push(maxClassId);
      }
    }
    
    if (boxes.length === 0) {
      return [];
    }
    const boxesTensor = tf.tensor2d(boxes.map(box => [box[1], box[0], box[1] + box[3], box[0] + box[2]]));
    const scoresTensor = tf.tensor1d(scores);
    const nms = tf.image.nonMaxSuppression(boxesTensor, scoresTensor, 50, iouThreshold, confThreshold);
    const indices = nms.dataSync();
    boxesTensor.dispose();
    scoresTensor.dispose();
    nms.dispose();
    
    indices.forEach(idx => {
      detections.push({
        class: classIds[idx],
        confidence: scores[idx],
        bbox: boxes[idx]
      });
    });
    
    return detections;
  };

  const runInference = async (source) => {
    if (!model) return [];
    
    try {
      const imgWidth = source.width || source.videoWidth;
      const imgHeight = source.height || source.videoHeight;
      
      const inputTensor = preprocessImage(source);
      const predictions = await model.executeAsync(inputTensor);
      
      inputTensor.dispose();
      
      const detections = processYOLOOutput(predictions, imgWidth, imgHeight);
      
      predictions.dispose();
      
      return detections;
    } catch (error) {
      console.error('Error en la inferencia:', error);
      return [];
    }
  };

  const drawDetections = (dets, source) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const imgWidth = source.width || source.videoWidth;
    const imgHeight = source.height || source.videoHeight;
    
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    
    ctx.drawImage(source, 0, 0, imgWidth, imgHeight);
    
    dets.forEach(det => {
      const [x, y, w, h] = det.bbox;
      const color = CLASS_COLORS[det.class];
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      
      const label = `${CLASS_NAMES[det.class]}`;
      ctx.font = '16px Arial';
      const textWidth = ctx.measureText(label).width;
      
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 30, textWidth + 10, 30);
      
      ctx.fillStyle = 'white';
      ctx.fillText(label, x + 5, y - 8);

      if (activeTab === 'camara') {
        const className = CLASS_NAMES[det.class];
        if (className !== 'Sanas') {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.clip();

          const now = performance.now();
          const bandHeight = Math.max(12, Math.min(24, h * 0.08));
          const scanY = y + ((now / 8) % (h + bandHeight)) - bandHeight;
          const grad = ctx.createLinearGradient(0, scanY, 0, scanY + bandHeight);
          grad.addColorStop(0, 'rgba(255,255,255,0)');
          grad.addColorStop(0.5, hexToRgba(CLASS_COLORS[det.class], 0.35));
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, w, h);

          ctx.strokeStyle = hexToRgba(CLASS_COLORS[det.class], 0.25);
          ctx.lineWidth = 1;
          const step = Math.max(8, Math.min(16, Math.floor(w * 0.05)));
          for (let gx = x; gx < x + w; gx += step) {
            ctx.beginPath();
            ctx.moveTo(gx, y);
            ctx.lineTo(gx, y + h);
            ctx.stroke();
          }
          ctx.restore();

          const labelText = className;
          ctx.font = '600 18px Arial';
          const padX = 8, padY = 6;
          const tw = ctx.measureText(labelText).width;
          const bx = x + (w - tw) / 2 - padX;
          const by = y + h - 28;
          const bw = tw + padX * 2;
          const bh = 22 + padY;
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = 'white';
          ctx.fillText(labelText, bx + padX, by + bh - padY - 4);
        }
      }
    });
  };

  const updateStats = useCallback((ms, preds) => {
    setAnalysisCount(prev => {
      const newCount = prev + 1;
      setAvgInferenceMs(prevAvg => {
        if (newCount === 1) return ms;
        return ((prevAvg * (newCount - 1)) + ms) / newCount;
      });
      const detAvg = preds.reduce((s, d) => s + d.confidence, 0) / preds.length;
      setAvgConfidence(prevAvg => {
        if (newCount === 1) return detAvg;
        return ((prevAvg * (newCount - 1)) + detAvg) / newCount;
      });
      localStorage.setItem('analysisCount', newCount.toString());
      return newCount;
    });
  }, []);


  const detectFrame = async () => {
    if (!model || !videoRef.current || !isDetecting || activeTab !== 'camara' || !cameraStream || deteccionFinalizada) {
      return;
    }

    const start = performance.now();
    const predictions = await runInference(videoRef.current);
    const ms = performance.now() - start;

    if (predictions.length > 0) {
      updateStats(ms, predictions);
      setDetections(predictions);
      drawDetections(predictions, videoRef.current);
      setDeteccionFinalizada(true);
      setIsDetecting(false);
      
      // Capturar el frame de video como base64 (imagen original sin anotaciones)
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoRef.current.videoWidth;
      tempCanvas.height = videoRef.current.videoHeight;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(videoRef.current, 0, 0);
      const imageDataUrl = tempCanvas.toDataURL('image/jpeg', 0.8); // JPEG con calidad 80% para optimizar tamaño
      
      await saveAnalysis(predictions, imageDataUrl, 'camara', ms);
      return;
    }

    if (predictions.length === 0) {
      showToast('¡Ups! No pudimos identificar ninguna hoja ni plaga en esta toma. Intenta acercar la hoja, enfocar bien y asegúrate de tener buena luz. ¡Tú puedes lograrlo! 🌱✨', 'warning');
    }

    if (isDetecting && activeTab === 'camara' && cameraStream) {
      requestAnimationFrame(detectFrame);
    }
  };


  useEffect(() => {
    if (isDetecting && activeTab === 'camara') {
      detectFrame();
    }

  }, [isDetecting, activeTab]);


  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
        setDetections([]); 
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!model || !imageRef.current) {
      alert('El modelo no está cargado o no hay imagen.');
      return;
    }
    setIsAnalyzing(true);

    try {
      await new Promise(resolve => {
        if (imageRef.current.complete) {
          resolve();
        } else {
          imageRef.current.onload = resolve;
        }
      });

      const start = performance.now();
      const predictions = await runInference(imageRef.current);
      const ms = performance.now() - start;

      if (predictions.length > 0) {
        updateStats(ms, predictions);
      }

      setDetections(predictions);
      drawDetections(predictions, imageRef.current);

      await saveAnalysis(predictions, uploadedImage, 'imagen', ms);

      const names = predictions.map(d => CLASS_NAMES[d.class]).filter(Boolean);
      const diseaseNames = names.filter(n => n !== 'Sanas');
      if (predictions.length === 0 || names.length === 0) {
        showToast('No se pudo identificar ninguna enfermedad o plaga. Intenta otra toma con mejor iluminación.', 'warning');
      } else if (diseaseNames.length === 0) {
        showToast('No se identificaron enfermedades ni plagas en la hoja.', 'info');
      }
    } catch (e) {
      console.error('Error analizando imagen:', e);
      alert('Ocurrió un error durante el análisis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'camara') {
      stopCamera();
      setIsDetecting(false);
      if (canvasRef.current && !uploadedImage) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    return () => {
      stopCamera();
      setIsDetecting(false);
    };
  }, [activeTab]);


  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };


  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };


  const handleNavigateConsultas = () => {
    navigate('/consultas');
  };


  const DetectionResults = () => {
    if (detections.length === 0) {
      return (
        <div className="bg-white rounded-xl p-6 border border-green-200 text-center">
          <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
          <h3 className="font-bold text-lg text-green-800">Análisis Limpio</h3>
          <p className="text-sm text-gray-600">No se detectaron problemas en la toma actual.</p>
        </div>
      );
    }


    const validNames = detections
      .map(d => CLASS_NAMES[d.class])
      .filter(Boolean);

    if (detections.length > 0 && validNames.length === 0) {
      return (
        <div className="bg-white rounded-xl p-6 border border-yellow-200 text-center">
          <AlertCircle size={32} className="text-yellow-600 mx-auto mb-3" />
          <h3 className="font-bold text-lg text-yellow-800">No se pudo identificar el tipo de plaga/enfermedad</h3>
          <p className="text-sm text-gray-600">Intenta con otra toma: mejora el enfoque, la iluminación y evita reflejos o sombras fuertes.</p>
        </div>
      );
    }

    const classCounts = validNames.reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    const classesSorted = Object.keys(classCounts).sort((a, b) => classCounts[b] - classCounts[a]);
    const diseaseClasses = classesSorted.filter(c => c !== 'Sanas');

    const maxClass = classesSorted[0] || 'Sanas';
    const mainDetection = classCounts[maxClass] ? {
      className: maxClass,
      count: classCounts[maxClass],
      info: CLASS_INFO[maxClass]
    } : null;

    const isHealthy = maxClass === 'Sanas';
    const isMulti = diseaseClasses.length >= 2;
    const topClasses = diseaseClasses.slice(0, 3);

    const mainIcon = isHealthy ? <CheckCircle size={32} /> : <AlertCircle size={32} />;
    const mainColor = isHealthy ? 'text-green-600' : 'text-red-600';
    const mainBg = isHealthy ? 'bg-green-50' : (isMulti ? 'bg-amber-50' : 'bg-red-50');

    return (
      <div className="mt-4 bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-green-200/50 overflow-hidden">
        <div className="p-6 lg:p-8">
        <h3 className="font-bold text-xl text-green-800 mb-4 flex items-center space-x-2 border-b pb-2">
            <TrendingUp size={20} className="text-green-600" />
            <span>Resultados del Análisis</span>
        </h3>

        {/* Resumen Principal */}
        <div className={`flex items-start p-4 rounded-xl shadow-md ${mainBg} border-l-4 ${isHealthy ? 'border-green-500' : isMulti ? 'border-amber-500' : 'border-red-500'} mb-4`}>
          <div className={`p-2 rounded-full ${mainColor} mr-3`}>
            {mainIcon}
          </div>
          <div className="flex-1">
            {isHealthy ? (
              <>
                <h4 className="font-extrabold text-lg text-gray-800">Diagnóstico General: SANAS</h4>
                <p className="text-sm text-gray-600">{CLASS_INFO['Sanas'].description}</p>
              </>
            ) : isMulti ? (
              <>
                <h4 className="font-extrabold text-lg text-gray-800">Diagnóstico Múltiple</h4>
                <p className="text-sm text-gray-600">Se detectaron varias condiciones en la misma hoja.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {topClasses.map(name => {
                    const idx = CLASS_NAMES.indexOf(name);
                    const color = CLASS_COLORS[idx] || '#16a34a';
                    const info = CLASS_INFO[name] || {};
                    return (
                      <span key={name} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm text-sm font-semibold" style={{ color, borderColor: color }}>
                        <span role="img" aria-label={name}>{info.icon || '❗'}</span>
                        {name}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-3 p-2 bg-white rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Recomendaciones principales</p>
                  <ul className="list-disc ml-5 text-sm text-gray-800 space-y-1">
                    {topClasses.map(name => (
                      <li key={`rec-${name}`}><span className="font-semibold" style={{ color: CLASS_COLORS[CLASS_NAMES.indexOf(name)] || '#0f766e' }}>{name}:</span> {CLASS_INFO[name]?.recommendation || 'Revisión técnica recomendada.'}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <>
                <h4 className="font-extrabold text-lg text-gray-800">{`Diagnóstico Principal: ${mainDetection.className}`}</h4>
                <p className="text-sm text-gray-600">{CLASS_INFO[mainDetection.className].description}</p>
                <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700">Severidad: <span className="font-bold text-red-700">{mainDetection.info.severity}</span></p>
                  <p className="text-sm font-medium text-gray-800 mt-1 flex items-start">
                    <Zap size={16} className="text-blue-500 mr-2 flex-shrink-0" />
                    <span className="font-bold text-blue-800">Recomendación:</span> {mainDetection.info.recommendation}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Detecciones Detalladas */}
        <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
            <h4 className="font-bold text-green-700 mb-3 border-b pb-2">Detalle de Identificaciones ({detections.length} Total)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Object.entries(classCounts).map(([className, count]) => {
                const classIndex = CLASS_NAMES.indexOf(className);
                const color = CLASS_COLORS[classIndex] || '#999';
                const info = CLASS_INFO[className] || {};

                const pct = Math.round((count / detections.length) * 100);

                return (
                    <div key={className} className="flex items-center justify-between px-4 py-3 rounded-2xl border bg-white shadow-sm" style={{ borderColor: `${color}20` }}>
                        <div className="flex items-center space-x-3">
                            <span className="text-lg" role="img" aria-label={className}>{info.icon || '❓'}</span>
                            <div>
                                <span className="font-semibold" style={{ color: color }}>
                                    {className}
                                </span>
                                <div className="mt-2 w-32 h-1.5 rounded-full bg-gray-100">
                                  <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border" style={{ color: color, borderColor: color }}>
                              {count} {count > 1 ? 'veces' : 'vez'}
                            </span>
                            <div className="text-[10px] text-gray-400 mt-1">{pct}%</div>
                        </div>
                    </div>
                );
            })}
            </div>
        </div>
      </div>
    </div>
    );
  };

  const handleContinueAnalysis = () => {
    setDeteccionFinalizada(false);
    setIsDetecting(true);
    setDetections([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  return (
    <>
      <main className="flex-1 p-6 lg:p-8">
        <Panel 
          pageTitle="Diagnóstico por Imagen"
          theme={theme}
          setTheme={setTheme}
          setSidebarOpen={setSidebarOpen}
        />
        <div className="w-full max-w-none">
          <div className="bg-white/90 dark:bg-gray-900/70 backdrop-blur-sm rounded-3xl shadow-xl border border-green-200/50 dark:border-green-700/40 overflow-hidden">
            <div className="p-8 lg:p-12">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Display Area */}
                <div className="xl:col-span-2">
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl h-[540px] lg:h-[640px] flex items-center justify-center border-2 border-green-300/60 ring-1 ring-green-200/40 shadow-2xl relative overflow-hidden">
                    {activeTab === 'camara' ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <canvas
                          ref={canvasRef}
                          className="absolute inset-0 w-full h-full pointer-events-none"
                        />
                        {!cameraStream && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                            <div className="text-center text-white">
                              <Camera size={64} className="mx-auto mb-4" />
                              <p className="text-xl font-semibold">Cámara Desactivada</p>
                              <p className="text-sm mt-2 text-gray-300">Activa la detección para iniciar.</p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full relative">
                        {uploadedImage ? (
                          <>
                            <img
                              ref={imageRef}
                              src={uploadedImage}
                              alt="Uploaded"
                              className="object-contain max-h-full max-w-full absolute inset-0 m-auto"
                              style={{ display: 'none' }} 
                              onLoad={() => {
                                if (canvasRef.current && imageRef.current) {
                                  const { naturalWidth, naturalHeight } = imageRef.current;
                                  const canvas = canvasRef.current;
                                  const container = canvas.parentNode;
                                  const containerWidth = container.clientWidth;
                                  const containerHeight = container.clientHeight;
                                  let displayWidth, displayHeight;
                                  const ratio = naturalWidth / naturalHeight;

                                  if (containerWidth / containerHeight > ratio) {
                                      displayHeight = containerHeight;
                                      displayWidth = containerHeight * ratio;
                                  } else {
                                      displayWidth = containerWidth;
                                      displayHeight = containerWidth / ratio;
                                  }

                                  canvas.width = naturalWidth;
                                  canvas.height = naturalHeight;
                                  canvas.style.width = `${displayWidth}px`;
                                  canvas.style.height = `${displayHeight}px`;

                                  const ctx = canvas.getContext('2d');
                                  ctx.drawImage(imageRef.current, 0, 0); 
                                }
                              }}
                            />
                            {/* Canvas ajustado para mostrar la imagen con las detecciones */}
                            <canvas
                              ref={canvasRef}
                              className="object-contain absolute inset-0 m-auto rounded-xl shadow-2xl ring-1 ring-black/10"
                            />
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center p-8">
                            <div className="w-full max-w-2xl rounded-2xl border-2 border-dashed border-green-300/60 bg-white/5 backdrop-blur-sm p-8 text-center shadow-lg">
                              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center ring-2 ring-green-400/40">
                                <Image size={28} className="text-green-200" />
                              </div>
                              <p className="text-2xl font-semibold text-green-100">Sube una imagen para analizar</p>
                              <p className="mt-2 text-sm text-green-100/80">Formatos soportados: JPG, PNG. Procura buena iluminación.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls Panel */}
                <div className="xl:col-span-1">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200/50 shadow-inner h-full">
                    <h3 className="text-lg font-bold text-green-800 mb-6">Controles y Estado</h3>
                    
                    {/* Mode Selection */}
                    <div className="space-y-4 mb-8">
                      <label className="block text-sm font-medium text-green-700 mb-3">
                        Modo de Operación
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setActiveTab('camara')}
                          className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                            activeTab === 'camara'
                              ? 'bg-green-600 text-white shadow-lg transform scale-105'
                              : 'bg-white text-green-700 hover:bg-green-100 border border-green-300'
                          }`}
                        >
                          <Camera size={20} />
                          <span>Cámara</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('imagen')}
                          className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                            activeTab === 'imagen'
                              ? 'bg-green-600 text-white shadow-lg transform scale-105'
                              : 'bg-white text-green-700 hover:bg-green-100 border border-green-300'
                          }`}
                        >
                          <Image size={20} />
                          <span>Imagen</span>
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {activeTab === 'camara' ? (
                        <>
                          {/* Botón para activar/desactivar cámara */}
                          <button
                            onClick={async () => {
                              if (cameraStream) {
                                stopCamera();
                              } else {
                                await startCamera();
                              }
                            }}
                            className={`w-full ${cameraStream ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2`}
                          >
                            {cameraStream ? (
                              <>
                                <Square size={20} />
                                <span>Desactivar Cámara</span>
                              </>
                            ) : (
                              <>
                                <Play size={20} />
                                <span>Activar Cámara</span>
                              </>
                            )}
                          </button>

                          {/* Botón para iniciar/detener detección */}
                          <button
                            onClick={() => {
                              if (!model) {
                                alert('Esperando la carga del modelo...');
                                return;
                              }
                              setDeteccionFinalizada(false);
                              setIsDetecting(!isDetecting);
                            }}
                            disabled={!cameraStream || !model || isModelLoading || deteccionFinalizada}
                            className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center space-x-2"
                          >
                            {isDetecting ? (
                              <>
                                <Square size={20} />
                                <span>Detener Detección</span>
                              </>
                            ) : (
                              <>
                                <Play size={20} />
                                <span>Iniciar Detección</span>
                              </>
                            )}
                          </button>

                          {/* Botón para continuar análisis */}
                          {deteccionFinalizada && (
                            <button
                              onClick={handleContinueAnalysis}
                              className="w-full mt-3 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                            >
                              <Play size={20} />
                              <span>Continuar Análisis</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                          >
                            <Upload size={20} />
                            <span>Subir Imagen</span>
                          </button>
                          {uploadedImage && (
                            <button
                              onClick={analyzeImage}
                              disabled={!model || isModelLoading || isAnalyzing}
                              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 inline-flex items-center justify-center space-x-2"
                            >
                              {isAnalyzing ? (
                                <>
                                  <Loader2 size={18} className="animate-spin" />
                                  <span>Analizando...</span>
                                </>
                              ) : (
                                <span>Analizar Imagen</span>
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Status / Diagnosis oculto: bloque eliminado completamente */}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {detections.length > 0 && (
            <div className="mt-8">
              <DetectionResults />
            </div>
          )}
          {/* Se eliminó la sección redundante de "Resultado Detectado/Listado" para evitar ruido visual. */}

          {/* Stats Cards (Dinámicas) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {/* Análisis Realizados */}
            <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-white to-green-50 border border-green-200/60 shadow-lg">
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-green-200/40 rounded-full blur-2xl"></div>
              <div className="flex items-center space-x-4 relative">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shadow-inner border border-green-200">
                  <Activity size={24} className="text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">Análisis Realizados</p>
                  <p className="text-3xl font-extrabold text-green-700 tracking-tight">{analysisCount.toLocaleString('es-ES')}</p>
                  <p className="text-xs text-green-700/70">Total desde inicio</p>
                </div>
              </div>
            </div>

            {/* Confianza Promedio */}
            <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-white to-green-50 border border-green-200/60 shadow-lg">
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-200/40 rounded-full blur-2xl"></div>
              <div className="flex items-center space-x-4 relative">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shadow-inner border border-emerald-200">
                  <BarChart3 size={24} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">Confianza Promedio</p>
                  <p className="text-3xl font-extrabold text-emerald-700 tracking-tight">{analysisCount > 0 ? `${(avgConfidence * 100).toFixed(1)}%` : '--'}</p>
                  <p className="text-xs text-emerald-700/70">Basado en detecciones</p>
                </div>
              </div>
            </div>

            {/* Tiempo medio de Inferencia */}
            <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-white to-green-50 border border-green-200/60 shadow-lg">
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-teal-200/40 rounded-full blur-2xl"></div>
              <div className="flex items-center space-x-4 relative">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center shadow-inner border border-teal-200">
                  <Timer size={24} className="text-teal-700" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">Tiempo Medio de Inferencia</p>
                  <p className="text-3xl font-extrabold text-teal-700 tracking-tight">{analysisCount > 0 ? `${Math.round(avgInferenceMs)}ms` : '--'}</p>
                  <p className="text-xs text-teal-700/70">Promedio por análisis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {toast && (
        <div className="fixed top-6 right-6 z-[60]">
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border ${
            toast.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-900' :
            toast.type === 'error' ? 'bg-red-50 border-red-300 text-red-900' :
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
            'bg-green-50 border-green-300 text-green-900'
          }`}>
            <div className="mt-0.5">
              {toast.type === 'warning' ? <AlertCircle size={18} className="text-amber-600" /> :
               toast.type === 'error' ? <AlertCircle size={18} className="text-red-600" /> :
               <CheckCircle size={18} className="text-emerald-600" />
              }
            </div>
            <div className="text-sm font-medium">{toast.message}</div>
            <button onClick={() => setToast(null)} className="ml-2 text-xs underline opacity-70 hover:opacity-100">Cerrar</button>
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-teal-900/40 backdrop-blur-sm"></div>
          <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-400/20 blur-3xl"></div>
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-green-500/20 blur-3xl"></div>
          <div role="dialog" aria-modal="true" className="relative w-full max-w-md mx-4">
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-green-200">
              <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30 shadow">
                      <Loader2 className="animate-spin text-white" size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold">Analizando imagen</h3>
                      <p className="text-xs text-green-100/90">Optimizando, ejecutando modelo y preparando resultados</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/20 text-white ring-1 ring-white/30">RumiLeaf AI</span>
                </div>
              </div>
              <div className="bg-white p-6">
                <div className="w-full h-2 rounded-full bg-green-100 overflow-hidden">
                  <div className="h-full w-1/2 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 animate-pulse rounded-full"></div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-[11px]">
                  <div className="px-3 py-2 rounded-lg border bg-white shadow-sm flex items-center justify-center space-x-2">
                    <Activity className="text-emerald-600" size={14} />
                    <span className="font-semibold text-gray-700">Preparando</span>
                  </div>
                  <div className="px-3 py-2 rounded-lg border bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 ring-2 ring-emerald-200/50 flex items-center justify-center space-x-2">
                    <BarChart3 className="text-emerald-700" size={14} />
                    <span className="font-bold text-emerald-800">Inferencia</span>
                  </div>
                  <div className="px-3 py-2 rounded-lg border bg-white shadow-sm flex items-center justify-center space-x-2">
                    <Timer className="text-teal-700" size={14} />
                    <span className="font-semibold text-gray-700">Post-proceso</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-green-100 bg-green-50/80 p-3">
                  <p className="text-[12px] text-green-800">
                    Consejo: obtendrás mejores resultados con hojas enfocadas y bien iluminadas. Evita sombras fuertes y movimientos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
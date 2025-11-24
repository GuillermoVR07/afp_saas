// frontend3/src/pages/reportes/ActivosReport.jsx
import React, { useState, useEffect, useRef} from 'react';
import { motion } from 'framer-motion';
import { FileText, FileDown, Loader, Filter, X, Mic } from 'lucide-react';
import { getReportePorQuery, downloadReportePorQuery } from '../../api/dataService';
import { useNotification } from '../../context/NotificacionContext';

// --- Componente de Píldora de Filtro ---
const FilterTag = ({ text, onRemove }) => (
    <div className="flex items-center gap-1.5 bg-accent bg-opacity-20 text-primary font-medium px-3 py-1 rounded-full animate-in fade-in">
        <span>{text}</span>
        <button onClick={onRemove} className="p-0.5 rounded-full hover:bg-accent hover:text-white">
            <X size={14} />
        </button>
    </div>
);

// --- Componente Principal de Reportes ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasSpeechRecognition = !!SpeechRecognition;
export default function ActivosReport() {
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingExport, setLoadingExport] = useState(false);
    
    const [queryInput, setQueryInput] = useState('');
    const [filters, setFilters] = useState([]);
    const [isListening, setIsListening] = useState(false);

    const [resultados, setResultados] = useState(null);
    const { showNotification } = useNotification();
    const recognitionRef = useRef(null);

    const handleQuerySubmit = (e) => {
        e.preventDefault();
        const newQuery = queryInput.trim();
        if (newQuery && !filters.includes(newQuery)) {
            setFilters([...filters, newQuery]);
            setQueryInput('');
        }
    };

    const removeFilter = (filterToRemove) => {
        setFilters(filters.filter(f => f !== filterToRemove));
    };
    
    const handleGenerarReporte = async () => {
        if (filters.length === 0) {
            showNotification('Añade al menos un filtro para generar el reporte', 'error');
            return;
        }
        setLoadingPreview(true);
        setResultados(null);
        try {
            const data = await getReportePorQuery({ filters });
            setResultados(data || []);
            if (!data || data.length === 0) {
                showNotification('No se encontraron resultados con esos filtros');
            }
        } catch (error) {
            console.error("Error al generar reporte:", error.response?.data || error.message);
            showNotification(error.response?.data?.detail || 'Error al generar el reporte', 'error');
            setResultados([]);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleExportar = async (format) => {
        if (!resultados || resultados.length === 0) {
            showNotification('Primero genera una vista previa con resultados.', 'error');
            return;
        }
        setLoadingExport(true);
        try {
            await downloadReportePorQuery({ filters, format });
        } catch (error) {
            console.error("Error al exportar:", error);
            showNotification(error.response?.data?.detail || 'Error al exportar el reporte', 'error');
        } finally {
            setLoadingExport(false);
        }
    };

    const startListening = () => {
        if (isListening || !hasSpeechRecognition) return;

        console.log("Iniciando reconocimiento de voz...");
        setIsListening(true);

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognitionRef.current = recognition;

        recognition.onresult = (event) => {
            let transcript = event.results[0][0].transcript;
            console.log("Voz reconocida:", transcript);
            
            transcript = transcript.replace(/[.,!?;]+$/, "").trim();
            console.log("Voz reconocida (limpia):", transcript);

            const words = transcript.toLowerCase().split(" ").filter(Boolean);
            const processedFilters = [];
            let i = 0;
            while (i < words.length) {
                const word = words[i];
                const nextWord = words[i + 1];
                const nextNextWord = words[i + 2];

                if ((word === "depto" || word === "departamento") && nextWord) {
                    processedFilters.push(`depto:${nextWord}`);
                    i += 2;
                } else if ((word === "categoría" || word === "categoria") && nextWord) {
                    processedFilters.push(`categoria:${nextWord}`);
                    i += 2;
                } else if ((word === "ubicación" || word === "ubicacion") && nextWord) {
                    processedFilters.push(`ubicacion:${nextWord}`);
                    i += 2;
                } else if (word === "valor" && (nextWord === "mayor" || nextWord === ">") && nextNextWord === "a" && words[i+3]) {
                     processedFilters.push(`valor>${words[i+3]}`);
                     i += 4;
                } else if (word === "valor" && (nextWord === "menor" || nextWord === "<") && nextNextWord === "a" && words[i+3]) {
                     processedFilters.push(`valor<${words[i+3]}`);
                     i += 4;
                } else if (word === "valor" && (nextWord === "=" || nextWord === "igual") && nextNextWord === "a" && words[i+3]) {
                    processedFilters.push(`valor=${words[i+3]}`);
                    i += 4;
                } else if (word !== "mostrar" && word !== "activos" && word !== "a") {
                    processedFilters.push(word);
                    i += 1;
                } else {
                     i += 1;
                }
            }
            console.log("Filtros procesados:", processedFilters);
            setFilters(prevFilters => {
                const newFilters = processedFilters.filter(f => f && !prevFilters.includes(f));
                return [...prevFilters, ...newFilters];
            });

            setQueryInput("");
        };

        recognition.onerror = (event) => {
            console.error("Error de reconocimiento de voz:", event.error);
            if (event.error === 'no-speech') {
                showNotification('No se detectó voz. Inténtalo de nuevo.', 'error');
            } else {
                showNotification('Error al procesar la voz.', 'error');
            }
        };

        recognition.onend = () => {
            console.log("Reconocimiento de voz detenido.");
            setIsListening(false);
        };

        recognition.start();
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-primary mb-2">Reportes de Activos Fijos</h1>
                <p className="text-secondary">Genera reportes filtrados de los activos fijos.</p>
            </div>
            
            {/* Panel de Filtros Inteligentes */}
            <div className="bg-secondary border border-theme rounded-xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2"><Filter size={20} /> Opciones de Reporte</h2>
                
                {/* Input de Búsqueda */}
                <form onSubmit={handleQuerySubmit} className="flex gap-2 mb-4">
                    <input 
                        type="text"
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                        placeholder='Escribe un filtro y presiona Enter (ej: "laptop", "depto: TI", "valor>500")'
                        className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        data-tour="filtro-input"
                    />
                    <button 
                        type="button" 
                        onClick={startListening}
                        disabled={!hasSpeechRecognition || isListening}
                        title={hasSpeechRecognition ? "Grabar comando de voz" : "Reconocimiento de voz no disponible"}
                        className={`p-3 rounded-lg transition-colors
                            ${isListening 
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-tertiary text-primary hover:text-accent'
                            } 
                            disabled:opacity-50 disabled:cursor-not-allowed`}
                        data-tour="grabar-voz-btn"
                    >
                        <Mic size={20} />
                    </button>
                    <button type="submit" className="p-3 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-90">
                        Añadir
                    </button>
                </form>

                {/* Píldoras de Filtro */}
                <div className="flex flex-wrap gap-2 mb-6 min-h-[38px]" data-tour="filtros-activos">
                    {filters.map((filter, index) => (
                        <FilterTag key={index} text={filter} onRemove={() => removeFilter(filter)} />
                    ))}
                    {filters.length > 0 && (
                        <button 
                            onClick={() => setFilters([])} 
                            className="text-sm text-secondary hover:text-red-500 underline"
                        >
                            Limpiar todo
                        </button>
                    )}
                </div>

                {/* Botón de Generar */}
                <button 
                    onClick={handleGenerarReporte} 
                    disabled={loadingPreview || filters.length === 0}
                    className="flex items-center justify-center gap-2 w-full md:w-auto bg-accent text-white font-semibold px-6 py-3 rounded-lg hover:bg-opacity-90 transition-transform active:scale-95 disabled:opacity-50"
                    data-tour="generar-preview-btn"
                >
                    {loadingPreview ? <Loader className="animate-spin" /> : <FileText size={20} />}
                    Generar Vista Previa
                </button>
            </div>

            {/* Panel de Resultados */}
            {resultados !== null && (
                <div className="bg-secondary border border-theme rounded-xl p-6 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h2 className="text-xl font-semibold text-primary">Resultados ({resultados.length})</h2>
                        {resultados.length > 0 && (
                            <div className="flex gap-3" data-tour="exportar-reporte-btn">
                                <button onClick={() => handleExportar('pdf')} disabled={loadingExport} className="flex items-center gap-2 text-sm bg-tertiary text-primary px-4 py-2 rounded-lg hover:bg-opacity-80 disabled:opacity-50">
                                    {loadingExport ? <Loader className="animate-spin w-4 h-4" /> : <FileDown size={16} />} PDF
                                </button>
                                <button onClick={() => handleExportar('excel')} disabled={loadingExport} className="flex items-center gap-2 text-sm bg-tertiary text-primary px-4 py-2 rounded-lg hover:bg-opacity-80 disabled:opacity-50">
                                    {loadingExport ? <Loader className="animate-spin w-4 h-4" /> : <FileDown size={16} />} Excel
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {resultados.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-theme">
                                    <tr className="text-secondary text-sm">
                                        <th className="py-2 pr-4">Nombre</th>
                                        <th className="py-2 px-4">Departamento</th>
                                        <th className="py-2 px-4">Ubicación</th>
                                        <th className="py-2 pl-4 text-right">Valor (Bs.)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resultados.map(activo => (
                                        <tr key={activo.id} className="border-b border-theme last:border-b-0">
                                            <td className="py-3 pr-4 text-primary font-medium">{activo.nombre}</td>
                                            <td className="py-3 px-4 text-secondary">{activo.departamento__nombre || 'N/A'}</td> 
                                            <td className="py-3 px-4 text-secondary">{activo.ubicacion__nombre || 'N/A'}</td>
                                            <td className="py-3 pl-4 text-primary text-right font-mono">{parseFloat(activo.valor_actual).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     ) : (
                         <p className="text-center text-tertiary py-8">No se encontraron activos con los filtros seleccionados.</p>
                     )}
                </div>
            )}
        </motion.div>
    );
}
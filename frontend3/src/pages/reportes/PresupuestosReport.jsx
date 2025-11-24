// src/pages/reportes/PresupuestosReport.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, FileDown, Loader, Filter } from 'lucide-react';
import { getReportePresupuestos, downloadReportePorQuery } from '../../api/dataService'; // Assuming a new dataService function for budget reports
import { useNotification } from '../../context/NotificacionContext';
import HelpButton from '../../components/help/HelpButton'; // Import HelpButton

// This is a placeholder component, implement actual filtering/display logic as needed.
export default function PresupuestosReport() {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [selectedPeriodo, setSelectedPeriodo] = useState(''); // Example: filter by period
    const { showNotification } = useNotification();

    // Placeholder for fetching periods for selection
    const [periodos, setPeriodos] = useState([]);
    useEffect(() => {
        // Fetch periodos here if needed for a dropdown filter
        const fetchPeriodos = async () => {
            // Example:
            // const data = await getPeriodos();
            // setPeriodos(data.results || data || []);
        };
        fetchPeriodos();
    }, []);

    const handleGenerateReport = async () => {
        setLoading(true);
        try {
            // Example: call to a new dataService function
            const data = await getReportePresupuestos({ periodo_id: selectedPeriodo });
            setReportData(data);
            showNotification('Reporte de presupuestos generado', 'success');
        } catch (error) {
            console.error("Error generating budget report:", error);
            showNotification('Error al generar el reporte de presupuestos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = async (format) => {
        if (!reportData) {
            showNotification('Primero genera el reporte para poder descargarlo.', 'error');
            return;
        }
        setLoading(true);
        try {
            // Re-using downloadReportePorQuery for now, assuming backend endpoint supports it
            await downloadReportePorQuery({ 
                filters: [{ type: 'periodo_id', value: selectedPeriodo }], // Example filters
                format 
            });
            showNotification(`Reporte descargado en formato ${format}`, 'success');
        } catch (error) {
            console.error("Error downloading budget report:", error);
            showNotification('Error al descargar el reporte de presupuestos', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-primary mb-2" data-tour="presupuestos-reporte-titulo">Reporte de Presupuestos</h2>
                <p className="text-secondary">Genera reportes detallados sobre el estado de tus presupuestos.</p>
            </div>

            <div className="bg-secondary border border-theme rounded-xl p-6 mb-8">
                <h3 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2"><Filter size={20} /> Opciones de Reporte</h3>
                
                {/* Example Filter: Periodo */}
                <div className="mb-4">
                    <label htmlFor="periodoSelect" className="block text-sm font-medium text-secondary mb-1">Seleccionar Período</label>
                    <select 
                        id="periodoSelect"
                        value={selectedPeriodo} 
                        onChange={(e) => setSelectedPeriodo(e.target.value)}
                        className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        data-tour="periodo-select"
                    >
                        <option value="">Todos los Períodos</option>
                        {/* {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)} */}
                        <option value="temp-id-1">Presupuesto 2024</option>
                        <option value="temp-id-2">Presupuesto 2025</option>
                    </select>
                </div>

                <button 
                    onClick={handleGenerateReport} 
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full md:w-auto bg-accent text-white font-semibold px-6 py-3 rounded-lg hover:bg-opacity-90 transition-transform active:scale-95 disabled:opacity-50"
                    data-tour="generar-reporte-btn"
                >
                    {loading ? <Loader className="animate-spin" /> : <FileText size={20} />}
                    Generar Reporte
                </button>
            </div>

            {reportData && (
                <div className="bg-secondary border border-theme rounded-xl p-6 animate-in fade-in" data-tour="reporte-resultados">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h3 className="text-xl font-semibold text-primary">Resultados del Reporte</h3>
                        <div className="flex gap-3" data-tour="descargar-reporte-btn">
                            <button onClick={() => handleDownloadReport('pdf')} disabled={loading} className="flex items-center gap-2 text-sm bg-tertiary text-primary px-4 py-2 rounded-lg hover:bg-opacity-80 disabled:opacity-50">
                                {loading ? <Loader className="animate-spin w-4 h-4" /> : <FileDown size={16} />} PDF
                            </button>
                            <button onClick={() => handleDownloadReport('excel')} disabled={loading} className="flex items-center gap-2 text-sm bg-tertiary text-primary px-4 py-2 rounded-lg hover:bg-opacity-80 disabled:opacity-50">
                                {loading ? <Loader className="animate-spin w-4 h-4" /> : <FileDown size={16} />} Excel
                            </button>
                        </div>
                    </div>
                    {/* Placeholder for report data display */}
                    <div className="text-center text-tertiary py-8">
                        {/* Render report data here. For now, just a message. */}
                        <p>Datos del reporte de presupuestos se mostrarán aquí.</p>
                        <pre className="mt-4 p-4 bg-tertiary rounded text-left overflow-auto">{JSON.stringify(reportData, null, 2)}</pre>
                    </div>
                </div>
            )}
            <HelpButton moduleKey="presupuestosReport" />
        </motion.div>
    );
}

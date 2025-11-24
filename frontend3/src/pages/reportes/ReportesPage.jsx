// src/pages/reportes/ReportesPage.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ActivosReport from './ActivosReport';
import PresupuestosReport from './PresupuestosReport';
import HelpButton from '../../components/help/HelpButton'; // Importar el nuevo componente de reporte de activos
 // Importar el nuevo componente de reporte de presupuestos

export default function ReportesPage() {
    const [activeReportTab, setActiveReportTab] = useState('activos'); // 'activos' o 'presupuestos'

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-primary mb-2" data-tour="reportes-titulo">Módulo de Reportes</h1>
                <p className="text-secondary">Selecciona el tipo de reporte que deseas generar.</p>
            </div>

            {/* Selector de Pestañas/Reportes */}
            <div className="bg-secondary border border-theme rounded-xl p-2 mb-8 flex flex-wrap gap-2">
                <button
                    onClick={() => setActiveReportTab('activos')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        activeReportTab === 'activos' ? 'bg-accent text-white' : 'bg-tertiary text-primary hover:bg-opacity-80'
                    }`}
                >
                    Reporte de Activos Fijos
                </button>
                <button
                    onClick={() => setActiveReportTab('presupuestos')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        activeReportTab === 'presupuestos' ? 'bg-accent text-white' : 'bg-tertiary text-primary hover:bg-opacity-80'
                    }`}
                >
                    Reporte de Presupuestos
                </button>
                
            </div>

            {/* Contenido del Reporte Seleccionado */}
            {activeReportTab === 'activos' && <ActivosReport />}
            {activeReportTab === 'presupuestos' && <PresupuestosReport />}
            <HelpButton moduleKey="reportes" />
        </motion.div>
    );
}
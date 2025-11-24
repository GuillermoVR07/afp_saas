// src/pages/revalorizacion/RevalorizacionPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Loader, Box, DollarSign, Calendar, Hash, Info } from 'lucide-react';
import { getActivosFijos, getRevalorizaciones, ejecutarRevalorizacion } from '../../api/dataService';
import { useNotification } from '../../context/NotificacionContext';
import { usePermissions } from '../../hooks/usePermissions';
import HelpButton from '../../components/help/HelpButton';

// --- Componentes de UI reutilizables ---
const FormSelect = ({ label, children, ...props }) => (
    <div className="flex flex-col flex-1">
        <label className="text-sm font-medium text-secondary mb-1.5">{label}</label>
        <select {...props} className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent appearance-none">
            {children}
        </select>
    </div>
);

const FormInput = ({ label, ...props }) => (
    <div className="flex flex-col flex-1">
        <label className="text-sm font-medium text-secondary mb-1.5">{label}</label>
        <input {...props} className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
    </div>
);

// --- Componente Principal ---
export default function RevalorizacionPage() {
    const [activos, setActivos] = useState([]);
    const [selectedActivoId, setSelectedActivoId] = useState('');
    const [historial, setHistorial] = useState([]);
    
    // --- [NUEVO] Estados para el formulario dinámico ---
    const [revalType, setRevalType] = useState('factor'); // 'factor', 'fijo', 'porcentual'
    const [value, setValue] = useState(''); // El valor a aplicar
    const [notas, setNotas] = useState('');

    const [loadingActivos, setLoadingActivos] = useState(true);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [loadingEjecutar, setLoadingEjecutar] = useState(false);

    const { showNotification } = useNotification();
    const { hasPermission, loadingPermissions } = usePermissions();
    const canManage = !loadingPermissions && hasPermission('manage_revalorizacion');

    // Cargar la lista de activos fijos para el selector
    useEffect(() => {
        const fetchActivos = async () => {
            try {
                setLoadingActivos(true);
                const data = await getActivosFijos();
                setActivos(data.results || data || []);
            } catch (error) {
                console.error("Error cargando activos:", error);
                showNotification('Error al cargar la lista de activos', 'error');
            } finally {
                setLoadingActivos(false);
            }
        };
        fetchActivos();
    }, [showNotification]);

    // Cargar el historial cuando se selecciona un activo
    useEffect(() => {
        if (!selectedActivoId) {
            setHistorial([]);
            return;
        }
        const fetchHistorial = async () => {
            try {
                setLoadingHistorial(true);
                const data = await getRevalorizaciones(selectedActivoId);
                setHistorial(data.results || data || []);
            } catch (error) {
                console.error("Error cargando historial:", error);
                showNotification('Error al cargar el historial del activo', 'error');
            } finally {
                setLoadingHistorial(false);
            }
        };
        fetchHistorial();
    }, [selectedActivoId, showNotification]);

    const selectedActivo = useMemo(() => {
        return activos.find(a => a.id === selectedActivoId);
    }, [selectedActivoId, activos]);

    const handleEjecutar = async (e) => {
        e.preventDefault();
        if (!selectedActivoId || !value) {
            showNotification('Debe seleccionar un activo y especificar un valor.', 'error');
            return;
        }

        const numericValue = parseFloat(value);
        if (isNaN(numericValue) || numericValue <= 0) {
            showNotification('El valor para la revalorización debe ser un número positivo.', 'error');
            return;
        }

        const valorActual = parseFloat(selectedActivo.valor_actual);
        let valorNuevo;

        switch (revalType) {
            case 'factor':
                valorNuevo = valorActual * numericValue;
                break;
            case 'fijo':
                valorNuevo = numericValue;
                break;
            case 'porcentual':
                valorNuevo = valorActual * (1 + numericValue / 100);
                break;
            default:
                showNotification('Tipo de revalorización no válido.', 'error');
                return;
        }

        if (valorNuevo <= valorActual) {
            showNotification('La revalorización debe resultar en un aumento del valor del activo.', 'error');
            return;
        }

        setLoadingEjecutar(true);
        try {
            const data = {
                activo_id: selectedActivoId,
                reval_type: revalType,
                value: value,
                notas: notas,
            };
            await ejecutarRevalorizacion(data);
            showNotification('Revalorización ejecutada con éxito');
            // Limpiar y recargar
            setValue('');
            setNotas('');
            // Recargar historial
            const updatedHistorial = await getRevalorizaciones(selectedActivoId);
            setHistorial(updatedHistorial.results || updatedHistorial || []);
            // Actualizar valor en la lista de activos (opcional, para UI)
            const updatedActivos = await getActivosFijos();
            setActivos(updatedActivos.results || updatedActivos || []);

        } catch (error) {
            console.error("Error al ejecutar revalorización:", error.response?.data || error);
            showNotification(error.response?.data?.detail || 'Error al ejecutar la revalorización', 'error');
        } finally {
            setLoadingEjecutar(false);
        }
    };

    // --- [NUEVO] Objeto para configurar el input dinámicamente ---
    const inputConfig = {
        factor: { label: 'Factor o Índice a Aplicar', placeholder: 'Ej: 1.05', step: '0.000001' },
        fijo: { label: 'Nuevo Valor Fijo (Bs.)', placeholder: 'Ej: 15000', step: '0.01' },
        porcentual: { label: 'Porcentaje de Aumento (%)', placeholder: 'Ej: 5', step: '0.01' },
    };


    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* --- Encabezado --- */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-primary mb-2" data-tour="revalorizacion-titulo">Revalorización de Activos</h1>                <p className="text-secondary">Actualiza el valor de los activos según índices o factores externos.</p>
            </div>

            {/* --- Panel Principal --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna de Acción */}
                <div className="lg:col-span-1 space-y-6">
                                            <div className="bg-secondary border border-theme rounded-xl p-6" data-tour="selector-activo">
                                                <h2 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2"><Box size={20} /> Seleccionar Activo</h2>                        {loadingActivos ? (
                            <Loader className="animate-spin text-accent" />
                        ) : (
                            <FormSelect
                                label="Activo Fijo"
                                value={selectedActivoId}
                                onChange={(e) => setSelectedActivoId(e.target.value)}
                            >
                                <option value="">-- Seleccione un activo --</option>
                                {activos.map(a => <option key={a.id} value={a.id}>{a.nombre} ({a.codigo_interno})</option>)}
                            </FormSelect>
                        )}
                    </div>

                    {selectedActivo && (
                                                    <div className="bg-secondary border border-theme rounded-xl p-6 animate-in fade-in" data-tour="valor-actual-activo">
                                                        <h3 className="text-lg font-semibold text-primary mb-4">Valor Actual</h3>                            <p className="text-3xl font-bold text-accent">
                                {parseFloat(selectedActivo.valor_actual).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}
                            </p>
                        </div>
                    )}

                                            {canManage && selectedActivo && (
                                                <form onSubmit={handleEjecutar} className="bg-secondary border border-theme rounded-xl p-6 space-y-4 animate-in fade-in" data-tour="ejecutar-proceso-form">
                                                    <h2 className="text-xl font-semibold text-primary mb-2">Ejecutar Proceso</h2>                            
                            {/* --- [NUEVO] Selector de Tipo --- */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-secondary">Método de Cálculo</label>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="revalType" value="factor" checked={revalType === 'factor'} onChange={(e) => setRevalType(e.target.value)} className="radio radio-accent" />
                                        <span className="text-primary text-sm">Por Factor</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="revalType" value="fijo" checked={revalType === 'fijo'} onChange={(e) => setRevalType(e.target.value)} className="radio radio-accent" />
                                        <span className="text-primary text-sm">A Monto Fijo</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="revalType" value="porcentual" checked={revalType === 'porcentual'} onChange={(e) => setRevalType(e.target.value)} className="radio radio-accent" />
                                        <span className="text-primary text-sm">Por Porcentaje</span>
                                    </label>
                                </div>
                            </div>

                            {/* --- [EDITADO] Input dinámico --- */}
                            <FormInput 
                                label={inputConfig[revalType].label}
                                type="number" 
                                step={inputConfig[revalType].step}
                                min="0.01"
                                placeholder={inputConfig[revalType].placeholder}
                                value={value} 
                                onChange={(e) => setValue(e.target.value)} 
                                required 
                            />
                            <FormInput label="Motivo / Nota (Opcional)" placeholder="Ej: Revalorización UFV 2025" value={notas} onChange={(e) => setNotas(e.target.value)} />
                            <button type="submit" disabled={loadingEjecutar} className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-transform active:scale-95 disabled:opacity-50">
                                {loadingEjecutar ? <Loader className="animate-spin" /> : <TrendingUp size={20} />}
                                Revalorizar Activo
                            </button>
                        </form>
                    )}
                </div>

                {/* Columna de Historial */}
                                    <div className="lg:col-span-2 bg-secondary border border-theme rounded-xl p-6" data-tour="historial-revalorizaciones">
                                        <h2 className="text-xl font-semibold text-primary mb-4">Historial de Revalorizaciones del Activo</h2>                    {loadingHistorial ? (
                        <div className="flex justify-center items-center h-48"><Loader className="animate-spin text-accent" /></div>
                    ) : !selectedActivoId ? (
                        <p className="text-center text-tertiary py-12">Selecciona un activo para ver su historial.</p>
                    ) : historial.length === 0 ? (
                        <p className="text-center text-tertiary py-12">Este activo no tiene revalorizaciones.</p>
                    ) : (
                        <div className="space-y-3">
                            {historial.map(h => {
                                // --- [NUEVO] Lógica de cálculo y color ---
                                let percentageChange = 0;
                                if (h.valor_anterior > 0) {
                                    percentageChange = ((h.valor_nuevo / h.valor_anterior) - 1) * 100;
                                } else if (h.valor_nuevo > 0) {
                                    percentageChange = 100; // O se podría considerar infinito
                                }
                                const isIncrease = percentageChange >= 0;
                                const colorClass = isIncrease ? 'text-green-500' : 'text-red-500';
                                const sign = isIncrease ? '+' : '';

                                return (
                                    <div key={h.id} className="p-4 border border-theme rounded-lg hover:bg-tertiary/40">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-primary flex items-center gap-2">
                                                    <Calendar size={14} /> {new Date(h.fecha).toLocaleString('es-ES')}
                                                </p>
                                                <p className="text-sm text-secondary mt-1">Realizado por: {h.realizado_por?.username || 'N/A'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${colorClass} text-lg`}>
                                                    {sign}{percentageChange.toFixed(2)}%
                                                </p>
                                                <p className="text-xs text-tertiary flex items-center gap-1 justify-end"><Hash size={12}/> Factor: {parseFloat(h.factor_aplicado).toFixed(4)}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-theme grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-secondary">Valor Anterior</p>
                                                <p className="font-mono text-primary">{parseFloat(h.valor_anterior).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-secondary">Valor Nuevo</p>
                                                <p className="font-mono text-primary">{parseFloat(h.valor_nuevo).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}</p>
                                            </div>
                                        </div>
                                        {h.notas && (
                                            <div className="mt-3 pt-3 border-t border-theme/50">
                                                <p className="text-xs text-secondary flex items-center gap-1.5"><Info size={12}/> {h.notas}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <HelpButton moduleKey="revalorizaciones" />
        </motion.div>
    );
}

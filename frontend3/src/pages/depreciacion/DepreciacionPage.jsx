// src/pages/depreciacion/DepreciacionPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, Loader, Box, DollarSign, Calendar, Hash, Info, Divide, Percent, Package } from 'lucide-react';
import { getActivosFijos, getDepreciaciones, ejecutarDepreciacion } from '../../api/dataService';
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
export default function DepreciacionPage() {
    const [activos, setActivos] = useState([]);
    const [selectedActivoId, setSelectedActivoId] = useState('');
    const [historial, setHistorial] = useState([]);
    
    // --- Estados del formulario ---
    const [depreciationType, setDepreciationType] = useState('STRAIGHT_LINE');
    const [formValues, setFormValues] = useState({});
    const [notas, setNotas] = useState('');

    const [loadingActivos, setLoadingActivos] = useState(true);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [loadingEjecutar, setLoadingEjecutar] = useState(false);

    const { showNotification } = useNotification();
    const { hasPermission, loadingPermissions } = usePermissions();
    const canManage = !loadingPermissions && hasPermission('manage_depreciacion');

    // Cargar activos
    useEffect(() => {
        const fetchActivos = async () => {
            try {
                setLoadingActivos(true);
                const data = await getActivosFijos();
                const activosActivos = (data.results || data || []).filter(a => a.valor_actual > 0 && a.estado_nombre !== 'DADO_DE_BAJA');
                setActivos(activosActivos);
            } catch (error) {
                console.error("Error cargando activos:", error);
                showNotification('Error al cargar la lista de activos', 'error');
            } finally {
                setLoadingActivos(false);
            }
        };
        fetchActivos();
    }, [showNotification]);

    // Cargar historial
    useEffect(() => {
        if (!selectedActivoId) {
            setHistorial([]);
            return;
        }
        const fetchHistorial = async () => {
            try {
                setLoadingHistorial(true);
                const data = await getDepreciaciones(selectedActivoId);
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
        if (!selectedActivoId) {
            showNotification('Debe seleccionar un activo.', 'error');
            return;
        }

        setLoadingEjecutar(true);
        try {
            const data = {
                activo_id: selectedActivoId,
                depreciation_type: depreciationType,
                notas: notas,
                ...formValues
            };
            await ejecutarDepreciacion(data);
            showNotification('Depreciación ejecutada con éxito');
            setFormValues({});
            setNotas('');
            // Recargar datos
            const updatedHistorial = await getDepreciaciones(selectedActivoId);
            setHistorial(updatedHistorial.results || updatedHistorial || []);
            const updatedActivos = await getActivosFijos();
            const activosActivos = (updatedActivos.results || updatedActivos || []).filter(a => a.valor_actual > 0 && a.estado_nombre !== 'DADO_DE_BAJA');
            setActivos(activosActivos);

        } catch (error) {
            console.error("Error al ejecutar depreciación:", error.response?.data || error);
            showNotification(error.response?.data?.detail || 'Error al ejecutar la depreciación', 'error');
        } finally {
            setLoadingEjecutar(false);
        }
    };
    
    const handleFormValueChange = (e) => {
        setFormValues(prev => ({...prev, [e.target.name]: e.target.value}));
    }

    const renderDynamicFields = () => {
        switch (depreciationType) {
            case 'MANUAL':
                return <FormInput label="Monto a Depreciar (Bs.)" type="number" step="0.01" min="0.01" name="monto" value={formValues.monto || ''} onChange={handleFormValueChange} required />;
            case 'STRAIGHT_LINE':
                return <FormInput label="Valor Residual (Bs.)" type="number" step="0.01" min="0" name="valor_residual" value={formValues.valor_residual || ''} onChange={handleFormValueChange} placeholder="0" />;
            case 'DECLINING_BALANCE':
                return <FormInput label="Tasa de Depreciación" type="number" step="0.01" min="0.01" max="1" name="tasa_depreciacion" value={formValues.tasa_depreciacion || ''} onChange={handleFormValueChange} placeholder="Ej: 0.2 para 20%" required />;
            case 'UNITS_OF_PRODUCTION':
                return (
                    <>
                        <FormInput label="Total Unidades Estimadas" type="number" step="1" min="1" name="total_unidades_estimadas" value={formValues.total_unidades_estimadas || ''} onChange={handleFormValueChange} placeholder="Ej: 100000 (para km)" required/>
                        <FormInput label="Unidades Producidas/Usadas" type="number" step="1" min="1" name="unidades_producidas" value={formValues.unidades_producidas || ''} onChange={handleFormValueChange} placeholder="Ej: 5000 (km este periodo)" required/>
                        <FormInput label="Valor Residual (Bs.)" type="number" step="0.01" min="0" name="valor_residual" value={formValues.valor_residual || ''} onChange={handleFormValueChange} placeholder="0" />
                    </>
                );
            default:
                return null;
        }
    };
    
    const DEPRECIATION_TYPES = [
        { id: 'STRAIGHT_LINE', label: 'Línea Recta', icon: <Divide size={16} /> },
        { id: 'MANUAL', label: 'Monto Manual', icon: <DollarSign size={16} /> },
        { id: 'DECLINING_BALANCE', label: 'Saldo Decreciente', icon: <Percent size={16} /> },
        { id: 'UNITS_OF_PRODUCTION', label: 'Unidades Producidas', icon: <Package size={16} /> },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-primary mb-2" data-tour="depreciacion-titulo">Depreciación de Activos</h1>
                <p className="text-secondary">Registra la disminución del valor de los activos por su uso o paso del tiempo.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-secondary border border-theme rounded-xl p-6" data-tour="selector-activo">
                        <h2 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2"><Box size={20} /> Seleccionar Activo</h2>
                        {loadingActivos ? <Loader className="animate-spin text-accent" /> : (
                            <FormSelect label="Activo Fijo a Depreciar" value={selectedActivoId} onChange={(e) => setSelectedActivoId(e.target.value)}>
                                <option value="">-- Seleccione un activo --</option>
                                {activos.map(a => <option key={a.id} value={a.id}>{a.nombre} ({a.codigo_interno})</option>)}
                            </FormSelect>
                        )}
                    </div>

                    {selectedActivo && (
                        <div className="bg-secondary border border-theme rounded-xl p-6 animate-in fade-in" data-tour="valor-actual-activo">
                            <h3 className="text-lg font-semibold text-primary mb-4">Valor Actual</h3>
                            <p className="text-3xl font-bold text-accent">{parseFloat(selectedActivo.valor_actual).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}</p>
                        </div>
                    )}

                    {canManage && selectedActivo && (
                        <form onSubmit={handleEjecutar} className="bg-secondary border border-theme rounded-xl p-6 space-y-4 animate-in fade-in" data-tour="ejecutar-proceso-form">
                            <h2 className="text-xl font-semibold text-primary mb-2">Ejecutar Depreciación</h2>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-secondary">Método de Cálculo</label>
                                <div className="flex flex-wrap gap-2">
                                    {DEPRECIATION_TYPES.map(type => (
                                        <button key={type.id} type="button" onClick={() => setDepreciationType(type.id)} className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${depreciationType === type.id ? 'bg-accent text-white border-accent' : 'bg-tertiary text-primary border-transparent hover:border-theme'}`}>
                                            {type.icon} {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {renderDynamicFields()}

                            <FormInput label="Motivo / Nota (Opcional)" placeholder="Ej: Depreciación anual 2025" value={notas} onChange={(e) => setNotas(e.target.value)} />
                            <button type="submit" disabled={loadingEjecutar} className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-transform active:scale-95 disabled:opacity-50">
                                {loadingEjecutar ? <Loader className="animate-spin" /> : <TrendingDown size={20} />}
                                Depreciar Activo
                            </button>
                        </form>
                    )}
                </div>

                <div className="lg:col-span-2 bg-secondary border border-theme rounded-xl p-6" data-tour="historial-depreciaciones">
                    <h2 className="text-xl font-semibold text-primary mb-4">Historial de Depreciaciones del Activo</h2>
                    {loadingHistorial ? <div className="flex justify-center items-center h-48"><Loader className="animate-spin text-accent" /></div>
                    : !selectedActivoId ? <p className="text-center text-tertiary py-12">Selecciona un activo para ver su historial.</p>
                    : historial.length === 0 ? <p className="text-center text-tertiary py-12">Este activo no tiene depreciaciones.</p>
                    : (
                        <div className="space-y-3">
                            {historial.map(h => (
                                <div key={h.id} className="p-4 border border-theme rounded-lg hover:bg-tertiary/40">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-primary flex items-center gap-2"><Calendar size={14} /> {new Date(h.fecha).toLocaleString('es-ES')}</p>
                                            <p className="text-sm text-secondary mt-1">Método: <span className="font-medium">{h.depreciation_type_display}</span></p>
                                            <p className="text-sm text-secondary mt-1">Realizado por: {h.realizado_por?.username || 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-red-500 text-lg">-{parseFloat(h.monto_depreciado).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-theme grid grid-cols-2 gap-4">
                                        <div><p className="text-xs text-secondary">Valor Anterior</p><p className="font-mono text-primary">{parseFloat(h.valor_anterior).toLocaleString('es-BO')}</p></div>
                                        <div className="text-right"><p className="text-xs text-secondary">Valor Nuevo</p><p className="font-mono text-primary">{parseFloat(h.valor_nuevo).toLocaleString('es-BO')}</p></div>
                                    </div>
                                    {h.notas && <div className="mt-3 pt-3 border-t border-theme/50"><p className="text-xs text-secondary flex items-center gap-1.5"><Info size={12}/> {h.notas}</p></div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <HelpButton moduleKey="depreciaciones" />
        </motion.div>
    );
}

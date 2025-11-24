// src/pages/presupuesto/PeriodosPresupuestariosList.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PiggyBank, Plus, Edit, Trash2, Loader, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getPeriodos, createPeriodo, updatePeriodo, deletePeriodo } from '../../api/dataService';
import Modal from '../../components/Modal';
import { useNotification } from '../../context/NotificacionContext';
import { usePermissions } from '../../hooks/usePermissions';
import HelpButton from '../../components/help/HelpButton'; // Import HelpButton

const PeriodoForm = ({ onSave, onCancel, periodo }) => {
    const [nombre, setNombre] = useState(periodo?.nombre || '');
    const [fecha_inicio, setFechaInicio] = useState(periodo?.fecha_inicio || '');
    const [fecha_fin, setFechaFin] = useState(periodo?.fecha_fin || '');
    const [estado, setEstado] = useState(periodo?.estado || 'PLANIFICACION');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ nombre, fecha_inicio, fecha_fin, estado });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del Período (ej. Presupuesto 2024)" required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="date" value={fecha_inicio} onChange={(e) => setFechaInicio(e.target.value)} required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
                <input type="date" value={fecha_fin} onChange={(e) => setFechaFin(e.target.value)} required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="PLANIFICACION">Planificación</option>
                <option value="ACTIVO">Activo</option>
                <option value="CERRADO">Cerrado</option>
            </select>
            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-primary hover:bg-tertiary">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-90">Guardar</button>
            </div>
        </form>
    );
};

const StatusBadge = ({ status }) => {
    const statusConfig = {
        PLANIFICACION: { icon: <Clock size={14} />, color: 'bg-yellow-500/20 text-yellow-400', label: 'Planificación' },
        ACTIVO: { icon: <CheckCircle size={14} />, color: 'bg-green-500/20 text-green-400', label: 'Activo' },
        CERRADO: { icon: <XCircle size={14} />, color: 'bg-red-500/20 text-red-400', label: 'Cerrado' },
    };
    const config = statusConfig[status] || { icon: null, color: 'bg-gray-500/20 text-gray-400', label: status };
    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${config.color}`}>
            {config.icon}
            {config.label}
        </span>
    );
};

export default function PeriodosPresupuestariosList({ onSelectPeriodo }) {
    const [periodos, setPeriodos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPeriodo, setSelectedPeriodo] = useState(null);
    const { showNotification } = useNotification();
    const { hasPermission } = usePermissions();
    const canManage = hasPermission('manage_presupuesto');

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await getPeriodos(); // Renamed for clarity
            console.log("API Response for Periodos:", response.data); // Log the actual data part of the response
            if (response && Array.isArray(response.data.results)) { // Check response.data.results
                setPeriodos(response.data.results);
            } else {
                // If response.data.results is not an array (e.g., response.data is {} or null, or response.data.results is undefined),
                // assume no periods or malformed response.
                setPeriodos([]);
                console.error("La respuesta de la API de períodos no tiene el formato esperado (o está vacía):", response.data);
                showNotification(`Respuesta inesperada del servidor para los períodos: ${JSON.stringify(response.data)}`, 'error');
            }
        } catch (error) {
            showNotification('Error al cargar los períodos presupuestarios', 'error');
            setPeriodos([]); // Asegurarse de que sea un array en caso de error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (data) => {
        try {
            if (selectedPeriodo) {
                await updatePeriodo(selectedPeriodo.id, data);
                showNotification('Período actualizado con éxito');
            } else {
                await createPeriodo(data);
                showNotification('Período creado con éxito');
            }
            fetchData();
            setIsModalOpen(false);
            setSelectedPeriodo(null);
        } catch (error) {
            const errorMsg = error.response?.data?.detail || (selectedPeriodo ? 'Error al actualizar el período' : 'Error al crear el período');
            showNotification(errorMsg, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este período? Esta acción no se puede deshacer.')) {
            try {
                await deletePeriodo(id);
                showNotification('Período eliminado con éxito');
                fetchData();
            } catch (error) {
                showNotification('Error al eliminar el período', 'error');
            }
        }
    };

    const openModal = (periodo = null) => {
        setSelectedPeriodo(periodo);
        setIsModalOpen(true);
    };

    return (
        <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-primary mb-2 flex items-center gap-3" data-tour="presupuestos-titulo">
                            <PiggyBank size={40} /> Gestión de Presupuestos
                        </h1>
                        <p className="text-secondary">Administra los períodos presupuestarios y sus partidas.</p>
                    </div>
                    {canManage && (
                        <button onClick={() => openModal()} className="flex items-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-transform active:scale-95" data-tour="nuevo-periodo-btn">
                            <Plus size={20} /> Nuevo Período
                        </button>
                    )}
                </div>

                <div className="bg-secondary border border-theme rounded-xl" data-tour="tabla-periodos">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-secondary uppercase bg-tertiary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Nombre</th>
                                    <th scope="col" className="px-6 py-3">Fechas</th>
                                    <th scope="col" className="px-6 py-3">Monto Total</th>
                                    <th scope="col" className="px-6 py-3">Estado</th>
                                    {canManage && <th scope="col" className="px-6 py-3">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={canManage ? 5 : 4} className="text-center py-12"><Loader className="animate-spin text-accent mx-auto" /></td></tr>
                                ) : periodos.length === 0 ? (
                                    <tr><td colSpan={canManage ? 5 : 4} className="text-center py-12 text-tertiary">No hay períodos presupuestarios para mostrar.</td></tr>
                                ) : (
                                    periodos.map(p => {
                                        try {
                                            return (
                                                <tr key={p?.id} className="border-b border-theme hover:bg-tertiary/40 cursor-pointer" onClick={() => onSelectPeriodo(p)} data-tour="periodo-item-view">
                                                    <td className="px-6 py-4 font-medium text-primary">{p?.nombre || 'Sin Nombre'}</td>
                                                    <td className="px-6 py-4 text-secondary flex items-center gap-2">
                                                        <Calendar size={16} />
                                                        {p?.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString() : 'N/A'} - {p?.fecha_fin ? new Date(p.fecha_fin).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 text-secondary font-mono">{parseFloat(p?.monto_total || 0).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}</td>
                                                    <td className="px-6 py-4"><StatusBadge status={p?.estado} /></td>
                                                    {canManage && (
                                                        <td className="px-6 py-4">
                                                            <div className="flex gap-2" data-tour="periodo-item-acciones">
                                                                <button onClick={(e) => { e.stopPropagation(); openModal(p); }} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-full"><Edit size={16} /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full"><Trash2 size={16} /></button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        } catch (error) {
                                            return (
                                                <tr key={p?.id || Math.random()} className="border-b border-theme bg-red-900/20">
                                                    <td colSpan={canManage ? 5 : 4} className="px-6 py-4 text-red-400">
                                                        Error al renderizar este período: {error.message}
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedPeriodo ? 'Editar Período' : 'Nuevo Período'}>
                <PeriodoForm onSave={handleSave} onCancel={() => setIsModalOpen(false)} periodo={selectedPeriodo} />
            </Modal>
            <HelpButton moduleKey="presupuestos" />
        </>
    );
}

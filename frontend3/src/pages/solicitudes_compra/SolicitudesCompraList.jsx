// src/pages/solicitudes_compra/SolicitudesCompraList.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Plus, Edit, Trash2, Loader, Check, X, MoreVertical } from 'lucide-react';
import { getSolicitudesCompra, createSolicitudCompra, decidirSolicitudCompra, getDepartamentos, getPartidas } from '../../api/dataService';
import Modal from '../../components/Modal';
import { useNotification } from '../../context/NotificacionContext';
import { usePermissions } from '../../hooks/usePermissions';
import HelpButton from '../../components/help/HelpButton';

const SolicitudForm = ({ solicitud, onSave, onCancel, departamentos, partidas }) => {
    const [descripcion, setDescripcion] = useState(solicitud?.descripcion || '');
    const [costo_estimado, setCostoEstimado] = useState(solicitud?.costo_estimado || '');
    const [justificacion, setJustificacion] = useState(solicitud?.justificacion || '');
    const [departamento_id, setDepartamentoId] = useState(solicitud?.departamento.id || '');
    const [partida_presupuestaria_id, setPartidaPresupuestariaId] = useState(solicitud?.partida_presupuestaria?.id || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ descripcion, costo_estimado, justificacion, departamento_id, partida_presupuestaria_id });
    };

    const partidasFiltradas = useMemo(() => {
        if (!departamento_id) return [];
        return partidas.filter(p => p.departamento.id === departamento_id);
    }, [departamento_id, partidas]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción del activo solicitado" required rows={3} className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
            <input type="number" value={costo_estimado} onChange={(e) => setCostoEstimado(e.target.value)} placeholder="Costo Estimado (Bs.)" required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" min="0.01" step="0.01" />
            <textarea value={justificacion} onChange={(e) => setJustificacion(e.target.value)} placeholder="Justificación de la necesidad" required rows={3} className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
            <select value={departamento_id} onChange={(e) => setDepartamentoId(e.target.value)} required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="">-- Seleccione un Departamento --</option>
                {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
            <select value={partida_presupuestaria_id} onChange={(e) => setPartidaPresupuestariaId(e.target.value)} className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" disabled={!departamento_id}>
                <option value="">-- Seleccione una Partida Presupuestaria (Opcional) --</option>
                {partidasFiltradas.map(p => (
                    <option key={p.id} value={p.id}>
                        {p.nombre} - (Disponible: {parseFloat(p.monto_disponible).toLocaleString('es-BO')} Bs.)
                    </option>
                ))}
            </select>
            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-primary hover:bg-tertiary">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-90">Guardar Solicitud</button>
            </div>
        </form>
    );
};

const StatusBadge = ({ status }) => {
    const statusStyles = {
        PENDIENTE: 'bg-yellow-500/20 text-yellow-400',
        APROBADA: 'bg-green-500/20 text-green-400',
        RECHAZADA: 'bg-red-500/20 text-red-400',
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status] || 'bg-gray-500/20 text-gray-400'}`}>
            {status}
        </span>
    );
};

export default function SolicitudesCompraList() {
    const [solicitudes, setSolicitudes] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [partidas, setPartidas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSolicitud, setEditingSolicitud] = useState(null);
    const [decisionModal, setDecisionModal] = useState({ isOpen: false, solicitud: null, decision: null });

    const { showNotification } = useNotification();
    const { hasPermission, loadingPermissions } = usePermissions();
    const canManage = !loadingPermissions && hasPermission('manage_solicitud_compra');
    const canApprove = !loadingPermissions && hasPermission('approve_solicitud_compra');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [solicitudesData, deptosData, partidasData] = await Promise.all([
                getSolicitudesCompra(), 
                getDepartamentos(),
                getPartidas({ periodo__estado: 'ACTIVO' }) // Solo traer partidas de períodos activos
            ]);
            setSolicitudes(solicitudesData.results || solicitudesData || []);
            setDepartamentos(deptosData.results || deptosData || []);
            setPartidas(partidasData.data.results || partidasData.data || []);
        } catch (error) {
            console.error("Error al cargar datos:", error);
            showNotification('Error al cargar los datos', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (data) => {
        try {
            // Asegurarse de que el ID de la partida sea nulo si está vacío, no una cadena vacía
            const payload = {
                ...data,
                partida_presupuestaria_id: data.partida_presupuestaria_id || null,
            };

            if (editingSolicitud) {
                // La edición podría no ser parte del flujo, pero se deja el esqueleto
                // await updateSolicitudCompra(editingSolicitud.id, payload);
                // showNotification('Solicitud actualizada con éxito');
            } else {
                await createSolicitudCompra(payload);
                showNotification('Solicitud de compra creada con éxito');
            }
            fetchData();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error al guardar:", error);
            const errorMsg = error.response?.data?.partida_presupuestaria_id?.[0] || error.response?.data?.detail || 'Error al guardar la solicitud';
            showNotification(errorMsg, 'error');
        }
    };
    
    const handleOpenDecisionModal = (solicitud, decision) => {
        setDecisionModal({ isOpen: true, solicitud, decision });
    };

    const handleConfirmDecision = async (motivo = '') => {
        const { solicitud, decision } = decisionModal;
        if (!solicitud) return;

        try {
            await decidirSolicitudCompra(solicitud.id, { decision, motivo_rechazo: motivo });
            showNotification(`Solicitud ${decision === 'aprobar' ? 'aprobada' : 'rechazada'} con éxito`);
            fetchData();
            setDecisionModal({ isOpen: false, solicitud: null, decision: null });
        } catch (error) {
            console.error("Error al decidir:", error);
            showNotification(error.response?.data?.detail || 'Error al procesar la decisión', 'error');
        }
    };

    return (
        <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-primary mb-2" data-tour="solicitudes-compra-titulo">Solicitudes de Compra</h1>
                        <p className="text-secondary">Inicia y gestiona el proceso de adquisición de nuevos activos.</p>
                    </div>
                    {canManage && (
                        <button onClick={() => { setEditingSolicitud(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-transform active:scale-95" data-tour="nueva-solicitud-btn">
                            <Plus size={20} /> Nueva Solicitud
                        </button>
                    )}
                </div>

                <div className="bg-secondary border border-theme rounded-xl" data-tour="tabla-solicitudes">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-secondary uppercase bg-tertiary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Descripción</th>
                                    <th scope="col" className="px-6 py-3">Partida Presupuestaria</th>
                                    <th scope="col" className="px-6 py-3">Departamento</th>
                                    <th scope="col" className="px-6 py-3">Solicitante</th>
                                    <th scope="col" className="px-6 py-3">Costo Est.</th>
                                    <th scope="col" className="px-6 py-3">Fecha</th>
                                    <th scope="col" className="px-6 py-3">Estado</th>
                                    <th scope="col" className="px-6 py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="8" className="text-center py-12"><Loader className="animate-spin text-accent mx-auto" /></td></tr>
                                ) : solicitudes.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center py-12 text-tertiary">No hay solicitudes para mostrar.</td></tr>
                                ) : (
                                    solicitudes.map(s => (
                                        <tr key={s.id} className="border-b border-theme hover:bg-tertiary/40">
                                            <td className="px-6 py-4 font-medium text-primary">{s.descripcion}</td>
                                            <td className="px-6 py-4 text-secondary">{s.partida_presupuestaria?.nombre || <span className="text-tertiary">N/A</span>}</td>
                                            <td className="px-6 py-4 text-secondary">{s.departamento.nombre}</td>
                                            <td className="px-6 py-4 text-secondary">{s.solicitante.username}</td>
                                            <td className="px-6 py-4 text-secondary">{parseFloat(s.costo_estimado).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}</td>
                                            <td className="px-6 py-4 text-secondary">{new Date(s.fecha_solicitud).toLocaleDateString()}</td>
                                            <td className="px-6 py-4"><StatusBadge status={s.estado} /></td>
                                            <td className="px-6 py-4">
                                                {s.estado === 'PENDIENTE' && canApprove && (
                                                    <div className="flex gap-2" data-tour="solicitud-item-acciones">
                                                        <button onClick={() => handleOpenDecisionModal(s, 'aprobar')} className="p-2 text-green-500 hover:bg-green-500/10 rounded-full"><Check size={18} /></button>
                                                        <button onClick={() => handleOpenDecisionModal(s, 'rechazar')} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"><X size={18} /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSolicitud ? "Editar Solicitud" : "Nueva Solicitud de Compra"}>
                <SolicitudForm solicitud={editingSolicitud} onSave={handleSave} onCancel={() => setIsModalOpen(false)} departamentos={departamentos} partidas={partidas} />
            </Modal>

            {decisionModal.isOpen && decisionModal.decision === 'rechazar' && (
                 <Modal isOpen={decisionModal.isOpen} onClose={() => setDecisionModal({ isOpen: false, solicitud: null, decision: null })} title="Rechazar Solicitud">
                     <div className="space-y-4">
                         <p>Por favor, especifica el motivo del rechazo.</p>
                         <textarea id="motivo_rechazo" rows={3} className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
                         <div className="flex justify-end gap-3 pt-2">
                             <button onClick={() => setDecisionModal({ isOpen: false, solicitud: null, decision: null })} className="px-4 py-2 rounded-lg text-primary hover:bg-tertiary">Cancelar</button>
                             <button onClick={() => handleConfirmDecision(document.getElementById('motivo_rechazo').value)} className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-opacity-90">Confirmar Rechazo</button>
                         </div>
                     </div>
                 </Modal>
            )}
            {decisionModal.isOpen && decisionModal.decision === 'aprobar' && (
                 <Modal isOpen={decisionModal.isOpen} onClose={() => setDecisionModal({ isOpen: false, solicitud: null, decision: null })} title="Aprobar Solicitud">
                     <div className="space-y-4">
                         <p>¿Estás seguro de que quieres aprobar esta solicitud de compra?</p>
                         <div className="flex justify-end gap-3 pt-2">
                             <button onClick={() => setDecisionModal({ isOpen: false, solicitud: null, decision: null })} className="px-4 py-2 rounded-lg text-primary hover:bg-tertiary">Cancelar</button>
                             <button onClick={() => handleConfirmDecision()} className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-opacity-90">Confirmar Aprobación</button>
                         </div>
                     </div>
                 </Modal>
            )}
            <HelpButton moduleKey="solicitudesCompra" />
        </>
    );
}

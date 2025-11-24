// src/pages/presupuesto/PartidasPresupuestariasList.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Edit, Trash2, Loader, List } from 'lucide-react';
import { getPartidas, createPartida, updatePartida, deletePartida, getDepartamentos } from '../../api/dataService';
import Modal from '../../components/Modal';
import { useNotification } from '../../context/NotificacionContext';
import { usePermissions } from '../../hooks/usePermissions';

const PartidaForm = ({ onSave, onCancel, partida, periodo, departamentos }) => {
    const [nombre, setNombre] = useState(partida?.nombre || '');
    const [codigo, setCodigo] = useState(partida?.codigo || '');
    const [monto_asignado, setMontoAsignado] = useState(partida?.monto_asignado || '');
    const [departamento_id, setDepartamentoId] = useState(partida?.departamento?.id || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ nombre, codigo, monto_asignado, departamento_id, periodo_id: periodo.id });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la Partida (ej. Compra de Laptops)" required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código Contable (Opcional)" className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
                <input type="number" value={monto_asignado} onChange={(e) => setMontoAsignado(e.target.value)} placeholder="Monto Asignado (Bs.)" required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" min="0.01" step="0.01" />
            </div>
            <select value={departamento_id} onChange={(e) => setDepartamentoId(e.target.value)} required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="">-- Asignar a Departamento --</option>
                {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-primary hover:bg-tertiary">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-90">Guardar Partida</button>
            </div>
        </form>
    );
};

export default function PartidasPresupuestariasList({ periodo, onBack }) {
    const [partidas, setPartidas] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPartida, setSelectedPartida] = useState(null);
    const { showNotification } = useNotification();
    const { hasPermission } = usePermissions();
    const canManage = hasPermission('manage_presupuesto');

    const fetchData = async () => {
        setLoading(true);
        let fetchedPartidas = [];
        let fetchedDepartamentos = [];

        // Fetch Partidas
        try {
            const partidasResponse = await getPartidas({ periodo_id: periodo.id });
            console.log("API Response for Partidas:", partidasResponse.data);
            if (partidasResponse && partidasResponse.data) {
                if (Array.isArray(partidasResponse.data.results)) {
                    fetchedPartidas = partidasResponse.data.results;
                } else if (Array.isArray(partidasResponse.data)) {
                    fetchedPartidas = partidasResponse.data;
                } else {
                    console.error("La respuesta de la API de partidas no tiene el formato esperado (o está vacía):", partidasResponse.data);
                    showNotification(`Respuesta inesperada del servidor para las partidas`, 'error');
                }
            } else {
                console.error("La respuesta de la API de partidas no tiene el formato esperado (o está vacía):", partidasResponse.data);
                showNotification(`Respuesta inesperada del servidor para las partidas: ${JSON.stringify(partidasResponse.data)}`, 'error');
            }
        } catch (error) {
            console.error("Error fetching partidas:", error);
            showNotification('Error al cargar las partidas presupuestarias', 'error');
        }

        // Fetch Departamentos
        try {
            const departamentosData = await getDepartamentos(); // Renamed for clarity
            console.log("API Response for Departamentos:", departamentosData); // Log the actual data
            if (departamentosData && Array.isArray(departamentosData.results)) {
                fetchedDepartamentos = departamentosData.results;
            } else if (departamentosData && Array.isArray(departamentosData)) { // Fallback for non-paginated direct array
                fetchedDepartamentos = departamentosData;
            } else {
                console.error("La respuesta de la API de departamentos no tiene el formato esperado (o está vacía):", departamentosData);
                showNotification(`Respuesta inesperada del servidor para los departamentos: ${JSON.stringify(departamentosData)}`, 'error');
            }
        } catch (error) {
            console.error("Error fetching departamentos:", error);
            showNotification('Error al cargar los departamentos', 'error');
        }

        setPartidas(fetchedPartidas);
        setDepartamentos(fetchedDepartamentos);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [periodo.id]);

    const handleSave = async (data) => {
        try {
            if (selectedPartida) {
                await updatePartida(selectedPartida.id, data);
                showNotification('Partida actualizada con éxito');
            } else {
                await createPartida(data);
                showNotification('Partida creada con éxito');
            }
            fetchData();
            setIsModalOpen(false);
            setSelectedPartida(null);
        } catch (error) {
            console.error("Error saving partida:", error); // Log the full error object
            const errorMsg = error.response?.data?.detail || (selectedPartida ? 'Error al actualizar la partida' : 'Error al crear la partida');
            showNotification(errorMsg, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta partida?')) {
            try {
                await deletePartida(id);
                showNotification('Partida eliminada con éxito');
                fetchData();
            } catch (error) {
                showNotification('Error al eliminar la partida', 'error');
            }
        }
    };

    const openModal = (partida = null) => {
        setSelectedPartida(partida);
        setIsModalOpen(true);
    };

    return (
        <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <button onClick={onBack} className="flex items-center gap-2 text-accent mb-4 font-semibold" data-tour="partidas-back-btn">
                    <ArrowLeft size={18} /> Volver a Períodos
                </button>
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-primary mb-2 flex items-center gap-3" data-tour="partidas-titulo">
                            <List size={40} /> Partidas para "{periodo.nombre}"
                        </h1>
                        <p className="text-secondary">Gestiona las líneas de gasto para este período.</p>
                    </div>
                    {canManage && (
                        <button onClick={() => openModal()} className="flex items-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-transform active:scale-95" data-tour="nueva-partida-btn">
                            <Plus size={20} /> Nueva Partida
                        </button>
                    )}
                </div>

                <div className="bg-secondary border border-theme rounded-xl" data-tour="tabla-partidas">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-secondary uppercase bg-tertiary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Nombre</th>
                                    <th scope="col" className="px-6 py-3">Departamento</th>
                                    <th scope="col" className="px-6 py-3">Monto Asignado</th>
                                    <th scope="col" className="px-6 py-3">Monto Gastado</th>
                                    <th scope="col" className="px-6 py-3">Monto Disponible</th>
                                    {canManage && <th scope="col" className="px-6 py-3">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={canManage ? 6 : 5} className="text-center py-12"><Loader className="animate-spin text-accent mx-auto" /></td></tr>
                                ) : partidas.length === 0 ? (
                                    <tr><td colSpan={canManage ? 6 : 5} className="text-center py-12 text-tertiary">No hay partidas para este período.</td></tr>
                                ) : (
                                    partidas.map(p => {
                                        const departamento = p?.departamento;
                                            return (
                                                <tr key={p?.id} className="border-b border-theme hover:bg-tertiary/40" data-tour="partida-item-view">
                                                    <td className="px-6 py-4 font-medium text-primary">{p?.nombre || 'Sin Nombre'} <span className="text-tertiary font-mono text-xs">{p?.codigo || ''}</span></td>
                                                    <td className="px-6 py-4 text-secondary">{departamento?.nombre || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-green-400 font-mono">{parseFloat(p?.monto_asignado || 0).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}</td>
                                                    <td className="px-6 py-4 text-red-400 font-mono">{parseFloat(p?.monto_gastado || 0).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}</td>
                                                    <td className="px-6 py-4 text-blue-400 font-mono">{parseFloat(p?.monto_disponible || 0).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}</td>
                                                    {canManage && (
                                                        <td className="px-6 py-4">
                                                            <div className="flex gap-2" data-tour="partida-item-acciones">
                                                                <button onClick={(e) => { e.stopPropagation(); openModal(p); }} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-full"><Edit size={16} /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full"><Trash2 size={16} /></button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedPartida ? 'Editar Partida' : 'Nueva Partida'}>
                <PartidaForm onSave={handleSave} onCancel={() => setIsModalOpen(false)} partida={selectedPartida} periodo={periodo} departamentos={departamentos} />
            </Modal>
        </>
    );
}

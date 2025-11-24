// src/pages/disposicion/DisposicionList.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Plus, Edit, Loader, Archive, DollarSign, Calendar, Info, Box } from 'lucide-react';
import { getDisposiciones, createDisposicion, updateDisposicion, deleteDisposicion, getActivosFijos } from '../../api/dataService';
import Modal from '../../components/Modal';
import { useNotification } from '../../context/NotificacionContext';
import { usePermissions } from '../../hooks/usePermissions';
import HelpButton from '../../components/help/HelpButton';

const DisposicionForm = ({ disposicion, onSave, onCancel, activos }) => {
    const [formData, setFormData] = useState({
        activo_id: disposicion?.activo?.id || '',
        tipo_disposicion: disposicion?.tipo_disposicion || 'BAJA',
        fecha_disposicion: disposicion?.fecha_disposicion || new Date().toISOString().split('T')[0],
        valor_venta: disposicion?.valor_venta || '',
        razon: disposicion?.razon || '',
    });

    const TIPO_CHOICES = [
        { value: 'VENTA', label: 'Venta' },
        { value: 'BAJA', label: 'Baja por Obsolescencia/Daño' },
        { value: 'DONACION', label: 'Donación' },
        { value: 'ROBO', label: 'Robo/Pérdida' },
        { value: 'OTRO', label: 'Otro' },
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSave = { ...formData };
        if (dataToSave.tipo_disposicion !== 'VENTA') {
            dataToSave.valor_venta = null;
        } else if (dataToSave.valor_venta === '') {
             dataToSave.valor_venta = 0;
        }
        onSave(dataToSave);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <select name="activo_id" value={formData.activo_id} onChange={handleChange} required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" disabled={!!disposicion}>
                <option value="">-- Seleccione un Activo --</option>
                {activos.map(activo => (
                    <option key={activo.id} value={activo.id}>{activo.nombre} ({activo.codigo_interno})</option>
                ))}
            </select>
            
            <select name="tipo_disposicion" value={formData.tipo_disposicion} onChange={handleChange} required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                {TIPO_CHOICES.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
            </select>

            <input type="date" name="fecha_disposicion" value={formData.fecha_disposicion} onChange={handleChange} required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" />

            {formData.tipo_disposicion === 'VENTA' && (
                <input type="number" step="0.01" name="valor_venta" value={formData.valor_venta} onChange={handleChange} placeholder="Valor de Venta (Bs.)" className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
            )}

            <textarea name="razon" value={formData.razon} onChange={handleChange} placeholder="Razón o motivo de la disposición" rows={3} className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" />

            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-primary hover:bg-tertiary">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-90">Guardar</button>
            </div>
        </form>
    );
};

export default function DisposicionList() {
    const [disposiciones, setDisposiciones] = useState([]);
    const [activos, setActivos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDisposicion, setEditingDisposicion] = useState(null);
    const { showNotification } = useNotification();
    const { hasPermission, loadingPermissions } = usePermissions();

    const canManage = !loadingPermissions && hasPermission('manage_disposicion');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [disposicionesData, activosData] = await Promise.all([
                getDisposiciones(),
                getActivosFijos() // Fetch assets for the form selector
            ]);
            setDisposiciones(disposicionesData.results || disposicionesData || []);
            // Filter out assets that are already disposed
            const activeAssets = (activosData.results || activosData || []).filter(a => a.estado?.nombre !== 'DADO_DE_BAJA');
            setActivos(activeAssets);
        } catch (error) {
            console.error("Error al cargar datos:", error);
            showNotification('Error al cargar los datos iniciales', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingDisposicion(null);
    };

    const handleSave = async (data) => {
        if (!canManage) {
            showNotification('No tienes permiso para realizar esta acción.', 'error');
            return;
        }
        try {
            if (editingDisposicion) {
                await updateDisposicion(editingDisposicion.id, data);
                showNotification('Disposición actualizada con éxito');
            } else {
                await createDisposicion(data);
                showNotification('Disposición creada con éxito');
            }
            fetchData();
            handleCloseModal();
        } catch (error) {
            console.error("Error guardando disposición:", error.response?.data);
            showNotification(error.response?.data?.detail || 'Error al guardar la disposición', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!canManage) {
            showNotification('No tienes permiso para realizar esta acción.', 'error');
            return;
        }
        if (window.confirm('¿Seguro que quieres eliminar este registro? Esta acción no se puede deshacer.')) {
            try {
                await deleteDisposicion(id);
                showNotification('Disposición eliminada con éxito');
                fetchData();
            } catch (error) {
                showNotification('Error al eliminar la disposición', 'error');
            }
        }
    };

    return (
        <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-primary mb-2" data-tour="disposicion-titulo">Disposición de Activos</h1>
                        <p className="text-secondary">Listado de activos dados de baja, vendidos o donados.</p>
                    </div>
                    {canManage && (
                        <button onClick={() => { setEditingDisposicion(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-transform active:scale-95" data-tour="nueva-disposicion-btn">
                            <Plus size={20} /> Nueva Disposición
                        </button>
                    )}
                </div>

                <div className="bg-secondary border border-theme rounded-xl p-4 min-h-[200px]" data-tour="tabla-disposiciones">
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader className="animate-spin text-accent w-8 h-8" />
                        </div>
                    ) : disposiciones.length === 0 ? (
                        <p className="text-center text-tertiary py-12">No se han registrado disposiciones de activos.</p>
                    ) : (
                        disposiciones.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center p-3 border-b border-theme last:border-b-0 hover:bg-tertiary rounded-lg"
                            >
                                <div className="p-3 bg-accent bg-opacity-10 rounded-lg mr-4">
                                    <Archive className="text-accent" />
                                </div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <div className="flex items-center gap-2"><Box size={14} className="text-secondary" /> <span className="font-semibold text-primary">{item.activo?.nombre || 'N/A'}</span></div>
                                    <div className="flex items-center gap-2"><Info size={14} className="text-secondary" /> <span className="text-primary">{item.tipo_disposicion_display}</span></div>
                                    <div className="flex items-center gap-2"><Calendar size={14} className="text-secondary" /> <span className="text-primary">{new Date(item.fecha_disposicion).toLocaleDateString()}</span></div>
                                </div>
                                {item.tipo_disposicion === 'VENTA' && (
                                    <div className="flex items-center gap-2 text-green-500 ml-4">
                                        <DollarSign size={14} /> {parseFloat(item.valor_venta).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}
                                    </div>
                                )}
                                {canManage && (
                                    <div className="flex gap-2 ml-auto" data-tour="disposicion-item-acciones">
                                        <button onClick={() => { setEditingDisposicion(item); setIsModalOpen(true); }} className="p-2 text-primary hover:text-accent"><Edit size={18} /></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-primary hover:text-red-500"><Trash2 size={18} /></button>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingDisposicion ? "Editar Disposición" : "Registrar Nueva Disposición"}>
                {canManage ? (
                    <DisposicionForm disposicion={editingDisposicion} onSave={handleSave} onCancel={handleCloseModal} activos={activos} />
                ) : (
                    <p className="text-red-500 text-center">No tienes permiso para gestionar disposiciones.</p>
                )}
            </Modal>
            <HelpButton moduleKey="disposiciones" />
        </>
    );
}

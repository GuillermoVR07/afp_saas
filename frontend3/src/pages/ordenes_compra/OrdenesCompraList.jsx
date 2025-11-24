// src/pages/ordenes_compra/OrdenesCompraList.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Truck, Loader, Send } from 'lucide-react';
import { 
    getOrdenesCompra, createOrdenCompra, recibirOrdenCompra, getSolicitudesCompra, getProveedores, 
    getCategoriasActivos, getEstados, getUbicaciones, enviarOrdenCompra
} from '../../api/dataService';
import Modal from '../../components/Modal';
import { useNotification } from '../../context/NotificacionContext';
import { usePermissions } from '../../hooks/usePermissions';
import HelpButton from '../../components/help/HelpButton';

const OrdenCompraForm = ({ onSave, onCancel, solicitudes, proveedores }) => {
    const [solicitud_id, setSolicitudId] = useState('');
    const [proveedor_id, setProveedorId] = useState('');
    const [precio_final, setPrecioFinal] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ solicitud_id, proveedor_id, precio_final });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <select value={solicitud_id} onChange={(e) => setSolicitudId(e.target.value)} required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="">-- Seleccione una Solicitud Aprobada --</option>
                {solicitudes.map(s => <option key={s.id} value={s.id}>{s.descripcion}</option>)}
            </select>
            <select value={proveedor_id} onChange={(e) => setProveedorId(e.target.value)} required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="">-- Seleccione un Proveedor --</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <input type="number" value={precio_final} onChange={(e) => setPrecioFinal(e.target.value)} placeholder="Precio Final Acordado (Bs.)" required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" min="0.01" step="0.01" />
            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-primary hover:bg-tertiary">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-90">Crear Orden</button>
            </div>
        </form>
    );
};

const RecibirActivoForm = ({ onSave, onCancel, categorias, estados, ubicaciones }) => {
    const [categoria_id, setCategoriaId] = useState('');
    const [estado_id, setEstadoId] = useState('');
    const [ubicacion_id, setUbicacionId] = useState('');
    const [vida_util, setVidaUtil] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ categoria_id, estado_id, ubicacion_id, vida_util });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-secondary">Completa los detalles para registrar el nuevo activo en el inventario.</p>
            <select value={categoria_id} onChange={(e) => setCategoriaId(e.target.value)} required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="">-- Seleccione Categoría --</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <select value={estado_id} onChange={(e) => setEstadoId(e.target.value)} required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="">-- Seleccione Estado Inicial --</option>
                {estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
            <select value={ubicacion_id} onChange={(e) => setUbicacionId(e.target.value)} required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="">-- Seleccione Ubicación Inicial --</option>
                {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
            <input type="number" value={vida_util} onChange={(e) => setVidaUtil(e.target.value)} placeholder="Vida Útil (años)" required className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" min="1" />
            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-primary hover:bg-tertiary">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-90">Confirmar Recepción</button>
            </div>
        </form>
    );
};

const StatusBadge = ({ status }) => {
    const statusStyles = {
        GENERADA: 'bg-blue-500/20 text-blue-400',
        ENVIADA: 'bg-yellow-500/20 text-yellow-400',
        COMPLETADA: 'bg-green-500/20 text-green-400',
        CANCELADA: 'bg-red-500/20 text-red-400',
    };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status] || 'bg-gray-500/20 text-gray-400'}`}>{status}</span>;
};

export default function OrdenesCompraList() {
    const [ordenes, setOrdenes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [selectedOrden, setSelectedOrden] = useState(null);
    
    // Data for forms
    const [solicitudesAprobadas, setSolicitudesAprobadas] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [estados, setEstados] = useState([]);
    const [ubicaciones, setUbicaciones] = useState([]);

    const { showNotification } = useNotification();
    const { hasPermission, loadingPermissions } = usePermissions();
    const canManage = !loadingPermissions && hasPermission('manage_orden_compra');
    const canReceive = !loadingPermissions && hasPermission('receive_orden_compra');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [ordenesData, solData, provData, catData, estData, ubiData] = await Promise.all([
                getOrdenesCompra(),
                getSolicitudesCompra(),
                getProveedores(),
                getCategoriasActivos(),
                getEstados(),
                getUbicaciones(),
            ]);
            setOrdenes(ordenesData.results || ordenesData || []);
            setSolicitudesAprobadas((solData.results || solData || []).filter(s => s.estado === 'APROBADA' && !s.orden_compra));
            setProveedores(provData.results || provData || []);
            setCategorias(catData.results || catData || []);
            setEstados(estData.results || estData || []);
            setUbicaciones(ubiData.results || ubiData || []);
        } catch (error) {
            console.error("Error al cargar datos:", error);
            showNotification('Error al cargar los datos', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSave = async (data) => {
        try {
            await createOrdenCompra(data);
            showNotification('Orden de compra creada con éxito');
            fetchData();
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error("Error al crear orden:", error);
            showNotification(error.response?.data?.detail || 'Error al crear la orden', 'error');
        }
    };

    const handleSend = async (orden) => {
        if (window.confirm('¿Seguro que quieres marcar esta orden como enviada al proveedor?')) {
            try {
                await enviarOrdenCompra(orden.id);
                showNotification('Orden de compra marcada como enviada');
                fetchData();
            } catch (error) {
                console.error("Error al enviar orden:", error);
                showNotification(error.response?.data?.detail || 'Error al enviar la orden', 'error');
            }
        }
    };

    const handleReceive = (orden) => {
        setSelectedOrden(orden);
        setIsReceiveModalOpen(true);
    };


    const handleConfirmReceive = async (data) => {
        if (!selectedOrden) return;
        try {
            await recibirOrdenCompra(selectedOrden.id, data);
            showNotification('Activo recibido y registrado con éxito');
            fetchData();
            setIsReceiveModalOpen(false);
            setSelectedOrden(null);
        } catch (error) {
            console.error("Error al recibir activo:", error);
            showNotification(error.response?.data?.detail || 'Error al recibir el activo', 'error');
        }
    };

    return (
        <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-primary mb-2" data-tour="ordenes-compra-titulo">Órdenes de Compra</h1>
                        <p className="text-secondary">Gestiona las órdenes de compra enviadas a proveedores.</p>
                    </div>
                    {canManage && (
                        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-transform active:scale-95" data-tour="nueva-orden-btn">
                            <Plus size={20} /> Nueva Orden
                        </button>
                    )}
                </div>

                <div className="bg-secondary border border-theme rounded-xl" data-tour="tabla-ordenes">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-secondary uppercase bg-tertiary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">ID Orden</th>
                                    <th scope="col" className="px-6 py-3">Solicitud</th>
                                    <th scope="col" className="px-6 py-3">Proveedor</th>
                                    <th scope="col" className="px-6 py-3">Precio Final</th>
                                    <th scope="col" className="px-6 py-3">Fecha</th>
                                    <th scope="col" className="px-6 py-3">Estado</th>
                                    <th scope="col" className="px-6 py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="text-center py-12"><Loader className="animate-spin text-accent mx-auto" /></td></tr>
                                ) : ordenes.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center py-12 text-tertiary">No hay órdenes de compra para mostrar.</td></tr>
                                ) : (
                                    ordenes.map(o => (
                                        <tr key={o.id} className="border-b border-theme hover:bg-tertiary/40">
                                            <td className="px-6 py-4 font-mono text-xs text-accent">{o.id.substring(0, 8)}</td>
                                            <td className="px-6 py-4 font-medium text-primary">{o.solicitud.descripcion}</td>
                                            <td className="px-6 py-4 text-secondary">{o.proveedor.nombre}</td>
                                            <td className="px-6 py-4 text-secondary">{parseFloat(o.precio_final).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}</td>
                                            <td className="px-6 py-4 text-secondary">{new Date(o.fecha_orden).toLocaleDateString()}</td>
                                            <td className="px-6 py-4"><StatusBadge status={o.estado} /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2" data-tour="orden-item-acciones">
                                                    {o.estado === 'GENERADA' && canManage && (
                                                        <button onClick={() => handleSend(o)} className="flex items-center gap-2 text-xs bg-purple-500/20 text-purple-400 font-semibold px-3 py-1 rounded-full hover:bg-purple-500/30">
                                                            <Send size={14} /> Enviar
                                                        </button>
                                                    )}
                                                    {o.estado === 'ENVIADA' && canReceive && (
                                                        <button onClick={() => handleReceive(o)} className="flex items-center gap-2 text-xs bg-blue-500/20 text-blue-400 font-semibold px-3 py-1 rounded-full hover:bg-blue-500/30">
                                                            <Truck size={14} /> Recibir
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Nueva Orden de Compra">
                <OrdenCompraForm onSave={handleSave} onCancel={() => setIsCreateModalOpen(false)} solicitudes={solicitudesAprobadas} proveedores={proveedores} />
            </Modal>

            <Modal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} title="Recibir Activo">
                <RecibirActivoForm onSave={handleConfirmReceive} onCancel={() => setIsReceiveModalOpen(false)} categorias={categorias} estados={estados} ubicaciones={ubicaciones} />
            </Modal>
            <HelpButton moduleKey="ordenesCompra" />
        </>
    );
}

// src/pages/mantenimiento/MantenimientoList.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Plus, Edit, Trash2, Loader, DollarSign, Box, User, CheckSquare, Camera, X } from 'lucide-react';
import { 
    getMantenimientos, createMantenimiento, updateMantenimiento, deleteMantenimiento,
    getActivosFijos,
    getEmpleados, actualizarEstadoMantenimiento
} from '../../api/dataService';
import apiClient from '../../api/axiosConfig';
import Modal from '../../components/Modal';
import { useNotification } from '../../context/NotificacionContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
import HelpButton from '../../components/help/HelpButton';

// --- Componentes de ayuda (sin cambios) ---
const FormInput = ({ label, ...props }) => ( <div className="flex flex-col"><label className="text-sm font-medium text-secondary mb-1.5">{label}</label><input {...props} className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" /></div> );
const FormSelect = ({ label, children, ...props }) => ( <div className="flex flex-col"><label className="text-sm font-medium text-secondary mb-1.5">{label}</label><select {...props} className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent appearance-none"><option value="" disabled>-- Seleccione --</option>{children}</select></div> );
const FormTextArea = ({ label, ...props }) => ( <div className="flex flex-col"><label className="text-sm font-medium text-secondary mb-1.5">{label}</label><textarea {...props} className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" rows={3} /></div> );

// --- Componente PhotoGrid (con borrado) ---
const PhotoGrid = ({ title, photos = [], onDelete }) => {
    if (!photos || !photos.length) return null;
    const serverUrl = apiClient.defaults.baseURL.replace('/api', '');

    return (
        <div className="my-3">
            <h3 className="text-sm font-medium text-secondary mb-2">{title}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {photos.map(photo => {
                    if (!photo || !photo.foto) return null;
                    const imageUrl = photo.foto.startsWith('http') ? photo.foto : `${serverUrl}${photo.foto}`;
                    return (
                        <div key={photo.id} className="relative group">
                             <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="relative aspect-square block">
                                <img 
                                    src={imageUrl} 
                                    alt={`Foto de mantenimiento ${photo.id}`}
                                    className="w-full h-full object-cover rounded-lg bg-tertiary"
                                    onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml,..."; }}
                                />
                            </a>
                            {onDelete && (
                                <button 
                                    type="button"
                                    onClick={() => onDelete(photo.id)}
                                    className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Eliminar foto"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Formulario de Mantenimiento (con borrado) ---
const MantenimientoForm = ({ mantenimiento, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        activo_id: mantenimiento?.activo?.id || '',
        empleado_asignado_id: mantenimiento?.empleado_asignado?.id || '',
        tipo: mantenimiento?.tipo || 'CORRECTIVO',
        estado: mantenimiento?.estado || 'PENDIENTE',
        descripcion_problema: mantenimiento?.descripcion_problema || '',
        notas_solucion: mantenimiento?.notas_solucion || '',
        costo: mantenimiento?.costo || 0,
        fotos_nuevas: [],
    });
    const [deletedPhotos, setDeletedPhotos] = useState([]); // <-- Estado para fotos borradas
    const [formDeps, setFormDeps] = useState({ activos: [], empleados: [] });
    const [loadingDeps, setLoadingDeps] = useState(true);
    const { showNotification } = useNotification();
    useEffect(() => {
        const loadDependencies = async () => {
            try {
                setLoadingDeps(true);
                const [activosRes, empleadosRes] = await Promise.all([ getActivosFijos(), getEmpleados() ]);
                setFormDeps({ activos: activosRes.results || activosRes || [], empleados: empleadosRes.results || empleadosRes || [] });
            } catch (error) { showNotification('Error al cargar activos y empleados', 'error');
            } finally { setLoadingDeps(false); }
        };
        loadDependencies();
    }, [showNotification]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleFileChange = (e) => {
        setFormData(prev => ({ ...prev, fotos_nuevas: [...e.target.files] }));
    };
    const handleDeletePhoto = (photoId) => {
        setDeletedPhotos(prev => [...prev, photoId]);
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        let dataToSave = { ...formData };
        if (!dataToSave.empleado_asignado_id) dataToSave.empleado_asignado_id = null;
        
        const finalData = {
            activo_id: dataToSave.activo_id,
            empleado_asignado_id: dataToSave.empleado_asignado_id,
            tipo: dataToSave.tipo,
            estado: dataToSave.estado,
            descripcion_problema: dataToSave.descripcion_problema,
            notas_solucion: dataToSave.notas_solucion,
            costo: dataToSave.costo,
        };
        onSave(finalData, formData.fotos_nuevas, deletedPhotos); // <-- Pasar fotos borradas
    };

    if (loadingDeps) return <div className="flex justify-center items-center h-48"><Loader className="animate-spin text-accent" /></div>;
    
    // Filtrar fotos que han sido marcadas para borrar
    const fotosProblemaVisibles = mantenimiento?.fotos_problema.filter(p => !deletedPhotos.includes(p.id)) || [];
    const fotosSolucionVisibles = mantenimiento?.fotos_solucion.filter(p => !deletedPhotos.includes(p.id)) || [];

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <FormSelect name="activo_id" label="Activo Fijo (Requerido)" value={formData.activo_id} onChange={handleChange} required>
                {formDeps.activos.map(a => <option key={a.id} value={a.id}>{a.nombre} ({a.codigo_interno})</option>)}
            </FormSelect>
            <FormSelect name="empleado_asignado_id" label="Asignar a Empleado (Opcional)" value={formData.empleado_asignado_id} onChange={handleChange}>
                <option value="">-- Ninguno --</option>
                {formDeps.empleados.map(e => <option key={e.id} value={e.id}>{e.usuario?.first_name || 'Usuario'} {e.apellido_p || ''}</option>)}
            </FormSelect>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormSelect name="tipo" label="Tipo de Mantenimiento" value={formData.tipo} onChange={handleChange} required><option value="CORRECTIVO">Correctivo</option><option value="PREVENTIVO">Preventivo</option></FormSelect>
                <FormSelect name="estado" label="Estado" value={formData.estado} onChange={handleChange} required><option value="PENDIENTE">Pendiente</option><option value="EN_PROGRESO">En Progreso</option><option value="COMPLETADO">Completado</option></FormSelect>
            </div>
            <FormTextArea name="descripcion_problema" label="Descripción del Problema/Tarea" value={formData.descripcion_problema} onChange={handleChange} required />
            <FormTextArea name="notas_solucion" label="Notas de Solución (Opcional)" value={formData.notas_solucion} onChange={handleChange} />
            <FormInput name="costo" label="Costo (Bs.)" type="number" step="0.01" min="0" value={formData.costo} onChange={handleChange} />
            
            <PhotoGrid title="Fotos del Problema" photos={fotosProblemaVisibles} onDelete={handleDeletePhoto} />
            <PhotoGrid title="Fotos de la Solución" photos={fotosSolucionVisibles} onDelete={handleDeletePhoto} />
            
            {(fotosProblemaVisibles.length > 0 || fotosSolucionVisibles.length > 0) && <hr className="border-theme" />}
            
            <div className="flex flex-col pt-2">
                <label className="text-sm font-medium text-secondary mb-1.5">Añadir Fotos (Problema/Solución)</label>
                <input type="file" name="fotos_nuevas" accept="image/*" multiple onChange={handleFileChange} className="w-full p-3 bg-tertiary rounded-lg text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-opacity-90 cursor-pointer" />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-theme">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-primary hover:bg-tertiary">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-90">Guardar</button>
            </div>
        </form>
    );
};

// --- Formulario de Actualización de Estado (sin cambios, no puede borrar) ---
const UpdateStatusForm = ({ mantenimiento, onSave, onCancel }) => {
    const [estado, setEstado] = useState(mantenimiento?.estado || 'PENDIENTE');
    const [notas, setNotas] = useState(mantenimiento?.notas_solucion || '');
    const [fotosSolucion, setFotosSolucion] = useState([]);
    const handleFileChange = (e) => { setFotosSolucion([...e.target.files]); };
    const handleSubmit = (e) => { e.preventDefault(); onSave({ estado, notas_solucion: notas }, fotosSolucion); };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className='mb-4 p-3 bg-tertiary rounded'><p className='text-sm text-secondary'>Activo:</p><p className='font-medium text-primary'>{mantenimiento?.activo?.nombre || 'N/A'}</p></div>
            <FormSelect name="estado" label="Nuevo Estado" value={estado} onChange={(e) => setEstado(e.target.value)} required><option value="EN_PROGRESO">En Progreso</option><option value="COMPLETADO">Completado</option></FormSelect>
            <FormTextArea name="notas_solucion" label="Notas Adicionales" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Añade notas sobre el trabajo realizado..."/>
            
            <PhotoGrid title="Fotos del Problema" photos={mantenimiento?.fotos_problema} />
            <hr className="border-theme" />

            <div className="flex flex-col pt-2">
                <label className="text-sm font-medium text-secondary mb-1.5">Añadir Fotos de Solución</label>
                <input type="file" name="fotos_solucion" accept="image/*" multiple onChange={handleFileChange} className="w-full p-3 bg-tertiary rounded-lg text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-opacity-90 cursor-pointer" />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-theme">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-primary hover:bg-tertiary">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-90">Actualizar</button>
            </div>
        </form>
    );
};

// --- Componente Principal ---
export default function MantenimientoList() {
    const [mantenimientos, setMantenimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMantenimiento, setEditingMantenimiento] = useState(null);
    const { showNotification } = useNotification();
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [updatingMantenimiento, setUpdatingMantenimiento] = useState(null);
    const { hasPermission, loadingPermissions } = usePermissions();
    const { user } = useAuth();
    const canManage = !loadingPermissions && hasPermission('manage_mantenimiento');
    const canUpdateAssigned = !loadingPermissions && hasPermission('update_assigned_mantenimiento');

    const fetchMantenimientos = async () => {
        try {
            setLoading(true);
            const data = await getMantenimientos();
            const processedData = (data.results || data || []).map(m => ({
                ...m,
                activo_nombre: m.activo?.nombre || 'Activo Eliminado',
                empleado_nombre: m.empleado_asignado ? `${m.empleado_asignado.usuario?.first_name || ''} ${m.empleado_asignado.apellido_p || ''}`.trim() : 'N/A',
            }));
            setMantenimientos(processedData);
        } catch (error) { 
            showNotification('Error al cargar los mantenimientos','error');
        } finally { setLoading(false); }
    };
    useEffect(() => { fetchMantenimientos(); }, []);

    const handleSave = async (data, fotosNuevas, deletedPhotos) => { // <-- Recibe deletedPhotos
        try {
            if (editingMantenimiento) {
                await updateMantenimiento(editingMantenimiento.id, data, fotosNuevas, deletedPhotos); // <-- Pasa deletedPhotos
                showNotification('Mantenimiento actualizado');
            } else {
                await createMantenimiento(data, fotosNuevas);
                showNotification('Mantenimiento registrado');
            }
            fetchMantenimientos();
            handleCloseModal();
        } catch (error) { 
            showNotification(error.response?.data?.detail || 'Error al guardar el registro', 'error');
        }    
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Seguro que quieres eliminar este registro?')) {
            try {
                await deleteMantenimiento(id);
                showNotification('Registro eliminado');
                fetchMantenimientos();
            } catch (error) { showNotification('Error al eliminar','error'); }
        }
    };
    const handleUpdateStatus = async (updateData, fotosSolucion) => {
        if (!updatingMantenimiento) return;
        try {
            await actualizarEstadoMantenimiento(updatingMantenimiento.id, updateData, fotosSolucion);
            showNotification('Estado del mantenimiento actualizado');
            fetchMantenimientos();
            handleCloseUpdateModal();
        } catch (error) {
            showNotification(error.response?.data?.detail || 'Error al actualizar el estado', 'error');
        }
    };

    // (El resto del componente sigue igual...)
    const handleCloseModal = () => { setIsModalOpen(false); setEditingMantenimiento(null); };
    const openCreateModal = () => { setEditingMantenimiento(null); setIsModalOpen(true); };
    const openEditModal = (mantenimiento) => { setEditingMantenimiento(mantenimiento); setIsModalOpen(true); };
    const handleCloseUpdateModal = () => { setIsUpdateModalOpen(false); setUpdatingMantenimiento(null); };
    const openUpdateModal = (mantenimiento) => { setUpdatingMantenimiento(mantenimiento); setIsUpdateModalOpen(true); };
    const getEstadoColor = (estado) => {
        switch(estado) {
            case 'PENDIENTE': return 'text-yellow-500';
            case 'EN_PROGRESO': return 'text-blue-500';
            case 'COMPLETADO': return 'text-green-500';
            default: return 'text-secondary';
        }
    };
    const currentEmpleadoId = user?.empleado_id;
    
    return (
        <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-primary mb-2" data-tour="mantenimientos-titulo">Mantenimientos</h1>
                        <p className="text-secondary">Gestiona el historial de reparaciones y preventivos.</p>
                    </div>
                    {canManage && (
                        <button onClick={openCreateModal} className="flex items-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-transform active:scale-95" data-tour="nuevo-mantenimiento-btn">
                            <Plus size={20} /> Nuevo Registro
                        </button>
                    )}
                </div>

                {/* --- Lista de Mantenimientos --- */}
                <div className="bg-secondary border border-theme rounded-xl p-4" data-tour="lista-mantenimientos">
                    {loading ? (
                        <div className="flex justify-center items-center h-48"><Loader className="animate-spin text-accent" /></div>
                    ) : mantenimientos.length === 0 ? (
                        <p className="text-center text-tertiary py-12">No hay registros de mantenimiento.</p>
                    ) : (
                        mantenimientos.map((m, index) => {
                            const isAssignedToCurrentUser = m.empleado_asignado && m.empleado_asignado.id === currentEmpleadoId;
                            return (
                                <motion.div
                                    key={m.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-center p-3 border-b border-theme last:border-b-0 hover:bg-tertiary rounded-lg"
                                    data-tour="mantenimiento-item-info"
                                >
                                    <div className="p-3 bg-accent bg-opacity-10 rounded-lg mr-4"><Wrench className="text-accent" /></div>
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-x-4">
                                        <div><p className="font-semibold text-primary flex items-center gap-1.5"><Box size={14} /> {m.activo_nombre}</p><p className="text-sm text-secondary">{m.descripcion_problema.substring(0, 40)}...</p></div>
                                        <div><p className={`font-medium ${getEstadoColor(m.estado)}`}>{m.estado}</p><p className="text-sm text-secondary">{m.tipo}</p></div>
                                        <div><p className="text-primary flex items-center gap-1.5"><User size={14} /> {m.empleado_nombre}</p><p className="text-secondary text-sm flex items-center gap-1.5"><DollarSign size={14} /> {parseFloat(m.costo).toLocaleString('es-BO')}</p></div>
                                        <div><p className="text-sm text-primary">Inicio: {new Date(m.fecha_inicio).toLocaleDateString()}</p><p className="text-sm text-secondary">Fin: {m.fecha_fin ? new Date(m.fecha_fin).toLocaleDateString() : 'N/A'}</p></div>
                                    </div>

                                    {/* --- Botones de Acción (Condicionales) --- */}
                                    <div className="flex gap-2 ml-4 flex-shrink-0" data-tour="mantenimiento-item-acciones">
                                        {/* Botones Edit/Delete solo para Admin (canManage) */}
                                        {canManage && (
                                            <>
                                                <button onClick={() => openEditModal(m)} title="Editar (Admin)" className="p-2 text-primary hover:text-accent"><Edit size={18} /></button>
                                                <button onClick={() => handleDelete(m.id)} title="Eliminar (Admin)" className="p-2 text-primary hover:text-red-500"><Trash2 size={18} /></button>
                                            </>
                                        )}
                                        {/* Botón Actualizar Estado solo para el empleado asignado */}
                                        {isAssignedToCurrentUser && (
                                            <button onClick={() => openUpdateModal(m)} title="Actualizar Estado" className="p-2 text-primary hover:text-green-500"><CheckSquare size={18} /></button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </motion.div>

            {/* --- Modales --- */}

            {/* Modal para Crear/Editar (usado por Admin con 'canManage') */}
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingMantenimiento ? "Editar Mantenimiento" : "Nuevo Mantenimiento"}>
                <MantenimientoForm
                    mantenimiento={editingMantenimiento}
                    onSave={handleSave}
                    onCancel={handleCloseModal}
                />
            </Modal>

            {/* Modal para Actualizar Estado (usado por Empleado Asignado) */}
            <Modal isOpen={isUpdateModalOpen} onClose={handleCloseUpdateModal} title="Actualizar Estado Mantenimiento">
                {/* Pasamos el mantenimiento que se está actualizando para mostrar info y usar su ID */}
                <UpdateStatusForm
                    mantenimiento={updatingMantenimiento}
                    onSave={handleUpdateStatus}
                    onCancel={handleCloseUpdateModal}
                />
            </Modal>
            <HelpButton moduleKey="mantenimientos" />
        </>
    );
}
// src/pages/mantenimiento/MantenimientoList.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Plus, Edit, Trash2, Loader, DollarSign, Box, User, CheckSquare } from 'lucide-react';
import { 
    getMantenimientos, createMantenimiento, updateMantenimiento, deleteMantenimiento,
    getActivosFijos, // <-- Dependencia
    getEmpleados, actualizarEstadoMantenimiento    // <-- Dependencia
} from '../../api/dataService';
import Modal from '../../components/Modal';
import { useNotification } from '../../context/NotificacionContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
import HelpButton from '../../components/help/HelpButton';

// --- Componentes de ayuda para el formulario ---
const FormInput = ({ label, ...props }) => (
    <div className="flex flex-col">
        <label className="text-sm font-medium text-secondary mb-1.5">{label}</label>
        <input {...props} className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
    </div>
);

const FormSelect = ({ label, children, ...props }) => (
    <div className="flex flex-col">
        <label className="text-sm font-medium text-secondary mb-1.5">{label}</label>
        <select {...props} className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent appearance-none">
            <option value="" disabled>-- Seleccione --</option>
            {children}
        </select>
    </div>
);

const FormTextArea = ({ label, ...props }) => (
    <div className="flex flex-col">
        <label className="text-sm font-medium text-secondary mb-1.5">{label}</label>
        <textarea {...props} className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent" rows={3} />
    </div>
);


// --- Formulario de Mantenimiento ---
const MantenimientoForm = ({ mantenimiento, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        activo_id: mantenimiento?.activo?.id || '', // <-- Cambiado de 'activo'
        empleado_asignado_id: mantenimiento?.empleado_asignado?.id || '', // <-- Cambiado de 'empleado_asignado'
        tipo: mantenimiento?.tipo || 'CORRECTIVO',
        estado: mantenimiento?.estado || 'PENDIENTE',
        descripcion_problema: mantenimiento?.descripcion_problema || '',
        notas_solucion: mantenimiento?.notas_solucion || '',
        costo: mantenimiento?.costo || 0,
    });

    const [formDeps, setFormDeps] = useState({ activos: [], empleados: [] });
    const [loadingDeps, setLoadingDeps] = useState(true);
    const { showNotification } = useNotification();

    useEffect(() => {
        const loadDependencies = async () => {
            try {
                setLoadingDeps(true);
                const [activosRes, empleadosRes] = await Promise.all([
                    getActivosFijos(),
                    getEmpleados()
                ]);
                setFormDeps({
                    activos: activosRes.results || activosRes || [],
                    empleados: empleadosRes.results || empleadosRes || [],
                });
            } catch (error) {
                console.error("Error cargando dependencias", error);
                showNotification('Error al cargar activos y empleados', 'error');
            } finally {
                setLoadingDeps(false);
            }
        };
        loadDependencies();
    }, [showNotification]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setFormData(prev => ({ ...prev, foto_solucion: e.target.files[0] }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        let dataToSave = { ...formData };
        // Limpiamos FKs opcionales si están vacíos
        // El backend espera null si el ID está vacío
        if (!dataToSave.empleado_asignado_id) {
             dataToSave.empleado_asignado_id = null;
        }
        // Asegurarse de enviar solo los campos que el serializer espera al escribir
        const finalData = {
            activo_id: dataToSave.activo_id,
            empleado_asignado_id: dataToSave.empleado_asignado_id,
            tipo: dataToSave.tipo,
            estado: dataToSave.estado,
            descripcion_problema: dataToSave.descripcion_problema,
            notas_solucion: dataToSave.notas_solucion,
            costo: dataToSave.costo,
        };
        onSave(finalData, formData.foto_solucion); // Enviar solo los datos necesarios para POST/PATCH + la foto
    };

    if (loadingDeps) {
        return <div className="flex justify-center items-center h-48"><Loader className="animate-spin text-accent" /></div>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            
            <FormSelect name="activo_id" label="Activo Fijo (Requerido)" value={formData.activo_id} onChange={handleChange} required>
                {formDeps.activos.map(a => <option key={a.id} value={a.id}>{a.nombre} ({a.codigo_interno})</option>)}
            </FormSelect>

            <FormSelect name="empleado_asignado_id" label="Asignar a Empleado (Opcional)" value={formData.empleado_asignado_id} onChange={handleChange}>
                <option value="">-- Ninguno --</option>
                {/* Asegúrate que 'e.usuario' existe y tiene 'first_name' */}
                {formDeps.empleados.map(e => <option key={e.id} value={e.id}>{e.usuario?.first_name || 'Usuario'} {e.apellido_p || ''}</option>)}
            </FormSelect>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormSelect name="tipo" label="Tipo de Mantenimiento" value={formData.tipo} onChange={handleChange} required>
                    <option value="CORRECTIVO">Correctivo</option>
                    <option value="PREVENTIVO">Preventivo</option>
                </FormSelect>
                <FormSelect name="estado" label="Estado" value={formData.estado} onChange={handleChange} required>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_PROGRESO">En Progreso</option>
                    <option value="COMPLETADO">Completado</option>
                </FormSelect>
            </div>

            <FormTextArea name="descripcion_problema" label="Descripción del Problema/Tarea" value={formData.descripcion_problema} onChange={handleChange} required />
            <FormTextArea name="notas_solucion" label="Notas de Solución (Opcional)" value={formData.notas_solucion} onChange={handleChange} />
            <FormInput name="costo" label="Costo (Bs.)" type="number" step="0.01" min="0" value={formData.costo} onChange={handleChange} />
            
            <div className="flex flex-col">
                <label className="text-sm font-medium text-secondary mb-1.5">Foto de Solución (Opcional)</label>
                <input type="file" name="foto_solucion" accept="image/*" onChange={handleFileChange} className="w-full p-3 bg-tertiary rounded-lg text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-opacity-90 cursor-pointer" />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-theme">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-primary hover:bg-tertiary">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-90">Guardar</button>
            </div>
        </form>
    );
};

const UpdateStatusForm = ({ mantenimiento, onSave, onCancel }) => {
    const [estado, setEstado] = useState(mantenimiento?.estado || 'PENDIENTE');
    const [notas, setNotas] = useState(mantenimiento?.notas_solucion || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ estado: estado, notas_solucion: notas });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             {/* Mostrar info del activo (solo lectura) */}
             <div className='mb-4 p-3 bg-tertiary rounded'>
                 <p className='text-sm text-secondary'>Activo:</p>
                 <p className='font-medium text-primary'>{mantenimiento?.activo?.nombre || 'N/A'}</p>
             </div>

            <FormSelect name="estado" label="Nuevo Estado" value={estado} onChange={(e) => setEstado(e.target.value)} required>
                {/* Opciones que un empleado puede poner */}
                <option value="EN_PROGRESO">En Progreso</option>
                <option value="COMPLETADO">Completado</option>
                {/* <option value="PENDIENTE">Pendiente</option>  Quizás no debería poder volver a pendiente */}
            </FormSelect>
            <FormTextArea name="notas_solucion" label="Notas Adicionales" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Añade notas sobre el trabajo realizado..."/>

             {/* Aquí podrías añadir un input para 'foto_evidencia' */}

            <div className="flex justify-end gap-3 pt-4 border-t border-theme">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-primary hover:bg-tertiary">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-90">Actualizar</button>
            </div>
        </form>
    );
};

// --- Componente Principal de la Lista ---
export default function MantenimientoList() {
    const [mantenimientos, setMantenimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMantenimiento, setEditingMantenimiento] = useState(null);
    const { showNotification } = useNotification();
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false); // <-- Nuevo estado para el modal de estado
    const [updatingMantenimiento, setUpdatingMantenimiento] = useState(null); // <-- Mantenimiento a actualizar estado
    const { hasPermission, loadingPermissions } = usePermissions();
    const { user } = useAuth();
    const canManage = !loadingPermissions && hasPermission('manage_mantenimiento');
    const canView = !loadingPermissions && hasPermission('view_mantenimiento'); // Ver lista (Todos)

    const fetchMantenimientos = async () => {
        try {
            setLoading(true);
            const data = await getMantenimientos();
            // Pre-procesar datos para mostrar nombres
            const processedData = (data.results || data || []).map(m => ({
                ...m,
                // 'activo' ya viene anidado por el serializer
                activo_nombre: m.activo?.nombre || 'Activo Eliminado',
                // Acceder al nombre a través del objeto anidado
                empleado_nombre: m.empleado_asignado
                                 ? `${m.empleado_asignado.usuario?.first_name || ''} ${m.empleado_asignado.apellido_p || ''}`.trim()
                                 : 'N/A',
            }));
            setMantenimientos(processedData);
        } catch (error) { 
            console.error("Error al obtener mantenimientos:", error); 
            showNotification('Error al cargar los mantenimientos','error');
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchMantenimientos(); }, []);

    const handleSave = async (data, fotoSolucion) => {
        try {
            if (editingMantenimiento) {
                await updateMantenimiento(editingMantenimiento.id, data, fotoSolucion);
                showNotification('Mantenimiento actualizado');
            } else {
                await createMantenimiento(data, fotoSolucion);
                showNotification('Mantenimiento registrado');
            }
            fetchMantenimientos();
            handleCloseModal();
        } catch (error) { 
            console.error("Error al guardar:", error.response?.data || error.message);
            showNotification('Error al guardar el registro', 'error');
        }    
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Seguro que quieres eliminar este registro?')) {
            try {
                await deleteMantenimiento(id);
                showNotification('Registro eliminado');
                fetchMantenimientos();
            } catch (error) { 
                console.error("Error al eliminar:", error); 
                showNotification('Error al eliminar','error');
            }
        }
    };

    const handleUpdateStatus = async (updateData) => {
        if (!updatingMantenimiento) return;
        try {
            await actualizarEstadoMantenimiento(updatingMantenimiento.id, updateData);
            showNotification('Estado del mantenimiento actualizado');
            fetchMantenimientos();
            handleCloseUpdateModal();
        } catch (error) {
            console.error("Error al actualizar estado:", error.response?.data || error.message);
            showNotification('Error al actualizar el estado', 'error');
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingMantenimiento(null);
    };
    
    const openCreateModal = () => {
        setEditingMantenimiento(null);
        setIsModalOpen(true);
    };

    const openEditModal = (mantenimiento) => {
        setEditingMantenimiento(mantenimiento);
        setIsModalOpen(true);
    };

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
    console.log("MantenimientoList: Current Empleado ID:", currentEmpleadoId); // Para depurar
    
    return (
        <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                {/* --- Encabezado --- */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-primary mb-2" data-tour="mantenimientos-titulo">Mantenimientos</h1>
                        <p className="text-secondary">Gestiona el historial de reparaciones y preventivos.</p>
                    </div>
                    {/* Botón "Nuevo" solo visible para quien tenga permiso 'manage_mantenimiento' */}
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
                            // Determinar si el usuario actual es el asignado a esta tarea
                            // Asegúrate de que currentEmpleadoId esté definido correctamente antes del return
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
                                    {/* --- Icono --- */}
                                    <div className="p-3 bg-accent bg-opacity-10 rounded-lg mr-4">
                                        <Wrench className="text-accent" />
                                    </div>

                                    {/* --- Datos del Mantenimiento (Grid) --- */}
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-x-4">
                                        {/* Columna 1: Activo y Descripción */}
                                        <div>
                                            <p className="font-semibold text-primary flex items-center gap-1.5"><Box size={14} /> {m.activo_nombre}</p>
                                            <p className="text-sm text-secondary">{m.descripcion_problema.substring(0, 40)}...</p>
                                        </div>
                                        {/* Columna 2: Estado y Tipo */}
                                        <div>
                                            <p className={`font-medium ${getEstadoColor(m.estado)}`}>{m.estado}</p>
                                            <p className="text-sm text-secondary">{m.tipo}</p>
                                        </div>
                                        {/* Columna 3: Asignado y Costo */}
                                        <div>
                                            <p className="text-primary flex items-center gap-1.5"><User size={14} /> {m.empleado_nombre}</p>
                                            <p className="text-secondary text-sm flex items-center gap-1.5"><DollarSign size={14} /> {parseFloat(m.costo).toLocaleString('es-BO')}</p>
                                        </div>
                                        {/* Columna 4: Fechas */}
                                        <div>
                                            <p className="text-sm text-primary">Inicio: {new Date(m.fecha_inicio).toLocaleDateString()}</p>
                                            <p className="text-sm text-secondary">Fin: {m.fecha_fin ? new Date(m.fecha_fin).toLocaleDateString() : 'N/A'}</p>
                                        </div>
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
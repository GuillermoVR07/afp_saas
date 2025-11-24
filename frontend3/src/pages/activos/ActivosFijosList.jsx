// src/pages/activos/ActivosFijosList.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Box, Plus, Edit, Trash2, Loader, QrCode } from 'lucide-react';
import { 
    getActivosFijos, createActivoFijo, updateActivoFijo, deleteActivoFijo,
    getCategoriasActivos, getEstados, getUbicaciones, getProveedores, getDepartamentos
} from '../../api/dataService';
import Modal from '../../components/Modal';
import { useNotification } from '../../context/NotificacionContext';
import { usePermissions } from '../../hooks/usePermissions'; 
import apiClient from '../../api/axiosConfig';
import HelpButton from '../../components/help/HelpButton'; // Importar HelpButton

// --- Componentes de ayuda para el formulario (sin cambios) ---
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

const FormFileInput = ({ label, onChange, fileName }) => (
    <div className="flex flex-col">
        <label className="text-sm font-medium text-secondary mb-1.5">{label}</label>
        <label className="w-full p-3 bg-tertiary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent flex items-center justify-center cursor-pointer hover:bg-theme">
            <span className="text-sm">
                {fileName ? fileName : 'Seleccionar foto (Opcional)'}
            </span>
            <input 
                type="file"
                accept="image/*"
                onChange={onChange}
                className="hidden"
            />
        </label>
    </div>
);

// --- Formulario de Activo Fijo (sin cambios) ---
const ActivoFijoForm = ({ activo, onSave, onCancel }) => {
    
    const [formData, setFormData] = useState({
        nombre: activo?.nombre || '',
        codigo_interno: activo?.codigo_interno || '',
        fecha_adquisicion: (activo?.fecha_adquisicion || '').split('T')[0],
        valor_actual: activo?.valor_actual || '',
        vida_util: activo?.vida_util || '',
        departamento: activo?.departamento || '',
        categoria: activo?.categoria?.id || activo?.categoria || '',
        estado: activo?.estado?.id || activo?.estado || '',
        ubicacion: activo?.ubicacion?.id || activo?.ubicacion || '',
        proveedor: activo?.proveedor?.id || activo?.proveedor || '',
    });
    
    const [fotoFile, setFotoFile] = useState(null);

    const [formDeps, setFormDeps] = useState({ 
        categorias: [], estados: [], ubicaciones: [], proveedores: [], departamentos: []
    });
    const [loadingDeps, setLoadingDeps] = useState(true);
    const { showNotification } = useNotification();
    
    useEffect(() => {
        const loadDependencies = async () => {
            try {
                setLoadingDeps(true);
                const [catRes, estRes, ubiRes, provRes, deptoRes] = await Promise.all([
                    getCategoriasActivos(),
                    getEstados(),
                    getUbicaciones(),
                    getProveedores(),
                    getDepartamentos()
                ]);
                
                setFormDeps({
                    categorias: catRes.results || catRes || [],
                    estados: estRes.results || estRes || [],
                    ubicaciones: ubiRes.results || ubiRes || [],
                    proveedores: provRes.results || provRes || [],
                    departamentos: deptoRes.results || deptoRes || []
                });
            } catch (error) {
                console.error("Error cargando dependencias del formulario", error);
                showNotification('Error al cargar opciones del formulario', 'error');
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
        setFotoFile(e.target.files[0]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const dataToSend = new FormData();

        Object.keys(formData).forEach(key => {
            const value = formData[key];
            
            if (key === 'proveedor' || key === 'departamento') {
                dataToSend.append(key, value || '');
            } else {
                dataToSend.append(key, value);
            }
        });
        
        if (fotoFile) {
            dataToSend.append('foto_activo', fotoFile);
        }
        
        onSave(dataToSend, activo?.id);
    };

    if (loadingDeps) {
        return <div className="flex justify-center items-center h-48"><Loader className="animate-spin text-accent" /></div>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <FormInput name="nombre" label="Nombre del Activo" value={formData.nombre} onChange={handleChange} required />
            <FormInput name="codigo_interno" label="Código Interno" value={formData.codigo_interno} onChange={handleChange} required />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput name="fecha_adquisicion" label="Fecha de Adquisición" type="date" value={formData.fecha_adquisicion} onChange={handleChange} required />
                <FormInput name="valor_actual" label="Valor Actual" type="number" step="0.01" min="0" value={formData.valor_actual} onChange={handleChange} required />
                <FormInput name="vida_util" label="Vida Útil (años)" type="number" step="1" min="1" value={formData.vida_util} onChange={handleChange} required />
                
                <FormSelect name="categoria" label="Categoría" value={formData.categoria} onChange={handleChange} required>
                    {formDeps.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </FormSelect>
                
                <FormSelect name="estado" label="Estado" value={formData.estado} onChange={handleChange} required>
                    {formDeps.estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </FormSelect>
                
                <FormSelect name="ubicacion" label="Ubicación" value={formData.ubicacion} onChange={handleChange} required>
                    {formDeps.ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </FormSelect>

                <FormSelect name="departamento" label="Departamento (Opcional)" value={formData.departamento} onChange={handleChange}>
                    <option value="">-- Ninguno --</option>
                    {formDeps.departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </FormSelect>
                
                <FormSelect name="proveedor" label="Proveedor (Opcional)" value={formData.proveedor} onChange={handleChange}>
                    <option value="">-- Ninguno --</option>
                    {formDeps.proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </FormSelect>

                <div className="md:col-span-2">
                    <FormFileInput 
                        label="Foto del Activo (Opcional)"
                        onChange={handleFileChange}
                        fileName={fotoFile?.name}
                    />
                </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-theme">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-primary hover:bg-tertiary">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-90">Guardar</button>
            </div>
        </form>
    );
};


// --- Componente Principal de la Lista ---
export default function ActivosFijosList() {
    const [activos, setActivos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingActivo, setEditingActivo] = useState(null);
    const [qrModal, setQrModal] = useState({ isOpen: false, assetId: null, assetName: '' });
    const { showNotification } = useNotification();
    const { hasPermission, loadingPermissions } = usePermissions();

    const canManage = !loadingPermissions && hasPermission('manage_activofijo');

    const fetchActivosFijos = async () => {
        try {
            setLoading(true);
            const data = await getActivosFijos();
            const activosActivos = (data.results || data || []).filter(activo => activo.estado_nombre !== 'DADO_DE_BAJA');
            setActivos(activosActivos);
        } catch (error) { 
            console.error("Error al obtener activos:", error); 
            showNotification('Error al cargar los activos','error');
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { 
        fetchActivosFijos(); 
    }, []);    

    const handleSave = async (formData, activoId) => {
        try {
            if (activoId) {
                await updateActivoFijo(activoId, formData);
                showNotification('Activo actualizado con éxito');
            } else {                
                await createActivoFijo(formData);
                showNotification('Activo creado con éxito');
            }
            fetchActivosFijos();
            setIsModalOpen(false);
            setEditingActivo(null);
        } catch (error) { 
            console.error("Error al guardar activo:", error.response?.data || error.message); 
            let errorMsg = 'Error al guardar el activo';
            if (error.response?.data) {
                const errors = error.response.data;
                if (errors.detail) {
                    errorMsg = errors.detail;
                } else {
                    const firstErrorKey = Object.keys(errors)[0];
                    errorMsg = `${firstErrorKey}: ${errors[firstErrorKey][0]}`;
                }
            }
            showNotification(errorMsg, 'error');
        }    
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Seguro que quieres eliminar este activo fijo?')) {
            try {
                await deleteActivoFijo(id);
                showNotification('Activo eliminado con éxito');
                fetchActivosFijos();
            } catch (error) { 
                console.error("Error al eliminar:", error); 
                showNotification('Error al eliminar el activo','error');
            }
        }
    };

    const openCreateModal = () => {
        setEditingActivo(null);
        setIsModalOpen(true);
    };

    const openEditModal = (activo) => {
        setEditingActivo(activo);
        setIsModalOpen(true);
    };

    const handlePrint = () => {
        const qrCodeImage = document.getElementById('qr-code-image');
        if (qrCodeImage) {
            const printWindow = window.open('', '_blank');
            printWindow.document.write('<html><head><title>Código QR</title>');
            printWindow.document.write('<style>body { text-align: center; margin-top: 50px; } img { max-width: 80%; }</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(qrCodeImage.outerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
    };
    
    return (
        <>            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="mb-8 flex justify-between items-center" data-tour="activos-fijos-titulo">
                    <div>
                        <h1 className="text-4xl font-bold text-primary mb-2">Activos Fijos</h1>
                        <p className="text-secondary">Gestiona los bienes y propiedades de tu empresa.</p>
                    </div>                  
                    {canManage && (
                        <button onClick={openCreateModal} className="flex items-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-transform active:scale-95" data-tour="nuevo-activo-btn">
                            <Plus size={20} /> Nuevo Activo
                        </button>
                    )}
                </div>
                
                <div className="bg-secondary border border-theme rounded-xl p-4" data-tour="lista-activos">
                    {loading ? (
                        <div className="flex justify-center items-center h-48"><Loader className="animate-spin text-accent" /></div>
                    ) : activos.length === 0 ? (
                        <p className="text-center text-tertiary py-12">No hay activos fijos para mostrar.</p>
                    ) : (
                        activos.map((activo) => (
                            <motion.div
                                key={activo.id}
                                className="flex flex-col md:flex-row items-start p-4 border-b border-theme last:border-b-0 hover:bg-tertiary/60 rounded-lg transition-colors duration-200"
                            >
                                <div className="p-0 bg-accent bg-opacity-10 rounded-lg mr-4 mb-3 md:mb-0 flex-shrink-0" data-tour="activo-item-foto">
                                    {activo.foto_activo ? (
                                        <img src={`${apiClient.defaults.baseURL.replace('/api', '')}${activo.foto_activo}`} alt={activo.nombre} className="w-16 h-16 rounded-lg object-cover" />
                                    ) : (
                                        <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-tertiary">
                                            <Box className="text-accent" size={32} />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4" data-tour="activo-item-info">
                                    {/* Columna 1: Info Principal */}
                                    <div className="space-y-1 col-span-2 sm:col-span-1">
                                        <p className="font-bold text-lg text-primary">{activo.nombre}</p>
                                        <p className="text-sm text-secondary font-mono bg-tertiary px-2 py-0.5 rounded w-fit">{activo.codigo_interno}</p>
                                    </div>

                                    {/* Columna 2: Estado y Valor */}
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-secondary">Valor Actual</p>
                                        <p className="font-semibold text-primary">{parseFloat(activo.valor_actual).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}</p>
                                    </div>

                                    {/* Columna 3: Detalles Físicos */}
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-secondary">Ubicación</p>
                                        <p className="text-primary">{activo.ubicacion_nombre || 'N/A'}</p>
                                    </div>
                                    
                                    {/* Columna 4: Detalles Organizacionales */}
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-secondary">Departamento</p>
                                        <p className="text-primary">{activo.departamento_nombre || 'No asignado'}</p>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-secondary">Categoría</p>
                                        <p className="text-primary">{activo.categoria_nombre || 'N/A'}</p>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-secondary">Vida Útil</p>
                                        <p className="text-primary">{activo.vida_util} años</p>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-secondary">Proveedor</p>
                                        <p className="text-primary">{activo.proveedor_nombre || 'N/A'}</p>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-secondary">Adquisición</p>
                                        <p className="text-primary">{new Date(activo.fecha_adquisicion + 'T00:00:00').toLocaleDateString('es-ES')}</p>
                                    </div>
                                </div>
                                
                                {canManage && (
                                    <div className="flex gap-2 ml-auto mt-3 md:mt-0 md:ml-4 self-start" data-tour="activo-item-acciones">
                                        <button onClick={() => setQrModal({ isOpen: true, assetId: activo.id, assetName: activo.nombre })} className="p-2 text-primary hover:text-accent" title="Generar QR"><QrCode size={18} /></button>
                                        <button onClick={() => openEditModal(activo)} className="p-2 text-primary hover:text-accent" title="Editar"><Edit size={18} /></button>
                                        <button onClick={() => handleDelete(activo.id)} className="p-2 text-primary hover:text-red-500" title="Eliminar"><Trash2 size={18} /></button>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingActivo ? "Editar Activo Fijo" : "Nuevo Activo Fijo"}>
                <ActivoFijoForm 
                    activo={editingActivo} 
                    onSave={handleSave} 
                    onCancel={() => setIsModalOpen(false)} 
                />
            </Modal>

            <Modal isOpen={qrModal.isOpen} onClose={() => setQrModal({ isOpen: false, assetId: null, assetName: '' })} title={`Código QR para "${qrModal.assetName}"`}>
                <div className="text-center p-4">
                    <div id="printable-qr-area">
                        <img 
                            id="qr-code-image"
                            src={`${apiClient.defaults.baseURL}/activos-fijos/${qrModal.assetId}/qr_code/`} 
                            alt={`Código QR para ${qrModal.assetName}`}
                            className="mx-auto border-4 border-white rounded-lg"
                        />
                    </div>
                    <div className="mt-6 flex justify-center gap-4">
                        <button onClick={() => setQrModal({ isOpen: false, assetId: null, assetName: '' })} className="px-4 py-2 rounded-lg text-primary hover:bg-tertiary">Cerrar</button>
                        <button onClick={handlePrint} className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-90">Imprimir</button>
                    </div>
                </div>
            </Modal>
            <HelpButton moduleKey="activosFijos" />
        </>
    );
}
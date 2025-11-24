/*// src/api/dataService.js
import apiClient from './axiosConfig';
import { logAction } from './logService';

// --- Funciones para Departamentos ---
export const getDepartamentos = async () => {
    const response = await apiClient.get('/departamentos/');
    return response.data;
};

export const createDepartamento = async (data) => {
    const response = await apiClient.post('/departamentos/', data);
    await logAction('CREATE: Departamento', { 
        id_creado: response.data.id,
        nombre: data.nombre 
    });
    return response.data;
};

export const updateDepartamento = async (id, data) => {
    const response = await apiClient.put(`/departamentos/${id}/`, data);
    await logAction('UPDATE: Departamento', { id: id, ...data });
    return response.data;
};

export const deleteDepartamento = async (id) => {
    await apiClient.delete(`/departamentos/${id}/`);
    await logAction('DELETE: Departamento', { id: id });
    // No hay return
};

// --- Funciones para Activos Fijos ---
export const getActivosFijos = async () => {
    const response = await apiClient.get('/activos-fijos/');
    return response.data;
};

export const createActivoFijo = async (data) => {
    const response = await apiClient.post('/activos-fijos/', data);
    await logAction('CREATE: ActivoFijo', { id_creado: response.data.id, nombre: data.nombre, codigo: data.codigo_interno });
    return response.data;
};

export const updateActivoFijo = async (id, data) => {
    const response = await apiClient.put(`/activos-fijos/${id}/`, data);
    await logAction('UPDATE: ActivoFijo', { id: id, ...data });
    return response.data;
};

export const deleteActivoFijo = async (id) => {
    await apiClient.delete(`/activos-fijos/${id}/`);
    await logAction('DELETE: ActivoFijo', { id: id });
    // No hay return
};

// --- Funciones para Cargos ---
export const getCargos = async () => {
    const response = await apiClient.get('/cargos/');
    return response.data;
};

export const createCargo = async (data) => {
    const response = await apiClient.post('/cargos/', data);
    await logAction('CREATE: Cargo', { id_creado: response.data.id, nombre: data.nombre });
    return response.data;
};

export const updateCargo = async (id, data) => {
    const response = await apiClient.put(`/cargos/${id}/`, data);
    await logAction('UPDATE: Cargo', { id: id, ...data });
    return response.data;
};

export const deleteCargo = async (id) => {
    await apiClient.delete(`/cargos/${id}/`);
    await logAction('DELETE: Cargo', { id: id });
    // No hay return
};

// --- Funciones para Empleados ---
export const getEmpleados = async () => {
    const response = await apiClient.get('/empleados/');
    return response.data;
};

export const createEmpleado = async (data) => {
    const response = await apiClient.post('/empleados/', data);
    await logAction('CREATE: Empleado', { 
        id_creado: response.data.id, 
        username: data.username,
        email: data.email
    });
    return response.data;
};

export const updateEmpleado = async (id, data) => {
    const response = await apiClient.patch(`/empleados/${id}/`, data); // Usamos PATCH
    await logAction('UPDATE: Empleado', { id: id, ...data });
    return response.data;
};

export const deleteEmpleado = async (id) => {
    await apiClient.delete(`/empleados/${id}/`);
    await logAction('DELETE: Empleado', { id: id });
    // No hay return
};

// --- Funciones para Roles y Permisos ---
export const getRoles = async () => {
    const response = await apiClient.get('/roles/');
    return response.data;
};

export const createRol = async (data) => {
    const response = await apiClient.post('/roles/', data);
    await logAction('CREATE: Rol', { id_creado: response.data.id, nombre: data.nombre, permisos: data.permisos });
    return response.data;
};

export const updateRol = async (id, data) => {
    const response = await apiClient.put(`/roles/${id}/`, data);
    await logAction('UPDATE: Rol', { id: id, ...data });
    return response.data;
};

export const deleteRol = async (id) => {
    await apiClient.delete(`/roles/${id}/`);
    await logAction('DELETE: Rol', { id: id });
    // No hay return
};


// --- Funciones para Presupuestos ---
export const getPresupuestos = async () => {
    const response = await apiClient.get('/presupuestos/');
    return response.data;
};

export const createPresupuesto = async (data) => {
    const response = await apiClient.post('/presupuestos/', data);
    await logAction('CREATE: Presupuesto', { id_creado: response.data.id, monto: data.monto, departamento_id: data.departamento_id });
    return response.data;
};

export const updatePresupuesto = async (id, data) => {
    const response = await apiClient.put(`/presupuestos/${id}/`, data);
    await logAction('UPDATE: Presupuesto', { id: id, ...data });
    return response.data;
};

export const deletePresupuesto = async (id) => {
    await apiClient.delete(`/presupuestos/${id}/`);
    await logAction('DELETE: Presupuesto', { id: id });
    // No hay return
};

// --- Funciones para Ubicaciones ---
export const getUbicaciones = async () => {
    const response = await apiClient.get('/ubicaciones/');
    return response.data;
};

export const createUbicacion = async (data) => {
    const response = await apiClient.post('/ubicaciones/', data);
    await logAction('CREATE: Ubicacion', { id_creado: response.data.id, nombre: data.nombre });
    return response.data;
};

export const updateUbicacion = async (id, data) => {
    const response = await apiClient.put(`/ubicaciones/${id}/`, data);
    await logAction('UPDATE: Ubicacion', { id: id, ...data });
    return response.data;
};

export const deleteUbicacion = async (id) => {
    await apiClient.delete(`/ubicaciones/${id}/`);
    await logAction('DELETE: Ubicacion', { id: id });
    // No hay return
};

// --- Funciones para Proveedores ---
export const getProveedores = async () => {
    const response = await apiClient.get('/proveedores/');
    return response.data;
};

export const createProveedor = async (data) => {
    const response = await apiClient.post('/proveedores/', data);
    await logAction('CREATE: Proveedor', { id_creado: response.data.id, nombre: data.nombre, nit: data.nit });
    return response.data;
};

export const updateProveedor = async (id, data) => {
    const response = await apiClient.put(`/proveedores/${id}/`, data);
    await logAction('UPDATE: Proveedor', { id: id, ...data });
    return response.data;
};

export const deleteProveedor = async (id) => {
    await apiClient.delete(`/proveedores/${id}/`);
    await logAction('DELETE: Proveedor', { id: id });
    // No hay return
};

// --- Funciones para Categorías de Activos ---
export const getCategoriasActivos = async () => {
    const response = await apiClient.get('/categorias-activos/');
    return response.data;
};

export const createCategoriaActivo = async (data) => {
    const response = await apiClient.post('/categorias-activos/', data);
    await logAction('CREATE: CategoriaActivo', { id_creado: response.data.id, nombre: data.nombre });
    return response.data;
};

export const updateCategoriaActivo = async (id, data) => {
    const response = await apiClient.put(`/categorias-activos/${id}/`, data);
    await logAction('UPDATE: CategoriaActivo', { id: id, ...data });
    return response.data;
};

export const deleteCategoriaActivo = async (id) => {
    await apiClient.delete(`/categorias-activos/${id}/`);
    await logAction('DELETE: CategoriaActivo', { id: id });
    // No hay return
};

// --- Funciones para Estados de Activos ---
export const getEstados = async () => {
    const response = await apiClient.get('/estados/');
    return response.data;
};

export const createEstado = async (data) => {
    const response = await apiClient.post('/estados/', data);
    await logAction('CREATE: Estado', { id_creado: response.data.id, nombre: data.nombre });
    return response.data;
};

export const updateEstado = async (id, data) => {
    const response = await apiClient.put(`/estados/${id}/`, data);
    await logAction('UPDATE: Estado', { id: id, ...data });
    return response.data;
};

export const deleteEstado = async (id) => {
    await apiClient.delete(`/estados/${id}/`);
    await logAction('DELETE: Estado', { id: id });
    // No hay return
};

//PARA REPORTES
// --- Funciones para Reportes ---

export const downloadReporteActivos = async (params) => {
    // Define the correct path relative to the baseURL
    const urlPath = 'reportes/activos-export/'; 

    console.log(`Attempting GET request to: ${apiClient.defaults.baseURL}/${urlPath}`); // Log URL before try
    console.log("With parameters:", params); // Log params before try

    try { 
        const response = await apiClient.get(urlPath, { // Use the correct path variable
            params,
            responseType: 'blob',
        });

        // --- Download Logic (No changes needed here) ---
        const contentType = response.headers['content-type'];
        let filename = "reporte.dat";
        if (params.format === 'excel') {
            filename = "reporte_activos.xlsx";
        } else { // Default to PDF
            filename = "reporte_activos.pdf";
        }       
        const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove(); 
        console.log("Download initiated successfully."); // Log success inside try
        // --- End Download Logic ---

    } catch (error) {
        // Log the detailed error from Axios
        console.error("Axios error during download:", error.toJSON ? error.toJSON() : error);
        
        // Re-throw the error so the calling component (.catch or await) knows it failed
        throw error; 
    }
};

// Keep the corrected getReporteActivosPreview function (without leading slash)
export const getReporteActivosPreview = async (params) => {
    const urlPath = 'reportes/activos-preview/'; // NO leading slash
    console.log(`Attempting GET request to: ${apiClient.defaults.baseURL}/${urlPath}`);
    console.log("With parameters:", params);
    try {
        const response = await apiClient.get(urlPath, { params }); 
        return response.data; // Return the actual data
    } catch (error) {
        console.error("Error fetching report preview:", error.response?.data || error.message);
        throw error; // Re-throw so the component knows about the error
    }
};
// --- Funciones para Permisos (CRUD Completo) ---
export const getPermisos = async () => {
    const response = await apiClient.get('/permisos/');
    return response.data;
};

export const createPermiso = async (data) => {
    const response = await apiClient.post('/permisos/', data);
    await logAction('CREATE: Permiso', { id_creado: response.data.id, nombre: data.nombre });
    return response.data;
};

export const updatePermiso = async (id, data) => {
    const response = await apiClient.put(`/permisos/${id}/`, data);
    await logAction('UPDATE: Permiso', { id: id, ...data });
    return response.data;
};

export const deletePermiso = async (id) => {
    await apiClient.delete(`/permisos/${id}/`);
    await logAction('DELETE: Permiso', { id: id });
    // No hay return
};

//MANTENIMIENTO
export const getMantenimientos = () => apiClient.get('/mantenimientos/');
export const createMantenimiento = (data) => apiClient.post('/mantenimientos/', data);
export const updateMantenimiento = (id, data) => apiClient.patch(`/mantenimientos/${id}/`, data);
export const deleteMantenimiento = (id) => apiClient.delete(`/mantenimientos/${id}/`);

// --- Notificaciones (para el header) ---
export const getNotificaciones = () => apiClient.get('/notificaciones/');
export const markNotificacionLeida = (id) => apiClient.post(`/notificaciones/${id}/marcar-leido/`);
export const markAllNotificacionesLeidas = () => apiClient.post('/notificaciones/marcar-todo-leido/');

// --- Suscripción (para una página de perfil/plan) ---
export const getSuscripcion = () => apiClient.get('/suscripcion/');*/

// src/api/dataService.js
import apiClient from './axiosConfig';
import { logAction } from './logService';

// --- Funciones para Departamentos ---
export const getDepartamentos = async () => {
    const response = await apiClient.get('/departamentos/');
    return response.data; // Devuelve { count, next, previous, results } o [...]
};

export const createDepartamento = async (data) => {
    const response = await apiClient.post('/departamentos/', data);
    // Log DESPUÉS de éxito
    await logAction('CREATE: Departamento', { id_creado: response.data.id, nombre: data.nombre });
    return response.data; // Devuelve el objeto creado
};

export const updateDepartamento = async (id, data) => {
    const response = await apiClient.patch(`/departamentos/${id}/`, data); // Usando PATCH
    // Log DESPUÉS de éxito
    await logAction('UPDATE: Departamento', { id: id, ...data });
    return response.data; // Devuelve el objeto actualizado
};

export const deleteDepartamento = async (id) => {
    await apiClient.delete(`/departamentos/${id}/`);
    // Log DESPUÉS de éxito
    await logAction('DELETE: Departamento', { id: id });
    // No hay return
};

// --- Funciones para Activos Fijos ---
export const getActivosFijos = async () => {
    const response = await apiClient.get('/activos-fijos/');
    return response.data;
};

// Acepta FormData para fotos
export const createActivoFijo = async (formData) => {
    const response = await apiClient.post('/activos-fijos/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    // Log DESPUÉS de éxito
    await logAction('CREATE: ActivoFijo', {
        id_creado: response.data.id,
        nombre: formData.get('nombre'), // Leer de FormData
        codigo: formData.get('codigo_interno')
    });
    return response.data;
};

// Acepta FormData para fotos
export const updateActivoFijo = async (id, formData) => {
    const response = await apiClient.patch(`/activos-fijos/${id}/`, formData, { // Usando PATCH
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    // Log DESPUÉS de éxito
    await logAction('UPDATE: ActivoFijo', { id: id }); // Logueamos solo ID con FormData
    return response.data;
};

export const deleteActivoFijo = async (id) => {
    await apiClient.delete(`/activos-fijos/${id}/`);
    // Log DESPUÉS de éxito
    await logAction('DELETE: ActivoFijo', { id: id });
};

// --- Funciones para Cargos ---
export const getCargos = async () => {
    const response = await apiClient.get('/cargos/');
    return response.data;
};

export const createCargo = async (data) => {
    const response = await apiClient.post('/cargos/', data);
    // Log DESPUÉS de éxito
    await logAction('CREATE: Cargo', { id_creado: response.data.id, nombre: data.nombre });
    return response.data;
};

export const updateCargo = async (id, data) => {
    const response = await apiClient.patch(`/cargos/${id}/`, data); // Usando PATCH
    // Log DESPUÉS de éxito
    await logAction('UPDATE: Cargo', { id: id, ...data });
    return response.data;
};

export const deleteCargo = async (id) => {
    await apiClient.delete(`/cargos/${id}/`);
    // Log DESPUÉS de éxito
    await logAction('DELETE: Cargo', { id: id });
};

// --- Funciones para Empleados ---
export const getEmpleados = async () => {
    const response = await apiClient.get('/empleados/');
    return response.data;
};

// Acepta FormData para fotos
export const createEmpleado = async (formData) => {
    const response = await apiClient.post('/empleados/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    // Log DESPUÉS de éxito
    await logAction('CREATE: Empleado', {
        id_creado: response.data.id,
        username: formData.get('username'), // Leer de FormData
        email: formData.get('email')
    });
    return response.data;
};

// Acepta FormData para fotos
export const updateEmpleado = async (id, formData) => {
    const response = await apiClient.patch(`/empleados/${id}/`, formData, { // Usando PATCH
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    // Log DESPUÉS de éxito
    await logAction('UPDATE: Empleado', { id: id }); // Logueamos solo ID con FormData
    return response.data;
};

export const deleteEmpleado = async (id) => {
    await apiClient.delete(`/empleados/${id}/`);
    // Log DESPUÉS de éxito
    await logAction('DELETE: Empleado', { id: id });
};

// --- Funciones para Roles ---
export const getRoles = async () => {
    const response = await apiClient.get('/roles/');
    return response.data;
};

export const createRol = async (data) => {
    const response = await apiClient.post('/roles/', data);
    // Log DESPUÉS de éxito
    await logAction('CREATE: Rol', { id_creado: response.data.id, nombre: data.nombre, permisos: data.permisos });
    return response.data;
};

export const updateRol = async (id, data) => {
    const response = await apiClient.patch(`/roles/${id}/`, data); // Usando PATCH
    // Log DESPUÉS de éxito
    await logAction('UPDATE: Rol', { id: id, ...data });
    return response.data;
};

export const deleteRol = async (id) => {
    await apiClient.delete(`/roles/${id}/`);
    // Log DESPUÉS de éxito
    await logAction('DELETE: Rol', { id: id });
};

// --- [NUEVO] Funciones para Módulo de Presupuesto ---

// Periodos Presupuestarios
export const getPeriodos = () => apiClient.get('/periodos-presupuestarios/');
export const createPeriodo = async (data) => {
    const response = await apiClient.post('/periodos-presupuestarios/', data);
    await logAction('CREATE: PeriodoPresupuestario', { id_creado: response.data.id, nombre: data.nombre });
    return response.data;
};
export const updatePeriodo = async (id, data) => {
    const response = await apiClient.patch(`/periodos-presupuestarios/${id}/`, data);
    await logAction('UPDATE: PeriodoPresupuestario', { id: id, ...data });
    return response.data;
};
export const deletePeriodo = async (id) => {
    await apiClient.delete(`/periodos-presupuestarios/${id}/`);
    await logAction('DELETE: PeriodoPresupuestario', { id: id });
};

// Partidas Presupuestarias
export const getPartidas = (params) => apiClient.get('/partidas-presupuestarias/', { params });
export const createPartida = async (data) => {
    const response = await apiClient.post('/partidas-presupuestarias/', data);
    await logAction('CREATE: PartidaPresupuestaria', { id_creado: response.data.id, nombre: data.nombre, periodo_id: data.periodo_id });
    return response.data;
};
export const updatePartida = async (id, data) => {
    const response = await apiClient.patch(`/partidas-presupuestarias/${id}/`, data);
    await logAction('UPDATE: PartidaPresupuestaria', { id: id, ...data });
    return response.data;
};
export const deletePartida = async (id) => {
    await apiClient.delete(`/partidas-presupuestarias/${id}/`);
    await logAction('DELETE: PartidaPresupuestaria', { id: id });
};

// Movimientos Presupuestarios (Solo lectura)
export const getMovimientos = (params) => apiClient.get('/movimientos-presupuestarios/', { params }); // params: { partida_id: '...' }


// --- Funciones para Ubicaciones ---
export const getUbicaciones = async () => {
    const response = await apiClient.get('/ubicaciones/');
    return response.data;
};

export const createUbicacion = async (data) => {
    const response = await apiClient.post('/ubicaciones/', data);
    // Log DESPUÉS de éxito
    await logAction('CREATE: Ubicacion', { id_creado: response.data.id, nombre: data.nombre });
    return response.data;
};

export const updateUbicacion = async (id, data) => {
    const response = await apiClient.patch(`/ubicaciones/${id}/`, data); // Usando PATCH
    // Log DESPUÉS de éxito
    await logAction('UPDATE: Ubicacion', { id: id, ...data });
    return response.data;
};

export const deleteUbicacion = async (id) => {
    await apiClient.delete(`/ubicaciones/${id}/`);
    // Log DESPUÉS de éxito
    await logAction('DELETE: Ubicacion', { id: id });
};

// --- Funciones para Proveedores ---
export const getProveedores = async () => {
    const response = await apiClient.get('/proveedores/');
    return response.data;
};

export const createProveedor = async (data) => {
    const response = await apiClient.post('/proveedores/', data);
    await logAction('CREATE: Proveedor', { id_creado: response.data.id, nombre: data.nombre, nit: data.nit });
    return response.data;
};

export const updateProveedor = async (id, data) => {
    const response = await apiClient.patch(`/proveedores/${id}/`, data);
    await logAction('UPDATE: Proveedor', { id: id, ...data });
    return response.data;
};

export const deleteProveedor = async (id) => {
    await apiClient.delete(`/proveedores/${id}/`);
    await logAction('DELETE: Proveedor', { id: id });
};

// --- Funciones para Categorías de Activos ---
export const getCategoriasActivos = async () => {
    const response = await apiClient.get('/categorias-activos/');
    return response.data;
};

export const createCategoriaActivo = async (data) => {
    const response = await apiClient.post('/categorias-activos/', data);
    // Log DESPUÉS de éxito
    await logAction('CREATE: CategoriaActivo', { id_creado: response.data.id, nombre: data.nombre });
    return response.data;
};

export const updateCategoriaActivo = async (id, data) => {
    const response = await apiClient.patch(`/categorias-activos/${id}/`, data); // Usando PATCH
    // Log DESPUÉS de éxito
    await logAction('UPDATE: CategoriaActivo', { id: id, ...data });
    return response.data;
};

export const deleteCategoriaActivo = async (id) => {
    await apiClient.delete(`/categorias-activos/${id}/`);
    // Log DESPUÉS de éxito
    await logAction('DELETE: CategoriaActivo', { id: id });
};

// --- Funciones para Estados de Activos ---
export const getEstados = async () => {
    const response = await apiClient.get('/estados/');
    return response.data;
};

export const createEstado = async (data) => {
    const response = await apiClient.post('/estados/', data);
    // Log DESPUÉS de éxito
    await logAction('CREATE: Estado', { id_creado: response.data.id, nombre: data.nombre });
    return response.data;
};

export const updateEstado = async (id, data) => {
    const response = await apiClient.patch(`/estados/${id}/`, data); // Usando PATCH
    // Log DESPUÉS de éxito
    await logAction('UPDATE: Estado', { id: id, ...data });
    return response.data;
};

export const deleteEstado = async (id) => {
    await apiClient.delete(`/estados/${id}/`);
    // Log DESPUÉS de éxito
    await logAction('DELETE: Estado', { id: id });
};

// --- Funciones para Reportes ---
export const getReporteActivosPreview = async (params) => {
    const urlPath = 'reportes/activos-preview/';
    try {
        const response = await apiClient.get(urlPath, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching report preview:", error.response?.data || error.message);
        throw error;
    }
};

export const downloadReporteActivos = async (params) => {
    const urlPath = 'reportes/activos-export/';
    try {
        const response = await apiClient.get(urlPath, { params, responseType: 'blob' });
        // Lógica de descarga...
        const contentType = response.headers['content-type'];
        let filename = params.format === 'excel' ? "reporte_activos.xlsx" : "reporte_activos.pdf";
        const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Log DESPUÉS de éxito
        await logAction('EXPORT: Reporte Activos', { format: params.format, filtros: params });
    } catch (error) {
        console.error("Axios error during download:", error.toJSON ? error.toJSON() : error);
        await logAction('ERROR: Export Reporte Activos', { error: error.message, filtros: params }); // Loguear error
        throw error;
    }
};

// --- Funciones para Permisos (Solo SuperAdmin - Asegúrate que frontend lo controle) ---
export const getPermisos = async () => {
    const response = await apiClient.get('/permisos/');
    return response.data;
};

export const createPermiso = async (data) => {
    const response = await apiClient.post('/permisos/', data);
    // Log DESPUÉS de éxito
    await logAction('CREATE: Permiso Global', { id_creado: response.data.id, nombre: data.nombre });
    return response.data;
};

export const updatePermiso = async (id, data) => {
    const response = await apiClient.patch(`/permisos/${id}/`, data); // Usando PATCH
    // Log DESPUÉS de éxito
    await logAction('UPDATE: Permiso Global', { id: id, ...data });
    return response.data;
};

export const deletePermiso = async (id) => {
    await apiClient.delete(`/permisos/${id}/`);
    // Log DESPUÉS de éxito
    await logAction('DELETE: Permiso Global', { id: id });
};

// --- Funciones para Mantenimiento ---
export const getMantenimientos = async () => {
    const response = await apiClient.get('/mantenimientos/');
    return response.data;
};

export const createMantenimiento = async (data, fotosNuevas) => {
    const formData = new FormData();
    // Agrega los datos de texto
    for (const key in data) {
        if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    }
    // Agrega las fotos nuevas
    if (fotosNuevas && fotosNuevas.length > 0) {
        fotosNuevas.forEach(file => {
            formData.append('fotos_nuevas', file); // El backend espera una lista
        });
    }

    const response = await apiClient.post('/mantenimientos/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    await logAction('CREATE: Mantenimiento', { id_creado: response.data.id, activo_id: data.activo_id });
    return response.data;
};

export const updateMantenimiento = async (id, data, fotosNuevas, deletedPhotos) => {
    const formData = new FormData();
    for (const key in data) {
        if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    }
    if (fotosNuevas && fotosNuevas.length > 0) {
        fotosNuevas.forEach(file => {
            formData.append('fotos_nuevas', file);
        });
    }
    // Añadir IDs de fotos a eliminar
    if (deletedPhotos && deletedPhotos.length > 0) {
        deletedPhotos.forEach(photoId => {
            formData.append('fotos_a_eliminar', photoId);
        });
    }
    
    const response = await apiClient.patch(`/mantenimientos/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    await logAction('UPDATE: Mantenimiento', { id: id, ...data });
    return response.data;
};

export const deleteMantenimiento = async (id) => {
    await apiClient.delete(`/mantenimientos/${id}/`);
    await logAction('DELETE: Mantenimiento', { id: id });
};

export const actualizarEstadoMantenimiento = async (id, data, fotosSolucion) => {
    const formData = new FormData();
    for (const key in data) {
        if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    }
    if (fotosSolucion && fotosSolucion.length > 0) {
        fotosSolucion.forEach(file => {
            formData.append('fotos_solucion', file);
        });
    }
    
    const response = await apiClient.post(`/mantenimientos/${id}/actualizar-estado/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    await logAction('UPDATE_STATUS: Mantenimiento', { id: id, ...data });
    return response.data;
};

// --- Funciones para Notificaciones ---
export const getNotificaciones = async () => {
    const response = await apiClient.get('/notificaciones/');
    return response.data;
};

// No logueamos acciones de lectura de notificaciones (muy frecuentes)
export const markNotificacionLeida = async (id) => {
    const response = await apiClient.post(`/notificaciones/${id}/marcar-leido/`);
    return response.data;
};

export const markAllNotificacionesLeidas = async () => {
    const response = await apiClient.post('/notificaciones/marcar-todo-leido/');
    return response.data;
};

// --- Funciones para Suscripción ---
// Solo lectura, no requiere log de acción
export const getSuscripcion = async () => {
    const response = await apiClient.get('/suscripcion/');
    return response.data;
};

// --- [NUEVO] Funciones para Revalorización ---
export const getRevalorizaciones = async (activoId) => {
    // Filtra el historial por el ID de un activo específico
    const response = await apiClient.get('/revalorizaciones/', { params: { activo_id: activoId } });
    return response.data;
};

export const ejecutarRevalorizacion = async (data) => {
    // data debe ser { activo_id, factor, notas }
    const response = await apiClient.post('/revalorizaciones/ejecutar/', data);
    await logAction('EXECUTE: Revalorizacion', { activo_id: data.activo_id, factor: data.factor });
    return response.data;
};

// --- [NUEVO] Funciones para Depreciación ---
export const getDepreciaciones = async (activoId) => {
    // Filtra el historial por el ID de un activo específico
    const response = await apiClient.get('/depreciaciones/', { params: { activo_id: activoId } });
    return response.data;
};

export const ejecutarDepreciacion = async (data) => {
    // data: { activo_id, depreciation_type, y otros campos... }
    const response = await apiClient.post('/depreciaciones/ejecutar/', data);
    await logAction('EXECUTE: Depreciacion', { ...data });
    return response.data;
};

// --- [NUEVO] Funciones para Disposición de Activos ---
export const getDisposiciones = async () => {
    const response = await apiClient.get('/disposiciones/');
    return response.data;
};

export const createDisposicion = async (data) => {
    const response = await apiClient.post('/disposiciones/', data);
    await logAction('CREATE: DisposicionActivo', { id_creado: response.data.id, activo_id: data.activo_id, tipo: data.tipo_disposicion });
    return response.data;
};

export const updateDisposicion = async (id, data) => {
    const response = await apiClient.patch(`/disposiciones/${id}/`, data);
    await logAction('UPDATE: DisposicionActivo', { id: id, ...data });
    return response.data;
};

export const deleteDisposicion = async (id) => {
    await apiClient.delete(`/disposiciones/${id}/`);
    await logAction('DELETE: DisposicionActivo', { id: id });
    return null;
};

// --- [NUEVO] Flujo de Adquisición ---

// --- Solicitudes de Compra ---
export const getSolicitudesCompra = async () => {
    const response = await apiClient.get('/solicitudes-compra/');
    return response.data;
};

export const createSolicitudCompra = async (data) => {
    const response = await apiClient.post('/solicitudes-compra/', data);
    await logAction('CREATE: SolicitudCompra', { id_creado: response.data.id, depto: data.departamento_id });
    return response.data;
};

export const decidirSolicitudCompra = async (id, data) => {
    // data: { decision: 'aprobar'/'rechazar', motivo_rechazo: '...' }
    const response = await apiClient.post(`/solicitudes-compra/${id}/decidir/`, data);
    await logAction('DECIDE: SolicitudCompra', { id: id, decision: data.decision });
    return response.data;
};

// --- Órdenes de Compra ---
export const getOrdenesCompra = async () => {
    const response = await apiClient.get('/ordenes-compra/');
    return response.data;
};

export const createOrdenCompra = async (data) => {
    const response = await apiClient.post('/ordenes-compra/', data);
    await logAction('CREATE: OrdenCompra', { id_creado: response.data.id, solicitud_id: data.solicitud_id });
    return response.data;
};

export const recibirOrdenCompra = async (id, data) => {
    // data: { categoria_id, estado_id, ubicacion_id, vida_util }
    const response = await apiClient.post(`/ordenes-compra/${id}/recibir/`, data);
    await logAction('RECEIVE: OrdenCompra', { id: id, activo_creado: response.data.id });
    return response.data;
};

export const enviarOrdenCompra = async (id) => {
    const response = await apiClient.post(`/ordenes-compra/${id}/enviar/`);
    await logAction('SEND: OrdenCompra', { id: id });
    return response.data;
};

// --- Función para actualizar Tema (ya la tenías) ---
export const updateMyThemePreferences = async (preferences) => {
    const response = await apiClient.patch('/me/theme/', preferences);
    // Loguear cambio de tema (opcional, puede ser ruidoso)
    await logAction('UPDATE: ThemePreferences', preferences);
    return response.data;
};

export const getReportePorQuery = async (query) => {
    const urlPath = 'reportes/query/'; // Nuevo endpoint
    try {
        // Usamos POST para enviar el array de filtros en el body
        const response = await apiClient.post(urlPath, query); 
        return response.data; // Devuelve la lista de resultados
    } catch (error) {
        console.error("Error fetching query report preview:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Exporta un reporte basado en filtros dinámicos.
 * @param {object} query - Objeto que contiene { filters: [...], format: 'pdf' }
 */
export const downloadReportePorQuery = async (query) => {
    const urlPath = 'reportes/query/export/'; // Nuevo endpoint de exportación
    try {
        // Usamos POST para enviar filtros y formato, esperamos un 'blob'
        const response = await apiClient.post(urlPath, query, { 
            responseType: 'blob' 
        });
        
        // Lógica de descarga (igual que antes)
        const contentType = response.headers['content-type'];
        let filename = query.format === 'excel' ? "reporte_personalizado.xlsx" : "reporte_personalizado.pdf";
        const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        // Loguear la acción
        await logAction('EXPORT: Reporte Query', { format: query.format, filters: query.filters });

    } catch (error) {
        console.error("Axios error during query download:", error.toJSON ? error.toJSON() : error);
        await logAction('ERROR: Export Reporte Query', { error: error.message, filters: query.filters });
        throw error;
    }
};

export const getDashboardData = async () => {
    const response = await apiClient.get('/dashboard/');
    return response.data;
};

// --- [NUEVO] Funciones para Reporte de Presupuestos ---
export const getReportePresupuestos = async (params) => {
    const urlPath = 'reportes-presupuestos/';
    try {
        const response = await apiClient.get(urlPath, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching budget report:", error.response?.data || error.message);
        throw error;
    }
};
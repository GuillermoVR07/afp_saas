/*// src/hooks/usePermissions.js
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import {getRoles} from '../api/dataService'
import apiClient from '../api/axiosConfig';

// --- MAPEO DE ROLES A MÓDULOS ---
// Define aquí qué roles pueden ver qué módulos.
// ¡ESTO ES CLAVE! Ajusta los nombres de roles ("Admin", "Jefe", "Empleado")
// a los que realmente uses en tu base de datos.
const roleAccess = {
    // Módulos principales
    'dashboard': ['Admin', 'Jefe', 'Empleado'],
    'activos_fijos': ['Admin', 'Jefe', 'Empleado'], // Todos ven, pero acciones varían
    'departamentos': ['Admin', 'Jefe'],
    'cargos': ['Admin', 'Jefe'],
    'empleados': ['Admin', 'Jefe'],
    'roles': ['Admin'], // Solo Admin gestiona roles
    'permisos': ['Admin'], // Solo Admin gestiona permisos
    'presupuestos': ['Admin', 'Jefe'], // Jefes ven, Admin crea/edita?
    
    // Módulos de soporte (configuración)
    'ubicaciones': ['Admin', 'Jefe'],
    'proveedores': ['Admin', 'Jefe'],
    'categorias': ['Admin', 'Jefe'],
    'estados': ['Admin', 'Jefe'],
    
    // Otros
    'reportes': ['Admin', 'Jefe'],
    'settings': ['Admin', 'Jefe', 'Empleado'], // Todos pueden personalizar
};
// --- FIN DEL MAPEO ---

export let roleDetailsCache = null; 
// --- FIN ---

// --- AÑADE UNA FUNCIÓN PARA LIMPIAR ---
export const clearRoleCache = () => {
    console.log("Clearing role details cache...");
    roleDetailsCache = null; 
};

const fetchMyPermissions = async () => {
    try {
        console.log("Fetching MY permissions...");
        const response = await apiClient.get('/my-permissions/'); // Use new endpoint
        console.log("My permissions fetched:", response.data);
        return new Set(response.data || []); // Return a Set for efficient lookup
    } catch (error) {
        console.error("Error fetching user permissions:", error);
        return new Set(); // Return empty set on error
    }
};

export const usePermissions = () => {
    const { userRoles, userIsAdmin, isAuthenticated } = useAuth();
    const [userPermissions, setUserPermissions] = useState(new Set());
    const [loadingPermissions, setLoadingPermissions] = useState(true);

    useEffect(() => {
        const fetchPermissions = async () => {
            if (!isAuthenticated || userIsAdmin) {
                setLoadingPermissions(false); // No need to fetch for guests or superadmin
                return;
            }
            if (roleDetailsCache === null) {
                console.log("Fetching role details for permissions...");
                 try {
                     // Fetch ALL roles for the company (or filter if possible)
                     // NOTE: This assumes getRoles returns roles with their permissions embedded
                     // You might need a different endpoint or modify RolesSerializer
                     const rolesData = await getRoles(); 
                     roleDetailsCache = rolesData.results || rolesData || [];
                     console.log("Role details fetched:", roleDetailsCache);
                 } catch (error) {
                     console.error("Error fetching role details:", error);
                     roleDetailsCache = []; // Prevent retrying on error
                 }
            }

            const currentPermissions = new Set();
            // userRoles currently holds NAMES, find matching roles in cache
            const userRoleObjects = roleDetailsCache.filter(role => userRoles.includes(role.nombre));

            userRoleObjects.forEach(role => {
                // Assumes role object has a 'permisos_details' array or similar
                // containing { id: 'uuid', nombre: 'perm_name', ... }
                // Adjust this based on your RolesSerializer output!
                (role.permisos_details || role.permisos || []).forEach(perm => {
                     // Check if perm is an object or just an ID
                     if (typeof perm === 'object' && perm.nombre) {
                         currentPermissions.add(perm.nombre);
                     } else if (typeof perm === 'string') {
                         // If only IDs are returned, you'd need another fetch
                         // to get permission names based on IDs - more complex.
                         // For now, assume names or objects are returned.
                         console.warn("Permissions seem to be IDs, cannot check by name:", perm);
                     }
                });
            });
            
            console.log("User Permissions Set:", currentPermissions);
            setUserPermissions(currentPermissions);
            setLoadingPermissions(false);
        };

        fetchPermissions();
        // Rerun if userRoles change (e.g., after login/logout)
    }, [userRoles, userIsAdmin, isAuthenticated]);

    // El SuperAdmin siempre tiene acceso a todo
    if (userIsAdmin) {
        return {
            canAccess: (moduleName) => true,
            hasRole: (roleName) => true,
            loadingPermissions: false,//recien agregado
        };
    }

    const canAccess = (moduleName) => {
        // Busca el módulo en nuestro mapeo
        const allowedRoles = roleAccess[moduleName.toLowerCase()];
        
        // Si el módulo no está definido o no hay roles permitidos, denegar
        if (!allowedRoles || allowedRoles.length === 0) {
            return false;
        }
        
        // Verifica si *alguno* de los roles del usuario está en la lista de roles permitidos
        return userRoles.some(userRoleName => allowedRoles.includes(userRoleName));
    };

    const hasPermission = (permissionName) => {
        return userPermissions.has(permissionName);
    };


    const hasRole = (roleName) => userRoles.includes(roleName);
        // Verifica si el nombre del rol está en la lista de ro


    return { canAccess, hasPermission, loadingPermissions, hasRole };
};*/
// src/hooks/usePermissions.js
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import {getRoles} from '../api/dataService'
import apiClient from '../api/axiosConfig';

// --- Sidebar Visibility Mapping (Based on Role Names in Token) ---
// This defines which ROLES can see which main sections in the sidebar.
// Adjust role names ("Admin", "Jefe", "Empleado") if yours are different.
const roleAccess = {
    // Main modules
    'dashboard': ['Admin', 'Jefe', 'Empleado'],
    'activos_fijos': ['Admin', 'Jefe', 'Empleado'],
    'departamentos': ['Admin', 'Jefe'],
    'cargos': ['Admin', 'Jefe'],
    'empleados': ['Admin', 'Jefe'],
    'roles': ['Admin'],         // Only company Admins manage roles
    'permisos': ['Admin'],      // Only company Admins view global permissions list
    'presupuestos': ['Admin', 'Jefe'],

    // Support modules (configuration)
    'ubicaciones': ['Admin', 'Jefe'],
    'proveedores': ['Admin', 'Jefe'],
    'categorias': ['Admin', 'Jefe'], // Assumes 'categorias' refers to 'categorias-activos' internally
    'estados': ['Admin', 'Jefe'],

    // Other modules
    'reportes': ['Admin', 'Jefe'],
    'settings': ['Admin', 'Jefe', 'Empleado'], // All users can access settings
};

const moduleViewPermissions = {
    'dashboard': 'view_dashboard',
    'activos_fijos': 'view_activofijo',
    'departamentos': 'view_departamento',
    'cargos': 'view_cargo',
    'empleados': 'view_empleado',
    'roles': 'view_rol', // Might only be needed if manage_rol is present
    'permisos': 'view_permiso', // Usually only SuperAdmin
    'presupuestos': 'view_presupuesto',
    'ubicaciones': 'view_ubicacion',
    'proveedores': 'view_proveedor',
    'categorias': 'view_categoriaactivo',
    'estados': 'view_estadoactivo',
    'reportes': 'view_reporte',
    'settings': 'manage_settings', // Or a dedicated view_settings if created
    'mantenimientos': 'view_mantenimiento',
    'revalorizaciones': 'view_revalorizacion',
    'depreciaciones': 'view_depreciacion',
    'disposiciones': 'view_disposicion', 
    'solicitudes_compra': 'view_solicitud_compra',
    'ordenes_compra': 'view_orden_compra',
    'suscripcion': 'view_suscripcion',
};
// --- End Sidebar Mapping ---

// --- Helper Function to Fetch Permissions for the Current User ---
const fetchMyPermissions = async () => {
    try {
        console.log("Fetching MY permissions...");
        // Calls the specific endpoint we created in views.py
        const response = await apiClient.get('/my-permissions/'); 
        const permissionsList = response.data || [];
        console.log("My permissions fetched:", permissionsList);
        // Return a Set for efficient 'has' checks later
        return new Set(permissionsList); 
    } catch (error) {
        console.error("Error fetching user permissions:", error.response?.data || error.message);
        // Return an empty Set in case of error to prevent crashes
        return new Set(); 
    }
};
// --- End Helper Function ---


// --- The Main Permissions Hook ---
export const usePermissions = () => {
    
    const { userRoles, userIsAdmin: isSuperAdmin, isAuthenticated } = useAuth(); 
    const [userPermissions, setUserPermissions] = useState(new Set());     
    const [loadingPermissions, setLoadingPermissions] = useState(true);

    // Effect to load permissions when authentication status changes
    useEffect(() => {
        let isMounted = true; // Prevent state updates if component unmounts quickly

        const loadPermissions = async () => {
            setLoadingPermissions(true); // Start loading indicator
            let permissionsSet = new Set(); // Default to empty set

            // Only fetch if logged in AND not a Django SuperAdmin (SuperAdmin has all perms)
            if (isAuthenticated && !isSuperAdmin) {
                permissionsSet = await fetchMyPermissions();
            } else if (isSuperAdmin) {
                // Optionally add a flag for superadmin if needed elsewhere
                // permissionsSet.add('is_superuser'); 
                console.log("User is SuperAdmin, skipping individual permission fetch.");
            }
            
            console.log(`Permissions loaded for user (Roles: ${userRoles.join(', ')}):`, Array.from(permissionsSet));
            // Update state only if the component is still mounted
            if (isMounted) {
                setUserPermissions(permissionsSet);
                setLoadingPermissions(false); // Stop loading indicator
                console.log("Permissions state updated:", permissionsSet);
            }
        };

        loadPermissions();

        // Cleanup function to prevent setting state on unmounted component
        return () => { 
            isMounted = false; 
            console.log("usePermissions cleanup ran.");
        };
        // Dependency array: Re-run effect if authentication status or superadmin flag changes
    }, [isAuthenticated, isSuperAdmin]); 

    // --- Special case for Django SuperAdmin ---
    // If the user is a SuperAdmin (is_staff=True), grant all permissions automatically.
    if (isSuperAdmin) {
        console.log("usePermissions returning full access for SuperAdmin.");
        return {
            canAccess: (moduleName) => true, // Siempre puede acceder al módulo
            hasPermission: (permissionName) => true, // Siempre tiene el permiso específico
            loadingPermissions: false,
            hasRole: (roleName) => true, // Podemos decir que tiene todos los roles si es necesario
        };
    }

    const canAccess = (moduleName) => {
        // WORKAROUND: For 'disposiciones' module, check manage_disposicion instead of view_disposicion
        if (moduleName.toLowerCase() === 'disposiciones') {
            return userPermissions.has('manage_disposicion');
        }

        // Find the required view permission for this module
        const requiredPermission = moduleViewPermissions[moduleName.toLowerCase()];

        // If no permission is defined for the module, deny access
        if (!requiredPermission) {
            console.log(`--> Sidebar access DENIED for [${moduleName}] (no view permission defined)`);
            return false;
        }

        // Check if the user's fetched permissions include the required one
        const hasAccess = userPermissions.has(requiredPermission);
        console.log(`--> Sidebar access check for [${moduleName}]: Requires [${requiredPermission}]. User has it?`, hasAccess);
        return hasAccess;
    };
    
    // Function to check for specific PERMISSION names (fetched from API)
    const hasPermission = (permissionName) => {
        const hasPerm = userPermissions.has(permissionName);
        // console.log(`Permission check: Has [${permissionName}]? ${hasPerm}`);
        return hasPerm;
    };

    // Function to check if the user has a specific ROLE name (from JWT)
    const hasRole = (roleName) => {
        const has = userRoles.includes(roleName);
        // console.log(`Role check: Has role [${roleName}]? ${has}`);
        return has;
    };

    // Return the functions and loading state for components to use
    return { canAccess, hasPermission, loadingPermissions, hasRole }; 
};

// No need for clearRoleCache or exporting roleDetailsCache with this approach
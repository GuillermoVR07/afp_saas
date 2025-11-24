// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/login/LoginPage';
import SubscriptionPage from './pages/public/SubscriptionPage';
import PaymentPage from './pages/public/PaymentPage';

// Importar todas las páginas que estaban en Layout
import DashboardPage from './pages/dashboard/DashboardPage';
import DepartamentosList from './pages/departamentos/DepartamentosList';
import ActivosFijosList from './pages/activos/ActivosFijosList';
import CargosList from './pages/cargos/CargosList';
import EmpleadosList from './pages/empleados/EmpleadosList';
import RolesList from './pages/roles/RolesList';
import PeriodosPresupuestariosList from './pages/presupuesto/PeriodosPresupuestariosList';
import UbicacionesList from './pages/ubicaciones/UbicacionesList';
import ProveedoresList from './pages/proveedores/ProveedoresList';
import CategoriasActivosList from './pages/categorias/CategoriasActivosList';
import EstadosList from './pages/estados/EstadosList';
import ReportesPage from './pages/reportes/ReportesPage';
import PermisosList from './pages/permisos/PermisosList';
import MantenimientoList from './pages/mantenimiento/MantenimientoList';
import RevalorizacionPage from './pages/revalorizacion/RevalorizacionPage';
import DepreciacionPage from './pages/depreciacion/DepreciacionPage';
import SolicitudesCompraList from './pages/solicitudes_compra/SolicitudesCompraList';
import OrdenesCompraList from './pages/ordenes_compra/OrdenesCompraList';
import SuscripcionPage from './pages/suscripcion/SuscripcionPage';
import DisposicionList from './pages/disposicion/DisposicionList';
import Settings from './components/Settings';


export default function App() {
  return (
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/" element={<Navigate to="/subscribe" />} />
      <Route path="/subscribe" element={<SubscriptionPage />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas Privadas anidadas dentro del Layout */}
      <Route 
        path="/app" 
        element={<PrivateRoute><Layout /></PrivateRoute>}
      >
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="departamentos" element={<DepartamentosList />} />
        <Route path="activos-fijos" element={<ActivosFijosList />} />
        <Route path="cargos" element={<CargosList />} />
        <Route path="empleados" element={<EmpleadosList />} />
        <Route path="roles" element={<RolesList />} />
        <Route path="presupuestos" element={<PeriodosPresupuestariosList />} />
        <Route path="ubicaciones" element={<UbicacionesList />} />
        <Route path="proveedores" element={<ProveedoresList />} />
        <Route path="categorias" element={<CategoriasActivosList />} />
        <Route path="estados" element={<EstadosList />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="permisos" element={<PermisosList />} />
        <Route path="mantenimientos" element={<MantenimientoList />} />
        <Route path="revalorizaciones" element={<RevalorizacionPage />} />
        <Route path="depreciaciones" element={<DepreciacionPage />} />
        <Route path="solicitudes-compra" element={<SolicitudesCompraList />} />
        <Route path="ordenes-compra" element={<OrdenesCompraList />} />
        <Route path="suscripcion" element={<SuscripcionPage />} />
        <Route path="disposiciones" element={<DisposicionList />} />
        <Route path="settings" element={<Settings />} />
        {/* Cualquier sub-ruta no encontrada dentro de /app redirige al dashboard */}
        <Route path="*" element={<Navigate to="/app/dashboard" />} />
      </Route>

      {/* Ruta para cualquier otra URL no definida */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
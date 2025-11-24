// lib/services/api_service.dart
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:image_picker/image_picker.dart'; // Para XFile

import 'log_service.dart'; // Import log service

import '../config/constants.dart';
import '../models/departamento.dart';
import '../models/periodo_presupuestario.dart';
import '../models/partida_presupuestaria.dart';
import '../models/solicitud_compra.dart';
import '../models/orden_compra.dart';
import '../models/activo_fijo.dart';
import '../models/cargo.dart';
import '../models/ubicacion.dart';
import '../models/estado.dart';
import '../models/mantenimiento.dart';
import '../models/empleado.dart';
import '../models/suscripcion.dart';
import '../models/dashboard_data.dart';
import '../models/proveedor.dart';
import '../models/categoria_activo.dart';
import '../models/disposicion.dart';
import '../models/depreciacion.dart';
import '../models/revalorizacion.dart';
import '../models/notification.dart';
import '../models/rol.dart'; // <--- NUEVO
import '../models/permiso.dart'; // <--- NUEVO
import '../models/reporte_activo.dart'; // <--- NUEVO

class ApiService {
  final Dio _dio;

  ApiService() : _dio = Dio(BaseOptions(baseUrl: apiBaseUrl)) {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) {
        if (e.response?.statusCode == 401) {
          debugPrint("ApiService: Token inválido o expirado (401).");
        }
        return handler.next(e);
      },
    ));
  }

  // --- Helpers ---
  Future<List<T>> _fetchList<T>(String endpoint, T Function(Map<String, dynamic>) fromJson, {Map<String, dynamic>? queryParameters}) async {
    try {
      final response = await _dio.get(endpoint, queryParameters: queryParameters);
      debugPrint("API Service: Raw response data from $endpoint: ${response.data}");
      final data = response.data;
      final List<dynamic> dataList = (data is Map && data.containsKey('results')) ? data['results'] as List : data as List;
      return dataList.map((json) => fromJson(json)).toList();
    } on DioException catch (e) {
      debugPrint("API Service Error on $endpoint: ${e.response?.data ?? e.message}");
      throw Exception('Error al cargar datos desde $endpoint: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Auth & Permissions ---
  Future<Set<String>> getMyPermissions(String token) async {
    try {
      final response = await _dio.get('/my-permissions/', options: Options(headers: {'Authorization': 'Bearer $token'}));
      return (response.data as List).map((item) => item.toString()).toSet();
    } on DioException catch (e) {
      throw Exception('Error al cargar permisos: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<Map<String, dynamic>> updateMyThemePreferences(Map<String, dynamic> preferences) async {
    try {
      final response = await _dio.patch('/me/theme/', data: preferences);
      await logAction('UPDATE: ThemePreferences', preferences);
      return response.data;
    } on DioException catch (e) {
      throw Exception('Error al guardar preferencias de tema: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- FCM Token Management ---
  Future<void> updateFCMToken(String fcmToken) async {
    try {
      await _dio.post('/fcm-token/', data: {'fcm_token': fcmToken});
      await logAction('UPDATE: FCMToken', {'fcm_token': fcmToken});
    } on DioException catch (e) {
      debugPrint("API Service Error updating FCM token: ${e.response?.data ?? e.message}");
      throw Exception('Error al actualizar token FCM: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<void> unregisterFCMToken() async {
    try {
      await _dio.delete('/fcm-token/');
      debugPrint("ApiService: FCM token unregistered from backend.");
    } on DioException catch (e) {
      // Don't throw an error, just log it. Logout should proceed anyway.
      debugPrint("ApiService: Failed to unregister FCM token from backend: ${e.message}");
    }
  }

  // --- Notifications ---
  Future<List<Notification>> getNotifications() => _fetchList('/notificaciones/', Notification.fromJson);

  Future<int> getUnreadNotificationsCount() async {
    try {
      final response = await _dio.get('/notificaciones/unread-count/');
      return response.data['unread_count'] as int;
    } on DioException catch (e) {
      throw Exception('Error al obtener el contador de notificaciones no leídas: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<void> markNotificationAsRead(String notificationId) async {
    try {
      await _dio.post('/notificaciones/$notificationId/marcar-leido/');
      await logAction('UPDATE: NotificationRead', {'id': notificationId});
    } on DioException catch (e) {
      throw Exception('Error al marcar notificación como leída: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<void> markAllNotificationsAsRead() async {
    try {
      await _dio.post('/notificaciones/marcar-todo-leido/');
      await logAction('UPDATE: AllNotificationsRead');
    } on DioException catch (e) {
      throw Exception('Error al marcar todas las notificaciones como leídas: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Roles ---
  Future<List<Rol>> getRoles() => _fetchList('/roles/', Rol.fromJson);

  Future<Rol> getRole(String id) async {
    try {
      final response = await _dio.get('/roles/$id/');
      return Rol.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al cargar rol: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<Rol> createRole(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/roles/', data: data);
      await logAction('CREATE: Rol', {'id': response.data['id'], 'nombre': data['nombre']});
      return Rol.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al crear rol: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<Rol> updateRole(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch('/roles/$id/', data: data);
      await logAction('UPDATE: Rol', {'id': id, 'nombre': data['nombre']});
      return Rol.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al actualizar rol: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<void> deleteRole(String id) async {
    try {
      await _dio.delete('/roles/$id/');
      await logAction('DELETE: Rol', {'id': id});
    } on DioException catch (e) {
      throw Exception('Error al eliminar rol: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Permisos ---
  Future<List<Permiso>> getAllPermissions() => _fetchList('/permisos/', Permiso.fromJson);

  Future<Rol> updateRolePermissions(String roleId, List<String> newPermissionIds) async {
    try {
      final response = await _dio.patch('/roles/$roleId/', data: {'permisos': newPermissionIds});
      await logAction('UPDATE: RolePermissions', {'id': roleId, 'permisos': newPermissionIds});
      return Rol.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al actualizar permisos del rol: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Departamentos ---
  Future<List<Departamento>> getDepartamentos() => _fetchList('/departamentos/', Departamento.fromJson);

  Future<Departamento> createDepartamento(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/departamentos/', data: data);
      await logAction('CREATE: Departamento', {'id': response.data['id'], 'nombre': data['nombre']});
      return Departamento.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al crear departamento: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<Departamento> updateDepartamento(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch('/departamentos/$id/', data: data);
      await logAction('UPDATE: Departamento', {'id': id, 'nombre': data['nombre']});
      return Departamento.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al actualizar departamento: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<void> deleteDepartamento(String id) async {
    try {
      await _dio.delete('/departamentos/$id/');
      await logAction('DELETE: Departamento', {'id': id});
    } on DioException catch (e) {
      throw Exception('Error al eliminar departamento: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Cargos ---
  Future<List<Cargo>> getCargos() => _fetchList('/cargos/', Cargo.fromJson);

  Future<Cargo> createCargo(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/cargos/', data: data);
      await logAction('CREATE: Cargo', {'id': response.data['id'], 'nombre': data['nombre']});
      return Cargo.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al crear cargo: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<Cargo> updateCargo(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch('/cargos/$id/', data: data);
      await logAction('UPDATE: Cargo', {'id': id, 'nombre': data['nombre']});
      return Cargo.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al actualizar cargo: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<void> deleteCargo(String id) async {
    try {
      await _dio.delete('/cargos/$id/');
      await logAction('DELETE: Cargo', {'id': id});
    } on DioException catch (e) {
      throw Exception('Error al eliminar cargo: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Ubicaciones ---
  Future<List<Ubicacion>> getUbicaciones() => _fetchList('/ubicaciones/', Ubicacion.fromJson);
  
  Future<Ubicacion> createUbicacion(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/ubicaciones/', data: data);
      await logAction('CREATE: Ubicacion', {'id': response.data['id'], 'nombre': data['nombre']});
      return Ubicacion.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al crear ubicación: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<Ubicacion> updateUbicacion(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch('/ubicaciones/$id/', data: data);
      await logAction('UPDATE: Ubicacion', {'id': id, 'nombre': data['nombre']});
      return Ubicacion.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al actualizar ubicación: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<void> deleteUbicacion(String id) async {
    try {
      await _dio.delete('/ubicaciones/$id/');
      await logAction('DELETE: Ubicacion', {'id': id});
    } on DioException catch (e) {
      throw Exception('Error al eliminar ubicación: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Estados ---
  Future<List<Estado>> getEstados() => _fetchList('/estados/', Estado.fromJson);

  Future<Estado> createEstado(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/estados/', data: data);
      await logAction('CREATE: Estado', {'id': response.data['id'], 'nombre': data['nombre']});
      return Estado.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al crear estado: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<Estado> updateEstado(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch('/estados/$id/', data: data);
      await logAction('UPDATE: Estado', {'id': id, 'nombre': data['nombre']});
      return Estado.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al actualizar estado: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<void> deleteEstado(String id) async {
    try {
      await _dio.delete('/estados/$id/');
      await logAction('DELETE: Estado', {'id': id});
    } on DioException catch (e) {
      throw Exception('Error al eliminar estado: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Empleados ---
  Future<List<Empleado>> getEmpleados() => _fetchList('/empleados/', Empleado.fromJson);

  // --- Proveedores ---
  Future<List<Proveedor>> getProveedores() => _fetchList('/proveedores/', Proveedor.fromJson);

  Future<Proveedor> createProveedor(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/proveedores/', data: data);
      await logAction('CREATE: Proveedor', {'id': response.data['id'], 'nombre': data['nombre']});
      return Proveedor.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al crear proveedor: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<Proveedor> updateProveedor(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch('/proveedores/$id/', data: data);
      await logAction('UPDATE: Proveedor', {'id': id, 'nombre': data['nombre']});
      return Proveedor.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al actualizar proveedor: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<void> deleteProveedor(String id) async {
    try {
      await _dio.delete('/proveedores/$id/');
      await logAction('DELETE: Proveedor', {'id': id});
    } on DioException catch (e) {
      throw Exception('Error al eliminar proveedor: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Categorias de Activo ---
  Future<List<CategoriaActivo>> getCategoriasActivo() => _fetchList('/categorias-activos/', CategoriaActivo.fromJson);

  Future<CategoriaActivo> createCategoriaActivo(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/categorias-activos/', data: data);
      await logAction('CREATE: CategoriaActivo', {'id': response.data['id'], 'nombre': data['nombre']});
      return CategoriaActivo.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al crear categoría: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<CategoriaActivo> updateCategoriaActivo(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch('/categorias-activos/$id/', data: data);
      await logAction('UPDATE: CategoriaActivo', {'id': id, 'nombre': data['nombre']});
      return CategoriaActivo.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al actualizar categoría: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<void> deleteCategoriaActivo(String id) async {
    try {
      await _dio.delete('/categorias-activos/$id/');
      await logAction('DELETE: CategoriaActivo', {'id': id});
    } on DioException catch (e) {
      throw Exception('Error al eliminar categoría: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Suscripcion ---
  Future<Suscripcion?> getSuscripcion() async {
    try {
      final response = await _dio.get('/suscripciones/');
      // Manejar el caso de que 'results' sea una lista vacía
      return (response.data['results'] as List).map((json) => Suscripcion.fromJson(json)).firstOrNull;
    } on DioException catch (e) {
      throw Exception('Error al cargar la suscripción: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Dashboard ---
  Future<DashboardData> getDashboardData() async {
    try {
      final response = await _dio.get('/dashboard/');
      return DashboardData.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al cargar los datos del dashboard: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Presupuestos: Periodos ---
  Future<List<PeriodoPresupuestario>> getPeriodos() => _fetchList('/periodos-presupuestarios/', PeriodoPresupuestario.fromJson);

  Future<PeriodoPresupuestario> createPeriodo(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/periodos-presupuestarios/', data: data);
      await logAction('CREATE: PeriodoPresupuestario', {'id': response.data['id'], 'nombre': data['nombre']});
      return PeriodoPresupuestario.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al crear periodo: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<PeriodoPresupuestario> updatePeriodo(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch('/periodos-presupuestarios/$id/', data: data);
      await logAction('UPDATE: PeriodoPresupuestario', {'id': id, 'nombre': data['nombre']});
      return PeriodoPresupuestario.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al actualizar periodo: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<void> deletePeriodo(String id) async {
    try {
      await _dio.delete('/periodos-presupuestarios/$id/');
      await logAction('DELETE: PeriodoPresupuestario', {'id': id});
    } on DioException catch (e) {
      throw Exception('Error al eliminar periodo: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Presupuestos: Partidas ---
  Future<List<PartidaPresupuestaria>> getPartidas(String periodoId) => _fetchList('/partidas-presupuestarias/', PartidaPresupuestaria.fromJson, queryParameters: {'periodo_id': periodoId});
  
  Future<PartidaPresupuestaria> createPartida(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/partidas-presupuestarias/', data: data);
      await logAction('CREATE: PartidaPresupuestaria', {'id': response.data['id'], 'nombre': data['nombre']});
      return PartidaPresupuestaria.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al crear partida: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<PartidaPresupuestaria> updatePartida(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch('/partidas-presupuestarias/$id/', data: data);
      await logAction('UPDATE: PartidaPresupuestaria', {'id': id, 'nombre': data['nombre']});
      return PartidaPresupuestaria.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al actualizar partida: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<void> deletePartida(String id) async {
    try {
      await _dio.delete('/partidas-presupuestarias/$id/');
      await logAction('DELETE: PartidaPresupuestaria', {'id': id});
    } on DioException catch (e) {
      throw Exception('Error al eliminar partida: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Solicitudes de Compra ---
  Future<List<SolicitudCompra>> getSolicitudes() => _fetchList('/solicitudes-compra/', SolicitudCompra.fromJson);

  Future<SolicitudCompra> createSolicitud(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/solicitudes-compra/', data: data);
      await logAction('CREATE: SolicitudCompra', {'id': response.data['id'], 'descripcion': data['descripcion']});
      return SolicitudCompra.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al crear solicitud: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<SolicitudCompra> decidirSolicitud(String id, String decision, {String? motivo}) async {
    try {
      final Map<String, dynamic> data = {'decision': decision};
      if (motivo != null) {
        data['motivo_rechazo'] = motivo;
      }
      final response = await _dio.post('/solicitudes-compra/$id/decidir/', data: data);
      await logAction('DECIDE: SolicitudCompra', {'id': id, 'decision': decision});
      return SolicitudCompra.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al decidir sobre la solicitud: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Órdenes de Compra ---
  Future<List<OrdenCompra>> getOrdenes() => _fetchList('/ordenes-compra/', OrdenCompra.fromJson);

  Future<OrdenCompra> createOrdenCompra(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/ordenes-compra/', data: data);
      await logAction('CREATE: OrdenCompra', {'id': response.data['id'], 'solicitud_id': data['solicitud']});
      return OrdenCompra.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al crear la orden de compra: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<ActivoFijo> recibirOrden(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/ordenes-compra/$id/recibir/', data: data);
      await logAction('RECEIVE: OrdenCompra', {'id': response.data['id'], 'activo_creado': response.data['id']});
      // El backend devuelve el ActivoFijo recién creado, no la OrdenCompra actualizada.
      return ActivoFijo.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al recibir la orden: ${e.response?.data?['detail'] ?? e.message}');
    }
  }
  
  // --- Activos Fijos ---
  Future<List<ActivoFijo>> getActivos() => _fetchList('/activos-fijos/', ActivoFijo.fromJson);

  Future<ActivoFijo> createActivo(Map<String, dynamic> data, {XFile? fotoActivo}) async {
    try {
      final formData = FormData.fromMap(data);
      if (fotoActivo != null) {
        formData.files.add(MapEntry('foto_activo', await MultipartFile.fromFile(fotoActivo.path, filename: fotoActivo.name)));
      }
      final response = await _dio.post('/activos-fijos/', data: formData);
      await logAction('CREATE: ActivoFijo', {'id': response.data['id'], 'nombre': data['nombre']});
      return ActivoFijo.fromJson(response.data);
    } on DioException catch (e) {
      debugPrint("DioException on createActivo: ${e.response?.data}");
      throw Exception('Error al crear activo fijo: ${e.response?.data?['detail'] ?? e.message}');
    } catch (e) {
      debugPrint("Exception on createActivo: $e");
      throw Exception('Error inesperado al crear activo fijo: ${e.toString()}');
    }
  }

  Future<ActivoFijo> updateActivo(String id, Map<String, dynamic> data, {XFile? fotoActivo, bool deleteExistingPhoto = false}) async {
    try {
      final formData = FormData.fromMap(data);
      if (fotoActivo != null) {
        formData.files.add(MapEntry('foto_activo', await MultipartFile.fromFile(fotoActivo.path, filename: fotoActivo.name)));
      } else if (deleteExistingPhoto) {
        formData.fields.add(const MapEntry('foto_activo', ''));
      }
      final response = await _dio.patch('/activos-fijos/$id/', data: formData);
      await logAction('UPDATE: ActivoFijo', {'id': id, 'nombre': data['nombre']});
      return ActivoFijo.fromJson(response.data);
    } on DioException catch (e) {
      debugPrint("DioException on updateActivo: ${e.response?.data}");
      throw Exception('Error al actualizar activo fijo: ${e.response?.data?['detail'] ?? e.message}');
    } catch (e) {
      debugPrint("Exception on updateActivo: $e");
      throw Exception('Error inesperado al actualizar activo fijo: ${e.toString()}');
    }
  }

  Future<void> deleteActivo(String id) async {
    try {
      await _dio.delete('/activos-fijos/$id/');
      await logAction('DELETE: ActivoFijo', {'id': id});
    } on DioException catch (e) {
      throw Exception('Error al eliminar activo fijo: ${e.response?.data?['detail'] ?? e.message}');
    }
  }
  
  // --- Mantenimientos ---
  Future<List<Mantenimiento>> getMantenimientos() => _fetchList('/mantenimientos/', Mantenimiento.fromJson);

  Future<Mantenimiento> getMantenimiento(String id) async {
    try {
      final response = await _dio.get('/mantenimientos/$id/');
      return Mantenimiento.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al cargar mantenimiento: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<Mantenimiento> createMantenimiento(Map<String, dynamic> data, List<XFile> newPhotos) async {
    try {
      List<MultipartFile> photoFiles = [];
      for (var file in newPhotos) {
        photoFiles.add(await MultipartFile.fromFile(file.path, filename: file.name));
      }
      final formData = FormData.fromMap(data);
      if (photoFiles.isNotEmpty) {
        formData.files.addAll(photoFiles.map((file) => MapEntry('fotos_nuevas[]', file)));
      }
      
      final response = await _dio.post('/mantenimientos/', data: formData);
      await logAction('CREATE: Mantenimiento', {'id': response.data['id'], 'activo_id': data['activo_id'], 'tipo': data['tipo']});
      return Mantenimiento.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al crear mantenimiento: ${e.response?.data?['detail'] ?? e.message}');
    } catch (e) {
      throw Exception('Error inesperado al crear mantenimiento: ${e.toString()}');
    }
  }

  Future<Mantenimiento> updateMantenimiento(String id, Map<String, dynamic> data, List<XFile> newPhotos, List<String> deletedPhotos) async {
    try {
      List<MultipartFile> photoFiles = [];
      for (var file in newPhotos) {
        photoFiles.add(await MultipartFile.fromFile(file.path, filename: file.name));
      }
      
      // Añadir la lista de fotos a eliminar al mapa de datos
      if (deletedPhotos.isNotEmpty) {
        data['fotos_a_eliminar'] = deletedPhotos;
      }

      final formData = FormData.fromMap(data, ListFormat.multiCompatible);

      if (photoFiles.isNotEmpty) {
        formData.files.addAll(photoFiles.map((file) => MapEntry('fotos_nuevas', file)));
      }

      final response = await _dio.patch('/mantenimientos/$id/', data: formData);
      await logAction('UPDATE: Mantenimiento', {'id': id, 'activo_id': data['activo_id'], 'estado': data['estado']});
      return Mantenimiento.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al actualizar mantenimiento: ${e.response?.data?['detail'] ?? e.message}');
    } catch (e) {
      throw Exception('Error inesperado al actualizar mantenimiento: ${e.toString()}');
    }
  }

  Future<void> deleteMantenimiento(String id) async {
    try {
      await _dio.delete('/mantenimientos/$id/');
      await logAction('DELETE: Mantenimiento', {'id': id});
    } on DioException catch (e) {
      throw Exception('Error al eliminar mantenimiento: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<Mantenimiento> actualizarEstadoMantenimiento(String id, Map<String, dynamic> data, List<XFile> fotosSolucion) async {
    try {
      List<MultipartFile> photoFiles = [];
      for (var file in fotosSolucion) {
        photoFiles.add(await MultipartFile.fromFile(file.path, filename: file.name));
      }
      final formData = FormData.fromMap(data, ListFormat.multiCompatible);
      if (photoFiles.isNotEmpty) {
        formData.files.addAll(photoFiles.map((file) => MapEntry('fotos_solucion', file)));
      }
      final response = await _dio.post('/mantenimientos/$id/actualizar-estado/', data: formData);
      await logAction('UPDATE_STATUS: Mantenimiento', {'id': id, 'estado': data['estado']});
      return Mantenimiento.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al actualizar estado: ${e.response?.data?['detail'] ?? e.message}');
    } catch (e) {
      throw Exception('Error inesperado al actualizar estado: ${e.toString()}');
    }
  }

  // --- Disposiciones de Activos ---
  Future<List<Disposicion>> getDisposiciones() => _fetchList('/disposiciones/', Disposicion.fromJson);

  Future<Disposicion> createDisposicion(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/disposiciones/', data: data);
      await logAction('CREATE: Disposicion', {'id': response.data['id'], 'activo_id': data['activo_id'], 'tipo': data['tipo_disposicion']});
      return Disposicion.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al crear disposición: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<Disposicion> updateDisposicion(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch('/disposiciones/$id/', data: data);
      await logAction('UPDATE: Disposicion', {'id': id, 'activo_id': data['activo_id'], 'tipo': data['tipo_disposicion']});
      return Disposicion.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al actualizar disposición: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  Future<void> deleteDisposicion(String id) async {
    try {
      await _dio.delete('/disposiciones/$id/');
      await logAction('DELETE: Disposicion', {'id': id});
    } on DioException catch (e) {
      throw Exception('Error al eliminar disposición: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Depreciaciones de Activos ---
  Future<List<Depreciacion>> getDepreciaciones(String activoId) => _fetchList('/depreciaciones/', Depreciacion.fromJson, queryParameters: {'activo_id': activoId});

  Future<Depreciacion> ejecutarDepreciacion(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/depreciaciones/ejecutar/', data: data);
      await logAction('EXECUTE: Depreciacion', {'id': response.data['id'], 'activo_id': data['activo_id'], 'type': data['depreciation_type']});
      return Depreciacion.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al ejecutar depreciación: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Revalorizaciones de Activos ---
  Future<List<Revalorizacion>> getRevalorizaciones(String activoId) => _fetchList('/revalorizaciones/', Revalorizacion.fromJson, queryParameters: {'activo_id': activoId});

  Future<Revalorizacion> ejecutarRevalorizacion(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/revalorizaciones/ejecutar/', data: data);
      await logAction('EXECUTE: Revalorizacion', {'id': response.data['id'], 'activo_id': data['activo_id'], 'type': data['reval_type']});
      return Revalorizacion.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception('Error al ejecutar revalorización: ${e.response?.data?['detail'] ?? e.message}');
    }
  }

  // --- Reports ---
  Future<List<ReporteActivo>> getDynamicReport(List<String> filters) async {
    try {
      final response = await _dio.post('/reportes/query/', data: {'filters': filters});
      // The backend returns a list of maps, which needs to be converted to ReporteActivo objects.
      final List<dynamic> dataList = response.data;
      return dataList.map((json) => ReporteActivo.fromJson(json)).toList();
    } on DioException catch (e) {
      debugPrint("API Service Error fetching dynamic report: ${e.response?.data ?? e.message}");
      throw Exception('Error al obtener reporte dinámico: ${e.response?.data?['detail'] ?? e.message}');
    }
  }
}
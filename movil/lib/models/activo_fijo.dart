// movil/lib/models/activo_fijo.dart
import 'estado.dart';
import '../config/constants.dart'; // Importar para la URL base

class ActivoFijo {
  final String id;
  final String nombre;
  final String codigoInterno;
  final DateTime fechaAdquisicion;
  final double valorActual;
  final int vidaUtil;
  
  final String? departamentoId;
  final String? departamentoNombre;
  
  final String categoriaId;
  final String categoriaNombre;
  
  final Estado estado; // Usamos el objeto Estado anidado
  
  final String ubicacionId;
  final String? ubicacionNombre;
  
  final String? proveedorId;
  final String? proveedorNombre;
  
  final String? fotoActivoUrl;

  ActivoFijo({
    required this.id,
    required this.nombre,
    required this.codigoInterno,
    required this.fechaAdquisicion,
    required this.valorActual,
    required this.vidaUtil,
    
    this.departamentoId,
    this.departamentoNombre,
    
    required this.categoriaId,
    required this.categoriaNombre,
    
    required this.estado, // Requerimos el objeto Estado
    
    required this.ubicacionId,
    this.ubicacionNombre,
    
    this.proveedorId,
    this.proveedorNombre,
    
    this.fotoActivoUrl,
  });

  factory ActivoFijo.fromJson(Map<String, dynamic> json) {
    String? rawUrl = json['foto_activo'];
    String? finalUrl;

    if (rawUrl != null && rawUrl.isNotEmpty && rawUrl.startsWith('/')) {
      finalUrl = '$serverBaseUrl$rawUrl';
    } else {
      finalUrl = rawUrl; // Puede ser ya una URL completa o nula
    }

    return ActivoFijo(
      id: json['id'] ?? '',
      nombre: json['nombre'] ?? '',
      codigoInterno: json['codigo_interno'] ?? '',
      fechaAdquisicion: DateTime.parse(json['fecha_adquisicion'] ?? DateTime.now().toIso8601String()),
      valorActual: (json['valor_actual'] is String ? double.parse(json['valor_actual']) : (json['valor_actual'] ?? 0.0)).toDouble(),
      vidaUtil: (json['vida_util'] is String ? int.parse(json['vida_util']) : (json['vida_util'] ?? 0)),
      
      departamentoId: json['departamento'],
      departamentoNombre: json['departamento_detail']?['nombre'],
      
      categoriaId: json['categoria'] ?? '',
      categoriaNombre: json['categoria_detail']?['nombre'] ?? 'Sin categoría',
      
      estado: json['estado_detail'] != null 
          ? Estado.fromJson(json['estado_detail']) 
          : Estado(id: '', nombre: 'Desconocido'), // Default Estado
      
      ubicacionId: json['ubicacion'] ?? '',
      ubicacionNombre: json['ubicacion_detail']?['nombre'],
      
      proveedorId: json['proveedor'],
      proveedorNombre: json['proveedor_detail']?['nombre'],
      
      fotoActivoUrl: finalUrl,
    );
  }
}

// lib/models/mantenimiento_foto.dart

import '../config/constants.dart';

class MantenimientoFoto {
  final String id;
  final String fotoUrl;
  final String tipo;
  final String? subidoPor; // Nombre de usuario de quien subió la foto

  MantenimientoFoto({
    required this.id,
    required this.fotoUrl,
    required this.tipo,
    this.subidoPor,
  });

  factory MantenimientoFoto.fromJson(Map<String, dynamic> json) {
    String rawUrl = json['foto'] ?? '';
    String finalUrl = rawUrl;

    // Si la URL es relativa (empieza con /), la completamos.
    if (rawUrl.startsWith('/')) {
      finalUrl = '$serverBaseUrl$rawUrl';
    }

    return MantenimientoFoto(
      id: json['id'],
      fotoUrl: finalUrl,
      tipo: json['tipo'] ?? 'PROBLEMA',
      subidoPor: json['subido_por']?['username'],
    );
  }
}

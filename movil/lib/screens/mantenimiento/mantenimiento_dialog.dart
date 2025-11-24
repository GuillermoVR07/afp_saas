// lib/screens/mantenimiento/mantenimiento_dialog.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:provider/provider.dart';
import '../../models/mantenimiento.dart';
import '../../models/mantenimiento_foto.dart';
import '../../providers/mantenimiento_provider.dart';
import '../../providers/activo_fijo_provider.dart';
import '../../providers/empleado_provider.dart';
import '../../models/activo_fijo.dart';
import '../../models/empleado.dart';
import '../../providers/provider_state.dart';
import '../../config/constants.dart'; // Importar para la URL base

void showMantenimientoDialog(BuildContext context, {Mantenimiento? mantenimiento, String? initialAssetId}) {
  final provider = Provider.of<MantenimientoProvider>(context, listen: false);
  final isEditing = mantenimiento != null;
  final formKey = GlobalKey<FormState>();

  // --- State Management ---
  String? selectedActivoId = mantenimiento?.activo.id ?? initialAssetId;
  String? selectedEmpleadoId = mantenimiento?.empleadoAsignado?.id;
  String tipo = mantenimiento?.tipo ?? 'CORRECTIVO';
  String estado = mantenimiento?.estado ?? 'PENDIENTE';
  final descProblemaController = TextEditingController(text: mantenimiento?.descripcionProblema ?? '');
  final notasSolucionController = TextEditingController(text: mantenimiento?.notasSolucion ?? '');
  final costoController = TextEditingController(text: mantenimiento?.costo.toString() ?? '0.0');

  // --- Refactored Photo State ---
  final List<MantenimientoFoto> fotosProblema = List.from(mantenimiento?.fotosProblema ?? []);
  final List<MantenimientoFoto> fotosSolucion = List.from(mantenimiento?.fotosSolucion ?? []);
  final List<XFile> newPhotos = [];
  final List<String> deletedPhotoIds = [];
  final imagePicker = ImagePicker();

  showDialog(
    context: context,
    builder: (dialogContext) {
      final activoProvider = Provider.of<ActivoFijoProvider>(context, listen: false);
      if (activoProvider.loadingState == LoadingState.idle) activoProvider.fetchActivos();
      
      final empleadoProvider = Provider.of<EmpleadoProvider>(context, listen: false);
      if (empleadoProvider.loadingState == LoadingState.idle) empleadoProvider.fetchEmpleados();

      final isLoading = ValueNotifier<bool>(false);
      
      return AlertDialog(
        title: Text(isEditing ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'),
        content: StatefulBuilder(
          builder: (BuildContext context, StateSetter setState) {

            // --- Widget para la galería de fotos con borrado ---
            Widget buildPhotoGrid(String title, List<MantenimientoFoto> photos) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 8),
                  if (photos.isEmpty)
                    const Text('No hay fotos.', style: TextStyle(fontStyle: FontStyle.italic, color: Colors.grey))
                  else
                    Wrap(
                      spacing: 8.0,
                      runSpacing: 8.0,
                      children: photos.map((photo) => Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Image.network(
                            photo.fotoUrl, // La URL ya está construida por el modelo
                            width: 80, height: 80, fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Container(width: 80, height: 80, color: Colors.grey.shade300, child: const Icon(LucideIcons.imageOff)),
                          ),
                          Positioned(
                            top: -8,
                            right: -8,
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  deletedPhotoIds.add(photo.id);
                                  photos.remove(photo);
                                });
                              },
                              child: const CircleAvatar(
                                radius: 12,
                                backgroundColor: Colors.red,
                                child: Icon(Icons.close, color: Colors.white, size: 14),
                              ),
                            ),
                          ),
                        ],
                      )).toList(),
                    ),
                  const SizedBox(height: 16),
                ],
              );
            }
            
            // --- Widget para mostrar las nuevas fotos a subir ---
            Widget buildNewPhotosGrid() {
               if (newPhotos.isEmpty) return const SizedBox.shrink();
               return Column(
                 crossAxisAlignment: CrossAxisAlignment.start,
                 children: [
                   const Text("Nuevas Fotos a Subir", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                   const SizedBox(height: 8),
                   Wrap(
                    spacing: 8.0,
                    runSpacing: 8.0,
                    children: newPhotos.map((file) => Stack(
                       clipBehavior: Clip.none,
                       children: [
                         Image.file(File(file.path), width: 80, height: 80, fit: BoxFit.cover),
                         Positioned(
                           top: -8,
                           right: -8,
                           child: GestureDetector(
                             onTap: () => setState(() => newPhotos.remove(file)),
                             child: const CircleAvatar(radius: 12, backgroundColor: Colors.red, child: Icon(Icons.close, color: Colors.white, size: 14)),
                           ),
                         ),
                       ],
                     )).toList(),
                   ),
                   const SizedBox(height: 16),
                 ],
               );
            }

            // --- Lógica para escoger imágenes ---
            Future<void> pickImage(ImageSource source) async {
              if (source == ImageSource.camera) {
                final pickedFile = await imagePicker.pickImage(source: source, imageQuality: 80, maxWidth: 1024);
                if (pickedFile != null) {
                  setState(() {
                    newPhotos.add(pickedFile);
                  });
                }
              } else {
                final pickedFiles = await imagePicker.pickMultiImage(imageQuality: 80, maxWidth: 1024);
                setState(() {
                  newPhotos.addAll(pickedFiles);
                });
              }
            }

            void showPicker(BuildContext context) {
              showModalBottomSheet(
                context: context,
                builder: (BuildContext bc) {
                  return SafeArea(
                    child: Wrap(
                      children: <Widget>[
                        ListTile(
                          leading: const Icon(LucideIcons.camera),
                          title: const Text('Cámara'),
                          onTap: () {
                            pickImage(ImageSource.camera);
                            Navigator.of(context).pop();
                          },
                        ),
                        ListTile(
                          leading: const Icon(LucideIcons.image),
                          title: const Text('Galería'),
                          onTap: () {
                            pickImage(ImageSource.gallery);
                            Navigator.of(context).pop();
                          },
                        ),
                      ],
                    ),
                  );
                },
              );
            }

            return Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Consumer<ActivoFijoProvider>(builder: (context, provider, _) { /* ... (sin cambios) ... */
                      if (provider.loadingState == LoadingState.loading) return const Center(child: CircularProgressIndicator());
                      ActivoFijo? preselectedAsset;
                      if (selectedActivoId != null) { try { preselectedAsset = provider.activos.firstWhere((a) => a.id == selectedActivoId); } catch(e) { preselectedAsset = null; } }
                      return DropdownButtonFormField<String>(value: selectedActivoId, hint: const Text('Seleccionar Activo'), items: provider.activos.map((ActivoFijo activo) => DropdownMenuItem<String>(value: activo.id, child: Text(activo.nombre))).toList(), onChanged: initialAssetId != null ? null : (value) { selectedActivoId = value; }, validator: (value) => value == null ? 'Seleccione un activo' : null, disabledHint: preselectedAsset != null ? Text(preselectedAsset.nombre) : const Text('Activo preseleccionado'));
                    }),
                    const SizedBox(height: 16),
                    Consumer<EmpleadoProvider>(builder: (context, provider, _) { /* ... (sin cambios) ... */
                      if (provider.loadingState == LoadingState.loading) return const Center(child: CircularProgressIndicator());
                      return DropdownButtonFormField<String>(value: selectedEmpleadoId, hint: const Text('Asignar a Empleado'), items: provider.empleados.map((Empleado empleado) => DropdownMenuItem<String>(value: empleado.id, child: Text(empleado.nombreCompleto))).toList(), onChanged: (value) { selectedEmpleadoId = value; });
                    }),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(value: tipo, items: const [ DropdownMenuItem(value: 'PREVENTIVO', child: Text('Preventivo')), DropdownMenuItem(value: 'CORRECTIVO', child: Text('Correctivo')) ], onChanged: (value) { if (value != null) tipo = value; }, decoration: const InputDecoration(labelText: 'Tipo')),
                    const SizedBox(height: 16),
                    TextFormField(controller: descProblemaController, decoration: const InputDecoration(labelText: 'Descripción del Problema'), validator: (value) => (value == null || value.isEmpty) ? 'La descripción es requerida' : null, maxLines: 3),
                    const SizedBox(height: 16),
                    TextFormField(controller: notasSolucionController, decoration: const InputDecoration(labelText: 'Notas de la Solución'), maxLines: 3),
                    const SizedBox(height: 16),
                    TextFormField(controller: costoController, decoration: const InputDecoration(labelText: 'Costo'), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
                    const Divider(height: 32),
                    
                    // --- Galerías de Fotos Separadas ---
                    if(isEditing) buildPhotoGrid("Fotos del Problema", fotosProblema),
                    if(isEditing) buildPhotoGrid("Fotos de la Solución", fotosSolucion),
                    buildNewPhotosGrid(),

                    // --- Botón para añadir fotos ---
                    Center(
                      child: ElevatedButton.icon(
                        icon: const Icon(LucideIcons.camera),
                        label: const Text('Añadir Fotos'),
                        onPressed: () => showPicker(context),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
        actions: [
          TextButton(child: const Text('Cancelar'), onPressed: () => Navigator.of(dialogContext).pop()),
          ValueListenableBuilder<bool>(
            valueListenable: isLoading,
            builder: (context, loading, child) {
              return ElevatedButton(
                onPressed: loading ? null : () async {
                  if (formKey.currentState!.validate()) {
                    isLoading.value = true;
                    final data = {
                      'activo_id': selectedActivoId,
                      'empleado_asignado_id': selectedEmpleadoId,
                      'tipo': tipo,
                      'estado': estado,
                      'descripcion_problema': descProblemaController.text,
                      'notas_solucion': notasSolucionController.text,
                      'costo': costoController.text,
                    };

                    bool success;
                    if (isEditing) {
                      success = await provider.updateMantenimiento(mantenimiento.id, data, newPhotos, deletedPhotoIds);
                    } else {
                      success = await provider.createMantenimiento(data, newPhotos);
                    }
                    
                    isLoading.value = false;

                    if (dialogContext.mounted) {
                      if (success) {
                        Navigator.of(dialogContext).pop();
                      } else {
                        ScaffoldMessenger.of(dialogContext).showSnackBar(SnackBar(content: Text('Error: ${provider.errorMessage}'), backgroundColor: Colors.red));
                      }
                    }
                  }
                },
                child: loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Guardar'),
              );
            },
          ),
        ],
      );
    },
  );
}

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:provider/provider.dart';
import '../../models/mantenimiento.dart';
import '../../providers/mantenimiento_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/provider_state.dart';
import 'mantenimiento_dialog.dart'; // Import the new dialog function

class MantenimientoScreen extends StatefulWidget {
  const MantenimientoScreen({super.key});

  @override
  State<MantenimientoScreen> createState() => _MantenimientoScreenState();
}

class _MantenimientoScreenState extends State<MantenimientoScreen> {
  
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<MantenimientoProvider>(context, listen: false);
      if (provider.loadingState == LoadingState.idle) {
        provider.fetchMantenimientos();
      }
    });
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PENDIENTE':
        return Colors.orange;
      case 'EN_PROGRESO':
        return Colors.blue;
      case 'COMPLETADO':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.read<AuthProvider>();
    final canManage = authProvider.hasPermission('manage_mantenimiento');
    final currentEmployeeId = authProvider.user?.empleadoId;

    return Scaffold(
      body: Consumer<MantenimientoProvider>(
        builder: (context, provider, child) {
          if (provider.loadingState == LoadingState.loading && provider.mantenimientos.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (provider.loadingState == LoadingState.error) {
            return Center(child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text('Error: ${provider.errorMessage}', textAlign: TextAlign.center),
            ));
          }
          if (provider.loadingState == LoadingState.success && provider.mantenimientos.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('No hay mantenimientos para mostrar.'),
                  const SizedBox(height: 10),
                  ElevatedButton.icon(
                     icon: const Icon(LucideIcons.refreshCw, size: 16),
                     label: const Text('Recargar'),
                     onPressed: () => provider.fetchMantenimientos(),
                  )
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: provider.fetchMantenimientos,
            child: ListView.builder(
              padding: const EdgeInsets.all(8.0),
              itemCount: provider.mantenimientos.length,
              itemBuilder: (context, index) {
                final mantenimiento = provider.mantenimientos[index];
                final isAssignedToMe = mantenimiento.empleadoAsignado?.id == currentEmployeeId;

                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: _getStatusColor(mantenimiento.estado),
                      foregroundColor: Colors.white,
                      child: const Icon(LucideIcons.wrench, size: 20),
                    ),
                    title: Text(mantenimiento.activo.nombre, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(mantenimiento.descripcionProblema, maxLines: 1, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 4),
                        Text(
                          mantenimiento.estado,
                          style: TextStyle(color: _getStatusColor(mantenimiento.estado), fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ],
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isAssignedToMe && authProvider.hasPermission('update_assigned_mantenimiento'))
                          IconButton(
                            icon: const Icon(LucideIcons.check),
                            tooltip: 'Actualizar Estado de Tarea',
                            onPressed: () {
                              _showEmployeeUpdateDialog(context, provider, mantenimiento);
                            },
                          ),
                        if (canManage) ...[
                          IconButton(
                            icon: const Icon(LucideIcons.pencil),
                            tooltip: 'Editar (Admin)',
                            onPressed: () {
                              showMantenimientoDialog(context, mantenimiento: mantenimiento);
                            },
                          ),
                          IconButton(
                            icon: Icon(LucideIcons.trash2, color: Theme.of(context).colorScheme.error),
                            tooltip: 'Eliminar',
                            onPressed: () {
                              _showDeleteConfirmDialog(context, provider, mantenimiento.id);
                            },
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: canManage
          ? FloatingActionButton(
              onPressed: () {
                showMantenimientoDialog(context);
              },
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
              child: const Icon(LucideIcons.plus),
            )
          : null,
    );
  }

  void _showEmployeeUpdateDialog(BuildContext context, MantenimientoProvider provider, Mantenimiento mantenimiento) {
    final formKey = GlobalKey<FormState>();
    final notasController = TextEditingController(text: mantenimiento.notasSolucion ?? '');
    // 1. Inicializar el estado directamente. El valor DEBE existir en la lista de items del Dropdown.
    String estado = mantenimiento.estado;
    final List<XFile> fotosSolucionNuevas = [];
    final imagePicker = ImagePicker();

    showDialog(
      context: context,
      builder: (dialogContext) {
        final isLoading = ValueNotifier<bool>(false);

        return AlertDialog(
          title: const Text('Actualizar Tarea'),
          content: StatefulBuilder(
            builder: (BuildContext context, StateSetter setState) {
              
              Future<void> pickImage(ImageSource source) async {
                if (source == ImageSource.camera) {
                  final pickedFile = await imagePicker.pickImage(source: source, imageQuality: 80, maxWidth: 1024);
                  if (pickedFile != null) {
                    setState(() {
                      fotosSolucionNuevas.add(pickedFile);
                    });
                  }
                } else {
                  final pickedFiles = await imagePicker.pickMultiImage(imageQuality: 80, maxWidth: 1024);
                  setState(() {
                    fotosSolucionNuevas.addAll(pickedFiles);
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

              Widget buildPhotoGrid(String title, List<Widget> children, {bool isExisting = true}) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 8),
                    children.isEmpty
                      ? Text(isExisting ? 'No hay fotos.' : 'Ninguna seleccionada.', style: const TextStyle(fontStyle: FontStyle.italic, color: Colors.grey))
                      : Wrap(spacing: 8.0, runSpacing: 8.0, children: children),
                    const SizedBox(height: 16),
                  ],
                );
              }

              return Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Activo: ${mantenimiento.activo.nombre}', style: const TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Text('Problema: ${mantenimiento.descripcionProblema}'),
                      const Divider(height: 24),

                      buildPhotoGrid('Fotos del Problema', [
                        ...mantenimiento.fotosProblema.map((photo) => Image.network(photo.fotoUrl, width: 80, height: 80, fit: BoxFit.cover)),
                      ]),

                      buildPhotoGrid('Fotos de la Solución', [
                        ...mantenimiento.fotosSolucion.map((photo) => Image.network(photo.fotoUrl, width: 80, height: 80, fit: BoxFit.cover)),
                      ]),

                      buildPhotoGrid('Nuevas Fotos de Solución', [
                        ...fotosSolucionNuevas.map((file) => Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Image.file(File(file.path), width: 80, height: 80, fit: BoxFit.cover),
                            Positioned(
                              top: -8, right: -8,
                              child: GestureDetector(
                                onTap: () => setState(() => fotosSolucionNuevas.remove(file)),
                                child: const CircleAvatar(radius: 12, backgroundColor: Colors.red, child: Icon(Icons.close, color: Colors.white, size: 14)),
                              ),
                            ),
                          ],
                        )),
                      ], isExisting: false),
                      
                      Center(
                        child: ElevatedButton.icon(
                          onPressed: () => showPicker(context),
                          icon: const Icon(LucideIcons.imagePlus),
                          label: const Text("Añadir Fotos"),
                        ),
                      ),

                      const SizedBox(height: 16),
                      // 2. Asegurarse de que la lista de items contenga TODOS los estados posibles
                      DropdownButtonFormField<String>(
                        value: estado,
                        items: const [
                          DropdownMenuItem(value: 'PENDIENTE', child: Text('Pendiente')),
                          DropdownMenuItem(value: 'EN_PROGRESO', child: Text('En Progreso')),
                          DropdownMenuItem(value: 'COMPLETADO', child: Text('Completado')),
                        ],
                        onChanged: (value) {
                          if (value != null) setState(() => estado = value);
                        },
                        decoration: const InputDecoration(labelText: 'Actualizar Estado'),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: notasController,
                        decoration: const InputDecoration(labelText: 'Notas de Solución'),
                        maxLines: 3,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          actions: [
            TextButton(
              child: const Text('Cancelar'),
              onPressed: () => Navigator.of(dialogContext).pop(),
            ),
            ValueListenableBuilder<bool>(
              valueListenable: isLoading,
              builder: (context, loading, child) {
                return ElevatedButton(
                  onPressed: loading ? null : () async {
                    if (formKey.currentState!.validate()) {
                      isLoading.value = true;
                      bool success = await provider.actualizarEstadoMantenimiento(
                        mantenimiento.id,
                        estado,
                        notasController.text,
                        fotosSolucionNuevas,
                      );
                      isLoading.value = false;

                      if (dialogContext.mounted) {
                        if (success) {
                          Navigator.of(dialogContext).pop();
                        } else {
                          ScaffoldMessenger.of(dialogContext).showSnackBar(
                            SnackBar(content: Text('Error: ${provider.errorMessage}'), backgroundColor: Colors.red),
                          );
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

  void _showDeleteConfirmDialog(BuildContext context, MantenimientoProvider provider, String id) {
    showDialog(
      context: context,
      builder: (context) {
        final isLoading = ValueNotifier<bool>(false);
        return AlertDialog(
          title: const Text('Confirmar Eliminación'),
          content: const Text('¿Estás seguro de que quieres eliminar este mantenimiento?'),
          actions: [
            TextButton(
              child: const Text('Cancelar'),
              onPressed: () => Navigator.of(context).pop(),
            ),
            ValueListenableBuilder<bool>(
              valueListenable: isLoading,
              builder: (context, loading, child) {
                return TextButton(
                  style: TextButton.styleFrom(foregroundColor: Colors.red),
                  onPressed: loading ? null : () async {
                    isLoading.value = true;
                    bool success = await provider.deleteMantenimiento(id);
                    isLoading.value = false;
                     if (context.mounted) {
                        Navigator.of(context).pop();
                         if (!success) {
                             ScaffoldMessenger.of(context).showSnackBar(
                               SnackBar(content: Text('Error: ${provider.errorMessage}'), backgroundColor: Colors.red),
                            );
                         }
                     }
                  },
                  child: loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.red)) : const Text('Eliminar'),
                );
              },
            ),
          ],
        );
      },
    );
  }
}
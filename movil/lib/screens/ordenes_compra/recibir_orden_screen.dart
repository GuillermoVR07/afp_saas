// lib/screens/ordenes_compra/recibir_orden_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/orden_compra.dart';
import '../../providers/orden_compra_provider.dart';
import '../../providers/categoria_activo_provider.dart';
import '../../providers/estados_provider.dart';
import '../../providers/ubicaciones_provider.dart';
import '../../models/categoria_activo.dart';
import '../../models/estado.dart';
import '../../models/ubicacion.dart';

class RecibirOrdenScreen extends StatefulWidget {
  final OrdenCompra orden;

  const RecibirOrdenScreen({Key? key, required this.orden}) : super(key: key);

  @override
  _RecibirOrdenScreenState createState() => _RecibirOrdenScreenState();
}

class _RecibirOrdenScreenState extends State<RecibirOrdenScreen> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedCategoriaId;
  String? _selectedEstadoId;
  String? _selectedUbicacionId;
  final _vidaUtilController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Fetch data for dropdowns
      Provider.of<CategoriaActivoProvider>(context, listen: false).fetchCategoriasActivo();
      Provider.of<EstadosProvider>(context, listen: false).fetchEstados();
      Provider.of<UbicacionesProvider>(context, listen: false).fetchUbicaciones();
    });
  }

  @override
  void dispose() {
    _vidaUtilController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_formKey.currentState!.validate()) {
      // Mostrar un loader
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (BuildContext context) {
          return const Center(child: CircularProgressIndicator());
        },
      );

      final data = {
        'categoria_id': _selectedCategoriaId,
        'estado_id': _selectedEstadoId,
        'ubicacion_id': _selectedUbicacionId,
        'vida_util': int.tryParse(_vidaUtilController.text) ?? 0,
      };

      try {
        final nuevoActivo = await Provider.of<OrdenCompraProvider>(context, listen: false)
            .recibirOrden(widget.orden.id, data);
        
        // Quitar el loader
        Navigator.of(context, rootNavigator: true).pop();

        // Navegar a la lista de activos, limpiando el stack y pasando argumentos
        Navigator.of(context).pushNamedAndRemoveUntil(
          '/home', 
          (Route<dynamic> route) => false, // Elimina todas las rutas anteriores
          arguments: {
            'initialModule': 'activos_fijos',
            'highlightedAssetId': nuevoActivo.id,
          },
        );

        // Mostrar SnackBar en la siguiente pantalla (opcional, más complejo)
        // Por ahora, la navegación y resaltado es suficiente.

      } catch (e) {
        // Quitar el loader
        Navigator.of(context, rootNavigator: true).pop();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al recibir el activo: ${e.toString()}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Recibir Activo de Orden'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Creando activo para: ${widget.orden.solicitudDescripcion}',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 24),

              // Categoria Dropdown
              Consumer<CategoriaActivoProvider>(
                builder: (context, provider, child) {
                  return DropdownButtonFormField<String>(
                    value: _selectedCategoriaId,
                    decoration: const InputDecoration(
                      labelText: 'Categoría del Activo',
                      border: OutlineInputBorder(),
                    ),
                    items: provider.categorias.map((CategoriaActivo item) {
                      return DropdownMenuItem<String>(
                        value: item.id,
                        child: Text(item.nombre),
                      );
                    }).toList(),
                    onChanged: (value) => setState(() => _selectedCategoriaId = value),
                    validator: (value) => value == null ? 'Seleccione una categoría' : null,
                  );
                },
              ),
              const SizedBox(height: 16),

              // Estado Dropdown
              Consumer<EstadosProvider>(
                builder: (context, provider, child) {
                  return DropdownButtonFormField<String>(
                    value: _selectedEstadoId,
                    decoration: const InputDecoration(
                      labelText: 'Estado Inicial',
                      border: OutlineInputBorder(),
                    ),
                    items: provider.estados.map((Estado item) {
                      return DropdownMenuItem<String>(
                        value: item.id,
                        child: Text(item.nombre),
                      );
                    }).toList(),
                    onChanged: (value) => setState(() => _selectedEstadoId = value),
                    validator: (value) => value == null ? 'Seleccione un estado' : null,
                  );
                },
              ),
              const SizedBox(height: 16),

              // Ubicacion Dropdown
              Consumer<UbicacionesProvider>(
                builder: (context, provider, child) {
                  return DropdownButtonFormField<String>(
                    value: _selectedUbicacionId,
                    decoration: const InputDecoration(
                      labelText: 'Ubicación Inicial',
                      border: OutlineInputBorder(),
                    ),
                    items: provider.ubicaciones.map((Ubicacion item) {
                      return DropdownMenuItem<String>(
                        value: item.id,
                        child: Text(item.nombre),
                      );
                    }).toList(),
                    onChanged: (value) => setState(() => _selectedUbicacionId = value),
                    validator: (value) => value == null ? 'Seleccione una ubicación' : null,
                  );
                },
              ),
              const SizedBox(height: 16),

              // Vida Util Text Field
              TextFormField(
                controller: _vidaUtilController,
                decoration: const InputDecoration(
                  labelText: 'Vida Útil (años)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.hourglass_bottom),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Ingrese la vida útil';
                  }
                  if (int.tryParse(value) == null || int.parse(value) <= 0) {
                    return 'Ingrese un número de años válido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),

              // Submit Button
              ElevatedButton.icon(
                icon: const Icon(Icons.check_circle_outline),
                label: const Text('Confirmar Recepción'),
                onPressed: _submit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

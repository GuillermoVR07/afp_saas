# api/views.py
from rest_framework import viewsets, status, serializers
from rest_framework import permissions
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from .permissions import HasPermission, check_permission
import io
import qrcode
from django.http import HttpResponse, Http404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action # <-- Importar action
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch

from openpyxl import Workbook
from openpyxl.styles import Font
from .models import *
from .serializers import * # Importa todos los serializers
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
import logging
from django.db.models import Q, Sum, Count
import re
from datetime import datetime
from .report_utils import create_excel_report, create_pdf_report
from .fcm_utils import send_fcm_notification # <--- NUEVO
from decimal import Decimal, InvalidOperation
from django.utils import timezone
import boto3
import json
import uuid
import os
from datetime import datetime
from django.conf import settings


logger = logging.getLogger(__name__)

class MyThemePreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request):
        # SOLO devuelve empleado si NO es staff
        if not request.user.is_staff:
            try:
                return request.user.empleado
            except Empleado.DoesNotExist:
                # Usuario normal sin perfil, esto es un error de datos
                raise serializers.ValidationError("Usuario no asociado a un perfil de empleado.")
        # Si es staff (SuperAdmin), devuelve None
        return None

    def get(self, request, *args, **kwargs):
        """Devuelve preferencias del empleado o defaults para SuperAdmin."""
        empleado = self.get_object(request) # Puede ser None si es SuperAdmin

        if empleado:
            data = {
                'theme_preference': empleado.theme_preference,
                'theme_custom_color': empleado.theme_custom_color,
                'theme_glow_enabled': empleado.theme_glow_enabled,
            }
        else:
            # Valores por defecto para SuperAdmin (o si falla get_object)
            data = {
                'theme_preference': 'dark',
                'theme_custom_color': '#6366F1',
                'theme_glow_enabled': False,
            }
        return Response(data, status=status.HTTP_200_OK)


    def patch(self, request, *args, **kwargs):
        """Actualiza preferencias SOLO para empleados normales."""
        empleado = self.get_object(request)

        # Si es SuperAdmin (empleado es None), prohibir guardar
        if empleado is None:
            return Response(
                {"detail": "El SuperAdmin no tiene preferencias de tema guardadas."},
                status=status.HTTP_403_FORBIDDEN # 403 Prohibido
            )

        # --- Lógica de validación y guardado (sin cambios) ---
        try:
            allowed_fields = ['theme_preference', 'theme_custom_color', 'theme_glow_enabled']
            update_data = {}
            valid = True
            errors = {}
            fields_to_update = [] # Lista para guardar solo los campos que llegaron

            for field in allowed_fields:
                if field in request.data:
                    value = request.data[field]
                    fields_to_update.append(field) # Añadir a la lista para .save()
                    # (Validaciones básicas...)
                    if field == 'theme_preference' and value not in ['light', 'dark', 'custom', None, '']:
                         valid = False; errors[field] = "Valor inválido."
                    elif field == 'theme_custom_color' and value is not None and value != '' and not (isinstance(value, str) and value.startswith('#') and len(value) in [4, 7]):
                         valid = False; errors[field] = "Formato de color inválido."
                    elif field == 'theme_glow_enabled' and not isinstance(value, bool):
                         valid = False; errors[field] = "Debe ser booleano."

                    if valid:
                        setattr(empleado, field, value)

            if not valid:
                 return Response(errors, status=status.HTTP_400_BAD_REQUEST)

            # Guardar solo los campos que se enviaron en el PATCH
            if fields_to_update:
                 empleado.save(update_fields=fields_to_update)

            updated_data = {
                'theme_preference': empleado.theme_preference,
                'theme_custom_color': empleado.theme_custom_color,
                'theme_glow_enabled': empleado.theme_glow_enabled,
            }
            return Response(updated_data, status=status.HTTP_200_OK)

        except serializers.ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
             print(f"ERROR en MyThemePreferencesView.patch: {e}")
             return Response({"detail": "Error interno."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)        
        
# --- VISTA DE LOGIN PERSONALIZADA ---
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

# --- VIEWSET BASE PARA LÓGICA MULTI-TENANT ---
#class BaseTenantViewSet(viewsets.ModelViewSet):
#    permission_classes = [IsAuthenticated]
#
#    def get_queryset(self):
#        try:
#            empleado = self.request.user.empleado
#            return self.queryset.filter(empresa=empleado.empresa)
#        except Empleado.DoesNotExist:
#            return self.queryset.none()
#
#    def perform_create(self, serializer):
#        empleado = self.request.user.empleado
#        serializer.save(empresa=empleado.empresa)

class BaseTenantViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Modificado para que el Superusuario (is_staff) pueda ver
        TODOS los objetos, sin filtrar por empresa.
        """
        # 1. Si el usuario es staff (Superusuario), saltar el filtro de tenant
        if self.request.user.is_staff:
            print(f"DEBUG: get_queryset for SUPERUSER: {self.request.user}. Returning all objects.")
            return self.queryset.all() # <-- Devuelve todo

        # 2. Si es un usuario normal, aplicar el filtro de tenant
        try:
            print(f"DEBUG: get_queryset called by user: {self.request.user}")
            empleado = self.request.user.empleado
            print(f"DEBUG: Found empleado: {empleado}, for empresa: {empleado.empresa}")
            
            queryset = self.queryset.filter(empresa=empleado.empresa)
            print(f"DEBUG: Filtered queryset count: {queryset.count()}")
            return queryset
        except Empleado.DoesNotExist:
            print(f"DEBUG: Empleado.DoesNotExist for user: {self.request.user}")
            return self.queryset.none()
        except Exception as e:
             print(f"ERROR in get_queryset: {e}")
             return self.queryset.none()       

    def check_permissions(self, request):
        super().check_permissions(request) 
        required_permission = getattr(self, 'required_manage_permission', None)
        if required_permission and request.method not in permissions.SAFE_METHODS:
             if not check_permission(request, self, required_permission):
                 self.permission_denied(
                     request, message=f'Permiso "{required_permission}" requerido.'
                 )
    
class BaseTenantLimitViewSet(BaseTenantViewSet):
    """
    ViewSet que comprueba los límites de la suscripción antes de CUALQUIER
    creación (POST) de un nuevo objeto (ej. Empleado o ActivoFijo).
    """
    model_to_count = None       # Ej: Empleado
    model_limit_field = None  # Ej: 'max_usuarios'

    def create(self, request, *args, **kwargs):
        empleado = request.user.empleado
        empresa = empleado.empresa

        if self.model_to_count and self.model_limit_field:
            try:
                suscripcion = empresa.suscripcion
                
                # 1. Comprobar si la suscripción está activa
                if suscripcion.estado != 'activa':
                    return Response(
                        {'detail': 'Tu suscripción no está activa. No puedes añadir nuevos registros.'},
                        status=status.HTTP_403_FORBIDDEN
                    )

                # 2. Comprobar límite
                current_count = self.model_to_count.objects.filter(empresa=empresa).count()
                limit = getattr(suscripcion, self.model_limit_field)

                if current_count >= limit:
                    # Límite alcanzado, bloquear creación
                    return Response(
                        {'detail': f'Has alcanzado el límite de {limit} {self.model_to_count._meta.verbose_name_plural} '
                                   f'para tu plan {suscripcion.get_plan_display()}. Por favor, actualiza tu plan.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                # 3. Comprobar umbral de notificación (90%) y crear notificación
                # (Se comprueba ANTES de crear, para notificar en el 90%)
                threshold = limit * 0.9
                if (current_count + 1) > threshold and limit < 9999: # No notificar si es "ilimitado"
                    # Obtener un admin de la empresa para enviarle la notificación
                    admin_user = User.objects.filter(empleado__empresa=empresa, empleado__roles__nombre='Admin').first()
                    
                    if admin_user:
                        model_name = self.model_to_count._meta.verbose_name_plural
                        mensaje = f"ESTIMADO USUARIO, ESTÁ LLEGANDO AL LÍMITE DE SUS {model_name.upper()} SEGÚN SU PLAN. LO INVITAMOS A MEJORAR DE PLAN."
                        
                        # Usamos get_or_create para no spamear notificaciones idénticas
                        Notificacion.objects.get_or_create(
                            destinatario=admin_user,
                            leido=False,
                            tipo='ADVERTENCIA',
                            mensaje=mensaje,
                            defaults={'url_destino': '/app/suscripcion'} # URL en el frontend
                        )
            
            except Suscripcion.DoesNotExist:
                return Response(
                    {'detail': 'Error: No se encontró una suscripción para tu empresa.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                return Response(
                    {'detail': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        # Si todo está bien (o no hay límites definidos), procede con la creación normal
        return super().create(request, *args, **kwargs)
    

# --- VIEWSETS DE LA APLICACIÓN ---
class CargoViewSet(BaseTenantViewSet):
    queryset = Cargo.objects.all()
    serializer_class = CargoSerializer
    required_manage_permission = 'manage_cargo'

class DepartamentoViewSet(BaseTenantViewSet):
    queryset = Departamento.objects.all()
    serializer_class = DepartamentoSerializer
    required_manage_permission = 'manage_departamento'

#class EmpleadoViewSet(BaseTenantViewSet):
#    queryset = Empleado.objects.all()
#    serializer_class = EmpleadoSerializer
#
#    # --- AÑADE ESTE MÉTODO ---
#    def create(self, request, *args, **kwargs):
#        """
#        Sobrescribe el método create para devolver una respuesta simple.
#        """
#        serializer = self.get_serializer(data=request.data)
#        serializer.is_valid(raise_exception=True)
#        # perform_create asigna la empresa automáticamente
#        self.perform_create(serializer) 
#        
#        # En lugar de devolver serializer.data (que puede fallar),
#        # devolvemos solo el ID y un mensaje.
#        headers = self.get_success_headers(serializer.data)
#        return Response(
#            {"id": serializer.instance.id, "detail": "Empleado creado con éxito."}, 
#            status=status.HTTP_201_CREATED, 
#            headers=headers
#        )

#class EmpleadoViewSet(BaseTenantViewSet):
#    queryset = Empleado.objects.all().select_related('usuario', 'cargo', 'departamento').prefetch_related('roles') # Optimization
#    serializer_class = EmpleadoSerializer
#    required_manage_permission = 'manage_empleado'
#
#    def create(self, request, *args, **kwargs):
#        # ... (Your existing create method returning simple response)
#        # Ensure perform_create is called correctly within this method if you override it
#        serializer = self.get_serializer(data=request.data)
#        serializer.is_valid(raise_exception=True)
#        self.perform_create(serializer) # Make sure this line exists and is called
#        headers = self.get_success_headers(serializer.data)
#        # Ensure serializer.instance is available AFTER perform_create
#        if hasattr(serializer, 'instance'):
#             return Response(
#                 {"id": serializer.instance.id, "detail": "Empleado creado con éxito."},
#                 status=status.HTTP_201_CREATED,
#                 headers=headers
#            )
#        else: # Should not happen if perform_create works
#             print("ERROR: serializer.instance not found after perform_create")
#             return Response({"detail":"Error creating employee instance."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EmpleadoViewSet(BaseTenantLimitViewSet): # <-- [EDITADO] Hereda de BaseTenantLimitViewSet
    queryset = Empleado.objects.all().select_related('usuario', 'cargo', 'departamento').prefetch_related('roles')
    serializer_class = EmpleadoSerializer
    required_manage_permission = 'manage_empleado'
    
    # --- [NUEVO] Definir los campos para el chequeo de límites ---
    model_to_count = Empleado
    model_limit_field = 'max_usuarios'

class ActivoFijoViewSet(BaseTenantViewSet):
    queryset = ActivoFijo.objects.all()
    serializer_class = ActivoFijoSerializer
    required_manage_permission = 'manage_activofijo'

    #@action(detail=True, methods=['get'])
    #@action(detail=True, methods=['get'], permission_classes=[AllowAny])
    #def qr_code(self, request, pk=None):
    #    activo = self.get_object()
    #    # URL que se codificará en el QR. Apunta a una ruta que el frontend deberá manejar.
    #    qr_data = f"/app/activos-fijos/{activo.id}"
    #    
    #    # Generar el QR en memoria
    #    qr_img = qrcode.make(qr_data)
    #    
    #    # Guardar la imagen en un buffer de bytes
    #    buffer = io.BytesIO()
    #    qr_img.save(buffer, format='PNG')
    #    
    #    # Devolver la imagen como una respuesta HTTP
    #    return HttpResponse(buffer.getvalue(), content_type="image/png")
    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def qr_code(self, request, pk=None):
        try:
            # Optimiza la consulta para incluir todos los datos relacionados necesarios
            activo = ActivoFijo.objects.select_related(
                'categoria', 'estado', 'ubicacion', 'departamento', 'proveedor'
            ).get(pk=pk)
            
        except (ActivoFijo.DoesNotExist, ValueError):
            return HttpResponse("Activo no encontrado", status=404)

        # Construye la cadena de texto con la información del activo
        qr_data = f"""
Nombre: {activo.nombre}
Código: {activo.codigo_interno}
Valor Actual: {activo.valor_actual} BOB
Ubicación: {activo.ubicacion.nombre if activo.ubicacion else 'N/A'}
Departamento: {activo.departamento.nombre if activo.departamento else 'N/A'}
Categoría: {activo.categoria.nombre if activo.categoria else 'N/A'}
Adquisición: {activo.fecha_adquisicion.strftime('%d/%m/%Y')}
Vida Útil: {activo.vida_util} años
"""
        
        # Genera el QR en memoria
        qr_img = qrcode.make(qr_data.strip())
        
        # Guarda la imagen en un buffer de bytes
        buffer = io.BytesIO()
        qr_img.save(buffer, format='PNG')
        
        # Devolver la imagen como una respuesta HTTP
        return HttpResponse(buffer.getvalue(), content_type="image/png")

class RolesViewSet(BaseTenantViewSet):
    queryset = Roles.objects.all()
    serializer_class = RolesSerializer
    required_manage_permission = 'manage_rol'

class CategoriaActivoViewSet(BaseTenantViewSet):
    queryset = CategoriaActivo.objects.all()
    serializer_class = CategoriaActivoSerializer
    required_manage_permission = 'manage_categoriaactivo'

class EstadoViewSet(BaseTenantViewSet):
    queryset = Estado.objects.all()
    serializer_class = EstadoSerializer
    required_manage_permission = 'manage_estadoactivo'

class UbicacionViewSet(BaseTenantViewSet):
    queryset = Ubicacion.objects.all()
    serializer_class = UbicacionSerializer
    required_manage_permission = 'manage_ubicacion'

class ProveedorViewSet(BaseTenantViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    required_manage_permission = 'manage_proveedor'


# --- [NUEVO] ViewSets para Módulo de Presupuesto ---

class PeriodoPresupuestarioViewSet(BaseTenantViewSet):
    queryset = PeriodoPresupuestario.objects.all().prefetch_related('partidas__departamento')
    serializer_class = PeriodoPresupuestarioSerializer
    required_manage_permission = 'manage_presupuesto'

class PartidaPresupuestariaViewSet(BaseTenantViewSet):
    queryset = PartidaPresupuestaria.objects.all()
    serializer_class = PartidaPresupuestariaSerializer
    required_manage_permission = 'manage_presupuesto'

    def get_queryset(self):
        """
        Corrected implementation for fetching Partidas.
        It builds the queryset from scratch to avoid the faulty BaseTenantViewSet logic
        which causes a FieldError because PartidaPresupuestaria has no direct 'empresa' field.
        """
        # For staff users, return all objects initially.
        if self.request.user.is_staff:
            qs = PartidaPresupuestaria.objects.all()
        else:
            # For regular users, correctly filter by their company via the related Periodo.
            try:
                empleado = self.request.user.empleado
                qs = PartidaPresupuestaria.objects.filter(periodo__empresa=empleado.empresa)
            except Empleado.DoesNotExist:
                # If the user is not linked to an employee, they can't see any partidas.
                return PartidaPresupuestaria.objects.none()

        # Now, apply the period_id filter from the frontend if it exists.
        periodo_id = self.request.query_params.get('periodo_id')
        if periodo_id:
            qs = qs.filter(periodo_id=periodo_id)
        
        return qs.distinct() # Use distinct to avoid potential duplicates from joins

class MovimientoPresupuestarioViewSet(BaseTenantViewSet):
    queryset = MovimientoPresupuestario.objects.all()
    serializer_class = MovimientoPresupuestarioSerializer
    required_manage_permission = 'view_presupuesto' # Permiso de solo lectura
    http_method_names = ['get', 'head', 'options'] # Hacerlo de solo lectura

    def get_queryset(self):
        qs = super().get_queryset()
        # Permitir filtrar movimientos por partida
        partida_id = self.request.query_params.get('partida_id')
        if partida_id:
            qs = qs.filter(partida_id=partida_id)
        return qs


# --- ViewSets para Flujo de Adquisición (EXISTENTE) ---
class SolicitudCompraViewSet(BaseTenantViewSet):
    queryset = SolicitudCompra.objects.all().select_related('solicitante', 'departamento', 'decision_por', 'partida_presupuestaria')
    serializer_class = SolicitudCompraSerializer
    required_manage_permission = 'manage_solicitud_compra'

    def get_queryset(self):
        qs = super().get_queryset()
        # Si el usuario no tiene permiso para aprobar, solo ve sus propias solicitudes
        if not self.request.user.is_staff and not check_permission(self.request, self, 'approve_solicitud_compra'):
            qs = qs.filter(solicitante=self.request.user)
        return qs

    def perform_create(self, serializer):
        """
        Sobrescrito para guardar la solicitud y luego notificar a los administradores.
        """
        # Guardar la solicitud de compra, asignando la empresa del usuario actual.
        solicitud = serializer.save(empresa=self.request.user.empleado.empresa)
        solicitante_nombre = solicitud.solicitante.get_full_name() or solicitud.solicitante.username

        # --- Lógica para Notificar a los Administradores ---
        try:
            # 1. Encontrar a todos los empleados con el rol 'Admin' en la misma empresa.
            admins = Empleado.objects.filter(empresa=solicitud.empresa, roles__nombre='Admin').select_related('usuario')

            if not admins.exists():
                logger.warning(f"No se encontraron administradores en la empresa {solicitud.empresa.nombre} para notificar sobre la solicitud {solicitud.id}.")
                return

            # 2. Preparar el contenido de la notificación.
            mensaje = f"{solicitante_nombre} ha creado una nueva solicitud de compra: '{solicitud.descripcion[:35]}...'."
            title_fcm = "Nueva Solicitud de Compra"
            url_destino = '/app/solicitudes-compra'
            
            # 3. Iterar sobre los admins y enviarles las notificaciones.
            for admin_empleado in admins:
                # Evitar notificar al usuario que creó la solicitud si también es admin.
                if admin_empleado.usuario == solicitud.solicitante:
                    continue

                # Crear la notificación web (para la campanita)
                notif_obj = Notificacion.objects.create(
                    destinatario=admin_empleado.usuario,
                    mensaje=mensaje,
                    tipo='INFO',
                    url_destino=url_destino
                )

                # Si el admin tiene un token FCM, enviar notificación push.
                if admin_empleado.fcm_token:
                    fcm_data = {
                        "id": str(notif_obj.id),
                        "url_destino": url_destino,
                        "tipo": notif_obj.tipo,
                    }
                    send_fcm_notification(
                        fcm_token=admin_empleado.fcm_token,
                        title=title_fcm,
                        body=mensaje,
                        data=fcm_data
                    )
        except Exception as e:
            # Es importante que la creación de la solicitud no falle si las notificaciones fallan.
            logger.error(f"Error al intentar notificar a los administradores sobre la nueva solicitud {solicitud.id}: {e}")

    @action(detail=True, methods=['post'], url_path='decidir')
    def decidir(self, request, pk=None):
        if not check_permission(request, self, 'approve_solicitud_compra'):
            self.permission_denied(request, message='Permiso "approve_solicitud_compra" requerido.')

        solicitud = self.get_object()
        if solicitud.estado != 'PENDIENTE':
            return Response({'detail': 'Esta solicitud ya ha sido decidida.'}, status=status.HTTP_400_BAD_REQUEST)

        decision = request.data.get('decision') # 'aprobar' o 'rechazar'
        motivo = request.data.get('motivo_rechazo', None)

        if decision == 'aprobar':
            solicitud.estado = 'APROBADA'
            solicitud.motivo_rechazo = None
        elif decision == 'rechazar':
            if not motivo:
                return Response({'detail': 'Se requiere un motivo para el rechazo.'}, status=status.HTTP_400_BAD_REQUEST)
            solicitud.estado = 'RECHAZADA'
            solicitud.motivo_rechazo = motivo
        else:
            return Response({'detail': "La decisión debe ser 'aprobar' o 'rechazar'."}, status=status.HTTP_400_BAD_REQUEST)

        solicitud.decision_por = request.user
        solicitud.fecha_decision = timezone.now()
        solicitud.save()

        # --- [NUEVO] Crear notificación para el solicitante ---
        try:
            if decision == 'aprobar':
                tipo_notif = 'INFO'
                mensaje = f"Tu solicitud de compra para '{solicitud.descripcion}' ha sido APROBADA."
                title_fcm = "Solicitud Aprobada"
            else: # 'rechazar'
                tipo_notif = 'ADVERTENCIA'
                mensaje = f"Tu solicitud de compra para '{solicitud.descripcion}' fue RECHAZADA."
                title_fcm = "Solicitud Rechazada"

            notif_obj = Notificacion.objects.create(
                destinatario=solicitud.solicitante,
                tipo=tipo_notif,
                mensaje=mensaje,
                url_destino='/app/solicitudes-compra' # URL a la que irá el usuario al hacer clic
            )

            # --- [NUEVO] Enviar FCM Push Notification ---
            empleado_destinatario = Empleado.objects.filter(usuario=solicitud.solicitante).first()
            if empleado_destinatario and empleado_destinatario.fcm_token:
                fcm_data = {
                    "id": str(notif_obj.id),
                    "url_destino": notif_obj.url_destino,
                    "tipo": notif_obj.tipo,
                }
                success, response_fcm = send_fcm_notification(
                    fcm_token=empleado_destinatario.fcm_token,
                    title=title_fcm,
                    body=mensaje,
                    data=fcm_data
                )
                if not success:
                    logger.error(f"Error al enviar FCM para solicitud {solicitud.id}: {response_fcm}")

        except Exception as e:
            # Si la creación de la notificación o FCM falla, no debe detener el proceso principal.
            logger.error(f"Error al crear la notificación o enviar FCM para la solicitud {solicitud.id}: {e}")
        # --- [FIN] ---

        serializer = self.get_serializer(solicitud)
        return Response(serializer.data, status=status.HTTP_200_OK)


class OrdenCompraViewSet(BaseTenantViewSet):
    queryset = OrdenCompra.objects.all().select_related('solicitud__departamento', 'proveedor', 'creado_por', 'activo_creado')
    serializer_class = OrdenCompraSerializer
    required_manage_permission = 'manage_orden_compra'

    def perform_create(self, serializer):
        """
        Sobrescrito para guardar la orden y notificar al solicitante original.
        """
        # Guardar la orden de compra, asignando la empresa del usuario actual
        orden = serializer.save(
            empresa=self.request.user.empleado.empresa,
            creado_por=self.request.user
        )

        # --- Lógica para Notificar al Solicitante Original ---
        try:
            solicitud_original = orden.solicitud
            destinatario = solicitud_original.solicitante

            # No notificar si el creador de la orden es el mismo que el solicitante
            if destinatario == self.request.user:
                return

            mensaje = f"Se ha generado una orden de compra para tu solicitud: '{solicitud_original.descripcion[:35]}...'."
            title_fcm = "Orden de Compra Generada"
            url_destino = f'/app/ordenes-compra' # O una URL más específica si existe

            # Crear la notificación web (para la campanita)
            notif_obj = Notificacion.objects.create(
                destinatario=destinatario,
                mensaje=mensaje,
                tipo='INFO',
                url_destino=url_destino
            )

            # Enviar notificación push si el solicitante tiene un token FCM
            empleado_destinatario = Empleado.objects.filter(usuario=destinatario).first()
            if empleado_destinatario and empleado_destinatario.fcm_token:
                fcm_data = {
                    "id": str(notif_obj.id),
                    "url_destino": url_destino,
                    "tipo": notif_obj.tipo,
                    "screen": "PurchaseOrderDetail", # Dato para deep linking en móvil
                    "orden_id": str(orden.id)
                }
                send_fcm_notification(
                    fcm_token=empleado_destinatario.fcm_token,
                    title=title_fcm,
                    body=mensaje,
                    data=fcm_data
                )
        except Exception as e:
            # La creación de la orden no debe fallar si las notificaciones fallan.
            logger.error(f"Error al intentar notificar al solicitante sobre la nueva orden de compra {orden.id}: {e}")

    @action(detail=True, methods=['post'], url_path='enviar')
    def enviar(self, request, pk=None):
        if not check_permission(request, self, 'manage_orden_compra'):
            self.permission_denied(request, message='Permiso "manage_orden_compra" requerido.')

        orden = self.get_object()
        if orden.estado != 'GENERADA':
            return Response({'detail': 'Esta orden no puede ser enviada.'}, status=status.HTTP_400_BAD_REQUEST)

        orden.estado = 'ENVIADA'
        orden.save(update_fields=['estado'])
        serializer = self.get_serializer(orden)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='recibir')
    def recibir(self, request, pk=None):
        if not check_permission(request, self, 'receive_orden_compra'):
            self.permission_denied(request, message='Permiso "receive_orden_compra" requerido.')

        orden = self.get_object()
        if orden.estado == 'COMPLETADA':
            return Response({'detail': 'Esta orden de compra ya ha sido completada.'}, status=status.HTTP_400_BAD_REQUEST)
        if orden.estado == 'CANCELADA':
            return Response({'detail': 'No se puede recibir una orden de compra cancelada.'}, status=status.HTTP_400_BAD_REQUEST)
        if hasattr(orden, 'activo_creado') and orden.activo_creado is not None:
            return Response({'detail': 'Ya se ha creado un activo para esta orden de compra.'}, status=status.HTTP_400_BAD_REQUEST)

        solicitud = orden.solicitud
        
        categoria_id = request.data.get('categoria_id')
        estado_id = request.data.get('estado_id')
        ubicacion_id = request.data.get('ubicacion_id')
        vida_util = request.data.get('vida_util')
        force_overspend = request.data.get('force_overspend', False) # NEW: Get force_overspend flag

        if not all([categoria_id, estado_id, ubicacion_id, vida_util]):
            return Response({'detail': 'Se requieren categoria_id, estado_id, ubicacion_id y vida_util para crear el activo.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Crear el activo
            nuevo_activo = ActivoFijo.objects.create(
                empresa=orden.empresa,
                nombre=solicitud.descripcion,
                codigo_interno=f"ACT-{orden.id.hex[:8].upper()}",
                fecha_adquisicion=timezone.now().date(),
                valor_actual=orden.precio_final,
                vida_util=vida_util,
                departamento=solicitud.departamento,
                categoria_id=categoria_id,
                estado_id=estado_id,
                ubicacion_id=ubicacion_id,
                proveedor=orden.proveedor,
                orden_compra=orden
            )

            # --- Integración con Presupuesto ---
            partida = solicitud.partida_presupuestaria
            if partida:
                logger.info(f"Recibir OrdenCompra {orden.id}: Partida presupuestaria {partida.id} encontrada.")
                logger.info(f"Recibir OrdenCompra {orden.id}: Precio final de la orden: {orden.precio_final}")

                # Bloquear la partida para evitar race conditions
                partida = PartidaPresupuestaria.objects.select_for_update().get(pk=partida.pk)
                logger.info(f"Recibir OrdenCompra {orden.id}: Monto gastado de partida {partida.id} ANTES: {partida.monto_gastado}")

                # NEW: Check force_overspend flag
                if not force_overspend and partida.monto_disponible < orden.precio_final:
                    logger.warning(f"Recibir OrdenCompra {orden.id}: El precio final ({orden.precio_final}) excede el monto disponible ({partida.monto_disponible}) en la partida '{partida.nombre}'.")
                    raise serializers.ValidationError(f"El precio final ({orden.precio_final}) excede el monto disponible ({partida.monto_disponible}) en la partida '{partida.nombre}'. Para forzar la recepción, envíe `force_overspend: true`.")
                elif force_overspend and partida.monto_disponible < orden.precio_final:
                    logger.warning(f"Recibir OrdenCompra {orden.id}: Forzando sobregasto en partida {partida.id}. Monto disponible: {partida.monto_disponible}, Precio final: {orden.precio_final}.")

                # Check if the associated PeriodoPresupuestario is ACTIVO
                if partida.periodo.estado != 'ACTIVO':
                    logger.warning(f"Recibir OrdenCompra {orden.id}: Intento de registrar gasto en partida {partida.id} cuyo período {partida.periodo.id} no está ACTIVO (estado: {partida.periodo.estado}).")
                    raise serializers.ValidationError(f"No se pueden registrar gastos en la partida '{partida.nombre}' porque su período presupuestario '{partida.periodo.nombre}' no está ACTIVO (estado actual: {partida.periodo.estado}).")

                # Crear el movimiento en el libro de contabilidad del presupuesto
                MovimientoPresupuestario.objects.create(
                    partida=partida,
                    orden_compra=orden,
                    monto=orden.precio_final,
                    tipo='GASTO',
                    descripcion=f"Compra de activo: {nuevo_activo.nombre}",
                    realizado_por=request.user
                )
                logger.info(f"Recibir OrdenCompra {orden.id}: Movimiento presupuestario creado para partida {partida.id}.")

                # Actualizar el monto gastado en la partida
                partida.monto_gastado += orden.precio_final
                partida.save(update_fields=['monto_gastado'])
                logger.info(f"Recibir OrdenCompra {orden.id}: Monto gastado de partida {partida.id} DESPUÉS: {partida.monto_gastado}. Partida guardada.")

            # Marcar la orden como completada
            orden.estado = 'COMPLETADA'
            orden.save(update_fields=['estado'])

            # --- [NUEVO] Notificar al solicitante original ---
            try:
                destinatario = solicitud.solicitante
                if destinatario != request.user: # No notificar a la persona que realiza la acción
                    mensaje = f"El activo para tu solicitud '{solicitud.descripcion[:30]}...' ha sido recibido y creado."
                    title_fcm = "Activo Recibido"
                    url_destino = f'/app/activos-fijos/{nuevo_activo.id}'

                    notif_obj = Notificacion.objects.create(
                        destinatario=destinatario,
                        mensaje=mensaje,
                        tipo='INFO',
                        url_destino=url_destino
                    )

                    empleado_destinatario = Empleado.objects.filter(usuario=destinatario).first()
                    if empleado_destinatario and empleado_destinatario.fcm_token:
                        fcm_data = {
                            "id": str(notif_obj.id),
                            "url_destino": url_destino,
                            "tipo": notif_obj.tipo,
                            "screen": "ActivoDetail",
                            "activo_id": str(nuevo_activo.id)
                        }
                        send_fcm_notification(
                            fcm_token=empleado_destinatario.fcm_token,
                            title=title_fcm,
                            body=mensaje,
                            data=fcm_data
                        )
            except Exception as e:
                logger.error(f"Error al notificar la recepción de la orden {orden.id}: {e}")
            # --- [FIN] ---

        serializer = ActivoFijoSerializer(nuevo_activo)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PermisosViewSet(viewsets.ModelViewSet): 
    """
    ViewSet para gestionar los Permisos Globales...
    """
    queryset = Permisos.objects.all().order_by('nombre')
    serializer_class = PermisosSerializer
    pagination_class = None
    
    def get_permissions(self):
        # ... (permission logic) ...
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        # Requiere ser Superusuario (is_staff=True) para otras acciones (POST, PUT, DELETE)
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

# --- NUEVO VIEWSET PARA LA BITÁCORA/LOG ---
#class LogViewSet(viewsets.ModelViewSet):
#    """
#    ViewSet para recibir y guardar registros de log desde el frontend.
#    No usa el filtro de tenant porque es una función a nivel de sistema.
#    """
#    queryset = Log.objects.all()
#    serializer_class = LogSerializer
#    permission_classes = [IsAuthenticated] # Solo usuarios autenticados pueden registrar logs
#
#    def perform_create(self, serializer):
#        # Obtenemos la IP del cliente de forma segura
#        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
#        if x_forwarded_for:
#            ip = x_forwarded_for.split(',')[0]
#        else:
#            ip = self.request.META.get('REMOTE_ADDR')
#
#        # Asignamos los datos automáticos antes de guardar
#        empleado = self.request.user.empleado
#        serializer.save(
#            usuario=self.request.user,
#            ip_address=ip,
#            tenant_id=empleado.empresa.id if empleado else None
#        )

class LogViewSet(viewsets.ModelViewSet):
    queryset = Log.objects.all() # Descomenta si tienes el modelo Log
    serializer_class = LogSerializer # Descomenta si tienes el serializer

    def create(self, request, *args, **kwargs):
        # 1. Validar datos recibidos
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # 2. Decidir estrategia: ¿Nube o Local?
        if getattr(settings, 'USE_S3_LOGS', False):
            # === ESTRATEGIA S3 (Producción) ===
            try:
                self._upload_to_s3(serializer.validated_data, request)
                return Response({"status": "Archivado en S3"}, status=status.HTTP_201_CREATED)
            except Exception as e:
                print(f"Error subiendo a S3: {e}")
                # Si falla S3, guardamos en BD como respaldo
                self.perform_create(serializer)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            # === ESTRATEGIA BD (Local) ===
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def _upload_to_s3(self, validated_data, request):
        # Prepara el JSON
        log_data = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.now().isoformat(),
            'usuario': request.user.username if request.user.is_authenticated else 'Anonimo',
            'accion': validated_data.get('accion'),
            'payload': validated_data.get('payload', {}),
            'ip': self.get_client_ip(request)
        }

        # Conecta con AWS
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
        # Sube el archivo (Ruta: logs/año/mes/dia/...)
        date_path = datetime.now().strftime('%Y/%m/%d')
        file_name = f"logs/{date_path}/{log_data['timestamp']}-{log_data['id']}.json"

        s3.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=file_name,
            Body=json.dumps(log_data, default=str),
            ContentType='application/json'
        )

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

class RegisterEmpresaView(APIView):
    permission_classes = [AllowAny] 

    def post(self, request, *args, **kwargs):
        # Usamos el parser de Form data para aceptar 'plan' y 'fotos'
        serializer = RegisterEmpresaSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()                         
            refresh = RefreshToken.for_user(user)
            token = refresh.access_token
            
            # Repoblamos el token con los datos (serializer.save() devuelve el user)
            try:
                empleado = user.empleado
                token['username'] = user.username
                token['email'] = user.email
                token['nombre_completo'] = f"{user.first_name} {empleado.apellido_p}"
                token['empresa_id'] = str(empleado.empresa.id)
                token['empresa_nombre'] = empleado.empresa.nombre
                token['empleado_id'] = str(empleado.id)
                # Al registrarse, el rol de Admin aún no está asignado (a menos que lo hagas en el serializer)
                token['roles'] = [] # Vacío por ahora
                token['is_admin'] = user.is_staff
            except Empleado.DoesNotExist:
                token['roles'] = []
                token['is_admin'] = user.is_staff
                
            return Response({
                'refresh': str(refresh),
                'access': str(token),
            }, status=status.HTTP_201_CREATED) # type: ignore
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DashboardDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            # Determinar la empresa del usuario actual
            if request.user.is_staff:
                # Si es superusuario, podría tener una lógica diferente,
                # como seleccionar una empresa o ver datos agregados de todas.
                # Por ahora, tomaremos la primera empresa como ejemplo si es necesario.
                empresa = Empresa.objects.first()
                if not empresa:
                    return Response({"detail": "No hay empresas en el sistema."}, status=status.HTTP_404_NOT_FOUND)
            else:
                empresa = request.user.empleado.empresa
        except Empleado.DoesNotExist:
            return Response({"detail": "El usuario no está asociado a una empresa."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Métricas de Activos y Usuarios
        activos_qs = ActivoFijo.objects.filter(empresa=empresa)
        total_activos = activos_qs.count()
        total_usuarios = Empleado.objects.filter(empresa=empresa).count()
        valor_total_activos = activos_qs.aggregate(total=Sum('valor_actual'))['total'] or 0

        # 2. Activos por Estado
        activos_por_estado = list(activos_qs.values('estado__nombre').annotate(count=Count('id')))

        # 3. Activos por Categoría
        activos_por_categoria = list(activos_qs.values('categoria__nombre').annotate(count=Count('id')))

        # 4. Solicitudes de Compra Pendientes
        solicitudes_pendientes = SolicitudCompra.objects.filter(empresa=empresa, estado='PENDIENTE').count()

        # 5. Mantenimientos en Proceso
        mantenimientos_en_proceso = Mantenimiento.objects.filter(empresa=empresa, estado='EN_PROCESO').count()

        # Consolidar todos los datos en una sola respuesta
        data = {
            'total_activos': total_activos,
            'total_usuarios': total_usuarios,
            'valor_total_activos': valor_total_activos,
            'activos_por_estado': activos_por_estado,
            'activos_por_categoria': activos_por_categoria,
            'solicitudes_pendientes': solicitudes_pendientes,
            'mantenimientos_en_proceso': mantenimientos_en_proceso,
        }

        return Response(data)

class UserPermissionsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, *args, **kwargs):
        permissions_set = set()
        try:
            empleado = request.user.empleado
            # 1. Obtener permisos basados en roles
            permissions_set.update(
                empleado.roles.values_list('permisos__nombre', flat=True).distinct()
            )
            
            # 2. Añadir permisos basados en la suscripción
            try:
                suscripcion = empleado.empresa.suscripcion
                if suscripcion.plan in ['profesional', 'empresarial']:
                    permissions_set.add('view_custom_reports')
                if suscripcion.plan == 'empresarial':
                    permissions_set.add('view_advanced_reports')
                    permissions_set.add('has_api_access')
            except Suscripcion.DoesNotExist:
                # Si no hay suscripción, no se añaden permisos extra
                pass

            # 3. Añadir permiso de superusuario si aplica
            if request.user.is_staff:
                 permissions_set.add('is_superuser')

        except Empleado.DoesNotExist:
            if request.user.is_staff:
                 permissions_set.add('is_superuser')
            pass 
        except Exception as e:
            print(f"Error fetching user permissions: {e}")
            
        return Response(list(permissions_set))

class ReporteActivosPreview(APIView):
    """
    Vista previa para el reporte original basado en filtros de formulario.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self, request):
        empleado = request.user.empleado
        queryset = ActivoFijo.objects.filter(empresa=empleado.empresa).select_related(
            'categoria', 'estado', 'ubicacion', 'departamento' # Asegurar todos los relateds
        )
        ubicacion_id = request.query_params.get('ubicacion_id') 
        fecha_min = request.query_params.get('fecha_min')
        fecha_max = request.query_params.get('fecha_max')
        
        # Aplicar filtros
        if ubicacion_id:
            queryset = queryset.filter(ubicacion_id=ubicacion_id)
        if fecha_min:
            queryset = queryset.filter(fecha_adquisicion__gte=fecha_min)
        if fecha_max:
            queryset = queryset.filter(fecha_adquisicion__lte=fecha_max)
            
        return queryset.order_by('fecha_adquisicion')

    def get(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset(request)
            # Devolver los campos que el frontend necesita para la tabla
            data = queryset.values(
                'id', 'nombre', 'codigo_interno', 'fecha_adquisicion', 'valor_actual',
                'ubicacion__nombre', 'categoria__nombre', 'departamento__nombre'
            )
            return Response(list(data))
        except Empleado.DoesNotExist:
             return Response({"detail": "Usuario no asociado a un empleado."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
             logger.error(f"ReporteActivosPreview Error: {e}", exc_info=True)
             return Response({"detail": "Error al generar vista previa."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- VISTA DE REPORTE EXPORT (ESTÁTICA) ---
class ReporteActivosExport(APIView):
    """
    Exporta el reporte original (filtros de formulario) a PDF o Excel.
    Reutiliza funciones de report_utils.py
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self, request):
        try:
            # Reutiliza la lógica de get_queryset de la vista previa
            # y asegura que todos los campos relacionados necesarios estén
            qs = ReporteActivosPreview().get_queryset(request).select_related(
               'ubicacion', 'estado', 'categoria', 'departamento'
            )
            logger.info(f"Report Export: Queryset count = {qs.count()}")
            return qs
        except Exception as e:
            logger.error(f"Report Export: Error in get_queryset: {e}", exc_info=True)
            raise Http404("Error al obtener datos base.")

    def get(self, request, *args, **kwargs):
        export_format = request.query_params.get('format', 'pdf').lower()
        logger.info(f"Report Export GET request. Format = {export_format}")
        try:
            queryset = self.get_queryset(request)
            if not queryset.exists():
                 logger.warning("Report Export: Queryset is empty.")
                 return Response({"detail": "No hay datos para exportar con esos filtros."}, status=status.HTTP_404_NOT_FOUND)

            # --- Llamar a funciones de utils ---
            if export_format == 'excel':
                logger.info("Report Export: Calling create_excel_report util...")
                response = create_excel_report(queryset)
                logger.info("Report Export: create_excel_report finished.")
                return response
            else:
                logger.info("Report Export: Calling create_pdf_report util...")
                response = create_pdf_report(queryset)
                logger.info("Report Export: create_pdf_report finished.")
                return response

        except Http404 as e:
             logger.warning(f"Report Export: Http404 raised - {e}")
             return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
             logger.error(f"Report Export: Unhandled error in GET: {e}", exc_info=True)
             return Response({"detail": f"Error interno al generar el reporte: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- FUNCIÓN HELPER PARA REPORTE DINÁMICO ---
def parse_and_build_query(filters_list, base_queryset):
    """
    Toma una lista de strings de filtro (ej: ["depto:TI", "laptop", "valor>500"])
    y la convierte en un queryset de Django filtrado.
    """
    query = base_queryset
    
    # Mapeo de claves a campos base del modelo ActivoFijo
    field_mapping = {
        'depto': 'departamento__nombre',
        'categoria': 'categoria__nombre',
        'ubicacion': 'ubicacion__nombre',
        'estado': 'estado__nombre',
        'proveedor': 'proveedor__nombre',
        'nombre': 'nombre',
        'codigo': 'codigo_interno',
        'valor': 'valor_actual',
        'fecha_adq': 'fecha_adquisicion',
    }

    # Mapeo de operadores de texto/numéricos a suffixes de Django ORM
    operator_mapping = {
        ':': '__icontains', # Búsqueda de texto flexible (contiene, sin mayúsculas)
        '>': '__gt',        # Mayor que
        '<': '__lt',        # Menor que
        '=': '__exact',     # Coincidencia exacta
    }

    q_objects = Q() # Inicializa un objeto Q vacío (para combinar filtros con AND)

    for f in filters_list:
        try:
            f = f.strip()
            if not f: continue # Ignorar filtros vacíos

            # --- NUEVA LÓGICA DE PARSEO ---
            # Intenta encontrar un patrón como "clave:valor", "clave>valor", "clave < valor"
            # Regex: (clave) (espacios) (operador) (espacios) (valor)
            match = re.match(r'([\w_]+)\s*([:<>])\s*(.+)', f)
            
            if match:
                # --- Filtro Estructurado (ej: "depto: TI", "valor > 1000") ---
                key, operator, value = match.groups()
                key = key.lower().strip()
                operator = operator.strip()
                value = value.strip()
                
                # Verificar si la clave y el operador son válidos
                if key in field_mapping and operator in operator_mapping:
                    # Construir el nombre completo del campo ORM (ej: 'valor_actual__gt')
                    orm_field = field_mapping[key] + operator_mapping[operator]
                    
                    # Convertir valor si es numérico o fecha
                    if operator in ['>', '<', '='] and key in ['valor', 'fecha_adq']:
                        try:
                            if key == 'valor':
                                value = float(value) # Convertir a número
                            elif key == 'fecha_adq':
                                # Asumir formato YYYY-MM-DD
                                value = datetime.strptime(value, '%Y-%m-%d').date()
                        except ValueError:
                            logger.warn(f"Filtro ignorado: Valor para '{key}{operator}' no es válido: '{value}'")
                            continue # Saltar este filtro
                    
                    # Añadir al query (ej: Q(valor_actual__gt=1000))
                    q_objects &= Q(**{orm_field: value})
                else:
                    logger.warn(f"Filtro ignorado: Clave '{key}' u operador '{operator}' no reconocidos.")

            # --- Filtro de Texto Simple (ej: "laptop", "finanzas") ---
            else:
                # Si no es un filtro estructurado, buscar el texto en MÚLTIPLES campos
                q_objects &= (
                    Q(nombre__icontains=f) | 
                    Q(codigo_interno__icontains=f) |
                    Q(departamento__nombre__icontains=f) |
                    Q(categoria__nombre__icontains=f) |
                    Q(ubicacion__nombre__icontains=f) |
                    Q(estado__nombre__icontains=f) |
                    Q(proveedor__nombre__icontains=f)
                )
        except Exception as e:
            # Ignorar filtros malformados (ej: "valor>abc")
            logger.warn(f"Report Query: Ignorando filtro malformado: '{f}'. Error: {e}")
            pass
            
    # Aplicar todos los filtros combinados (Q objects) al queryset
    return query.filter(q_objects).distinct()

# --- VISTA DE REPORTE DINÁMICO (PREVIEW) ---
class ReporteQueryView(APIView):
    """
    Recibe filtros dinámicos (POST) y devuelve una vista previa JSON.
    Endpoint: /api/reportes/query/
    """
    permission_classes = [IsAuthenticated]

    def get_base_queryset(self, request):
        # Filtrar por tenant (empresa)
        try:
            empleado = request.user.empleado
            # Precargar todos los campos relacionados que podamos necesitar
            return ActivoFijo.objects.filter(empresa=empleado.empresa).select_related(
                'departamento', 'ubicacion', 'categoria', 'estado', 'proveedor'
            )
        except Empleado.DoesNotExist:
            if request.user.is_staff:
                 return ActivoFijo.objects.all().select_related(
                    'departamento', 'ubicacion', 'categoria', 'estado', 'proveedor'
                 )
            return ActivoFijo.objects.none()

    def post(self, request, *args, **kwargs):
        # --- Comprobación de Suscripción y Permiso --- # <--- MODIFICADO
        try:
            if not request.user.is_staff:
                # Comprobación de permiso explícita
                if not check_permission(request, self, 'view_custom_reports'): # Assuming 'view_custom_reports' covers general report access
                    return Response(
                        {'detail': 'Permiso "view_custom_reports" requerido para acceder a reportes personalizados.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                # Comprobación de suscripción (existente)
                plan = request.user.empleado.empresa.suscripcion.plan
                if plan == 'basico':
                    return Response(
                        {'detail': 'Los reportes personalizables no están incluidos en tu plan Básico.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
        except (Empleado.DoesNotExist, Suscripcion.DoesNotExist):
            return Response(
                {'detail': 'No se pudo verificar tu plan de suscripción o perfil de empleado.'}, # <--- Mensaje mejorado
                status=status.HTTP_403_FORBIDDEN
            )
        # --- Fin de la Comprobación ---

        filters = request.data.get('filters', [])
        if not isinstance(filters, list):
             return Response({"detail": "El campo 'filters' debe ser una lista."}, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Report Query Preview POST. Filters = {filters}")
        try:
            base_qs = self.get_base_queryset(request)
            queryset = parse_and_build_query(filters, base_qs)
            
            # Devolver los datos que el frontend espera en la tabla
            data = queryset.values(
                'id', 'nombre', 'codigo_interno', 'fecha_adquisicion', 'valor_actual',
                'departamento__nombre',
                'ubicacion__nombre'
            )
            return Response(list(data), status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Report Query Error: {e}", exc_info=True)
            return Response({"detail": f"Error al procesar la consulta: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- VISTA DE REPORTE DINÁMICO (EXPORT) ---
class ReporteQueryExportView(ReporteQueryView): # Hereda get_base_queryset
    """
    Recibe filtros dinámicos y formato (POST) y devuelve un archivo PDF/Excel
    usando las funciones de report_utils.py
    """
    
    def post(self, request, *args, **kwargs):
        # --- Comprobación de Suscripción y Permiso --- # <--- MODIFICADO
        try:
            if not request.user.is_staff:
                # Comprobación de permiso explícita
                if not check_permission(request, self, 'view_custom_reports'): # Assuming 'view_custom_reports' covers general report access
                    return Response(
                        {'detail': 'Permiso "view_custom_reports" requerido para exportar reportes personalizados.'},
                        status=status.HTTP_403_FORBIDDEN
                    )

                # Comprobación de suscripción (existente)
                plan = request.user.empleado.empresa.suscripcion.plan
                if plan == 'basico':
                    return Response(
                        {'detail': 'La exportación de reportes personalizables no está incluida en tu plan Básico.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
        except (Empleado.DoesNotExist, Suscripcion.DoesNotExist):
            return Response(
                {'detail': 'No se pudo verificar tu plan de suscripción o perfil de empleado.'}, # <--- Mensaje mejorado
                status=status.HTTP_403_FORBIDDEN
            )
        # --- Fin de la Comprobación ---

        filters = request.data.get('filters', [])
        export_format = request.data.get('format', 'pdf').lower()
        
        if not isinstance(filters, list):
             return Response({"detail": "Filters debe ser lista."}, status=status.HTTP_400_BAD_REQUEST)

        logger.info(f"Report Query Export POST. Format = {export_format}, Filters = {filters}")
        try:
            # Obtener queryset base (ya tiene select_related)
            base_qs = self.get_base_queryset(request)
            # Aplicar filtros
            queryset = parse_and_build_query(filters, base_qs)

            if not queryset.exists():
                logger.warning("Report Query Export: Queryset is empty.")
                return Response({"detail": "No hay datos para exportar."}, status=status.HTTP_404_NOT_FOUND)

            # --- Llamar a funciones de utils ---
            if export_format == 'excel':
                logger.info("Report Query Export: Calling create_excel_report util...")
                return create_excel_report(queryset) # <-- LLAMADA A UTIL
            else:
                logger.info("Report Query Export: Calling create_pdf_report util...")
                return create_pdf_report(queryset) # <-- LLAMADA A UTIL

        except Http404 as e:
            logger.warning(f"Report Query Export: Http404 - {e}")
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Report Query Export Error: {e}", exc_info=True)
            return Response({"detail": f"Error al exportar: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction

class MantenimientoViewSet(BaseTenantViewSet):
    queryset = Mantenimiento.objects.all().select_related('activo', 'empleado_asignado__usuario', 'creado_por').prefetch_related('fotos') # Optimizar query
    serializer_class = MantenimientoSerializer
    required_manage_permission = 'manage_mantenimiento'
    parser_classes = (JSONParser, MultiPartParser, FormParser) # Añadir parsers para subida de archivos

    @action(detail=True, methods=['patch', 'post'], url_path='actualizar-estado')
    def actualizar_estado(self, request, pk=None):
        """
        Permite al empleado asignado actualizar estado, notas y subir fotos de solución.
        Acepta multipart/form-data.
        """
        try:
            mantenimiento = self.get_object()
            empleado_actual = request.user.empleado
            estado_anterior = mantenimiento.estado
            
            # 1. Verificar si el usuario es el empleado asignado o un admin
            if mantenimiento.empleado_asignado != empleado_actual and not request.user.is_staff:
                 return Response({'detail': 'No tienes permiso para actualizar este mantenimiento.'},
                                status=status.HTTP_403_FORBIDDEN)

            # 2. Validar y actualizar campos de texto
            nuevo_estado = request.data.get('estado')
            if nuevo_estado and nuevo_estado not in dict(Mantenimiento.ESTADO_CHOICES).keys():
                return Response({'estado': 'Estado inválido.'}, status=status.HTTP_400_BAD_REQUEST)

            if nuevo_estado:
                mantenimiento.estado = nuevo_estado
            
            if 'notas_solucion' in request.data:
                mantenimiento.notas_solucion = request.data['notas_solucion']

            # Marcar fecha_fin si el estado es COMPLETADO
            if mantenimiento.estado == 'COMPLETADO' and not mantenimiento.fecha_fin:
                 mantenimiento.fecha_fin = timezone.now()

            mantenimiento.save()

            # 3. Procesar fotos de solución subidas
            fotos_solucion = request.FILES.getlist('fotos_solucion')
            for foto_data in fotos_solucion:
                MantenimientoFoto.objects.create(
                    mantenimiento=mantenimiento,
                    foto=foto_data,
                    subido_por=request.user,
                    tipo='SOLUCION'
                )
            
            # --- [NUEVO] Lógica de Notificación al creador ---
            print("--- DEBUG NOTIFICACIÓN ---")
            print(f"Mantenimiento ID: {mantenimiento.id}")
            print(f"Creador de la tarea: {mantenimiento.creado_por}")
            print(f"Usuario actualizando: {request.user}")
            print(f"Estado anterior: {estado_anterior}")
            print(f"Nuevo estado: {nuevo_estado}")

            if not mantenimiento.creado_por:
                print("DEBUG: Condición falló - La tarea no tiene creador (creado_por es Nulo).")
            if mantenimiento.creado_por == request.user:
                print("DEBUG: Condición falló - El usuario está actualizando su propia tarea.")
            if not nuevo_estado:
                print("DEBUG: Condición falló - No se proporcionó un nuevo estado.")
            if nuevo_estado == estado_anterior:
                print("DEBUG: Condición falló - El estado no ha cambiado.")

            if (mantenimiento.creado_por and 
                mantenimiento.creado_por != request.user and 
                nuevo_estado and 
                nuevo_estado != estado_anterior):
                
                print("DEBUG: Todas las condiciones cumplidas. Intentando crear notificación...")
                try:
                    mensaje = (f"El estado del mantenimiento para '{mantenimiento.activo.nombre}' "
                               f"fue actualizado a '{mantenimiento.get_estado_display()}' por "
                               f"{empleado_actual.usuario.get_full_name() or empleado_actual.usuario.username}.")
                    title_fcm = "Actualización de Mantenimiento"
                    
                    notif_obj = Notificacion.objects.create(
                        destinatario=mantenimiento.creado_por,
                        mensaje=mensaje,
                        tipo='INFO',
                        url_destino=f'/app/mantenimientos' # URL al módulo general
                    )
                    print(f"DEBUG: Notificación de BD creada para {mantenimiento.creado_por}.")

                    # Enviar también una notificación Push a través de FCM
                    empleado_creador = Empleado.objects.filter(usuario=mantenimiento.creado_por).first()
                    if empleado_creador and empleado_creador.fcm_token:
                        print(f"DEBUG: Encontrado fcm_token para el creador. Enviando push notification.")
                        fcm_data = {
                            "id": str(notif_obj.id),
                            "url_destino": notif_obj.url_destino,
                            "tipo": notif_obj.tipo,
                        }
                        send_fcm_notification(
                            fcm_token=empleado_creador.fcm_token,
                            title=title_fcm,
                            body=mensaje,
                            data=fcm_data
                        )
                    else:
                        print("DEBUG: El creador no tiene un fcm_token registrado. No se envía push notification.")

                except Exception as e:
                    logger.error(f"Error al crear notificación de actualización de estado: {e}")
            else:
                print("DEBUG: No se cumplieron todas las condiciones para enviar la notificación.")
            print("--- FIN DEBUG ---")
            # --- [FIN DE NUEVA LÓGICA] ---

            serializer = self.get_serializer(mantenimiento)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Empleado.DoesNotExist:
             return Response({'detail': 'Perfil de empleado no encontrado.'}, status=status.HTTP_400_BAD_REQUEST)
        except Mantenimiento.DoesNotExist:
             return Response({'detail': 'Mantenimiento no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error en MantenimientoViewSet.actualizar_estado: {e}", exc_info=True)
            return Response({'detail': f'Error interno: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    # --- [NUEVA FUNCIÓN HELPER] ---
    def _crear_notificacion_asignacion(self, mantenimiento_instance):
        print("\n--- DEBUG: Invocando _crear_notificacion_asignacion ---")
        empleado_asignado = mantenimiento_instance.empleado_asignado
        
        if empleado_asignado and hasattr(empleado_asignado, 'usuario'):
            destinatario_user = empleado_asignado.usuario
            print(f"DEBUG: Tarea asignada a: {destinatario_user.username} (ID: {destinatario_user.id})")
            print(f"DEBUG: Petición hecha por: {self.request.user.username} (ID: {self.request.user.id})")
            
            # No enviar notificación si se está auto-asignando la tarea
            if self.request.user == destinatario_user:
                print("DEBUG: Auto-asignación detectada. No se enviará notificación.")
                return

            try:
                mensaje = (f"Se te ha asignado una tarea de mantenimiento ({mantenimiento_instance.get_tipo_display()}) "
                           f"para el activo '{mantenimiento_instance.activo.nombre}'.")
                title_fcm = "Nueva Asignación de Mantenimiento"

                notif_obj = Notificacion.objects.create(
                    destinatario=destinatario_user,
                    mensaje=mensaje,
                    tipo='INFO',
                    url_destino=f'/app/mantenimientos'
                )
                print(f"DEBUG: Notificación de BD creada para {destinatario_user.username}.")

                # Enviar FCM Push Notification
                if empleado_asignado.fcm_token:
                    print(f"DEBUG: fcm_token encontrado para {destinatario_user.username}: '{empleado_asignado.fcm_token[:20]}...'")
                    fcm_data = {
                        "id": str(notif_obj.id),
                        "url_destino": notif_obj.url_destino,
                        "tipo": notif_obj.tipo,
                    }
                    success, response_fcm = send_fcm_notification(
                        fcm_token=empleado_asignado.fcm_token,
                        title=title_fcm,
                        body=mensaje,
                        data=fcm_data
                    )
                    if success:
                        print(f"DEBUG: Notificación Push enviada exitosamente a {destinatario_user.username}.")
                    else:
                        logger.error(f"Error al enviar FCM para mantenimiento {mantenimiento_instance.id}: {response_fcm}")
                else:
                    print(f"DEBUG: No se encontró fcm_token para {destinatario_user.username}. No se envía Push.")

            except Exception as e:
                print(f"ERROR: No se pudo crear notificación para mant. {mantenimiento_instance.id}. Error: {e}")
        else:
            print("DEBUG: No hay empleado asignado a esta tarea. No se envía notificación de asignación.")
        print("--- FIN DEBUG ---\n")

    # --- [ MÉTODO EDITADO ] ---
    def perform_create(self, serializer):
        # Asigna el usuario actual como creador y la empresa
        mantenimiento = serializer.save(
            empresa=self.request.user.empleado.empresa,
            creado_por=self.request.user 
        )
        # Luego, intenta crear la notificación para el asignado (si existe)
        self._crear_notificacion_asignacion(mantenimiento)

class RevalorizacionActivoViewSet(BaseTenantViewSet):
    queryset = RevalorizacionActivo.objects.all()
    serializer_class = RevalorizacionActivoSerializer
    required_manage_permission = 'manage_revalorizacion'

    def get_queryset(self):
        qs = super().get_queryset()
        activo_id = self.request.query_params.get('activo_id')
        if activo_id:
            return qs.filter(activo_id=activo_id)
        return qs

    @action(detail=False, methods=['post'], url_path='ejecutar')
    def ejecutar(self, request, *args, **kwargs):
        # 1. Comprobar permiso explícitamente para esta acción
        if not check_permission(request, self, self.required_manage_permission):
            self.permission_denied(request, message=f'Permiso "{self.required_manage_permission}" requerido.')

        # 2. Validar datos de entrada
        activo_id = request.data.get('activo_id')
        reval_type = request.data.get('reval_type') # 'factor', 'fijo', 'porcentual'
        value_str = request.data.get('value')
        notas = request.data.get('notas')

        if not all([activo_id, reval_type, value_str]):
            return Response({'detail': 'Se requieren activo_id, reval_type y value.'}, status=status.HTTP_400_BAD_REQUEST)

        if reval_type not in ['factor', 'fijo', 'porcentual']:
            return Response({'detail': 'reval_type inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            value = Decimal(value_str)
            if reval_type == 'porcentual':
                if value <= -100:
                    raise ValueError("El porcentaje no puede ser menor o igual a -100%.")
            elif value < 0:
                raise ValueError("El valor no puede ser negativo para este método.")

        except (ValueError, InvalidOperation) as e:
            return Response({'detail': str(e) or 'El valor proporcionado no es un número válido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Determinar la empresa del usuario
                empresa_obj = Empresa.objects.first() if request.user.is_staff else request.user.empleado.empresa
                if not empresa_obj:
                    return Response({'detail': 'No se pudo determinar la empresa para la operación.'}, status=status.HTTP_400_BAD_REQUEST)

                activo = ActivoFijo.objects.select_for_update().get(
                    id=activo_id, 
                    empresa=empresa_obj
                )

                valor_anterior = activo.valor_actual
                valor_nuevo = Decimal(0)
                factor_aplicado = Decimal(1)

                if valor_anterior == 0 and reval_type != 'fijo':
                    return Response({'detail': 'No se puede revalorizar por factor o porcentaje un activo con valor cero.'}, status=status.HTTP_400_BAD_REQUEST)

                # 3. Calcular el nuevo valor según el tipo
                if reval_type == 'factor':
                    factor_aplicado = value
                    valor_nuevo = valor_anterior * factor_aplicado
                elif reval_type == 'fijo':
                    valor_nuevo = value
                    if valor_anterior > 0:
                        factor_aplicado = valor_nuevo / valor_anterior
                    else:
                        factor_aplicado = Decimal(0)
                elif reval_type == 'porcentual':
                    factor_aplicado = Decimal(1) + (value / Decimal(100))
                    valor_nuevo = valor_anterior * factor_aplicado

                # 4. Crear registro de historial
                historial = RevalorizacionActivo.objects.create(
                    empresa=activo.empresa,
                    activo=activo,
                    valor_anterior=valor_anterior,
                    valor_nuevo=valor_nuevo,
                    factor_aplicado=factor_aplicado,
                    notas=notas,
                    realizado_por=request.user
                )

                # 5. Actualizar el valor del activo
                activo.valor_actual = valor_nuevo
                activo.save(update_fields=['valor_actual'])

            serializer = self.get_serializer(historial)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ActivoFijo.DoesNotExist:
            return Response({'detail': 'El activo no existe o no pertenece a tu empresa.'}, status=status.HTTP_404_NOT_FOUND)
        except Empleado.DoesNotExist:
            return Response({'detail': 'El perfil de empleado para este usuario no existe.'}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            logger.error(f"Error en RevalorizacionActivoViewSet.ejecutar: {e}", exc_info=True)
            return Response({'detail': f'Error interno del servidor: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DepreciacionActivoViewSet(BaseTenantViewSet):
    queryset = DepreciacionActivo.objects.all()
    serializer_class = DepreciacionActivoSerializer
    required_manage_permission = 'manage_depreciacion'

    def get_queryset(self):
        qs = super().get_queryset()
        activo_id = self.request.query_params.get('activo_id')
        if activo_id:
            return qs.filter(activo_id=activo_id)
        return qs

    @action(detail=False, methods=['post'], url_path='ejecutar')
    def ejecutar(self, request, *args, **kwargs):
        if not check_permission(request, self, self.required_manage_permission):
            self.permission_denied(request, message=f'Permiso "{self.required_manage_permission}" requerido.')

        activo_id = request.data.get('activo_id')
        depreciation_type = request.data.get('depreciation_type', 'MANUAL').upper() # Default a MANUAL
        notas = request.data.get('notas')

        if not activo_id:
            return Response({'detail': 'Se requiere activo_id.'}, status=status.HTTP_400_BAD_REQUEST)

        if depreciation_type not in [choice[0] for choice in DepreciacionActivo.DEPRECIATION_TYPE_CHOICES]:
            return Response({'detail': 'Tipo de depreciación inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                empresa_obj = Empresa.objects.first() if request.user.is_staff else request.user.empleado.empresa
                if not empresa_obj:
                    return Response({'detail': 'No se pudo determinar la empresa para la operación.'}, status=status.HTTP_400_BAD_REQUEST)

                activo = ActivoFijo.objects.select_for_update().get(
                    id=activo_id, 
                    empresa=empresa_obj
                )

                valor_anterior = activo.valor_actual
                monto_depreciado = Decimal(0)
                
                # --- Lógica de cálculo por tipo de depreciación ---
                if depreciation_type == 'MANUAL':
                    monto_str = request.data.get('monto')
                    if not monto_str:
                        return Response({'detail': 'Para depreciación MANUAL, se requiere el monto.'}, status=status.HTTP_400_BAD_REQUEST)
                    try:
                        monto_depreciado = Decimal(monto_str)
                        if monto_depreciado <= 0:
                            raise ValueError("El monto a depreciar debe ser un número positivo.")
                    except (ValueError, InvalidOperation) as e:
                        return Response({'detail': str(e) or 'El monto proporcionado no es un número válido.'}, status=status.HTTP_400_BAD_REQUEST)

                elif depreciation_type == 'STRAIGHT_LINE':
                    valor_residual_str = request.data.get('valor_residual', '0')
                    try:
                        valor_residual = Decimal(valor_residual_str)
                        if valor_residual < 0:
                            raise ValueError("El valor residual no puede ser negativo.")
                    except (ValueError, InvalidOperation) as e:
                        return Response({'detail': str(e) or 'El valor residual no es un número válido.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    if activo.vida_util <= 0:
                        return Response({'detail': 'La vida útil del activo debe ser mayor a 0 para depreciación lineal.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Usamos el valor actual como costo base para la depreciación lineal
                    # En un sistema real, se usaría el costo de adquisición original.
                    base_depreciable = activo.valor_actual - valor_residual
                    if base_depreciable < 0:
                        base_depreciable = Decimal(0) # No depreciar por debajo del valor residual
                    
                    monto_depreciado = base_depreciable / activo.vida_util # Depreciación anual

                elif depreciation_type == 'DECLINING_BALANCE':
                    tasa_depreciacion_str = request.data.get('tasa_depreciacion')
                    if not tasa_depreciacion_str:
                        return Response({'detail': 'Para depreciación por SALDO DECRECIENTE, se requiere la tasa de depreciación.'}, status=status.HTTP_400_BAD_REQUEST)
                    try:
                        tasa_depreciacion = Decimal(tasa_depreciacion_str)
                        if not (Decimal(0) < tasa_depreciacion <= Decimal(1)): # Tasa entre 0 y 1 (ej: 0.2 para 20%)
                            raise ValueError("La tasa de depreciación debe estar entre 0 y 1 (ej: 0.2 para 20%).")
                    except (ValueError, InvalidOperation) as e:
                        return Response({'detail': str(e) or 'La tasa de depreciación no es un número válido.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    monto_depreciado = activo.valor_actual * tasa_depreciacion

                elif depreciation_type == 'UNITS_OF_PRODUCTION':
                    unidades_producidas_str = request.data.get('unidades_producidas')
                    total_unidades_estimadas_str = request.data.get('total_unidades_estimadas')
                    valor_residual_str = request.data.get('valor_residual', '0')

                    if not all([unidades_producidas_str, total_unidades_estimadas_str]):
                        return Response({'detail': 'Para depreciación por UNIDADES DE PRODUCCIÓN, se requieren unidades_producidas y total_unidades_estimadas.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    try:
                        unidades_producidas = Decimal(unidades_producidas_str)
                        total_unidades_estimadas = Decimal(total_unidades_estimadas_str)
                        valor_residual = Decimal(valor_residual_str)

                        if unidades_producidas <= 0 or total_unidades_estimadas <= 0:
                            raise ValueError("Las unidades producidas y totales estimadas deben ser números positivos.")
                        if valor_residual < 0:
                            raise ValueError("El valor residual no puede ser negativo.")
                    except (ValueError, InvalidOperation) as e:
                        return Response({'detail': str(e) or 'Valores de unidades o residual no válidos.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    base_depreciable = activo.valor_actual - valor_residual
                    if base_depreciable < 0:
                        base_depreciable = Decimal(0)

                    depreciacion_por_unidad = base_depreciable / total_unidades_estimadas
                    monto_depreciado = depreciacion_por_unidad * unidades_producidas
                
                # --- Validaciones comunes ---
                if monto_depreciado <= 0:
                    return Response({'detail': 'El monto a depreciar debe ser un número positivo.'}, status=status.HTTP_400_BAD_REQUEST)

                if monto_depreciado > valor_anterior:
                    return Response({'detail': 'El monto a depreciar no puede ser mayor que el valor actual del activo.'}, status=status.HTTP_400_BAD_REQUEST)

                valor_nuevo = valor_anterior - monto_depreciado

                historial = DepreciacionActivo.objects.create(
                    empresa=activo.empresa,
                    activo=activo,
                    valor_anterior=valor_anterior,
                    valor_nuevo=valor_nuevo,
                    monto_depreciado=monto_depreciado,
                    depreciation_type=depreciation_type, # Guardar el tipo de depreciación
                    notas=notas,
                    realizado_por=request.user
                )

                activo.valor_actual = valor_nuevo
                activo.save(update_fields=['valor_actual'])

            serializer = self.get_serializer(historial)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ActivoFijo.DoesNotExist:
            return Response({'detail': 'El activo no existe o no pertenece a tu empresa.'}, status=status.HTTP_404_NOT_FOUND)
        except Empleado.DoesNotExist:
            return Response({'detail': 'El perfil de empleado para este usuario no existe.'}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            logger.error(f"Error en DepreciacionActivoViewSet.ejecutar: {e}", exc_info=True)
            return Response({'detail': f'Error interno del servidor: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DisposicionActivoViewSet(BaseTenantViewSet):
    queryset = DisposicionActivo.objects.all().select_related('activo', 'realizado_por')
    serializer_class = DisposicionActivoSerializer
    # Removed required_manage_permission from here

    def check_permissions(self, request):
        # Custom permission check for DisposicionActivoViewSet
        if request.method in permissions.SAFE_METHODS: # GET, HEAD, OPTIONS
            if not check_permission(request, self, 'view_disposicion'):
                self.permission_denied(
                    request, message='Permiso "view_disposicion" requerido.'
                )
        else: # POST, PUT, PATCH, DELETE
            if not check_permission(request, self, 'manage_disposicion'):
                self.permission_denied(
                    request, message='Permiso "manage_disposicion" requerido.'
                )
        super().check_permissions(request) # Call super to handle IsAuthenticated etc.

    def perform_create(self, serializer):
        with transaction.atomic():
            disposicion = serializer.save(realizado_por=self.request.user)
            
            # Update the ActivoFijo status
            activo = disposicion.activo
            try:
                estado_disposicion = Estado.objects.get(empresa=activo.empresa, nombre='DADO_DE_BAJA')
            except Estado.DoesNotExist:
                # If the status doesn't exist, create it.
                estado_disposicion = Estado.objects.create(empresa=activo.empresa, nombre='DADO_DE_BAJA', detalle='Activo dado de baja por disposición.')
            
            # Set the asset's status to DADO_DE_BAJA
            activo.estado = estado_disposicion
            # Upon disposal, the asset's book value becomes zero.
            activo.valor_actual = Decimal('0.00')
            
            # Save the updated fields for the asset.
            activo.save(update_fields=['estado', 'valor_actual'])

class SuscripcionViewSet(BaseTenantViewSet):
    """
    ViewSet para que el Admin de la empresa vea su suscripción.
    """
    queryset = Suscripcion.objects.all().order_by('fecha_inicio')
    serializer_class = SuscripcionSerializer
    required_manage_permission = 'view_suscripcion' 
    http_method_names = ['get', 'head', 'options', 'post'] # Habilitar POST para la nueva acción

    def get_queryset(self):
        # Sobrescribimos para que solo devuelva LA suscripción de la empresa
        empleado = self.request.user.empleado
        return self.queryset.filter(empresa=empleado.empresa)

    @action(detail=True, methods=['post'], url_path='upgrade-plan')
    def upgrade_plan(self, request, pk=None):
        # 1. Comprobar permiso
        if not check_permission(request, self, 'manage_suscripcion'):
            self.permission_denied(request, message='Permiso "manage_suscripcion" requerido.')

        suscripcion = self.get_object()
        new_plan = request.data.get('plan')

        # 2. Validar el nuevo plan
        if not new_plan or new_plan not in ['profesional', 'empresarial']:
            return Response({'detail': "Plan inválido. Solo se puede actualizar a 'profesional' o 'empresarial'."}, status=status.HTTP_400_BAD_REQUEST)

        if new_plan == suscripcion.plan:
            return Response({'detail': 'Ya te encuentras en este plan.'}, status=status.HTTP_400_BAD_REQUEST)

        # Lógica de negocio: no permitir downgrade
        plan_order = {'basico': 1, 'profesional': 2, 'empresarial': 3}
        if plan_order[new_plan] < plan_order[suscripcion.plan]:
            return Response({'detail': 'No se puede bajar de plan desde esta opción.'}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Obtener nuevos límites (similar a RegisterEmpresaSerializer)
        limits = {
            'profesional': {'usuarios': 40, 'activos': 350},
            'empresarial': {'usuarios': 9999, 'activos': 99999},
        }
        
        new_limits = limits.get(new_plan)

        # 4. Actualizar y guardar
        suscripcion.plan = new_plan
        suscripcion.max_usuarios = new_limits['usuarios']
        suscripcion.max_activos = new_limits['activos']
        # Opcional: Extender la fecha de fin, simular pago, etc.
        # Por ahora, solo cambiamos el plan y los límites.
        suscripcion.save()

        serializer = self.get_serializer(suscripcion)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ReportePresupuestosViewSet(BaseTenantViewSet):
    queryset = PeriodoPresupuestario.objects.all().prefetch_related('partidas__departamento')
    serializer_class = PeriodoPresupuestarioSerializer
    required_manage_permission = 'view_presupuesto_report' # New permission for budget reports
    http_method_names = ['get', 'head', 'options'] # Read-only

    def get_queryset(self):
        qs = super().get_queryset()

        # Add filtering capabilities
        status_filter = self.request.query_params.get('estado')
        if status_filter:
            qs = qs.filter(estado=status_filter.upper())

        fecha_inicio_min = self.request.query_params.get('fecha_inicio_min')
        if fecha_inicio_min:
            qs = qs.filter(fecha_inicio__gte=fecha_inicio_min)

        fecha_inicio_max = self.request.query_params.get('fecha_inicio_max')
        if fecha_inicio_max:
            qs = qs.filter(fecha_inicio__lte=fecha_inicio_max)
        
        fecha_fin_min = self.request.query_params.get('fecha_fin_min')
        if fecha_fin_min:
            qs = qs.filter(fecha_fin__gte=fecha_fin_min)

        fecha_fin_max = self.request.query_params.get('fecha_fin_max')
        if fecha_fin_max:
            qs = qs.filter(fecha_fin__lte=fecha_fin_max)

        return qs.order_by('-fecha_inicio') # Order by most recent periods first

class NotificacionViewSet(BaseTenantViewSet):
    """
    ViewSet para la "campanita" de notificaciones en el Header.
    """
    queryset = Notificacion.objects.all()
    serializer_class = NotificacionSerializer
    required_manage_permission = 'view_dashboard' # Cualquiera que vea el dashboard puede verlas

    def get_queryset(self):
        """
        Modificado: Devuelve TODAS las notificaciones del USUARIO logueado,
        ordenadas por no leídas primero, y luego por fecha descendente.
        (Ya no filtra por empresa ni necesita caso especial SuperAdmin aquí).
        """
        # Filtrar directamente por el usuario autenticado
        user = self.request.user
        if not user.is_authenticated: # Seguridad extra
            return self.queryset.none()
        # print(f"DEBUG: NotificacionViewSet.get_queryset for user {user.id}")
        # Orden ya definido en Meta del modelo
        return self.queryset.filter(destinatario=user)
        
    @action(detail=True, methods=['post'], url_path='marcar-leido')
    def marcar_leido(self, request, pk=None):
        """Marcar como leída (Verifica que sea el destinatario)."""
        try:
            notificacion = self.get_object()
            # --- [CAMBIO] Verificar destinatario ---
            if notificacion.destinatario != request.user:
                return Response({'error': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)

            notificacion.leido = True
            notificacion.save()
            return Response({'status': 'Notificación marcada como leída'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='marcar-todo-leido', permission_classes=[IsAuthenticated])
    def marcar_todo_leido(self, request):
        """Marcar todas las del usuario como leídas."""
        try:
            # --- [CAMBIO] Filtrar por destinatario ---
            count, _ = Notificacion.objects.filter(destinatario=request.user, leido=False).update(leido=True)
            return Response({'status': f'{count} notificaciones marcadas como leídas'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """Devuelve el número de notificaciones no leídas para el usuario."""
        count = self.get_queryset().filter(leido=False).count()
        return Response({'unread_count': count}, status=status.HTTP_200_OK)

class FCMTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = FCMTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        fcm_token = serializer.validated_data['fcm_token']

        try:
            empleado = request.user.empleado
            empleado.fcm_token = fcm_token
            empleado.save(update_fields=['fcm_token'])
            return Response({'detail': 'FCM token guardado exitosamente.'}, status=status.HTTP_200_OK)
        except Empleado.DoesNotExist:
            return Response({'detail': 'Usuario no asociado a un perfil de empleado.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error saving FCM token for user {request.user.id}: {e}", exc_info=True)
            return Response({'detail': 'Error interno al guardar el token FCM.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, *args, **kwargs):
        """
        Elimina el token FCM del perfil del empleado al cerrar sesión.
        """
        try:
            empleado = request.user.empleado
            if empleado.fcm_token:
                empleado.fcm_token = None
                empleado.save(update_fields=['fcm_token'])
            return Response({'detail': 'FCM token eliminado exitosamente.'}, status=status.HTTP_200_OK)
        except Empleado.DoesNotExist:
            # Si no hay empleado, no hay nada que hacer. Devuelve éxito silenciosamente.
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"Error deleting FCM token for user {request.user.id}: {e}", exc_info=True)
            return Response({'detail': 'Error interno al eliminar el token FCM.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
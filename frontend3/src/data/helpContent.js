// src/data/helpContent.js

export const helpContent = {
  activosFijos: {
    title: 'Módulo de Activos Fijos',
    guide: [
      'Este módulo te permite gestionar de forma integral todos los bienes y propiedades de tu empresa.',
      'Puedes registrar nuevos activos, editar su información, darles de baja, generar códigos QR para un seguimiento fácil y mucho más.',
      'Utiliza el botón "Nuevo Activo" para comenzar a registrar un bien. Completa la información solicitada en el formulario, como nombre, código, valor, y categoría.',
      'La lista principal muestra todos tus activos. Puedes ver detalles importantes de un vistazo. Usa los botones de acción en cada activo para editar, eliminar o generar su código QR.',
    ],
    tourSteps: [
      {
        selector: '[data-tour="activos-fijos-titulo"]',
        title: 'Título del Módulo',
        content: 'Esta es la página principal para la gestión de activos fijos. Aquí puedes ver y administrar todos los bienes de tu empresa.',
      },
      {
        selector: '[data-tour="nuevo-activo-btn"]',
        title: 'Crear Nuevo Activo',
        content: 'Haz clic en este botón para abrir el formulario y registrar un nuevo activo en el sistema. Deberás proporcionar detalles como nombre, valor, fecha de adquisición, etc.',
      },
      {
        selector: '__NO_SELECTOR__', // Indicate this step doesn't target a specific element
        title: 'Gestión de Activos Fijos',
        content: 'Este es el listado principal de activos fijos. Si hay activos registrados, se mostrarán aquí con todos sus detalles. Puedes interactuar con ellos o añadir nuevos. Ya que el listado es muy extenso o no hay datos cargados, esta ventana de información le guiará a los siguientes pasos. Ya no busques mas soluciones.',
      },
      {
        selector: '[data-tour="activo-item-acciones"]',
        title: 'Acciones del Activo',
        content: 'Estos botones te permiten realizar acciones específicas para cada activo: generar un código QR para seguimiento, editar la información o eliminar el registro del sistema.',
      },
      {
        selector: '[data-tour="activo-item-foto"]',
        title: 'Foto del Activo',
        content: 'Esta es una vista previa de la foto del activo. Si no se ha subido una, se muestra un ícono genérico.',
      },
      {
        selector: '[data-tour="activo-item-info"]',
        title: 'Información Detallada',
        content: 'En esta sección, puedes ver rápidamente los detalles más importantes del activo, como su valor actual, ubicación, departamento asignado y más.',
      },
    ],
  },
  presupuestos: {
    title: 'Módulo de Presupuestos',
    guide: [
      'Este módulo te permite gestionar los presupuestos de tu empresa dividiéndolos en períodos y asignando partidas específicas.',
      'Primero, crearás y gestionarás "Períodos Presupuestarios", que son los marcos de tiempo para tus presupuestos (ej. "Presupuesto 2024").',
      'Dentro de cada período, podrás definir "Partidas Presupuestarias", que son las líneas de gasto detalladas (ej. "Compra de Laptops para TI").',
      'El sistema te ayudará a controlar los montos asignados, gastados y disponibles para cada partida, facilitando un control financiero riguroso.'
    ],
    tourSteps: [
      {
        selector: '[data-tour="presupuestos-titulo"]',
        title: 'Gestión de Presupuestos',
        content: 'Esta es la sección principal para administrar los presupuestos de tu empresa, organizados por períodos.'
      },
      {
        selector: '[data-tour="nuevo-periodo-btn"]',
        title: 'Crear Nuevo Período',
        content: 'Utiliza este botón para definir un nuevo período presupuestario, estableciendo su nombre, fechas de inicio y fin, y su estado inicial.'
      },
      {
        selector: '[data-tour="tabla-periodos"]',
        title: 'Tabla de Períodos',
        content: 'Aquí verás un listado de todos los períodos presupuestarios configurados, con sus fechas, monto total y estado actual.'
      },
      {
        selector: '[data-tour="periodo-item-view"]', // Selector for viewing partidas of a period
        title: 'Ver Partidas del Período',
        content: 'Haz clic en cualquier fila de la tabla para ver y gestionar las partidas presupuestarias específicas de ese período.',
        navigatesTo: '/app/presupuestos/partidas' // Indicate that this step requires navigation
      },
      {
        selector: '[data-tour="partidas-back-btn"]',
        title: 'Volver a Períodos',
        content: 'Una vez dentro de las partidas de un período, usa este botón para regresar a la vista general de Períodos Presupuestarios.',
      },
      {
        selector: '[data-tour="partidas-titulo"]',
        title: 'Partidas Presupuestarias',
        content: 'Aquí puedes ver y gestionar las líneas de gasto específicas para el período seleccionado.'
      },
      {
        selector: '[data-tour="nueva-partida-btn"]',
        title: 'Crear Nueva Partida',
        content: 'Añade una nueva partida presupuestaria, asignándole un nombre, código, monto y el departamento responsable.'
      },
      {
        selector: '[data-tour="tabla-partidas"]',
        title: 'Tabla de Partidas',
        content: 'Este listado muestra todas las partidas del período, con los montos asignados, gastados y disponibles.'
      },
      {
        selector: '[data-tour="partida-item-acciones"]',
        title: 'Acciones de la Partida',
        content: 'Edita o elimina partidas individuales para mantener tus presupuestos actualizados.'
      },
    ]
  },
  mantenimientos: {
    title: 'Módulo de Mantenimientos',
    guide: [
      'Gestiona el historial de mantenimiento de tus activos fijos, ya sean preventivos o correctivos.',
      'Puedes registrar nuevos mantenimientos, asignar empleados, especificar el tipo de mantenimiento, su estado (Pendiente, En Progreso, Completado), la descripción del problema y las notas de solución.',
      'También puedes registrar el costo asociado al mantenimiento y adjuntar una foto de la solución.',
      'Los empleados asignados pueden actualizar el estado de sus tareas de mantenimiento directamente.'
    ],
    tourSteps: [
      {
        selector: '[data-tour="mantenimientos-titulo"]',
        title: 'Gestión de Mantenimientos',
        content: 'Esta sección te permite llevar un registro detallado de todas las actividades de mantenimiento de tus activos.'
      },
      {
        selector: '[data-tour="nuevo-mantenimiento-btn"]',
        title: 'Registrar Nuevo Mantenimiento',
        content: 'Usa este botón para crear un nuevo registro de mantenimiento para cualquiera de tus activos.'
      },
      {
        selector: '[data-tour="lista-mantenimientos"]',
        title: 'Lista de Mantenimientos',
        content: 'Aquí se muestran todos los mantenimientos registrados, con información clave como el activo, tipo, estado, empleado asignado y fechas.'
      },
      {
        selector: '[data-tour="mantenimiento-item-acciones"]',
        title: 'Acciones de Mantenimiento',
        content: 'Puedes editar o eliminar registros de mantenimiento (si tienes los permisos). Los empleados asignados también pueden actualizar el estado de su tarea aquí.'
      },
      {
        selector: '[data-tour="mantenimiento-item-info"]',
        title: 'Detalles del Mantenimiento',
        content: 'Información rápida sobre el activo, tipo de mantenimiento, estado, costo y el empleado responsable.'
      },
    ]
  },
  revalorizaciones: {
    title: 'Módulo de Revalorización',
    guide: [
      'Este módulo te permite ajustar el valor de tus activos fijos basándose en factores de mercado, inflación o revaluaciones contables.',
      'Puedes seleccionar un activo y aplicar una revalorización por factor, monto fijo o porcentaje, registrando las notas pertinentes.',
      'El sistema registrará un historial detallado de todas las revalorizaciones aplicadas, mostrando el valor anterior y el nuevo valor del activo.'
    ],
    tourSteps: [
      {
        selector: '[data-tour="revalorizacion-titulo"]',
        title: 'Revalorización de Activos',
        content: 'Aquí puedes actualizar el valor contable de tus activos fijos según diferentes criterios.'
      },
      {
        selector: '[data-tour="selector-activo"]',
        title: 'Seleccionar Activo',
        content: 'Elige el activo fijo al que deseas aplicar una revalorización. Su valor actual se mostrará abajo.'
      },
      {
        selector: '[data-tour="valor-actual-activo"]',
        title: 'Valor Actual del Activo',
        content: 'Muestra el valor contable actual del activo fijo seleccionado.'
      },
      {
        selector: '[data-tour="ejecutar-proceso-form"]',
        title: 'Ejecutar Revalorización',
        content: 'Selecciona el método de cálculo (factor, monto fijo o porcentaje) y el valor a aplicar. Añade un motivo y ejecuta el proceso.'
      },
      {
        selector: '[data-tour="historial-revalorizaciones"]',
        title: 'Historial de Revalorizaciones',
        content: 'Aquí podrás ver todas las revalorizaciones aplicadas al activo seleccionado, incluyendo la fecha, valores y el cambio porcentual.'
      },
    ]
  },
  depreciaciones: {
    title: 'Módulo de Depreciación',
    guide: [
      'Registra la disminución del valor de tus activos fijos a lo largo del tiempo debido al uso, obsolescencia o desgaste.',
      'Puedes seleccionar un activo y aplicar diferentes métodos de depreciación: línea recta, saldo decreciente, unidades de producción o un monto manual.',
      'El sistema mantendrá un historial de todas las depreciaciones ejecutadas, mostrando el impacto en el valor contable del activo.'
    ],
    tourSteps: [
      {
        selector: '[data-tour="depreciacion-titulo"]',
        title: 'Depreciación de Activos',
        content: 'Esta sección te permite registrar la pérdida de valor de tus activos fijos de forma sistemática.'
      },
      {
        selector: '[data-tour="selector-activo"]',
        title: 'Seleccionar Activo',
        content: 'Elige el activo fijo al que deseas aplicar la depreciación. Su valor actual se mostrará abajo.'
      },
      {
        selector: '[data-tour="valor-actual-activo"]',
        title: 'Valor Actual del Activo',
        content: 'Muestra el valor contable actual del activo fijo seleccionado.'
      },
      {
        selector: '[data-tour="ejecutar-proceso-form"]',
        title: 'Ejecutar Depreciación',
        content: 'Selecciona el método de cálculo y los parámetros necesarios. Puedes añadir notas y ejecutar el proceso para registrar la depreciación.'
      },
      {
        selector: '[data-tour="historial-depreciaciones"]',
        title: 'Historial de Depreciaciones',
        content: 'Aquí se muestra un registro cronológico de todas las depreciaciones aplicadas al activo seleccionado.'
      },
    ]
  },
  solicitudesCompra: {
    title: 'Módulo de Solicitudes de Compra',
    guide: [
      'Este módulo te permite iniciar el proceso de adquisición de nuevos activos para tu empresa.',
      'Puedes crear nuevas solicitudes, especificando la descripción del activo, su costo estimado, la justificación de la necesidad y el departamento solicitante.',
      'Las solicitudes creadas pasarán por un proceso de aprobación antes de convertirse en órdenes de compra.',
      'Los gerentes o administradores pueden aprobar o rechazar solicitudes pendientes, añadiendo un motivo si es necesario.'
    ],
    tourSteps: [
      {
        selector: '[data-tour="solicitudes-compra-titulo"]',
        title: 'Solicitudes de Compra',
        content: 'Esta es la sección donde puedes ver y gestionar todas las solicitudes de compra de activos.'
      },
      {
        selector: '[data-tour="nueva-solicitud-btn"]',
        title: 'Crear Nueva Solicitud',
        content: 'Usa este botón para levantar una nueva solicitud de adquisición de un activo fijo. Deberás completar los detalles del bien deseado.'
      },
      {
        selector: '[data-tour="tabla-solicitudes"]',
        title: 'Listado de Solicitudes',
        content: 'Aquí se muestran todas las solicitudes con su estado actual: Pendiente, Aprobada o Rechazada.'
      },
      {
        selector: '[data-tour="solicitud-item-acciones"]',
        title: 'Acciones de Solicitud',
        content: 'Si tienes permisos, puedes aprobar o rechazar solicitudes pendientes desde aquí. Las solicitudes aprobadas pueden convertirse en órdenes de compra.'
      },
    ]
  },
  ordenesCompra: {
    title: 'Módulo de Órdenes de Compra',
    guide: [
      'Este módulo te permite gestionar las órdenes de compra que se generan a partir de solicitudes aprobadas.',
      'Puedes crear nuevas órdenes de compra, enviarlas a proveedores y registrar la recepción de los activos.',
      'Una vez que un activo es recibido, se registra automáticamente en el inventario de activos fijos.',
      'Puedes ver el estado de cada orden de compra: Generada, Enviada, Completada o Cancelada.'
    ],
    tourSteps: [
      {
        selector: '[data-tour="ordenes-compra-titulo"]',
        title: 'Órdenes de Compra',
        content: 'Aquí se visualizan y gestionan todas las órdenes de compra de la empresa.'
      },
      {
        selector: '[data-tour="nueva-orden-btn"]',
        title: 'Crear Nueva Orden',
        content: 'Haz clic aquí para crear una nueva orden de compra a partir de una solicitud aprobada. Deberás seleccionar el proveedor y el precio final.'
      },
      {
        selector: '[data-tour="tabla-ordenes"]',
        title: 'Listado de Órdenes',
        content: 'En esta tabla se muestran todas las órdenes de compra, su estado y detalles.'
      },
      {
        selector: '[data-tour="orden-item-acciones"]',
        title: 'Acciones de Orden',
        content: 'Puedes enviar una orden al proveedor una vez generada, o registrar la recepción del activo cuando llegue.'
      },
    ]
  },
  disposiciones: {
    title: 'Módulo de Disposición de Activos',
    guide: [
      'Este módulo te permite registrar el final del ciclo de vida de tus activos fijos, ya sea por venta, baja, donación o pérdida.',
      'Puedes crear un registro de disposición para un activo específico, indicando el tipo de disposición, la fecha y la razón.',
      'Si la disposición es una venta, puedes registrar el valor de venta obtenido.',
      'El activo se marcará como "DADO_DE_BAJA" automáticamente en el inventario.'
    ],
    tourSteps: [
      {
        selector: '[data-tour="disposicion-titulo"]',
        title: 'Disposición de Activos',
        content: 'Esta sección permite gestionar el proceso de baja o salida de activos del inventario.'
      },
      {
        selector: '[data-tour="nueva-disposicion-btn"]',
        title: 'Registrar Nueva Disposición',
        content: 'Usa este botón para registrar que un activo ha salido de la empresa. Deberás especificar la razón y el tipo de disposición.'
      },
      {
        selector: '[data-tour="tabla-disposiciones"]',
        title: 'Listado de Disposiciones',
        content: 'Aquí se muestra un historial de todos los activos que han sido dados de baja, vendidos o donados.'
      },
      {
        selector: '[data-tour="disposicion-item-acciones"]',
        title: 'Acciones de Disposición',
        content: 'Puedes editar o eliminar registros de disposición si es necesario.'
      },
    ]
  },
  dashboard: {
    title: 'Dashboard Principal',
    guide: [
      'El Dashboard es tu panel de control principal, donde puedes ver un resumen rápido del estado de tu empresa.',
      'Muestra estadísticas clave como el total de activos, su valor total, y solicitudes pendientes.',
      'También incluye gráficos visuales que te ayudan a entender la distribución de tus activos por estado y categoría.',
      'Puedes personalizar la apariencia del sistema desde la sección de Configuración.'
    ],
    tourSteps: [
      {
        selector: '[data-tour="dashboard-titulo"]',
        title: 'Bienvenido al Dashboard',
        content: 'Este es el resumen principal de tu aplicación, donde verás información clave de un vistazo.'
      },
      {
        selector: '[data-tour="total-activos-card"]',
        title: 'Total de Activos',
        content: 'Aquí se muestra el número total de activos fijos registrados en tu empresa.'
      },
      {
        selector: '[data-tour="valor-activos-card"]',
        title: 'Valor Total de Activos',
        content: 'Este recuadro indica el valor monetario total de todos tus activos fijos.'
      },
      {
        selector: '[data-tour="solicitudes-pendientes-card"]',
        title: 'Solicitudes Pendientes',
        content: 'Muestra el número de solicitudes de compra que aún esperan tu aprobación o gestión.'
      },
      {
        selector: '[data-tour="activos-por-estado-chart"]',
        title: 'Activos por Estado',
        content: 'Este gráfico de barras te ayuda a visualizar la distribución de tus activos según su estado (Nuevo, En Uso, Reparación, etc.).'
      },
      {
        selector: '[data-tour="activos-por-categoria-chart"]',
        title: 'Activos por Categoría',
        content: 'Este gráfico circular muestra la proporción de tus activos agrupados por sus categorías (Mobiliario, Equipo de Computo, Vehículos, etc.).'
      },
    ]
  },
  reportes: {
    title: 'Módulo de Reportes',
    guide: [
      'Este módulo te permite generar reportes personalizados de tus activos fijos.',
      'Puedes aplicar filtros dinámicos utilizando texto o comandos de voz para obtener la información que necesitas.',
      'Los reportes se pueden visualizar en una vista previa y luego exportar en diferentes formatos como PDF o Excel.',
      'Utiliza los filtros de forma combinada para afinar los resultados y obtener análisis específicos.'
    ],
    tourSteps: [
      {
        selector: '[data-tour="reportes-titulo"]',
        title: 'Generación de Reportes',
        content: 'Esta es la sección para crear y visualizar reportes sobre tus activos.'
      },
      {
        selector: '[data-tour="filtro-input"]',
        title: 'Añadir Filtros',
        content: 'Escribe aquí los criterios de búsqueda (ej. "laptop", "depto: TI", "valor>500") o usa el botón de micrófono para comandos de voz.'
      },
      {
        selector: '[data-tour="grabar-voz-btn"]',
        title: 'Grabar Comando de Voz',
        content: 'Haz clic en este botón para usar tu voz y dictar filtros, como "mostrar activos del departamento de TI".'
      },
      {
        selector: '[data-tour="filtros-activos"]',
        title: 'Filtros Activos',
        content: 'Aquí verás todos los filtros que has aplicado. Puedes eliminarlos haciendo clic en la "X".'
      },
      {
        selector: '[data-tour="generar-preview-btn"]',
        title: 'Generar Vista Previa',
        content: 'Una vez que tengas los filtros deseados, haz clic aquí para ver un resumen de los activos que cumplen con esos criterios.'
      },
      {
        selector: '[data-tour="exportar-reporte-btn"]',
        title: 'Exportar Reporte',
        content: 'Después de generar la vista previa, usa estos botones para descargar el reporte completo en formato PDF o Excel.'
      },
    ]
  },
  presupuestosReport: {
    title: 'Módulo de Reportes de Presupuestos',
    guide: [
      'Este módulo te permite generar reportes detallados sobre el estado de tus presupuestos y partidas.',
      'Puedes seleccionar un período presupuestario específico para ver un resumen de los montos asignados, gastados y disponibles.',
      'Genera una vista previa del reporte antes de exportarlo en formatos como PDF o Excel para un análisis más profundo.'
    ],
    tourSteps: [
      {
        selector: '[data-tour="presupuestos-reporte-titulo"]',
        title: 'Reporte de Presupuestos',
        content: 'Esta es la sección para generar reportes financieros sobre tus presupuestos.'
      },
      {
        selector: '[data-tour="periodo-select"]',
        title: 'Seleccionar Período',
        content: 'Elige un período presupuestario para enfocar el reporte en un marco de tiempo específico.'
      },
      {
        selector: '[data-tour="generar-reporte-btn"]',
        title: 'Generar Reporte',
        content: 'Haz clic para cargar y visualizar los datos del reporte según los filtros seleccionados.'
      },
      {
        selector: '[data-tour="reporte-resultados"]',
        title: 'Resultados del Reporte',
        content: 'Aquí se mostrarán los datos resumidos o detallados del reporte de presupuestos. Puedes verificar la información antes de exportar.'
      },
      {
        selector: '[data-tour="descargar-reporte-btn"]',
        title: 'Descargar Reporte',
        content: 'Usa estos botones para exportar el reporte generado a un archivo PDF o Excel para su distribución o análisis externo.'
      },
    ]
  }
  // ... aquí se pueden añadir guías para otros módulos en el futuro
};

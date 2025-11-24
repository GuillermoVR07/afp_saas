// lib/config/constants.dart
// lib/config/constants.dart

// IP de tu PC en la red Wi-Fi (ejemplo)
const String _pcIp = '192.168.3.37'; 

// URL base del servidor (sin /api)
const String serverBaseUrl = 'http://$_pcIp:8000';

// URL de la API (construida desde la base)
const String apiBaseUrl = '$serverBaseUrl/api';
//const String apiBaseUrl = 'https://actfijopresupuesto.duckdns.org/api';
//const String serverBaseUrl = 'https://actfijopresupuesto.duckdns.org';
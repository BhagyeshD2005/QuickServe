import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/* =========================================================================
   QUICKSERVE — single-file Flutter application (Customer + Agent)
   Backend: https://quickserve-api.quickserve-by-bhagyesh.workers.dev
   Everything (models, API client, auth, customer UI, agent UI, navigation)
   lives in this one file, as required.
========================================================================= */

const String kBaseUrl =
    'https://quickserve-api.quickserve-by-bhagyesh.workers.dev';

// Google OAuth Web/Server Client ID (public, not a secret) used as the
// backend audience for POST /api/auth/google.
const String kGoogleServerClientId =
    '1092817021642-7sgo3dqmeljot2l3kpeleis3fi37jpol.apps.googleusercontent.com';

final GoogleSignIn googleSignIn = GoogleSignIn(
  serverClientId: kGoogleServerClientId,
  scopes: <String>['email', 'profile'],
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await PushService.init(); // safe: swallows errors if Firebase isn't set up
  runApp(const QuickServeApp());
}

/* =========================================================================
   THEME
========================================================================= */

class AppColors {
  static const navy = Color(0xFF1E293B);
  static const navyLight = Color(0xFF334155);
  static const orange = Color(0xFFFF6B35);
  static const orangeLight = Color(0xFFFFE7DC);
  static const background = Color(0xFFF8FAFC);
  static const card = Color(0xFFFFFFFF);
  static const textMuted = Color(0xFF64748B);
  static const star = Color(0xFFFFC107);
  static const success = Color(0xFF16A34A);
  static const danger = Color(0xFFDC2626);
  static const info = Color(0xFF2563EB);
}

List<BoxShadow> softShadow({double opacity = 0.06, double blur = 18}) => [
      BoxShadow(
        color: Colors.black.withValues(alpha: opacity),
        blurRadius: blur,
        offset: const Offset(0, 8),
      ),
    ];

class QuickServeApp extends StatelessWidget {
  const QuickServeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QuickServe',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: AppColors.background,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.navy,
          primary: AppColors.navy,
          secondary: AppColors.orange,
          surface: AppColors.card,
        ),
        splashFactory: InkRipple.splashFactory,
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.navy,
          foregroundColor: Colors.white,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 20,
            letterSpacing: 0.2,
            color: Colors.white,
          ),
        ),
        cardTheme: CardThemeData(
          color: AppColors.card,
          elevation: 0,
          margin: EdgeInsets.zero,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.orange,
            foregroundColor: Colors.white,
            shape: const StadiumBorder(),
            textStyle:
                const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.orange,
            side: const BorderSide(color: AppColors.orange, width: 1.4),
            shape: const StadiumBorder(),
            textStyle: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: AppColors.orange,
            textStyle: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.card,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          labelStyle: const TextStyle(color: AppColors.textMuted),
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide.none),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide.none),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: AppColors.orange, width: 1.6),
          ),
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: AppColors.card,
          indicatorColor: AppColors.orangeLight,
          elevation: 8,
          height: 68,
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            final selected = states.contains(WidgetState.selected);
            return TextStyle(
              fontSize: 11.5,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: selected ? AppColors.orange : AppColors.textMuted,
            );
          }),
          iconTheme: WidgetStateProperty.resolveWith((states) {
            final selected = states.contains(WidgetState.selected);
            return IconThemeData(
                color: selected ? AppColors.orange : AppColors.textMuted);
          }),
        ),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: AppColors.navy,
          contentTextStyle: const TextStyle(color: Colors.white),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        progressIndicatorTheme:
            const ProgressIndicatorThemeData(color: AppColors.orange),
      ),
      home: const SplashScreen(),
    );
  }
}

/* =========================================================================
   LOCATION — GPS -> readable address
========================================================================= */

class LocationResult {
  final double lat;
  final double lng;
  final String address;
  LocationResult(this.lat, this.lng, this.address);
}

class LocationService {
  static Future<LocationResult> current() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw ApiException('Please turn on location services.');
    }
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.denied ||
        perm == LocationPermission.deniedForever) {
      throw ApiException(
          'Location permission denied. Enable it in app settings.');
    }
    final pos = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 15)),
    );
    var address =
        '${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}';
    try {
      final marks = await placemarkFromCoordinates(pos.latitude, pos.longitude);
      if (marks.isNotEmpty) {
        final p = marks.first;
        final parts = <String>{
          for (final s in [
            p.name,
            p.subLocality,
            p.locality,
            p.administrativeArea,
            p.postalCode
          ])
            if (s != null && s.trim().isNotEmpty) s.trim()
        };
        if (parts.isNotEmpty) address = parts.join(', ');
      }
    } catch (_) {/* keep coordinates as fallback */}
    return LocationResult(pos.latitude, pos.longitude, address);
  }
}

/* =========================================================================
   PUSH NOTIFICATIONS — Firebase Cloud Messaging + on-device display
   The backend must store device tokens and send the pushes.
========================================================================= */

@pragma('vm:entry-point')
Future<void> firebaseBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

class PushService {
  static final FlutterLocalNotificationsPlugin _local =
      FlutterLocalNotificationsPlugin();
  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'quickserve_updates',
    'Request updates',
    description: 'Status changes and new job assignments',
    importance: Importance.high,
  );
  static bool _ready = false;
  static bool _localReady = false;

  static Future<void> init() async {
    // Local notifications work even without Firebase.
    try {
      await _local.initialize(const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher')));
      final android = _local.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      await android?.createNotificationChannel(_channel);
      await android?.requestNotificationsPermission();
      _localReady = true;
    } catch (e) {
      debugPrint('Local notifications skipped: $e');
    }
    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);
      await FirebaseMessaging.instance.requestPermission();
      FirebaseMessaging.onMessage.listen((m) {
        final n = m.notification;
        if (n != null) notifyLocal(n.title ?? 'QuickServe', n.body ?? '');
      });
      FirebaseMessaging.instance.onTokenRefresh.listen(_register);
      _ready = true;
    } catch (e) {
      debugPrint('Firebase push skipped: $e');
    }
  }

  /// Call after login so the backend knows this device belongs to the user.
  static Future<void> registerDevice() async {
    if (!_ready) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _register(token);
    } catch (_) {}
  }

  // ASSUMPTION: POST /api/devices {token, platform}. Rename to match your API.
  static Future<void> _register(String token) async {
    try {
      await ApiService.request('POST', '/api/devices',
          auth: true, body: {'token': token, 'platform': 'android'});
    } catch (_) {}
  }

  static Future<void> unregister() async {
    if (!_ready) return;
    try {
      await FirebaseMessaging.instance.deleteToken();
    } catch (_) {}
  }

  static Future<void> notifyLocal(String title, String body) async {
    if (!_localReady) return;
    try {
      await _local.show(
        DateTime.now().millisecondsSinceEpoch ~/ 1000,
        title,
        body,
        NotificationDetails(
          android: AndroidNotificationDetails(_channel.id, _channel.name,
              channelDescription: _channel.description,
              importance: Importance.high,
              priority: Priority.high),
        ),
      );
    } catch (_) {}
  }
}

/* =========================================================================
   FLAT ILLUSTRATIONS — drawn in code (no assets, no licences needed)
========================================================================= */

enum IllustrationKind { handyman, customer }

class Illustration extends StatelessWidget {
  final IllustrationKind kind;
  final double size;
  const Illustration({super.key, required this.kind, this.size = 160});

  @override
  Widget build(BuildContext context) => SizedBox(
        width: size,
        height: size,
        child: CustomPaint(
            painter: kind == IllustrationKind.handyman
                ? _HandymanPainter()
                : _CustomerPainter()),
      );
}

Paint _fill(int c) => Paint()..color = Color(c);
RRect _rr(double l, double t, double r, double b, double rad) =>
    RRect.fromLTRBR(l, t, r, b, Radius.circular(rad));
Paint _stroke() => Paint()
  ..color = const Color(0xFF1E293B)
  ..style = PaintingStyle.stroke
  ..strokeWidth = 1.8
  ..strokeCap = StrokeCap.round;

class _HandymanPainter extends CustomPainter {
  @override
  void paint(Canvas c, Size s) {
    c.scale(s.width / 200, s.height / 200);
    c.drawCircle(const Offset(100, 105), 88, _fill(0xFFFFE7DC)); // blob
    c.drawRRect(_rr(72, 150, 94, 196, 6), _fill(0xFF334155)); // legs
    c.drawRRect(_rr(106, 150, 128, 196, 6), _fill(0xFF334155));
    c.drawRRect(_rr(66, 190, 94, 198, 4), _fill(0xFF0F172A)); // boots
    c.drawRRect(_rr(106, 190, 134, 198, 4), _fill(0xFF0F172A));
    c.drawRRect(_rr(64, 92, 136, 158, 16), _fill(0xFF1E293B)); // torso
    c.drawRRect(_rr(88, 116, 112, 140, 5), _fill(0xFFFF6B35)); // pocket
    c.drawRRect(_rr(48, 98, 68, 146, 9), _fill(0xFF334155)); // left arm
    c.drawCircle(const Offset(58, 150), 8, _fill(0xFFF2B98F));
    c.drawRRect(_rr(132, 98, 152, 138, 9), _fill(0xFF334155)); // right arm
    c.drawCircle(const Offset(146, 142), 8, _fill(0xFFF2B98F));
    c.save(); // wrench
    c.translate(146, 118);
    c.rotate(0.5);
    c.drawRRect(_rr(-4, -36, 4, 30, 3), _fill(0xFF94A3B8));
    c.drawCircle(const Offset(0, -36), 10, _fill(0xFF94A3B8));
    c.drawCircle(const Offset(0, -42), 4.5, _fill(0xFFFFE7DC));
    c.restore();
    c.drawCircle(const Offset(100, 74), 22, _fill(0xFFF2B98F)); // head
    c.drawPath(
        Path()
          ..moveTo(76, 70)
          ..arcTo(Rect.fromCircle(center: const Offset(100, 70), radius: 24),
              math.pi, math.pi, false)
          ..close(),
        _fill(0xFFFF6B35)); // hard hat
    c.drawRRect(_rr(72, 68, 128, 75, 3.5), _fill(0xFFE5561F));
    c.drawCircle(const Offset(92, 82), 2, _fill(0xFF1E293B));
    c.drawCircle(const Offset(108, 82), 2, _fill(0xFF1E293B));
    c.drawArc(Rect.fromCircle(center: const Offset(100, 86), radius: 6), 0.3,
        2.5, false, _stroke());
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

class _CustomerPainter extends CustomPainter {
  @override
  void paint(Canvas c, Size s) {
    c.scale(s.width / 200, s.height / 200);
    c.drawCircle(const Offset(100, 105), 88, _fill(0xFFDBEAFE)); // blob
    c.drawRRect(_rr(20, 112, 64, 158, 4), _fill(0xFFFFFFFF)); // house
    c.drawPath(
        Path()
          ..moveTo(14, 114)
          ..lineTo(42, 92)
          ..lineTo(70, 114)
          ..close(),
        _fill(0xFFFF6B35));
    c.drawRRect(_rr(36, 134, 48, 158, 2), _fill(0xFF1E293B));
    c.drawRRect(_rr(78, 152, 98, 196, 6), _fill(0xFF1E293B)); // legs
    c.drawRRect(_rr(104, 152, 124, 196, 6), _fill(0xFF1E293B));
    c.drawRRect(_rr(72, 92, 130, 160, 16), _fill(0xFF2563EB)); // torso
    c.drawRRect(_rr(56, 98, 76, 146, 9), _fill(0xFF2563EB)); // left arm
    c.drawCircle(const Offset(66, 150), 8, _fill(0xFFE8A87C));
    c.drawRRect(_rr(126, 98, 146, 132, 9), _fill(0xFF2563EB)); // right arm
    c.drawRRect(_rr(130, 100, 156, 138, 5), _fill(0xFF1E293B)); // phone
    c.drawRRect(_rr(133, 104, 153, 132, 3), _fill(0xFFFF6B35));
    c.drawCircle(const Offset(143, 118), 5, _fill(0xFFFFFFFF));
    c.drawCircle(const Offset(101, 74), 22, _fill(0xFFE8A87C)); // head
    c.drawArc(Rect.fromCircle(center: const Offset(101, 72), radius: 24),
        math.pi, math.pi, true, _fill(0xFF1E293B)); // hair
    c.drawCircle(const Offset(93, 80), 2, _fill(0xFF1E293B));
    c.drawCircle(const Offset(109, 80), 2, _fill(0xFF1E293B));
    c.drawArc(Rect.fromCircle(center: const Offset(101, 84), radius: 6), 0.3,
        2.5, false, _stroke());
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

/// Illustrated empty state (replaces plain "No ... yet" texts).
class EmptyIllustration extends StatelessWidget {
  final IllustrationKind kind;
  final String text;
  const EmptyIllustration({super.key, required this.kind, required this.text});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: Column(children: [
            Illustration(kind: kind, size: 150),
            const SizedBox(height: 10),
            Text(text, style: const TextStyle(color: AppColors.textMuted)),
          ]),
        ),
      );
}

/* =========================================================================
   MODELS — tolerant of missing/nullable backend fields
========================================================================= */

String? _str(dynamic v) => v?.toString();
String _strOr(dynamic v, String fallback) =>
    (v == null || v.toString().trim().isEmpty) ? fallback : v.toString();

class AppUser {
  final String id;
  final String fullName;
  final String email;
  final String role;
  final String? phone;

  AppUser({
    required this.id,
    required this.fullName,
    required this.email,
    required this.role,
    this.phone,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: _strOr(json['id'] ?? json['user_id'], ''),
        fullName: _strOr(json['full_name'] ?? json['name'], 'User'),
        email: _strOr(json['email'], ''),
        role: _strOr(json['role'], 'CUSTOMER').toUpperCase(),
        phone: _str(json['phone'] ?? json['phone_number']),
      );

  bool get isAgent => role == 'AGENT';
  bool get isAdmin => role == 'ADMIN';
}

class ServiceItem {
  final String id;
  final String name;
  final String description;

  ServiceItem(
      {required this.id, required this.name, required this.description});

  factory ServiceItem.fromJson(Map<String, dynamic> json) => ServiceItem(
        id: _strOr(
            json['id'] ??
                json['service_id'] ??
                json['uuid'] ??
                json['service_uuid'],
            ''),
        name: _strOr(json['name'] ?? json['service_name'], 'Service'),
        description: _strOr(json['description'], 'Professional service'),
      );

  Map<String, dynamic> toJson() =>
      {'id': id, 'name': name, 'description': description};
}

class StatusHistoryEntry {
  final String status;
  final String? timestamp;
  final String? note;

  StatusHistoryEntry({required this.status, this.timestamp, this.note});

  factory StatusHistoryEntry.fromJson(Map<String, dynamic> json) =>
      StatusHistoryEntry(
        status: _strOr(json['status'], ''),
        timestamp:
            _str(json['timestamp'] ?? json['created_at'] ?? json['changed_at']),
        note: _str(json['note'] ?? json['reason']),
      );
}

class RequestNote {
  final String id;
  final String content;
  final String? authorName;
  final String? authorRole;
  final String? createdAt;

  RequestNote({
    required this.id,
    required this.content,
    this.authorName,
    this.authorRole,
    this.createdAt,
  });

  factory RequestNote.fromJson(Map<String, dynamic> json) => RequestNote(
        id: _strOr(json['id'], ''),
        content: _strOr(json['content'] ?? json['note'] ?? json['text'], ''),
        authorName: _str(json['author_name'] ?? json['created_by_name']),
        authorRole: _str(json['author_role'] ?? json['role']),
        createdAt: _str(json['created_at']),
      );
}

class ServiceRequestModel {
  final String id;
  final String requestNumber;
  final String? serviceId;
  final String serviceName;
  final String description;
  final String status;
  final String priority;
  final String? address;
  final String? preferredAt;
  final String? createdAt;
  final String? updatedAt;
  final String? customerName;
  final String? customerEmail;
  final String? customerPhone;
  final String? agentName;
  final List<StatusHistoryEntry> statusHistory;
  final List<RequestNote> notes;
  final Map<String, dynamic> raw;

  ServiceRequestModel({
    required this.id,
    required this.requestNumber,
    this.serviceId,
    required this.serviceName,
    required this.description,
    required this.status,
    required this.priority,
    this.address,
    this.preferredAt,
    this.createdAt,
    this.updatedAt,
    this.customerName,
    this.customerEmail,
    this.customerPhone,
    this.agentName,
    this.statusHistory = const [],
    this.notes = const [],
    this.raw = const {},
  });

  factory ServiceRequestModel.fromJson(Map<String, dynamic> json) {
    final service = json['service'];
    final customer = json['customer'] ?? json['user'];
    final agent = json['agent'] ?? json['assigned_agent'];

    List<StatusHistoryEntry> history = [];
    final rawHistory = json['status_history'] ?? json['history'];
    if (rawHistory is List) {
      history = rawHistory
          .whereType<Map>()
          .map((e) => StatusHistoryEntry.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }

    List<RequestNote> notes = [];
    final rawNotes = json['notes'];
    if (rawNotes is List) {
      notes = rawNotes
          .whereType<Map>()
          .map((e) => RequestNote.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }

    return ServiceRequestModel(
      id: _strOr(json['id'], ''),
      requestNumber: _strOr(json['request_number'] ?? json['id'], 'Request'),
      serviceId:
          _str(json['service_id'] ?? (service is Map ? service['id'] : null)),
      serviceName: _strOr(
          json['service_name'] ?? (service is Map ? service['name'] : null),
          'Service'),
      description: _strOr(json['description'], 'No description'),
      status: _strOr(json['status'], 'CREATED').toUpperCase(),
      priority: _strOr(json['priority'], 'MEDIUM').toUpperCase(),
      address: _str(json['address']),
      preferredAt: _str(json['preferred_at']),
      createdAt: _str(json['created_at']),
      updatedAt: _str(json['updated_at']),
      customerName: _str((customer is Map ? customer['full_name'] : null) ??
          json['customer_name']),
      customerEmail: _str((customer is Map ? customer['email'] : null) ??
          json['customer_email']),
      customerPhone: _str((customer is Map ? customer['phone'] : null) ??
          json['customer_phone']),
      agentName: _str(
          (agent is Map ? agent['full_name'] : null) ?? json['agent_name']),
      statusHistory: history,
      notes: notes,
      raw: json,
    );
  }

  static ServiceRequestModel? tryParse(dynamic response) {
    if (response is! Map) return null;
    final data = response['data'];
    Map<String, dynamic>? map;
    if (data is Map && data['request'] is Map) {
      map = Map<String, dynamic>.from(data['request']);
    } else if (data is Map) {
      map = Map<String, dynamic>.from(data);
    } else if (response['request'] is Map) {
      map = Map<String, dynamic>.from(response['request']);
    } else {
      map = Map<String, dynamic>.from(response);
    }
    return ServiceRequestModel.fromJson(map);
  }
}

/// Statuses in workflow order. CANCELLED is a separate terminal state.
const List<String> kStatusFlow = [
  'CREATED',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
];

/* =========================================================================
   API SERVICE
========================================================================= */

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, {this.statusCode});
  @override
  String toString() => message;
}

class ApiService {
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  static Future<String?> getToken() => _storage.read(key: 'quickserve_token');

  static Future<void> saveToken(String token) =>
      _storage.write(key: 'quickserve_token', value: token);

  static Future<void> clearToken() => _storage.delete(key: 'quickserve_token');

  /// Called when the backend reports the session is no longer valid.
  static void Function()? onUnauthorized;

  static Future<Map<String, dynamic>> request(
    String method,
    String endpoint, {
    Map<String, dynamic>? body,
    bool auth = false,
  }) async {
    final uri = Uri.parse('$kBaseUrl$endpoint');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (auth) {
      final token = await getToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }

    http.Response response;
    try {
      switch (method) {
        case 'GET':
          response = await http.get(uri, headers: headers);
          break;
        case 'POST':
          response = await http.post(uri,
              headers: headers, body: jsonEncode(body ?? {}));
          break;
        case 'PATCH':
          response = await http.patch(uri,
              headers: headers, body: jsonEncode(body ?? {}));
          break;
        default:
          throw ApiException('Unsupported HTTP method: $method');
      }
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException(
          'Could not reach the server. Check your internet connection.');
    }

    Map<String, dynamic> data;
    try {
      final decoded = response.body.isEmpty ? {} : jsonDecode(response.body);
      data = decoded is Map<String, dynamic> ? decoded : {'data': decoded};
    } catch (_) {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        data = {};
      } else {
        throw ApiException('Server returned an unexpected response.',
            statusCode: response.statusCode);
      }
    }

    if (response.statusCode == 401) {
      if (auth) {
        await clearToken();
        onUnauthorized?.call();
      }
      throw ApiException(
          _extractError(data, 'Session expired. Please log in again.'),
          statusCode: 401);
    }

    if (response.statusCode == 403) {
      throw ApiException(
          _extractError(data, "You don't have permission to do that."),
          statusCode: 403);
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(_extractError(data, 'Request failed.'),
          statusCode: response.statusCode);
    }

    return data;
  }

  static String _extractError(Map<String, dynamic> data, String fallback) {
    final error = data['error'] ?? data['message'];
    if (error is Map) return error['message']?.toString() ?? fallback;
    if (error is String && error.isNotEmpty) return error;
    return fallback;
  }

  // ---------- Auth ----------

  static Future<AppUser> login(String email, String password) async {
    final response = await request('POST', '/api/auth/login', body: {
      'email': email,
      'password': password,
    });
    final token = _extractToken(response);
    if (token != null) await saveToken(token);
    return me();
  }

  static Future<AppUser> googleLogin(String idToken) async {
    final response =
        await request('POST', '/api/auth/google', body: {'id_token': idToken});
    final token = _extractToken(response);
    if (token != null) await saveToken(token);
    return me();
  }

  static Future<AppUser> register(
      String name, String email, String password) async {
    final response = await request('POST', '/api/auth/register', body: {
      'full_name': name,
      'email': email,
      'password': password,
      'role': 'CUSTOMER',
    });
    final token = _extractToken(response);
    if (token != null) await saveToken(token);
    return me();
  }

  static String? _extractToken(Map<String, dynamic> response) {
    final data = response['data'];
    if (data is Map) {
      return data['token']?.toString() ?? data['jwt']?.toString();
    }
    return response['token']?.toString();
  }

  static Future<AppUser> me() async {
    final response = await request('GET', '/api/auth/me', auth: true);
    final data = response['data'];
    final map = data is Map && data['user'] is Map
        ? Map<String, dynamic>.from(data['user'])
        : (data is Map ? Map<String, dynamic>.from(data) : response);
    return AppUser.fromJson(map);
  }

  static Future<void> changePassword(
      String currentPassword, String newPassword) {
    return request('POST', '/api/auth/change-password', auth: true, body: {
      'current_password': currentPassword,
      'new_password': newPassword,
    });
  }

  static Future<void> logout() => clearToken();

  // ---------- Public / services ----------

  static Future<List<ServiceItem>> services() async {
    final response = await request('GET', '/api/services');
    final data = response['data'];
    final list = data is List ? data : (data is Map ? data['services'] : null);
    if (list is! List) return [];
    return list
        .whereType<Map>()
        .map((e) => ServiceItem.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  // ---------- Customer requests ----------

  static Future<ServiceRequestModel> createRequest({
    required String serviceId,
    required String description,
    required String date,
    required String time,
    required String address,
    required String priority,
    double? latitude,
    double? longitude,
  }) async {
    final response = await request('POST', '/api/requests', auth: true, body: {
      'service_id': serviceId,
      'description': description,
      'preferred_at': '${date}T$time:00',
      'address': address,
      'priority': priority,
      // Remove these two lines if your API rejects unknown fields.
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
    });
    final parsed = ServiceRequestModel.tryParse(response);
    if (parsed == null) {
      throw ApiException(
          'Request created, but the server response was unexpected.');
    }
    return parsed;
  }

  static Future<List<ServiceRequestModel>> myRequests() async {
    final response = await request('GET', '/api/requests', auth: true);
    return _parseRequestList(response);
  }

  static Future<ServiceRequestModel> requestDetails(String id) async {
    final response = await request('GET', '/api/requests/$id', auth: true);
    final parsed = ServiceRequestModel.tryParse(response);
    if (parsed == null) throw ApiException('Could not read request details.');
    return parsed;
  }

  static Future<void> updateStatus(String id, String status) {
    return request('PATCH', '/api/requests/$id/status', auth: true, body: {
      'status': status,
    });
  }

  static Future<void> addCustomerNote(String id, String content) {
    return request('POST', '/api/requests/$id/notes', auth: true, body: {
      'content': content,
    });
  }

  // ---------- Agent requests ----------

  static Future<List<ServiceRequestModel>> agentRequests() async {
    final response = await request('GET', '/api/agent/requests', auth: true);
    return _parseRequestList(response);
  }

  static Future<ServiceRequestModel> agentRequestDetails(String id) async {
    final response =
        await request('GET', '/api/agent/requests/$id', auth: true);
    final parsed = ServiceRequestModel.tryParse(response);
    if (parsed == null) throw ApiException('Could not read job details.');
    return parsed;
  }

  static Future<void> agentAccept(String id) =>
      request('POST', '/api/agent/requests/$id/accept', auth: true);

  static Future<void> agentReject(String id, String reason) =>
      request('POST', '/api/agent/requests/$id/reject',
          auth: true, body: {'reason': reason});

  static Future<void> agentStart(String id) =>
      request('POST', '/api/agent/requests/$id/start', auth: true);

  static Future<void> agentComplete(String id) =>
      request('POST', '/api/agent/requests/$id/complete', auth: true);

  static Future<void> addAgentNote(String id, String content) {
    return request('POST', '/api/agent/requests/$id/notes', auth: true, body: {
      'content': content,
    });
  }

  static List<ServiceRequestModel> _parseRequestList(
      Map<String, dynamic> response) {
    final data = response['data'];
    List? list;
    if (data is List) {
      list = data;
    } else if (data is Map && data['requests'] is List) {
      list = data['requests'];
    }
    if (list == null) return [];
    return list
        .whereType<Map>()
        .map((e) => ServiceRequestModel.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}

/* =========================================================================
   SPLASH — restores session, routes by backend role
========================================================================= */

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
      vsync: this, duration: const Duration(milliseconds: 900));
  late final Animation<double> _scale =
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack);
  late final Animation<double> _fade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.0, 0.6, curve: Curves.easeOut));

  @override
  void initState() {
    super.initState();
    _controller.forward();
    _bootstrap();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    final token = await ApiService.getToken();
    await Future.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;

    if (token != null) {
      try {
        final user = await ApiService.me();
        _goHome(user);
        return;
      } catch (_) {
        await ApiService.clearToken();
      }
    }
    if (!mounted) return;
    Navigator.pushReplacement(
        context, MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  void _goHome(AppUser user) {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) =>
            user.isAgent ? AgentShell(user: user) : CustomerShell(user: user),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: Center(
        child: FadeTransition(
          opacity: _fade,
          child: ScaleTransition(
            scale: _scale,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: softShadow(opacity: 0.25, blur: 30),
                  ),
                  child: const Icon(Icons.handyman_rounded,
                      size: 56, color: AppColors.orange),
                ),
                const SizedBox(height: 22),
                RichText(
                  text: const TextSpan(
                    style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.2),
                    children: [
                      TextSpan(
                          text: 'Quick', style: TextStyle(color: Colors.white)),
                      TextSpan(
                          text: 'Serve',
                          style: TextStyle(color: AppColors.orange)),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                const Text('Service made simple',
                    style: TextStyle(color: Colors.white70, fontSize: 15)),
                const SizedBox(height: 34),
                const SizedBox(
                  height: 26,
                  width: 26,
                  child: CircularProgressIndicator(
                      strokeWidth: 2.6, color: AppColors.orange),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/* =========================================================================
   AUTH — Login / Register / shared layout
========================================================================= */

class AuthLayout extends StatelessWidget {
  final String title;
  final String subtitle;
  final List<Widget> children;
  const AuthLayout(
      {super.key,
      required this.title,
      required this.subtitle,
      required this.children});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Column(
                children: [
                  const Illustration(
                      kind: IllustrationKind.handyman, size: 130),
                  const SizedBox(height: 6),
                  RichText(
                    text: const TextSpan(
                      style:
                          TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
                      children: [
                        TextSpan(
                            text: 'Quick',
                            style: TextStyle(color: AppColors.navy)),
                        TextSpan(
                            text: 'Serve',
                            style: TextStyle(color: AppColors.orange)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(title,
                        style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            color: AppColors.navy)),
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(subtitle,
                        style: const TextStyle(color: AppColors.textMuted)),
                  ),
                  const SizedBox(height: 25),
                  ...children,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool loading = false;

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  void _goHome(AppUser user) {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) =>
            user.isAgent ? AgentShell(user: user) : CustomerShell(user: user),
      ),
    );
  }

  Future<void> _login() async {
    if (email.text.trim().isEmpty || password.text.isEmpty) {
      _showMessage('Enter email and password');
      return;
    }
    setState(() => loading = true);
    try {
      final user = await ApiService.login(email.text.trim(), password.text);
      if (!mounted) return;
      _goHome(user);
    } catch (e) {
      _showMessage(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _loginWithGoogle() async {
    if (loading) return;
    setState(() => loading = true);
    try {
      await googleSignIn.signOut();
      final account = await googleSignIn.signIn();
      if (account == null) return;
      final authentication = await account.authentication;
      final idToken = authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw ApiException('Google did not return an ID token.');
      }
      final user = await ApiService.googleLogin(idToken);
      if (!mounted) return;
      _goHome(user);
    } catch (e) {
      _showMessage(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthLayout(
      title: 'Welcome Back',
      subtitle: 'Login to manage your service requests',
      children: [
        TextField(
          controller: email,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
              labelText: 'Email',
              prefixIcon: Icon(Icons.email_outlined, color: AppColors.navy)),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: password,
          obscureText: true,
          decoration: const InputDecoration(
              labelText: 'Password',
              prefixIcon: Icon(Icons.lock_outline, color: AppColors.navy)),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 54,
          child: FilledButton(
            onPressed: loading ? null : _login,
            child: loading
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2.4))
                : const Text('Login'),
          ),
        ),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          height: 54,
          child: OutlinedButton.icon(
            onPressed: loading ? null : _loginWithGoogle,
            icon: const Icon(Icons.g_mobiledata_rounded, size: 30),
            label: const Text('Continue with Google'),
          ),
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: () => Navigator.push(context,
              MaterialPageRoute(builder: (_) => const RegisterScreen())),
          child: const Text("Don't have an account? Register"),
        ),
      ],
    );
  }
}

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final name = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();
  bool loading = false;

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  void _goHome(AppUser user) {
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(
        builder: (_) =>
            user.isAgent ? AgentShell(user: user) : CustomerShell(user: user),
      ),
      (_) => false,
    );
  }

  Future<void> _register() async {
    if (name.text.trim().isEmpty ||
        email.text.trim().isEmpty ||
        password.text.isEmpty) {
      _showMessage('Please fill all fields');
      return;
    }
    setState(() => loading = true);
    try {
      final user = await ApiService.register(
          name.text.trim(), email.text.trim(), password.text);
      if (!mounted) return;
      _goHome(user);
    } catch (e) {
      _showMessage(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _registerWithGoogle() async {
    if (loading) return;
    setState(() => loading = true);
    try {
      await googleSignIn.signOut();
      final account = await googleSignIn.signIn();
      if (account == null) return;
      final authentication = await account.authentication;
      final idToken = authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw ApiException('Google did not return an ID token.');
      }
      final user = await ApiService.googleLogin(idToken);
      if (!mounted) return;
      _goHome(user);
    } catch (e) {
      _showMessage(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthLayout(
      title: 'Create Account',
      subtitle: 'Join QuickServe today',
      children: [
        TextField(
          controller: name,
          decoration: const InputDecoration(
              labelText: 'Full Name',
              prefixIcon: Icon(Icons.person_outline, color: AppColors.navy)),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: email,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
              labelText: 'Email',
              prefixIcon: Icon(Icons.email_outlined, color: AppColors.navy)),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: password,
          obscureText: true,
          decoration: const InputDecoration(
              labelText: 'Password',
              prefixIcon: Icon(Icons.lock_outline, color: AppColors.navy)),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 54,
          child: FilledButton(
            onPressed: loading ? null : _register,
            child: loading
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2.4))
                : const Text('Create Account'),
          ),
        ),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          height: 54,
          child: OutlinedButton.icon(
            onPressed: loading ? null : _registerWithGoogle,
            icon: const Icon(Icons.g_mobiledata_rounded, size: 30),
            label: const Text('Sign up with Google'),
          ),
        ),
      ],
    );
  }
}

/* =========================================================================
   SHARED UI HELPERS
========================================================================= */

class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color color = AppColors.navy;
    if (status == 'COMPLETED') {
      color = AppColors.success;
    } else if (status == 'IN_PROGRESS') {
      color = AppColors.orange;
    } else if (status == 'CANCELLED' || status == 'REJECTED') {
      color = AppColors.danger;
    } else if (status == 'ASSIGNED' || status == 'ACCEPTED') {
      color = AppColors.info;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
          color: color.withValues(alpha: .12),
          borderRadius: BorderRadius.circular(20)),
      child: Text(
        status.replaceAll('_', ' '),
        style:
            TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w800),
      ),
    );
  }
}

class InfoCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  const InfoCard(
      {super.key,
      required this.title,
      required this.value,
      required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        boxShadow: softShadow(opacity: 0.04, blur: 10),
      ),
      child: ListTile(
        leading: Container(
          height: 42,
          width: 42,
          decoration: BoxDecoration(
              color: AppColors.orangeLight,
              borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: AppColors.orange, size: 20),
        ),
        title: Text(title,
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 3),
          child: Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.w700, color: AppColors.navy)),
        ),
      ),
    );
  }
}

class StatusTimeline extends StatelessWidget {
  final String currentStatus;
  const StatusTimeline({super.key, required this.currentStatus});

  @override
  Widget build(BuildContext context) {
    int currentIndex = kStatusFlow.indexOf(currentStatus);
    final terminalNegative =
        currentStatus == 'CANCELLED' || currentStatus == 'REJECTED';
    if (terminalNegative) currentIndex = -1;

    return Column(
      children: [
        ...List.generate(kStatusFlow.length, (index) {
          final completed = currentIndex >= index;
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  CircleAvatar(
                    radius: 11,
                    backgroundColor:
                        completed ? AppColors.orange : const Color(0xFFE2E8F0),
                    child: completed
                        ? const Icon(Icons.check, color: Colors.white, size: 13)
                        : null,
                  ),
                  if (index < kStatusFlow.length - 1)
                    Container(
                      width: 2,
                      height: 38,
                      color: completed
                          ? AppColors.orange
                          : const Color(0xFFE2E8F0),
                    ),
                ],
              ),
              const SizedBox(width: 14),
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  kStatusFlow[index].replaceAll('_', ' '),
                  style: TextStyle(
                    fontWeight: completed ? FontWeight.w800 : FontWeight.normal,
                    color: completed ? AppColors.navy : AppColors.textMuted,
                  ),
                ),
              ),
            ],
          );
        }),
        if (terminalNegative)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: StatusBadge(status: currentStatus),
            ),
          ),
      ],
    );
  }
}

class NotesSection extends StatelessWidget {
  final List<RequestNote> notes;
  final bool loading;
  final VoidCallback onAdd;
  const NotesSection(
      {super.key,
      required this.notes,
      required this.onAdd,
      this.loading = false});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text('Notes',
                style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                    color: AppColors.navy)),
            const Spacer(),
            TextButton.icon(
              onPressed: loading ? null : onAdd,
              icon: const Icon(Icons.add_comment_outlined, size: 18),
              label: const Text('Add note'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (notes.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 10),
            child: Text('No notes yet',
                style: TextStyle(color: AppColors.textMuted)),
          )
        else
          ...notes.map((note) => Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: softShadow(opacity: 0.04, blur: 8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(note.content,
                        style: const TextStyle(color: AppColors.navy)),
                    if (note.authorName != null || note.createdAt != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        [
                          if (note.authorName != null) note.authorName,
                          if (note.createdAt != null) note.createdAt,
                        ].whereType<String>().join(' • '),
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textMuted),
                      ),
                    ],
                  ],
                ),
              )),
      ],
    );
  }
}

Future<String?> showAddNoteDialog(BuildContext context) async {
  final controller = TextEditingController();
  return showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Add Note'),
      content: TextField(
        controller: controller,
        maxLines: 4,
        autofocus: true,
        decoration: const InputDecoration(hintText: 'Write a note...'),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel')),
        FilledButton(
          onPressed: () {
            final text = controller.text.trim();
            if (text.isEmpty) return;
            Navigator.pop(context, text);
          },
          child: const Text('Add'),
        ),
      ],
    ),
  );
}

Future<bool> showConfirmDialog(BuildContext context,
    {required String title, required String message}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel')),
        FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirm')),
      ],
    ),
  );
  return result ?? false;
}

Future<String?> showReasonDialog(BuildContext context,
    {required String title, required String hint}) async {
  final controller = TextEditingController();
  return showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: TextField(
        controller: controller,
        maxLines: 3,
        autofocus: true,
        decoration: InputDecoration(hintText: hint),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel')),
        FilledButton(
          onPressed: () {
            final text = controller.text.trim();
            if (text.isEmpty) return;
            Navigator.pop(context, text);
          },
          child: const Text('Submit'),
        ),
      ],
    ),
  );
}

/// Simple centered error state with a retry button, used across the app
/// so a failed API call never leaves a blank screen.
class ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const ErrorState({super.key, required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: AppColors.danger, size: 40),
            const SizedBox(height: 12),
            Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textMuted)),
            const SizedBox(height: 16),
            OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

/* =========================================================================
   PROFILE (shared shell for both roles — data comes from /api/auth/me)
========================================================================= */

class ProfileTab extends StatefulWidget {
  final AppUser user;
  const ProfileTab({super.key, required this.user});
  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  late AppUser user = widget.user;
  bool loading = false;
  String? error;

  Future<void> _refresh() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final u = await ApiService.me();
      if (mounted) setState(() => user = u);
    } catch (e) {
      if (mounted) {
        setState(() => error = e is ApiException ? e.message : e.toString());
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _logout() async {
    await PushService.unregister();
    await ApiService.logout();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text('Profile',
                style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: AppColors.navy)),
            const SizedBox(height: 30),
            Center(
              child: CircleAvatar(
                radius: 46,
                backgroundColor: AppColors.navy,
                child: Text(
                  user.fullName.isNotEmpty
                      ? user.fullName.substring(0, 1).toUpperCase()
                      : 'U',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.w800),
                ),
              ),
            ),
            const SizedBox(height: 20),
            if (error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: ErrorState(message: error!, onRetry: _refresh),
              ),
            InfoCard(
                title: 'Full Name',
                value: user.fullName,
                icon: Icons.person_outline),
            InfoCard(
                title: 'Email', value: user.email, icon: Icons.email_outlined),
            InfoCard(
                title: 'Role', value: user.role, icon: Icons.badge_outlined),
            const SizedBox(height: 20),
            Container(
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(16),
                boxShadow: softShadow(opacity: 0.04, blur: 10),
              ),
              child: ListTile(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                leading: const Icon(Icons.lock_outline, color: AppColors.navy),
                title: const Text('Change Password',
                    style: TextStyle(
                        fontWeight: FontWeight.w600, color: AppColors.navy)),
                trailing:
                    const Icon(Icons.chevron_right, color: AppColors.textMuted),
                onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => const ChangePasswordScreen())),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(16),
                boxShadow: softShadow(opacity: 0.04, blur: 10),
              ),
              child: ListTile(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                leading: const Icon(Icons.logout, color: AppColors.danger),
                title: const Text('Logout',
                    style: TextStyle(
                        color: AppColors.danger, fontWeight: FontWeight.w600)),
                onTap: _logout,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});
  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final current = TextEditingController();
  final newPassword = TextEditingController();
  bool loading = false;

  Future<void> _submit() async {
    if (current.text.isEmpty || newPassword.text.isEmpty) return;
    setState(() => loading = true);
    try {
      await ApiService.changePassword(current.text, newPassword.text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Password changed successfully')));
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e is ApiException ? e.message : e.toString())));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Change Password')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(
              controller: current,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Current Password')),
          const SizedBox(height: 16),
          TextField(
              controller: newPassword,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New Password')),
          const SizedBox(height: 25),
          SizedBox(
            height: 54,
            child: FilledButton(
              onPressed: loading ? null : _submit,
              child: loading
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2.4))
                  : const Text('Change Password'),
            ),
          ),
        ],
      ),
    );
  }
}

/* =========================================================================
   CUSTOMER APPLICATION
========================================================================= */

class CustomerShell extends StatefulWidget {
  final AppUser user;
  const CustomerShell({super.key, required this.user});
  @override
  State<CustomerShell> createState() => _CustomerShellState();
}

class _CustomerShellState extends State<CustomerShell> {
  int index = 0;
  String? servicesQuery;

  Timer? _poll;
  final Map<String, String> _statuses = {};
  bool _firstPoll = true;

  @override
  void initState() {
    super.initState();
    ApiService.onUnauthorized = _forceLogout;
    PushService.registerDevice();
    _poll = Timer.periodic(const Duration(seconds: 45), (_) => _checkUpdates());
    _checkUpdates();
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  /// In-app fallback: notify when one of the customer's requests changes
  /// status while the app is open (works without backend push).
  Future<void> _checkUpdates() async {
    try {
      final list = await ApiService.myRequests();
      for (final r in list) {
        final old = _statuses[r.id];
        if (!_firstPoll && old != null && old != r.status) {
          PushService.notifyLocal('Request ${r.requestNumber} updated',
              'Status: ${r.status.replaceAll('_', ' ')}');
        }
        _statuses[r.id] = r.status;
      }
      _firstPoll = false;
    } catch (_) {}
  }

  void _forceLogout() {
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(context,
        MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
  }

  void goToTab(int newIndex, {String? query}) {
    setState(() {
      index = newIndex;
      if (query != null) servicesQuery = query;
    });
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      CustomerHomeTab(onNavigate: goToTab),
      CustomerServicesTab(initialQuery: servicesQuery),
      const CustomerRequestsTab(),
      ProfileTab(user: widget.user),
    ];

    return Scaffold(
      body: IndexedStack(index: index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'Home'),
          NavigationDestination(
              icon: Icon(Icons.grid_view_outlined),
              selectedIcon: Icon(Icons.grid_view_rounded),
              label: 'Services'),
          NavigationDestination(
              icon: Icon(Icons.receipt_long_outlined),
              selectedIcon: Icon(Icons.receipt_long_rounded),
              label: 'My Requests'),
          NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'Profile'),
        ],
      ),
    );
  }
}

class CustomerHomeTab extends StatefulWidget {
  final void Function(int index, {String? query}) onNavigate;
  const CustomerHomeTab({super.key, required this.onNavigate});
  @override
  State<CustomerHomeTab> createState() => _CustomerHomeTabState();
}

class _CustomerHomeTabState extends State<CustomerHomeTab> {
  final searchController = TextEditingController();
  late Future<List<ServiceItem>> future;

  @override
  void initState() {
    super.initState();
    future = ApiService.services();
  }

  void openServices({String? query}) => widget.onNavigate(1, query: query);

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async => setState(() => future = ApiService.services()),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            Row(
              children: [
                const CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.orangeLight,
                    child: Icon(Icons.person, color: AppColors.orange)),
                const SizedBox(width: 12),
                const Icon(Icons.handyman_rounded,
                    color: AppColors.orange, size: 22),
                const SizedBox(width: 6),
                RichText(
                  text: const TextSpan(
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                    children: [
                      TextSpan(
                          text: 'Quick',
                          style: TextStyle(color: AppColors.navy)),
                      TextSpan(
                          text: 'Serve',
                          style: TextStyle(color: AppColors.orange)),
                    ],
                  ),
                ),
                const Spacer(),
                IconButton(
                    onPressed: () => openServices(),
                    icon: const Icon(Icons.search, color: AppColors.navy)),
              ],
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.fromLTRB(22, 16, 10, 34),
              decoration: BoxDecoration(
                color: AppColors.navy,
                borderRadius: BorderRadius.circular(24),
                boxShadow: softShadow(opacity: 0.12),
              ),
              child: const Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Find a Pro.',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.w800)),
                        Text('Book a Task.',
                            style: TextStyle(
                                color: AppColors.orange,
                                fontSize: 24,
                                fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ),
                  Illustration(kind: IllustrationKind.handyman, size: 110),
                ],
              ),
            ),
            Transform.translate(
              offset: const Offset(0, -22),
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: softShadow(opacity: 0.10),
                ),
                child: TextField(
                  controller: searchController,
                  textInputAction: TextInputAction.search,
                  onSubmitted: (value) => openServices(query: value),
                  decoration: InputDecoration(
                    hintText: 'Search for any task...',
                    hintStyle: const TextStyle(color: AppColors.textMuted),
                    prefixIcon:
                        const Icon(Icons.search, color: AppColors.textMuted),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide.none),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            const Text('Available Services',
                style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                    color: AppColors.navy)),
            const SizedBox(height: 16),
            FutureBuilder<List<ServiceItem>>(
              future: future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 30),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                if (snapshot.hasError) {
                  return ErrorState(
                    message: 'Could not load services.\n${snapshot.error}',
                    onRetry: () =>
                        setState(() => future = ApiService.services()),
                  );
                }
                final list = snapshot.data ?? [];
                if (list.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 30),
                    child: Center(
                        child: Text('No services available',
                            style: TextStyle(color: AppColors.textMuted))),
                  );
                }
                return Column(
                  children: list
                      .take(4)
                      .map((s) => ServiceCard(
                            service: s,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) =>
                                      CreateRequestScreen(service: s)),
                            ),
                          ))
                      .toList(),
                );
              },
            ),
            const SizedBox(height: 8),
            Center(
              child: TextButton(
                onPressed: () => openServices(),
                child: const Text('See all services'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ServiceCard extends StatelessWidget {
  final ServiceItem service;
  final VoidCallback onTap;
  const ServiceCard({super.key, required this.service, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(18),
        boxShadow: softShadow(opacity: 0.05, blur: 12),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        leading: Container(
          height: 52,
          width: 52,
          decoration: BoxDecoration(
              color: AppColors.orangeLight,
              borderRadius: BorderRadius.circular(16)),
          child: const Icon(Icons.home_repair_service_rounded,
              color: AppColors.orange),
        ),
        title: Text(service.name,
            style: const TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.navy)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 5),
          child: Text(service.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppColors.textMuted)),
        ),
        trailing: const Icon(Icons.arrow_forward_ios,
            size: 15, color: AppColors.orange),
        onTap: onTap,
      ),
    );
  }
}

class CustomerServicesTab extends StatefulWidget {
  final String? initialQuery;
  const CustomerServicesTab({super.key, this.initialQuery});
  @override
  State<CustomerServicesTab> createState() => _CustomerServicesTabState();
}

class _CustomerServicesTabState extends State<CustomerServicesTab> {
  late Future<List<ServiceItem>> future;
  late final TextEditingController searchController;
  String query = '';

  @override
  void initState() {
    super.initState();
    future = ApiService.services();
    query = widget.initialQuery ?? '';
    searchController = TextEditingController(text: query);
  }

  @override
  void didUpdateWidget(covariant CustomerServicesTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialQuery != null &&
        widget.initialQuery != oldWidget.initialQuery) {
      setState(() {
        query = widget.initialQuery!;
        searchController.text = query;
      });
    }
  }

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  List<ServiceItem> _filter(List<ServiceItem> services) {
    if (query.trim().isEmpty) return services;
    final q = query.trim().toLowerCase();
    return services
        .where((s) =>
            s.name.toLowerCase().contains(q) ||
            s.description.toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: FutureBuilder<List<ServiceItem>>(
        future: future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorState(
              message: 'Unable to load services.\n${snapshot.error}',
              onRetry: () => setState(() => future = ApiService.services()),
            );
          }
          final services = _filter(snapshot.data ?? []);
          return RefreshIndicator(
            onRefresh: () async {
              setState(() => future = ApiService.services());
              await future;
            },
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                const Text('Our Services',
                    style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: AppColors.navy)),
                const SizedBox(height: 8),
                const Text('Choose a service you need',
                    style: TextStyle(color: AppColors.textMuted)),
                const SizedBox(height: 18),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: softShadow(opacity: 0.05, blur: 12),
                  ),
                  child: TextField(
                    controller: searchController,
                    onChanged: (value) => setState(() => query = value),
                    decoration: InputDecoration(
                      hintText: 'Search services...',
                      prefixIcon:
                          const Icon(Icons.search, color: AppColors.textMuted),
                      suffixIcon: query.isEmpty
                          ? null
                          : IconButton(
                              icon: const Icon(Icons.close,
                                  color: AppColors.textMuted),
                              onPressed: () => setState(() {
                                query = '';
                                searchController.clear();
                              }),
                            ),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide.none),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                if (services.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(30),
                      child: Text('No services found',
                          style: TextStyle(color: AppColors.textMuted)),
                    ),
                  ),
                ...services.map((s) => ServiceCard(
                      service: s,
                      onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => CreateRequestScreen(service: s))),
                    )),
              ],
            ),
          );
        },
      ),
    );
  }
}

class CreateRequestScreen extends StatefulWidget {
  final ServiceItem service;
  const CreateRequestScreen({super.key, required this.service});
  @override
  State<CreateRequestScreen> createState() => _CreateRequestScreenState();
}

class _CreateRequestScreenState extends State<CreateRequestScreen> {
  final description = TextEditingController();
  final date = TextEditingController();
  final time = TextEditingController();
  final address = TextEditingController();
  String priority = 'LOW';
  bool loading = false;
  bool locating = false;
  double? lat;
  double? lng;

  @override
  void initState() {
    super.initState();
    // Auto-detect the address on open (silently ignored if denied).
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _useMyLocation(silent: true));
  }

  @override
  void dispose() {
    description.dispose();
    date.dispose();
    time.dispose();
    address.dispose();
    super.dispose();
  }

  Future<void> _useMyLocation({bool silent = false}) async {
    if (locating) return;
    setState(() => locating = true);
    try {
      final r = await LocationService.current();
      if (!mounted) return;
      if (!silent || address.text.trim().isEmpty) address.text = r.address;
      lat = r.lat;
      lng = r.lng;
    } catch (e) {
      if (!silent && mounted) {
        _showMessage(e is ApiException ? e.message : e.toString());
      }
    } finally {
      if (mounted) setState(() => locating = false);
    }
  }

  Future<void> _pickDate() async {
    FocusScope.of(context).unfocus();
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: DateTime(now.year + 2),
      initialDate: now,
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(
              primary: AppColors.navy,
              onPrimary: Colors.white,
              secondary: AppColors.orange),
        ),
        child: child!,
      ),
    );
    if (!mounted || picked == null) return;
    date.text = DateFormat('yyyy-MM-dd').format(picked);
    setState(() {});
  }

  Future<void> _pickTime() async {
    FocusScope.of(context).unfocus();
    final picked = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 10, minute: 0),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(
              primary: AppColors.navy,
              onPrimary: Colors.white,
              secondary: AppColors.orange),
        ),
        child: child!,
      ),
    );
    if (!mounted || picked == null) return;
    final hour = picked.hour.toString().padLeft(2, '0');
    final minute = picked.minute.toString().padLeft(2, '0');
    time.text = '$hour:$minute';
    setState(() {});
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _submit() async {
    final id = widget.service.id;
    final desc = description.text.trim();
    final selDate = date.text.trim();
    final selTime = time.text.trim();
    final selAddress = address.text.trim();

    if (id.isEmpty) {
      _showMessage(
          'This service has no valid service ID. Please refresh Services and try again.');
      return;
    }
    if (desc.isEmpty) {
      _showMessage('Please describe the problem.');
      return;
    }
    if (selDate.isEmpty || DateTime.tryParse(selDate) == null) {
      _showMessage('Please select a valid preferred date.');
      return;
    }
    if (selTime.isEmpty) {
      _showMessage('Please select a preferred time.');
      return;
    }
    if (selAddress.isEmpty) {
      _showMessage('Please enter the service address.');
      return;
    }

    setState(() => loading = true);
    try {
      final created = await ApiService.createRequest(
        serviceId: id,
        description: desc,
        date: selDate,
        time: selTime,
        address: selAddress,
        priority: priority,
        latitude: lat,
        longitude: lng,
      );
      if (!mounted) return;
      _showMessage(
          'Service request ${created.requestNumber} created successfully');
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
            builder: (_) => RequestDetailsScreen(requestId: created.id)),
      );
    } catch (e) {
      _showMessage(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Request')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(widget.service.name,
              style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.navy)),
          const SizedBox(height: 20),
          TextField(
            controller: description,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Describe the problem',
              hintText: 'Example: AC is not cooling properly',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: date,
            readOnly: true,
            onTap: _pickDate,
            decoration: const InputDecoration(
              labelText: 'Preferred Date',
              hintText: 'YYYY-MM-DD',
              prefixIcon:
                  Icon(Icons.calendar_month_outlined, color: AppColors.navy),
              suffixIcon: Icon(Icons.arrow_drop_down),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: time,
            readOnly: true,
            onTap: _pickTime,
            decoration: const InputDecoration(
              labelText: 'Preferred Time',
              hintText: 'HH:MM',
              prefixIcon:
                  Icon(Icons.access_time_outlined, color: AppColors.navy),
              suffixIcon: Icon(Icons.arrow_drop_down),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: address,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Service Address',
              hintText: 'Example: Nagpur, Maharashtra',
              alignLabelWithHint: true,
            ),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: locating ? null : () => _useMyLocation(),
              icon: locating
                  ? const SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.my_location, size: 18),
              label: Text(locating
                  ? 'Detecting location...'
                  : 'Use my current location'),
            ),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: priority, // Changed from initialValue to value
            decoration: const InputDecoration(
                labelText: 'Priority', border: OutlineInputBorder()),
            items: const [
              DropdownMenuItem(value: 'LOW', child: Text('Low')),
              DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
              DropdownMenuItem(value: 'HIGH', child: Text('High')),
            ],
            onChanged: loading
                ? null
                : (value) => setState(() => priority = value ?? 'LOW'),
          ),
          const SizedBox(height: 25),
          SizedBox(
            height: 54,
            child: FilledButton(
              onPressed: loading ? null : _submit,
              child: loading
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2.4))
                  : const Text('Create Request'),
            ),
          ),
        ],
      ),
    );
  }
}

class CustomerRequestsTab extends StatefulWidget {
  const CustomerRequestsTab({super.key});
  @override
  State<CustomerRequestsTab> createState() => _CustomerRequestsTabState();
}

class _CustomerRequestsTabState extends State<CustomerRequestsTab> {
  late Future<List<ServiceRequestModel>> future;

  @override
  void initState() {
    super.initState();
    future = ApiService.myRequests();
  }

  Future<void> _refresh() async {
    setState(() => future = ApiService.myRequests());
    await future;
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: FutureBuilder<List<ServiceRequestModel>>(
        future: future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorState(
              message: 'Unable to load requests.\n${snapshot.error}',
              onRetry: () => setState(() => future = ApiService.myRequests()),
            );
          }
          final requests = snapshot.data ?? [];
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                const Text('My Requests',
                    style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: AppColors.navy)),
                const SizedBox(height: 20),
                if (requests.isEmpty)
                  const EmptyIllustration(
                      kind: IllustrationKind.customer, text: 'No requests yet'),
                ...requests.map((r) => RequestListCard(
                      request: r,
                      onTap: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) =>
                                  RequestDetailsScreen(requestId: r.id)),
                        );
                        _refresh();
                      },
                    )),
              ],
            ),
          );
        },
      ),
    );
  }
}

class RequestListCard extends StatelessWidget {
  final ServiceRequestModel request;
  final VoidCallback onTap;

  /// Agent lists show who the customer is and where the job is.
  final bool showCustomer;
  const RequestListCard(
      {super.key,
      required this.request,
      required this.onTap,
      this.showCustomer = false});

  Color get _priorityColor {
    switch (request.priority) {
      case 'HIGH':
        return AppColors.danger;
      case 'LOW':
        return AppColors.success;
      default:
        return AppColors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(18),
        boxShadow: softShadow(opacity: 0.05, blur: 12),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(17),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(request.requestNumber,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            color: AppColors.navy)),
                  ),
                  StatusBadge(status: request.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(request.serviceName,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppColors.orange,
                      fontSize: 12)),
              const SizedBox(height: 10),
              Text(request.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: AppColors.navy)),
              if (showCustomer) ...[
                const SizedBox(height: 10),
                if (request.customerName != null)
                  Row(children: [
                    const Icon(Icons.person_outline,
                        size: 16, color: AppColors.textMuted),
                    const SizedBox(width: 5),
                    Expanded(
                      child: Text(request.customerName!,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: AppColors.textMuted, fontSize: 13)),
                    ),
                  ]),
                if (request.address != null) ...[
                  const SizedBox(height: 4),
                  Row(children: [
                    const Icon(Icons.location_on_outlined,
                        size: 16, color: AppColors.textMuted),
                    const SizedBox(width: 5),
                    Expanded(
                      child: Text(request.address!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: AppColors.textMuted, fontSize: 13)),
                    ),
                  ]),
                ],
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(Icons.flag_rounded, size: 16, color: _priorityColor),
                  const SizedBox(width: 5),
                  Text(request.priority,
                      style: TextStyle(
                          color: _priorityColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 12.5)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class RequestDetailsScreen extends StatefulWidget {
  final String requestId;
  const RequestDetailsScreen({super.key, required this.requestId});
  @override
  State<RequestDetailsScreen> createState() => _RequestDetailsScreenState();
}

class _RequestDetailsScreenState extends State<RequestDetailsScreen> {
  late Future<ServiceRequestModel> future;
  bool actionLoading = false;

  @override
  void initState() {
    super.initState();
    future = ApiService.requestDetails(widget.requestId);
  }

  void _reload() =>
      setState(() => future = ApiService.requestDetails(widget.requestId));

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _cancel() async {
    final confirmed = await showConfirmDialog(context,
        title: 'Cancel Request',
        message: 'Are you sure you want to cancel this request?');
    if (!confirmed) return;
    setState(() => actionLoading = true);
    try {
      await ApiService.updateStatus(widget.requestId, 'CANCELLED');
      _showMessage('Request cancelled');
      _reload();
    } catch (e) {
      _showMessage(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _addNote() async {
    final text = await showAddNoteDialog(context);
    if (text == null) return;
    setState(() => actionLoading = true);
    try {
      await ApiService.addCustomerNote(widget.requestId, text);
      _reload();
    } catch (e) {
      _showMessage(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Request Details')),
      body: FutureBuilder<ServiceRequestModel>(
        future: future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorState(
                message: snapshot.error is ApiException
                    ? (snapshot.error as ApiException).message
                    : snapshot.error.toString(),
                onRetry: _reload);
          }
          final r = snapshot.data!;
          final canCancel = r.status == 'CREATED' || r.status == 'ASSIGNED';

          return RefreshIndicator(
            onRefresh: () async {
              _reload();
              await future;
            },
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(r.requestNumber,
                    style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppColors.navy)),
                const SizedBox(height: 10),
                StatusBadge(status: r.status),
                const SizedBox(height: 25),
                InfoCard(
                    title: 'Service',
                    value: r.serviceName,
                    icon: Icons.home_repair_service_rounded),
                InfoCard(
                    title: 'Description',
                    value: r.description,
                    icon: Icons.description_outlined),
                InfoCard(
                    title: 'Address',
                    value: r.address ?? 'Not provided',
                    icon: Icons.location_on_outlined),
                InfoCard(
                    title: 'Priority',
                    value: r.priority,
                    icon: Icons.flag_rounded),
                if (r.preferredAt != null)
                  InfoCard(
                      title: 'Preferred Time',
                      value: r.preferredAt!,
                      icon: Icons.schedule_rounded),
                if (r.agentName != null)
                  InfoCard(
                      title: 'Assigned Agent',
                      value: r.agentName!,
                      icon: Icons.engineering_rounded),
                if (r.createdAt != null)
                  InfoCard(
                      title: 'Created',
                      value: r.createdAt!,
                      icon: Icons.event_available_rounded),
                const SizedBox(height: 10),
                const Text('Status Timeline',
                    style: TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        color: AppColors.navy)),
                const SizedBox(height: 15),
                StatusTimeline(currentStatus: r.status),
                const SizedBox(height: 20),
                NotesSection(
                    notes: r.notes, onAdd: _addNote, loading: actionLoading),
                if (canCancel)
                  Padding(
                    padding: const EdgeInsets.only(top: 25),
                    child: SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: OutlinedButton.icon(
                        onPressed: actionLoading ? null : _cancel,
                        icon: const Icon(Icons.close),
                        label: const Text('Cancel Request'),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/* =========================================================================
   AGENT APPLICATION
========================================================================= */

/// Opens Google Maps navigation for a job (uses GPS coordinates when the
/// backend provides them, otherwise the typed address).
Future<void> openMapsFor(ServiceRequestModel r, BuildContext context) async {
  final lat = r.raw['latitude'], lng = r.raw['longitude'];
  final query = (lat != null && lng != null)
      ? '$lat,$lng'
      : Uri.encodeComponent(r.address ?? '');
  if (query.isEmpty) return;
  final ok = await launchUrl(
      Uri.parse('https://www.google.com/maps/search/?api=1&query=$query'),
      mode: LaunchMode.externalApplication);
  if (!ok && context.mounted) {
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Could not open Maps')));
  }
}

class JobQuickActions extends StatelessWidget {
  final ServiceRequestModel job;
  const JobQuickActions({super.key, required this.job});

  @override
  Widget build(BuildContext context) {
    Widget btn(IconData icon, String label, VoidCallback? onTap) => Expanded(
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: onTap == null ? const Color(0xFFF1F5F9) : AppColors.card,
                borderRadius: BorderRadius.circular(16),
                boxShadow: softShadow(opacity: 0.05, blur: 10),
              ),
              child: Column(children: [
                Icon(icon,
                    color:
                        onTap == null ? AppColors.textMuted : AppColors.orange),
                const SizedBox(height: 4),
                Text(label,
                    style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.navy)),
              ]),
            ),
          ),
        );

    return Row(children: [
      btn(
          Icons.call_rounded,
          'Call',
          job.customerPhone == null
              ? null
              : () => launchUrl(Uri.parse('tel:${job.customerPhone}'))),
      const SizedBox(width: 10),
      btn(Icons.navigation_rounded, 'Navigate',
          () => openMapsFor(job, context)),
      const SizedBox(width: 10),
      btn(Icons.copy_rounded, 'Copy address', () {
        Clipboard.setData(ClipboardData(text: job.address ?? ''));
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Address copied')));
      }),
    ]);
  }
}

class AgentHeader extends StatefulWidget {
  final String name;
  final int activeJobs;
  const AgentHeader({super.key, required this.name, required this.activeJobs});
  @override
  State<AgentHeader> createState() => _AgentHeaderState();
}

class _AgentHeaderState extends State<AgentHeader> {
  bool online = true;

  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    final greet = hour < 12
        ? 'Good morning'
        : hour < 17
            ? 'Good afternoon'
            : 'Good evening';
    final n = widget.activeJobs;
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 18, 8, 12),
      decoration: BoxDecoration(
        color: AppColors.navy,
        borderRadius: BorderRadius.circular(24),
        boxShadow: softShadow(opacity: 0.12),
      ),
      child: Row(children: [
        Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('$greet,',
                style: const TextStyle(color: Colors.white70, fontSize: 14)),
            Text(widget.name.split(' ').first,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(
                n == 0
                    ? 'No active jobs right now'
                    : '$n active job${n == 1 ? '' : 's'}',
                style: const TextStyle(
                    color: AppColors.orange, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Row(children: [
              Switch(
                  value: online,
                  activeTrackColor: AppColors.orange,
                  onChanged: (v) => setState(() => online = v)),
              const SizedBox(width: 4),
              Text(online ? 'Available' : 'Offline',
                  style: const TextStyle(color: Colors.white70)),
            ]),
          ]),
        ),
        const Illustration(kind: IllustrationKind.handyman, size: 120),
      ]),
    );
  }
}

class AgentShell extends StatefulWidget {
  final AppUser user;
  const AgentShell({super.key, required this.user});
  @override
  State<AgentShell> createState() => _AgentShellState();
}

class _AgentShellState extends State<AgentShell> {
  int index = 0;
  String? jobsFilter;

  Timer? _poll;
  Set<String> _seen = {};
  bool _firstPoll = true;

  @override
  void initState() {
    super.initState();
    ApiService.onUnauthorized = _forceLogout;
    PushService.registerDevice();
    _poll = Timer.periodic(const Duration(seconds: 45), (_) => _checkJobs());
    _checkJobs();
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  /// Notifies the agent about newly assigned jobs while the app is open
  /// (works even before backend push is set up).
  Future<void> _checkJobs() async {
    try {
      final jobs = await ApiService.agentRequests();
      final ids =
          jobs.where((j) => j.status == 'ASSIGNED').map((j) => j.id).toSet();
      final fresh = ids.difference(_seen);
      if (!_firstPoll && fresh.isNotEmpty) {
        PushService.notifyLocal('New job assigned',
            '${fresh.length} new job${fresh.length == 1 ? '' : 's'} waiting for you');
      }
      _seen = ids;
      _firstPoll = false;
    } catch (_) {}
  }

  void _forceLogout() {
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(context,
        MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
  }

  void goToJobs({String? filter}) {
    setState(() {
      index = 1;
      jobsFilter = filter;
    });
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      AgentDashboardTab(user: widget.user, onOpenJobs: goToJobs),
      AgentJobsTab(initialFilter: jobsFilter),
      ProfileTab(user: widget.user),
    ];

    return Scaffold(
      body: IndexedStack(index: index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard_rounded),
              label: 'Dashboard'),
          NavigationDestination(
              icon: Icon(Icons.work_outline_rounded),
              selectedIcon: Icon(Icons.work_rounded),
              label: 'Jobs'),
          NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'Profile'),
        ],
      ),
    );
  }
}

class AgentDashboardTab extends StatefulWidget {
  final AppUser user;
  final void Function({String? filter}) onOpenJobs;
  const AgentDashboardTab(
      {super.key, required this.user, required this.onOpenJobs});
  @override
  State<AgentDashboardTab> createState() => _AgentDashboardTabState();
}

class _AgentDashboardTabState extends State<AgentDashboardTab> {
  late Future<List<ServiceRequestModel>> future;

  @override
  void initState() {
    super.initState();
    future = ApiService.agentRequests();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async {
          setState(() => future = ApiService.agentRequests());
          await future;
        },
        child: FutureBuilder<List<ServiceRequestModel>>(
          future: future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ErrorState(
                message: 'Unable to load your jobs.\n${snapshot.error}',
                onRetry: () =>
                    setState(() => future = ApiService.agentRequests()),
              );
            }
            final jobs = snapshot.data ?? [];
            final assigned = jobs.where((j) => j.status == 'ASSIGNED').length;
            final accepted = jobs.where((j) => j.status == 'ACCEPTED').length;
            final inProgress =
                jobs.where((j) => j.status == 'IN_PROGRESS').length;
            final completed = jobs.where((j) => j.status == 'COMPLETED').length;
            final active = jobs
                .where((j) =>
                    j.status == 'ASSIGNED' ||
                    j.status == 'ACCEPTED' ||
                    j.status == 'IN_PROGRESS')
                .toList();

            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                AgentHeader(
                    name: widget.user.fullName, activeJobs: active.length),
                const SizedBox(height: 20),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 14,
                  crossAxisSpacing: 14,
                  childAspectRatio: 1.5,
                  children: [
                    DashboardStat(
                        label: 'Assigned',
                        value: assigned,
                        color: AppColors.info,
                        onTap: () => widget.onOpenJobs(filter: 'ASSIGNED')),
                    DashboardStat(
                        label: 'Accepted',
                        value: accepted,
                        color: AppColors.navy,
                        onTap: () => widget.onOpenJobs(filter: 'ACCEPTED')),
                    DashboardStat(
                        label: 'In Progress',
                        value: inProgress,
                        color: AppColors.orange,
                        onTap: () => widget.onOpenJobs(filter: 'IN_PROGRESS')),
                    DashboardStat(
                        label: 'Completed',
                        value: completed,
                        color: AppColors.success,
                        onTap: () => widget.onOpenJobs(filter: 'COMPLETED')),
                  ],
                ),
                const SizedBox(height: 26),
                Row(
                  children: [
                    const Text('Active Jobs',
                        style: TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w800,
                            color: AppColors.navy)),
                    const Spacer(),
                    TextButton(
                        onPressed: () => widget.onOpenJobs(),
                        child: const Text('View all')),
                  ],
                ),
                const SizedBox(height: 10),
                if (active.isEmpty)
                  const EmptyIllustration(
                      kind: IllustrationKind.handyman,
                      text: 'No active jobs right now'),
                ...active.take(5).map((j) => RequestListCard(
                      request: j,
                      showCustomer: true,
                      onTap: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) =>
                                  AgentRequestDetailsScreen(requestId: j.id)),
                        );
                        setState(() => future = ApiService.agentRequests());
                      },
                    )),
              ],
            );
          },
        ),
      ),
    );
  }
}

class DashboardStat extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  final VoidCallback onTap;
  const DashboardStat(
      {super.key,
      required this.label,
      required this.value,
      required this.color,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(18),
          boxShadow: softShadow(opacity: 0.05, blur: 12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('$value',
                style: TextStyle(
                    fontSize: 28, fontWeight: FontWeight.w800, color: color)),
            const SizedBox(height: 4),
            Text(label,
                style: const TextStyle(
                    color: AppColors.textMuted, fontSize: 12.5)),
          ],
        ),
      ),
    );
  }
}

class AgentJobsTab extends StatefulWidget {
  final String? initialFilter;
  const AgentJobsTab({super.key, this.initialFilter});
  @override
  State<AgentJobsTab> createState() => _AgentJobsTabState();
}

class _AgentJobsTabState extends State<AgentJobsTab> {
  late Future<List<ServiceRequestModel>> future;
  String? filter;

  static const filters = ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];

  @override
  void initState() {
    super.initState();
    future = ApiService.agentRequests();
    filter = widget.initialFilter;
  }

  @override
  void didUpdateWidget(covariant AgentJobsTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialFilter != oldWidget.initialFilter) {
      setState(() => filter = widget.initialFilter);
    }
  }

  Future<void> _refresh() async {
    setState(() => future = ApiService.agentRequests());
    await future;
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: FutureBuilder<List<ServiceRequestModel>>(
        future: future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorState(
              message: 'Unable to load jobs.\n${snapshot.error}',
              onRetry: () =>
                  setState(() => future = ApiService.agentRequests()),
            );
          }
          final all = snapshot.data ?? [];
          final jobs = filter == null
              ? all
              : all.where((j) => j.status == filter).toList();

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                const Text('Jobs',
                    style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: AppColors.navy)),
                const SizedBox(height: 16),
                SizedBox(
                  height: 38,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      FilterChipButton(
                          label: 'All',
                          selected: filter == null,
                          onTap: () => setState(() => filter = null)),
                      const SizedBox(width: 8),
                      ...filters.map((f) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilterChipButton(
                              label: f.replaceAll('_', ' '),
                              selected: filter == f,
                              onTap: () => setState(() => filter = f),
                            ),
                          )),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                if (jobs.isEmpty)
                  const EmptyIllustration(
                      kind: IllustrationKind.handyman, text: 'No jobs found'),
                ...jobs.map((j) => RequestListCard(
                      request: j,
                      showCustomer: true,
                      onTap: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) =>
                                  AgentRequestDetailsScreen(requestId: j.id)),
                        );
                        _refresh();
                      },
                    )),
              ],
            ),
          );
        },
      ),
    );
  }
}

class FilterChipButton extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const FilterChipButton(
      {super.key,
      required this.label,
      required this.selected,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.navy : AppColors.card,
          borderRadius: BorderRadius.circular(20),
          boxShadow: softShadow(opacity: 0.04, blur: 8),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.textMuted,
            fontWeight: FontWeight.w700,
            fontSize: 12.5,
          ),
        ),
      ),
    );
  }
}

class AgentRequestDetailsScreen extends StatefulWidget {
  final String requestId;
  const AgentRequestDetailsScreen({super.key, required this.requestId});
  @override
  State<AgentRequestDetailsScreen> createState() =>
      _AgentRequestDetailsScreenState();
}

class _AgentRequestDetailsScreenState extends State<AgentRequestDetailsScreen> {
  late Future<ServiceRequestModel> future;
  bool actionLoading = false;

  @override
  void initState() {
    super.initState();
    future = ApiService.agentRequestDetails(widget.requestId);
  }

  void _reload() =>
      setState(() => future = ApiService.agentRequestDetails(widget.requestId));

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _accept() async {
    setState(() => actionLoading = true);
    try {
      await ApiService.agentAccept(widget.requestId);
      _showMessage('Job accepted');
      _reload();
    } catch (e) {
      _showMessage(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _reject() async {
    final reason = await showReasonDialog(context,
        title: 'Reject Job', hint: 'Reason for rejecting this job');
    if (reason == null) return;
    setState(() => actionLoading = true);
    try {
      await ApiService.agentReject(widget.requestId, reason);
      _showMessage('Job rejected');
      _reload();
    } catch (e) {
      _showMessage(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _start() async {
    setState(() => actionLoading = true);
    try {
      await ApiService.agentStart(widget.requestId);
      _showMessage('Service started');
      _reload();
    } catch (e) {
      _showMessage(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _complete() async {
    final confirmed = await showConfirmDialog(context,
        title: 'Complete Job', message: 'Mark this job as completed?');
    if (!confirmed) return;
    setState(() => actionLoading = true);
    try {
      await ApiService.agentComplete(widget.requestId);
      _showMessage('Job completed');
      _reload();
    } catch (e) {
      _showMessage(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _addNote() async {
    final text = await showAddNoteDialog(context);
    if (text == null) return;
    setState(() => actionLoading = true);
    try {
      await ApiService.addAgentNote(widget.requestId, text);
      _reload();
    } catch (e) {
      _showMessage(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Job Details')),
      body: FutureBuilder<ServiceRequestModel>(
        future: future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorState(
                message: snapshot.error is ApiException
                    ? (snapshot.error as ApiException).message
                    : snapshot.error.toString(),
                onRetry: _reload);
          }
          final r = snapshot.data!;

          return RefreshIndicator(
            onRefresh: () async {
              _reload();
              await future;
            },
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(r.requestNumber,
                    style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppColors.navy)),
                const SizedBox(height: 10),
                StatusBadge(status: r.status),
                const SizedBox(height: 20),
                JobQuickActions(job: r),
                const SizedBox(height: 20),
                InfoCard(
                    title: 'Service',
                    value: r.serviceName,
                    icon: Icons.home_repair_service_rounded),
                InfoCard(
                    title: 'Customer',
                    value: r.customerName ?? 'Not provided',
                    icon: Icons.person_outline),
                if (r.customerPhone != null)
                  InfoCard(
                      title: 'Customer Phone',
                      value: r.customerPhone!,
                      icon: Icons.phone_outlined),
                if (r.customerEmail != null)
                  InfoCard(
                      title: 'Customer Email',
                      value: r.customerEmail!,
                      icon: Icons.email_outlined),
                InfoCard(
                    title: 'Description',
                    value: r.description,
                    icon: Icons.description_outlined),
                InfoCard(
                    title: 'Address',
                    value: r.address ?? 'Not provided',
                    icon: Icons.location_on_outlined),
                InfoCard(
                    title: 'Priority',
                    value: r.priority,
                    icon: Icons.flag_rounded),
                if (r.preferredAt != null)
                  InfoCard(
                      title: 'Preferred Time',
                      value: r.preferredAt!,
                      icon: Icons.schedule_rounded),
                const SizedBox(height: 10),
                const Text('Status Timeline',
                    style: TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        color: AppColors.navy)),
                const SizedBox(height: 15),
                StatusTimeline(currentStatus: r.status),
                const SizedBox(height: 20),
                NotesSection(
                    notes: r.notes, onAdd: _addNote, loading: actionLoading),
                const SizedBox(height: 20),
                if (r.status == 'ASSIGNED')
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 50,
                          child: FilledButton.icon(
                            onPressed: actionLoading ? null : _accept,
                            icon: const Icon(Icons.check),
                            label: const Text('Accept'),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: SizedBox(
                          height: 50,
                          child: OutlinedButton.icon(
                            onPressed: actionLoading ? null : _reject,
                            icon: const Icon(Icons.close),
                            label: const Text('Reject'),
                          ),
                        ),
                      ),
                    ],
                  ),
                if (r.status == 'ACCEPTED')
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: FilledButton.icon(
                      onPressed: actionLoading ? null : _start,
                      icon: const Icon(Icons.play_arrow_rounded),
                      label: const Text('Start Service'),
                    ),
                  ),
                if (r.status == 'IN_PROGRESS')
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: FilledButton.icon(
                      onPressed: actionLoading ? null : _complete,
                      icon: const Icon(Icons.task_alt_rounded),
                      label: const Text('Complete Service'),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

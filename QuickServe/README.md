# QuickServe

A new Flutter project created with FlutLab - https://flutlab.io

## Getting Started

A few resources to get you started if this is your first Flutter project:

- https://flutter.dev/docs/get-started/codelab
- https://flutter.dev/docs/cookbook

For help getting started with Flutter, view our
https://flutter.dev/docs, which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## Getting Started: FlutLab - Flutter Online IDE

- How to use FlutLab? Please, view our https://flutlab.io/docs
- Join the discussion and conversation on https://flutlab.io/residents


## Google Sign-In

The app supports Google authentication through the QuickServe backend.

- Backend endpoint: `https://quickserve-api.quickserve-by-bhagyesh.workers.dev/api/auth/google`
- Server OAuth Client ID: `1092817021642-7sgo3dqmeljot2l3kpeleis3fi37jpol.apps.googleusercontent.com`
- The app sends Google's ID token to QuickServe and stores the returned QuickServe JWT in secure storage.
- Google-created accounts are handled by the backend as `CUSTOMER`.

### Android Google Cloud setup

Create an **Android OAuth client** for the Android package:

`com.example.quickserve`

Add the SHA-1 fingerprint for the signing certificate used by the build you run. Keep the Web OAuth Client ID above as the server client ID.

### Run

```bash
flutter pub get
flutter run
```

For Android, Google Sign-In requires a correctly configured Android OAuth client (package name + SHA-1). The Web OAuth client ID is used as the backend/server audience.

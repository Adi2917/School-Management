# Connect Your School Mobile

Native Android/iOS app for the existing Connect Your School platform. It uses
the same production API and MongoDB data as the website.

## Local testing

From the repository root:

```bash
npm run mobile:start
```

Install Expo Go on an Android phone and scan the QR code. The phone and computer
must normally be on the same network.

To point the app at another backend, copy `.env.example` to `.env.local` and set:

```env
EXPO_PUBLIC_API_URL=https://connectyourschool.in/api
```

Never place `MONGODB_URI`, Google private keys, or server secrets in this folder.

## Checks

```bash
npm run mobile:check
```

## Android builds

After signing in to an Expo account with EAS CLI:

```bash
cd mobile-app
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
```

`preview` creates a test APK. `production` creates the signed Android App Bundle
used for Google Play Console.

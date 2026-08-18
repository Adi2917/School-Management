# Android release

## Expo Go message

“Project is incompatible with this version of Expo Go” means the phone has an older Expo Go than this project's Expo SDK 57. Update Expo Go from Play Store. For stable testing that does not depend on Expo Go, create the preview APK below.

## Build files

- APK: directly installable test build.
- AAB (Android App Bundle): signed Play Store upload file. It is not normally installed directly; Google Play creates device-specific APKs from it.

## Commands

Run these inside `mobile-app`:

```powershell
npx.cmd eas-cli login
npx.cmd eas-cli build --platform android --profile preview
npx.cmd eas-cli build --platform android --profile production
```

The preview profile creates an APK. Test admin/student login, profile image, fees, results and notices on a real phone. The production profile creates the AAB for Play Console.

Before the first production build, EAS may ask to create/link an Expo project and generate an Android signing key. Allow EAS to manage the key and keep account recovery enabled. Do not commit signing credentials or service-account JSON files.

## Play Console checklist

1. Create the app with package name `in.connectyourschool.app`.
2. Upload the production AAB to Internal testing first.
3. Use `store-listing/feature-graphic-1024x500.png` and the generated app icon.
4. Capture at least two current phone screenshots after installing the preview APK.
5. Set privacy policy URL to `https://connectyourschool.in/privacy`.
6. Complete Data safety using `store-listing/privacy-and-data-safety.md`.
7. Add testers, publish the internal release, test, then promote to production.

Every future Play Store release must have a higher Android version code. EAS `autoIncrement` handles this for production builds.

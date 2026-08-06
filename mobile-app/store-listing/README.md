# Store artwork

- `feature-graphic-1024x500.png`: upload as the Play Store feature graphic.
- `../assets/images/connect-your-school-icon.png`: source icon used by Expo/EAS.
- Phone screenshots must be captured from the latest preview APK after final testing; do not reuse old browser screenshots because they do not represent the native release.

Regenerate the icon and feature graphic from the repository root with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-mobile-brand-assets.ps1
```

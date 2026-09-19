# Publish Vocab AI on Google Play (Android)

The web app is a PWA. The `android/` folder is a [Capacitor](https://capacitorjs.com/) shell so the same UI can ship as a public Android app. iOS is not set up here (it needs Xcode on a Mac).

App id: `io.github.chrisyau96.vocabai`  
Display name: Vocab AI  
Web assets: `dist/` with `VITE_BASE=/` (not the GitHub Pages `/dictionary/` path)

## One-time machine setup

1. Install [Android Studio](https://developer.android.com/studio) (Android SDK, platform tools, and a current build-tools / compile SDK).
2. Create a Play Console account: https://play.google.com/console
3. Create the app listing (name, short description, icon 512×512 from `public/icons/icon-512.png`, screenshots, privacy policy URL). Play will not accept a public production listing without a privacy policy.
4. Make a release keystore **once** and keep a backup. Losing it means you cannot update the store listing.

```bash
keytool -genkey -v -keystore vocabai-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias vocabai
```

Do not commit `.jks`, `.keystore`, or `android/key.properties`.

If `android/` is missing (fresh clone before Capacitor was added), from the repo root:

```bash
npm install
VITE_BASE=/ npm run build
npx cap add android
npx cap sync android
```

## Build the Play Store file (AAB)

From the repo root, on your computer:

```bash
npm install
VITE_BASE=/ npm run build
npx cap sync android
npx cap build android --androidreleasetype AAB --keystorepath /absolute/path/to/vocabai-release.jks --keystorepass 'YOUR_STORE_PASS' --keystorealias vocabai --keystorealiaspass 'YOUR_KEY_PASS'
```

The signed bundle is:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Same steps as npm scripts:

```bash
npm run android:sync
npx cap build android --androidreleasetype AAB --keystorepath /absolute/path/to/vocabai-release.jks --keystorepass 'YOUR_STORE_PASS' --keystorealias vocabai --keystorealiaspass 'YOUR_KEY_PASS'
```

Or open Android Studio and use **Build → Generate Signed Bundle / APK**:

```bash
npm run android:sync
npm run android:open
```

## Upload

1. Play Console → the app → **Production** (or a testing track first) → **Create new release**
2. Upload `app-release.aab`
3. Fill release notes → **Review and roll out**

Bump `versionCode` / `versionName` in `android/app/build.gradle` before each store upload. `package.json` `version` is the web/PWA version and does not update Play by itself.

## Notes

- First install inside the app still downloads Chris Workplace 1000 and Common English 5000 into on-device storage.
- GitHub Pages stays on `https://chrisyau96.github.io/dictionary/` and still deploys from `main` with `VITE_BASE=/dictionary/`.
- This environment often has no Android SDK, so the AAB is built on your machine, not in this cloud workspace.

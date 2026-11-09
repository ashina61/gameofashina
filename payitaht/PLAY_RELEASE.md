# Android / Play Store release

The production upload is a signed AAB. A debug APK is for device testing.

## Shared build and version

Run `pnpm build:android` from payitaht. It builds a native static export and validates every phone sprite counterpart before pruning only full-size painted building images from out/. Source assets and parcel sprites are retained. APK and AAB workflows use the same preparation.

package.json is the versionName source (currently 0.127.0). PAYITAHT_VERSION_NAME must match it. Default versionCode is major × 1000000 + minor × 1000 + patch. For Play, explicitly choose PAYITAHT_VERSION_CODE above every previously uploaded code; the CI-only 999999 code must not be treated as the production release code.

## Signing secrets

Configure the repository secrets before running Android Production AAB:

- PAYITAHT_KEYSTORE_B64 — base64 of the Play upload/release keystore
- PAYITAHT_KEYSTORE_PASSWORD
- PAYITAHT_KEY_ALIAS
- PAYITAHT_KEY_PASSWORD

The keystore is materialized only on the runner and is not committed. Keep the existing production upload key. Debug APKs use test signing and may not update an APK signed by a different key.

## Production release

Run Actions → Android Production AAB → Run workflow:

- version_name: exactly the package.json version, e.g. 0.127.0
- version_code: integer higher than all codes already uploaded to Play

The workflow installs the frozen lockfile, builds/prepares the Android export, syncs Capacitor, injects signing credentials, runs bundleRelease with R8/resource shrinking, verifies the signature and uploads the signed AAB as an artifact. Upload only this signed AAB to the chosen Play Console track.

## Pull-request checks and test builds

Android Release Check runs TypeScript/tests/ESLint/CSS and V2 budgets, builds the native export, checks four phone/text configurations and the complete layout scan, syncs Capacitor, and builds the unsigned release AAB plus debug APK on Java21/SDK36. UI reports/screenshots and test builds are workflow artifacts. An unsigned PR AAB cannot be submitted to Play.

## Device and Console gates

Before promoting a build, verify on an actual Android device:

- Existing save survives close/reopen and update; avoid uninstalling or clearing data before taking a backup.
- Export JSON through the system document picker, cancel it, and restore a chosen JSON through Settings.
- Back closes forest/mine → island → city before exiting.
- Notifications granted/denied, offline startup and return from background work.
- Text at 100%/130%, phone navigation insets and long sessions remain usable.

Serve public/privacy.html over a public HTTPS URL and enter that actual URL in Play Console. Confirm developer/support identity and Data safety, age/target-audience declarations against the shipped build. Review art/music licenses. Run internal testing before production. Physical performance, first-user comprehension and D1/D7 retention still require measurement.

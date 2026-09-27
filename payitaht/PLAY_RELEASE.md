# Play Store release

Production Android release is built as a signed **AAB**. The debug APK workflow remains only for device testing.

## GitHub secrets

Configure these repository secrets before running **Android Production AAB**:

- `PAYITAHT_KEYSTORE_B64` — base64 of the Play upload/release keystore
- `PAYITAHT_KEYSTORE_PASSWORD`
- `PAYITAHT_KEY_ALIAS`
- `PAYITAHT_KEY_PASSWORD`

The keystore is materialized only on the GitHub runner and is not committed.

## Release

Run **Actions → Android Production AAB → Run workflow** and enter:

- `version_name` — e.g. `0.29.0`
- `version_code` — integer higher than every version already uploaded to Play

The workflow:

1. installs the exact pnpm lockfile,
2. creates the native static export,
3. syncs Capacitor,
4. injects signing credentials,
5. runs `bundleRelease` with R8 + resource shrinking,
6. verifies the AAB signature,
7. uploads the signed AAB as a GitHub Actions artifact.

Upload that AAB to the desired Play Console track.

## Pull-request protection

`Android Release Check` builds an **unsigned** release AAB on every relevant PR. This catches R8, Gradle, Capacitor and release-only build failures without exposing signing secrets.

## Versioning

`android/app/build.gradle` accepts `PAYITAHT_VERSION_CODE` and `PAYITAHT_VERSION_NAME` from the release workflow. Local/debug builds keep the repository fallback values.

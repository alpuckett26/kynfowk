/**
 * Android Digital Asset Links — published at
 * https://kynfowk.vercel.app/.well-known/assetlinks.json
 *
 * Android (API 23+) uses this to verify that the domain authorizes
 * `com.kynfowk.app` to handle https://kynfowk.vercel.app/* URLs without
 * the disambiguation chooser. Combined with `android:autoVerify="true"`
 * on the matching intent-filter, tapping a kynfowk.vercel.app link from
 * email opens the app directly.
 *
 * The cert fingerprint is the SHA256 of the keystore that signs the
 * production APK. Get it via:
 *   keytool -list -v -keystore <release.keystore> -alias <alias>
 * or from Play Console → Setup → App integrity → App signing key.
 *
 * Set ANDROID_CERT_SHA256 in Vercel as `AB:CD:EF:...` (colon-separated,
 * uppercase). Multiple comma-separated fingerprints are supported so
 * you can include both upload + Play-managed keys, or debug + release.
 */

import { NextResponse } from "next/server";

const PACKAGE_NAME = "com.kynfowk.app";

export async function GET() {
  const sha256Raw = process.env.ANDROID_CERT_SHA256;
  if (!sha256Raw) {
    return new NextResponse("Not configured", { status: 404 });
  }

  const fingerprints = sha256Raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: PACKAGE_NAME,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

const { execFileSync } = require("child_process");

function hasEnvVars(keys) {
  return keys.every((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function hasSigningIdentity() {
  if (hasEnvVars(["CSC_LINK"]) || hasEnvVars(["CSC_NAME"])) {
    return true;
  }

  try {
    const output = execFileSync("security", ["find-identity", "-v", "-p", "codesigning"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return /Developer ID Application:/m.test(output);
  } catch (error) {
    return false;
  }
}

function fail(message) {
  console.error(`\n[mac-release-check] ${message}\n`);
  process.exit(1);
}

if (process.platform !== "darwin") {
  fail("Mac release builds must run on macOS.");
}

if (!hasSigningIdentity()) {
  fail(
    [
      "No Developer ID signing identity found.",
      "Use a real Apple Developer signing certificate before creating a downloadable DMG.",
      "Provide one of these:",
      "  - a local 'Developer ID Application:' certificate in Keychain",
      "  - CSC_LINK (+ CSC_KEY_PASSWORD) for CI",
      "  - CSC_NAME if the certificate is already installed",
      "For local unsigned testing, use 'npm run build:mac:local' instead.",
    ].join("\n")
  );
}

const notarizationStrategies = [
  {
    label: "App Store Connect API key",
    keys: ["APPLE_API_KEY", "APPLE_API_KEY_ID", "APPLE_API_ISSUER"],
  },
  {
    label: "Apple ID app-specific password",
    keys: ["APPLE_ID", "APPLE_APP_SPECIFIC_PASSWORD", "APPLE_TEAM_ID"],
  },
  {
    label: "notarytool keychain profile",
    keys: ["APPLE_KEYCHAIN", "APPLE_KEYCHAIN_PROFILE"],
  },
];

const matchedStrategy = notarizationStrategies.find((strategy) => hasEnvVars(strategy.keys));

if (!matchedStrategy) {
  fail(
    [
      "Missing notarization credentials.",
      "electron-builder will only produce a Gatekeeper-friendly download when Apple notarization is configured.",
      "Set one of these credential groups:",
      "  - APPLE_API_KEY + APPLE_API_KEY_ID + APPLE_API_ISSUER",
      "  - APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID",
      "  - APPLE_KEYCHAIN + APPLE_KEYCHAIN_PROFILE",
      "For local unsigned testing, use 'npm run build:mac:local' instead.",
    ].join("\n")
  );
}

console.log(`[mac-release-check] Release prerequisites OK (${matchedStrategy.label}).`);

import extensionManifest from "../../extension/manifest.json";

export const EXTENSION_VERSION = extensionManifest.version;
export const EXTENSION_DOWNLOAD_URL = `/braino-extension.zip?v=${encodeURIComponent(EXTENSION_VERSION)}`;
export const EXTENSION_DOWNLOAD_FILENAME = `braino-extension-v${EXTENSION_VERSION}.zip`;

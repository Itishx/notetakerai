declare const __EXTENSION_VERSION__: string;

export const EXTENSION_VERSION = __EXTENSION_VERSION__;
export const EXTENSION_DOWNLOAD_URL = `/braino-extension.zip?v=${encodeURIComponent(EXTENSION_VERSION)}`;
export const EXTENSION_DOWNLOAD_FILENAME = `braino-extension-v${EXTENSION_VERSION}.zip`;

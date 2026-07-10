declare const __EXTENSION_VERSION__: string;

export const EXTENSION_VERSION = __EXTENSION_VERSION__;
export const EXTENSION_DOWNLOAD_URL = `/braino.zip?v=${encodeURIComponent(EXTENSION_VERSION)}`;
export const EXTENSION_DOWNLOAD_FILENAME = "braino.zip";

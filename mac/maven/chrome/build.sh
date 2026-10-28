#!/bin/sh
# Builds Maven for Chrome: the extension's own files plus the Mac app's island
# (html/css/js) and safety gate, copied unchanged. Output: ~/Desktop/Maven-for-Chrome.zip
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
cp -R src/. dist/
cp ../renderer/island.css dist/
# Same island; only the Do shortcut in its hover hint shows the Chrome keys.
sed "s/fn⌃ Do/⌃⌘ Do/g" ../renderer/island.js > dist/island.js
# The island page, with the Chrome shim loaded before island.js (the only change).
sed 's#<script src="island.js"></script>#<script src="island-shim.js"></script><script src="island.js"></script>#' ../renderer/island.html > dist/island.html
{ echo "(() => { const module = { exports: {} };"; cat ../lib/dictation.cjs; echo "self.MavenGate = module.exports; })();"; } > dist/dictation.js
rm -f ~/Desktop/Maven-for-Chrome.zip
(cd dist && zip -qr ~/Desktop/Maven-for-Chrome.zip .)
rm -rf ~/Desktop/Maven-for-Chrome && cp -R dist ~/Desktop/Maven-for-Chrome
echo "built: ~/Desktop/Maven-for-Chrome (folder) and ~/Desktop/Maven-for-Chrome.zip"

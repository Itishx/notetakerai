#!/bin/sh
# Builds Maven for Chrome: the extension's own files plus the Mac app's island
# (html/css/js) and safety gate, copied unchanged. Output: ~/Desktop/Maven-for-Chrome.zip
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
cp -R src/. dist/
cp ../renderer/island.css ../renderer/maven-character.js dist/
mkdir -p dist/vendor && cp ../../shared/affectiveos-voice.js dist/vendor/affectiveos-voice.js
# Same island; only the Do shortcut in its hover hint shows the Chrome keys.
sed "s/fn⌃ Do/⌥⌘ Do/g" ../renderer/island.js > dist/island.js
# The island page, with the Chrome shim loaded before island.js (the only change).
sed 's#<script src="vendor/affectiveos-voice.js"></script>#<script src="island-shim.js"></script><script src="vendor/affectiveos-voice.js"></script>#' ../renderer/island.html > dist/island.html
# The Mac's job list, unchanged except the Do keys Chrome uses.
{ echo "(() => { const module = { exports: {} };"; sed -e 's/"fn⌃"/"⌥⌘"/' -e 's/fn+Control/Option+Command/' -e 's/Add to a list in Notes/Add to a list/' ../lib/jobs.cjs; echo "self.MAVEN_JOBS = module.exports.MAVEN_JOBS; })();"; } > dist/jobs.js
{ echo "(() => { const module = { exports: {} };"; cat ../lib/dictation.cjs; echo "self.MavenGate = module.exports; })();"; } > dist/dictation.js
# One copy only, always at the same place: the old one is deleted, so Chrome's
# reload arrow picks up the new version without loading it again.
rm -f ~/Desktop/Maven-for-Chrome.zip ~/Desktop/Maven-for-Chrome-*.zip
rm -rf ~/Desktop/Maven-for-Chrome && cp -R dist ~/Desktop/Maven-for-Chrome
# The Chrome Web Store upload: the same files, zipped, named by version.
V=$(sed -n 's/.*"version": "\(.*\)".*/\1/p' dist/manifest.json | sed 's/\.0$//')
(cd dist && zip -qr ~/Desktop/Maven-for-Chrome-$V.zip . -x ".*")
echo "built: ~/Desktop/Maven-for-Chrome (v$(sed -n 's/.*"version": "\(.*\)".*/\1/p' dist/manifest.json))"

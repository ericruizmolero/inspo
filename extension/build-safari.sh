#!/bin/sh
# Builds the Safari version from extension/chrome, into extension/safari (not in git). Signing and the Mac App Store
# need a person with the Apple Developer account: open the project in Xcode for that.
#   sh extension/build-safari.sh
set -e
cd "$(dirname "$0")"
rm -rf safari
xcrun safari-web-extension-converter chrome --project-location safari --app-name Criterio --bundle-identifier design.criterio.extension --macos-only --no-open --no-prompt --copy-resources --force
# The converter gives the app an identifier that does not contain the extension's, and Xcode refuses that
sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = design.criterio.Criterio;/PRODUCT_BUNDLE_IDENTIFIER = design.criterio.extension;/' safari/Criterio/Criterio.xcodeproj/project.pbxproj
xcodebuild -project safari/Criterio/Criterio.xcodeproj -scheme Criterio -configuration Debug CODE_SIGNING_ALLOWED=NO -derivedDataPath safari/dd build | tail -1

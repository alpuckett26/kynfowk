#!/usr/bin/env node
// Patches applied after npm install to fix compatibility issues
const fs = require('fs');
const path = require('path');

const fixes = [
  {
    file: path.resolve(__dirname, '../../../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle'),
    from: 'from components.release',
    to: 'from components.named("release")',
    description: 'Fix Gradle 8 compatibility: components.release → components.named("release")',
  },
];

let patched = 0;
for (const fix of fixes) {
  if (!fs.existsSync(fix.file)) {
    console.log(`[postinstall] Skip (not found): ${path.basename(fix.file)}`);
    continue;
  }
  const content = fs.readFileSync(fix.file, 'utf8');
  if (content.includes(fix.from)) {
    fs.writeFileSync(fix.file, content.replace(fix.from, fix.to));
    console.log(`[postinstall] Patched: ${fix.description}`);
    patched++;
  } else if (content.includes(fix.to)) {
    console.log(`[postinstall] Already patched: ${path.basename(fix.file)}`);
  }
}
console.log(`[postinstall] Done (${patched} patches applied).`);

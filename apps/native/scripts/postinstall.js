#!/usr/bin/env node
// Patches applied after npm install to fix compatibility issues
const fs = require('fs');
const path = require('path');

const gradleFile = path.resolve(__dirname, '../../../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle');

if (!fs.existsSync(gradleFile)) {
  console.log('[postinstall] Skip (not found): ExpoModulesCorePlugin.gradle');
  process.exit(0);
}

let content = fs.readFileSync(gradleFile, 'utf8');

// AGP 8 registers SoftwareComponents lazily (after all afterEvaluate blocks),
// so components.release and components.named("release") both throw at
// afterEvaluate time with "SoftwareComponent with name 'release' not found".
// Fix: use findByName (returns null instead of throwing) and skip the
// publication when the component isn't available. For an app build, maven
// publishing is irrelevant — only the APK output matters.

const originalBlock = `  afterEvaluate {
    publishing {
      publications {
        release(MavenPublication) {
          from components.release
        }
      }
      repositories {
        maven {
          url = mavenLocal().url
        }
      }
    }
  }`;

const previouslyPatchedBlock = `  afterEvaluate {
    publishing {
      publications {
        release(MavenPublication) {
          from components.named("release")
        }
      }
      repositories {
        maven {
          url = mavenLocal().url
        }
      }
    }
  }`;

const fixedBlock = `  afterEvaluate {
    def releaseComp = components.findByName("release")
    if (releaseComp) {
      publishing {
        publications {
          release(MavenPublication) {
            from releaseComp
          }
        }
        repositories {
          maven {
            url = mavenLocal().url
          }
        }
      }
    }
  }`;

if (content.includes('findByName("release")')) {
  console.log('[postinstall] Already patched: ExpoModulesCorePlugin.gradle');
} else if (content.includes(originalBlock)) {
  fs.writeFileSync(gradleFile, content.replace(originalBlock, fixedBlock));
  console.log('[postinstall] Patched: Fix AGP 8.x SoftwareComponent timing in useExpoPublishing()');
} else if (content.includes(previouslyPatchedBlock)) {
  fs.writeFileSync(gradleFile, content.replace(previouslyPatchedBlock, fixedBlock));
  console.log('[postinstall] Patched: Fix AGP 8.x SoftwareComponent timing in useExpoPublishing()');
} else {
  console.log('[postinstall] Warning: Could not find pattern in ExpoModulesCorePlugin.gradle — patch skipped');
}

console.log('[postinstall] Done.');

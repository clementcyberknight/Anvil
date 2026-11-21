const { withAppBuildGradle } = require("expo/config-plugins");

const GRADLE_SNIPPET = `
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_OBJECT_PATH_MAX=220"
            }
        }`;

module.exports = function withShortCmakePaths(config) {
  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    if (!contents.includes("CMAKE_OBJECT_PATH_MAX")) {
      contents = contents.replace(
        /versionName\s+"[^"]+"/,
        (match) => `${match}${GRADLE_SNIPPET}`,
      );
    }

    if (!contents.includes("buildStagingDirectory")) {
      contents = contents.replace(
        /defaultConfig\s*\{/,
        `externalNativeBuild {\n        cmake {\n            buildStagingDirectory file("C:/cx")\n        }\n    }\n    defaultConfig {`,
      );
    }

    modConfig.modResults.contents = contents;

    return modConfig;
  });
};

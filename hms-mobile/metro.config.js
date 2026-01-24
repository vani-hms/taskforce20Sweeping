const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Force Metro to resolve packages from this app's node_modules only. This prevents
// pulling a different react-native version from sibling projects in the monorepo,
// which can lead to native module mismatches like PlatformConstants not found.
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [path.join(projectRoot, "node_modules")];

module.exports = config;

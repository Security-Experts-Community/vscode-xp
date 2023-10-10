// file: esbuild.js

const { build } = require("esbuild");

const baseConfig = {
	bundle: true,
	minify: process.env.NODE_ENV === "production",
	sourcemap: process.env.NODE_ENV !== "production",
};

const extensionConfig = {
	...baseConfig,
	platform: "node",
	mainFields: ["module", "main"],
	format: "cjs",
	entryPoints: ["./client/src/extension.ts"],
	outfile: "./client/out/extension.js",
	external: ["vscode"],
};

const webviewConfig = {
	...baseConfig,
	target: "es2020",
	format: "esm",
	entryPoints: ["./client/src/ui.ts"],
	outfile: "./client/out/ui.js",
};

(async () => {
	try {
		await build(extensionConfig);
		await build(webviewConfig);
		console.log("build complete");
	} catch (err) {
		process.stderr.write(err.stderr);
		process.exit(1);
	}
})();
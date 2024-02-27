/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const { build } = require("esbuild");

const baseConfig = {
	bundle: true,
	minify: process.env.NODE_ENV === "production",
	sourcemap: process.env.NODE_ENV !== "production",
};

const clientConfig = {
	...baseConfig,
	platform: "node",
	mainFields: ["module", "main"],
	format: "cjs",
	entryPoints: ["./client/src/extension.ts"],
	outfile: "./client/out/extension.js",
	external: ["vscode"],
};

const uiConfig = {
	...baseConfig,
	target: "es2020",
	format: "esm",
	entryPoints: ["./client/src/uiToolkit/ui.ts"],
	outfile: "./client/out/ui.js",
};

const serverConfig = {
	...baseConfig,
	platform: "node",
	mainFields: ["module", "main"],
	format: "cjs",
	entryPoints: ["./server/src/server.ts"],
	outfile: "./server/out/server.js",
	external: ["vscode"],
};

const webviewConfig = {
	...baseConfig,
	target: "es2020",
	format: "esm",
	entryPoints: ["./client/templates/TableListEditor/js/tableListDefaultsEditor.js"],
	outfile: "./out/tableListDefaultsEditor.js",
  };

const watchConfig = {
	watch: {
		onRebuild(error, result) {
			console.log("\x1b[33m[watch] \x1b[37mbuild \x1b[32mstarted\x1b[0m");
			if (error) {
				error.errors.forEach(error =>
					console.error(`> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`)
				);
			} else {
				console.log("\x1b[33m[watch] \x1b[37mbuild \x1b[32mfinished\x1b[0m");
			}
		},
	},
};

(async () => {
	const args = process.argv.slice(2);
	console.log(process.argv);
	try {
		if (args.includes("--watch")) {
			console.log("\x1b[33m[watch] \x1b[37mbuild \x1b[32mstarted\x1b[0m");
			await build({
				...clientConfig,
				...watchConfig,
			});
			await build({
				...uiConfig,
				...watchConfig,
			});
			await build({
				...serverConfig,
				...watchConfig,
			});
			await build({
				...webviewConfig,
				...watchConfig,
			});
			console.log("\x1b[33m[watch] \x1b[34mclient\x1b[37m, \x1b[35mui-toolkit\x1b[37m, \x1b[36mserver \x1b[37mbuild \x1b[32mfinished\x1b[0m\n");
		} else {
			await build(clientConfig);
			console.log("\x1b[32m✓ \x1b[34mclient \x1b[37mbuild \x1b[32mcomplete\x1b[0m");
			await build(uiConfig);
			console.log("\x1b[32m✓ \x1b[35mui-toolkit \x1b[37mbuild \x1b[32mcomplete\x1b[0m");
			await build(serverConfig);
			console.log("\x1b[32m✓ \x1b[36mserver \x1b[37mbuild \x1b[32mcomplete\x1b[0m");
			await build(webviewConfig);
			console.log("\x1b[32m✓ \x1b[36mwebview \x1b[37mbuild \x1b[32mcomplete\x1b[0m\n");
		}
	} catch (err) {
		process.stderr.write(err.stderr);
		process.exit(1);
	}
})();
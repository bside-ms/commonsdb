import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	ssr: {
		// TipTap/ProseMirror must exist once per process: ProseMirror checks
		// instances, and two copies (one bundled, one from node_modules) make
		// server-side rendering of rich text fail ("multiple versions of
		// prosemirror-model"). Bundling all of it into the server build
		// guarantees a single copy.
		noExternal: [/^@tiptap\//, /^prosemirror-/]
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				experimental: { async: true }
			},

			// Node server for the VPS target (ARCHITECTURE: reference deployment).
			// Uploads need a larger request body than its 512 KB default:
			// set BODY_SIZE_LIMIT (e.g. 12M) in the server's environment.
			adapter: adapter(),
			env: { dir: '../../' },
			experimental: { remoteFunctions: true }
		}),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true
		})
	]
});

# syntax=docker/dockerfile:1
FROM node:24-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
# Image-only pnpm settings (local dev stays isolated):
# - hoisted: the server build resolves sharp/postgres/drizzle from the root
#   node_modules. pnpm 12 ignores --config.node-linker on the CLI, so it
#   goes into the workspace file.
# - no pre-run check: the build RUN has no store mount, and the check would
#   try to re-link from a store that isn't there.
RUN printf '\nnodeLinker: hoisted\nverifyDepsBeforeRun: false\n' >> pnpm-workspace.yaml
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
	pnpm install --frozen-lockfile
# SvelteKit validates defineEnvVars at build time ("Analysing routes").
# Placeholders for this step only: nothing is inlined, the real values
# come from the server's .env at runtime.
RUN DATABASE_URL=postgres://build@localhost/build \
	ORIGIN=http://localhost \
	BETTER_AUTH_SECRET=build-only-placeholder-000000000000 \
	UPLOAD_DIR=/tmp/uploads \
	pnpm --filter webapp build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 UPLOAD_DIR=/data/uploads
COPY --from=build /repo/package.json ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/webapp/package.json ./apps/webapp/
COPY --from=build /repo/apps/webapp/build ./apps/webapp/build
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
EXPOSE 3000
CMD ["node", "apps/webapp/build"]
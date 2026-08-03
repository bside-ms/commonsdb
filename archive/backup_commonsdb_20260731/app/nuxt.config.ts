import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },
  experimental: {
    asyncContext: true,
  },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/apple-touch-icon.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "/favicon-32.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "192x192",
          href: "/favicon-192.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "512x512",
          href: "/favicon-512.png",
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      baseUrl: "http://localhost:3000",
    },
    oauth: {
      keycloak: {
        serverUrl: "",
        realm: "",
        clientId: "",
        clientSecret: "",
      },
    },
  },
  modules: ["shadcn-nuxt", "@nuxt/fonts", "@nuxtjs/i18n", "nuxt-auth-utils"],
  shadcn: {
    prefix: "",
    componentDir: "./components/ui",
  },
  i18n: {
    defaultLocale: "de",
    locales: [{ code: "de", language: "de-DE", file: "de.json" }],
  },
  // https://github.com/nuxt/nuxt/issues/24690#issuecomment-2254528534
  vite: {
    plugins: [tailwindcss()],
  },
  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      "0 0 * * *": ["task:occurrences:update"],
      "*/5 * * * *": ["task:occurrences:missed"],
    },
  },
});

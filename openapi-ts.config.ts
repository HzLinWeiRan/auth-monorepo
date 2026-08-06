import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'packages/shared/openapi.json',
  output: {
    path: 'packages/shared/src/generated',
    clean: true,
  },
  plugins: [
    '@hey-api/typescript',
    {
      name: '@hey-api/sdk',
      client: '@hey-api/client-fetch',
      asClass: true,
    },
  ],
});
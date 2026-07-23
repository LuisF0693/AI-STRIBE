/** @type {import('next').NextConfig} */
const nextConfig = {
  // @aiscribe/shared é publicado como TS cru (main: ./src/index.ts).
  // Sem isto o build do Next falha ao importar tipos/código do workspace.
  transpilePackages: ['@aiscribe/shared'],
  reactStrictMode: true,
};

export default nextConfig;

/**
 * Configuração centralizada — secrets nunca acessados diretamente via process.env
 * no código de negócio. Toda referência a variáveis sensíveis passa por este objeto.
 * AC: 3, 10 — CERTISIGN_API_KEY e CERTISIGN_CERT_ID gerenciados aqui exclusivamente.
 */

export const config = {
  certisign: {
    apiKey: process.env.CERTISIGN_API_KEY ?? '',
    certId: process.env.CERTISIGN_CERT_ID ?? '',
    baseUrl: process.env.CERTISIGN_BASE_URL ?? 'https://sandbox.certisign.com.br/api/v1',
    timeoutMs: 10_000,
  },
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    anonKey: process.env.SUPABASE_ANON_KEY ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },
  storage: {
    pdfBucket: 'notas-pdf',
    signedUrlTtlSeconds: 86_400, // 24h
  },
} as const;

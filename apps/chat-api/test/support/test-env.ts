const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL é obrigatória para os testes e2e');
}
process.env.DATABASE_URL = testDatabaseUrl;

const testRedisUrl = process.env.TEST_REDIS_URL;
if (!testRedisUrl) {
  throw new Error('TEST_REDIS_URL é obrigatória para os testes e2e');
}
process.env.REDIS_URL = testRedisUrl;

// A carência da presença reduzida (LLD, "Carência da presença"): os testes do tempo real esperam
// a Pessoa ficar ausente sem os 30 s da produção.
process.env.PRESENCE_GRACE_MS = '300';

// A credencial de bot dos testes, a mesma que `botRoutes` envia (test/support/bot-routes.ts).
process.env.CHAT_BOT_TOKEN = 'credencial-de-bot-dos-testes';
process.env.CHAT_WORKER_TOKEN = 'credencial-worker-dos-testes';
process.env.S3_ENDPOINT = 'http://s3:8333';
process.env.S3_PUBLIC_ENDPOINT = 'http://s3:8333';
process.env.S3_ACCESS_KEY_ID = 'fullcycle';
process.env.S3_SECRET_ACCESS_KEY = 'fullcycle-secret';
process.env.REPORT_DOWNLOAD_TTL_SECONDS = '1';

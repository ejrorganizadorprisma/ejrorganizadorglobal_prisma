import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';

const PORT = env.PORT || 3000;

async function start() {
  try {
    // Usando Supabase Client - conexão via REST API
    logger.info('⚡ Banco de dados: Supabase REST API');

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor rodando na porta ${PORT}`);
      logger.info(`📝 Ambiente: ${env.NODE_ENV}`);
      logger.info(`🌐 API: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

start();

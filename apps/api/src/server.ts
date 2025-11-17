import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';

const PORT = env.PORT || 3000;

async function start() {
  try {
    // Usando Supabase Client - conexão via REST API
    logger.info('⚡ Banco de dados: Supabase REST API');

    // Start server - Listen on all network interfaces (0.0.0.0)
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Servidor rodando na porta ${PORT}`);
      logger.info(`📝 Ambiente: ${env.NODE_ENV}`);
      logger.info(`🌐 API Local: http://localhost:${PORT}/api/v1`);
      logger.info(`🌐 API Rede: http://192.168.1.91:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

start();

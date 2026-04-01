import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { networkInterfaces } from 'os';
import { backupScheduler } from './services/backup-scheduler.service';

const PORT = env.PORT || 3000;

// Função para detectar o IP da rede local
function getLocalNetworkIP(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    const netInfo = nets[name];
    if (!netInfo) continue;

    for (const net of netInfo) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '0.0.0.0';
}

async function start() {
  try {
    // Usando Supabase Client - conexão via REST API
    logger.info('⚡ Banco de dados: Supabase REST API');

    // Initialize backup scheduler (only in non-serverless environments)
    if (!process.env.VERCEL) {
      await backupScheduler.init();
    }

    // Start server - Listen on all network interfaces (0.0.0.0)
    app.listen(PORT, '0.0.0.0', () => {
      const networkIP = getLocalNetworkIP();
      logger.info(`🚀 Servidor rodando na porta ${PORT}`);
      logger.info(`📝 Ambiente: ${env.NODE_ENV}`);
      logger.info(`🌐 API Local: http://localhost:${PORT}/api/v1`);
      logger.info(`🌐 API Rede: http://${networkIP}:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

start();

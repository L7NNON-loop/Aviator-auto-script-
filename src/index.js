import cors from 'cors';
import express from 'express';
import { AviatorService } from './aviatorService.js';
import { config } from './config.js';
import { initFirebase } from './firebase.js';

const app = express();
app.use(express.json());
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin }));

const aviator = new AviatorService();
const firebaseState = initFirebase();

app.get('/api/velas', (req, res) => {
  const limit = Number(req.query.limit || 50);
  res.json({
    ok: true,
    latest: aviator.getLatest(),
    items: aviator.getRecords(limit)
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    service: aviator.getStatus(),
    firebase: firebaseState
  });
});

app.get('/api/sites/requisicoes', (req, res) => {
  res.json({
    ok: true,
    rotas: [
      { method: 'GET', path: '/api/velas?limit=50', description: 'Retorna histórico mais recente das velas' },
      { method: 'GET', path: '/api/status', description: 'Retorna estado do bot/servidor' },
      { method: 'GET', path: '/api/docs', description: 'Documentação JSON simplificada' },
      { method: 'GET', path: '/api/sites/requisicoes', description: 'Lista de rotas públicas' }
    ]
  });
});

app.get('/api/docs', (req, res) => {
  res.json({
    nome: 'Aviator Collector API',
    versao: '1.0.0',
    baseUrl: req.protocol + '://' + req.get('host'),
    endpoints: {
      '/api/velas': {
        method: 'GET',
        query: { limit: 'Opcional, padrão 50' },
        response: '{ latest, items[] }'
      },
      '/api/status': {
        method: 'GET',
        response: '{ service, firebase }'
      },
      '/api/sites/requisicoes': {
        method: 'GET',
        response: '{ rotas[] }'
      }
    }
  });
});

const server = app.listen(config.port, async () => {
  console.log(`🚀 API pronta na porta ${config.port}`);

  try {
    await aviator.start();
    console.log('✅ Bot de captura iniciado com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao iniciar captura:', error.message);
  }
});

const shutdown = async () => {
  console.log('\n🛑 Encerrando servidor...');
  await aviator.stop();
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

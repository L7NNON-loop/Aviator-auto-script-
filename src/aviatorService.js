import { chromium } from 'playwright';
import { config } from './config.js';
import { pushToFirebase } from './firebase.js';

const DEFAULT_METHOD_SELECTORS = [
  'div.payout[appcoloredmultiplier]',
  'div[class*="payout"]',
  'div[style*="rgb(52, 180, 255)"], div[style*="rgb(145, 62, 248)"], div[style*="rgb(192, 23, 180)"]'
];

export class AviatorService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.interval = null;
    this.startedAt = null;
    this.totalCaptures = 0;
    this.records = [];
    this.lastSnapshot = '';
    this.status = {
      state: 'idle',
      message: 'Aguardando inicialização',
      lastRunAt: null,
      lastError: null
    };
  }

  getStatus() {
    return {
      ...this.status,
      startedAt: this.startedAt,
      totalCaptures: this.totalCaptures,
      inMemoryRecords: this.records.length,
      pollIntervalMs: config.pollIntervalMs,
      aviatorUrl: config.casinoAviatorUrl
    };
  }

  getLatest() {
    return this.records[0] || null;
  }

  getRecords(limit = 50) {
    return this.records.slice(0, Math.max(1, limit));
  }

  async start() {
    if (this.interval) return;

    this.status = { ...this.status, state: 'starting', message: 'Iniciando browser e login...' };

    this.browser = await chromium.launch({
      headless: config.browserHeadless,
      executablePath: config.browserExecutablePath
    });

    const context = await this.browser.newContext();
    this.page = await context.newPage();

    await this.doLogin();
    await this.page.goto(config.casinoAviatorUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(5000);

    this.startedAt = new Date().toISOString();
    this.status = { ...this.status, state: 'running', message: 'Captura ativa', lastError: null };

    this.interval = setInterval(async () => {
      await this.captureTick();
    }, config.pollIntervalMs);

    await this.captureTick();
  }

  async stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }

    this.status = { ...this.status, state: 'stopped', message: 'Serviço parado' };
  }

  async doLogin() {
    if (!config.casinoUsername || !config.casinoPassword) {
      throw new Error('Defina CASINO_USERNAME e CASINO_PASSWORD no .env');
    }

    await this.page.goto(config.casinoLoginUrl, { waitUntil: 'domcontentloaded' });
    await this.page.fill(config.selectors.username, config.casinoUsername);
    await this.page.fill(config.selectors.password, config.casinoPassword);

    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      this.page.click(config.selectors.submit)
    ]);
  }

  async captureTick() {
    if (!this.page) return;

    try {
      const velas = await this.page.evaluate(({ selectors }) => {
        const regex = /^\d+\.\d+x$/i;

        const fromSelector = (selector) => {
          try {
            return Array.from(document.querySelectorAll(selector));
          } catch {
            return [];
          }
        };

        let elements = [];
        for (const selector of selectors) {
          elements = fromSelector(selector);
          if (elements.length > 0) break;
        }

        if (elements.length === 0) {
          const block = document.querySelector('div[class*="payouts-block"]');
          if (block) {
            elements = Array.from(block.querySelectorAll('div[style*="color"], div[style*="rgb"]'));
          }
        }

        if (elements.length === 0) {
          elements = Array.from(document.querySelectorAll('div')).filter((div) => regex.test(div.textContent.trim()));
        }

        return elements
          .map((v) => v.textContent.trim())
          .filter((v) => regex.test(v));
      }, { selectors: [config.selectors.velas, ...DEFAULT_METHOD_SELECTORS].filter(Boolean) });

      this.status.lastRunAt = new Date().toISOString();

      if (velas.length === 0) {
        this.status.message = 'Aguardando velas...';
        return;
      }

      const joined = velas.join(',');
      if (joined === this.lastSnapshot) {
        this.status.message = 'Sem mudanças no histórico';
        return;
      }

      this.lastSnapshot = joined;
      this.totalCaptures += 1;

      const values = velas.map((v) => parseFloat(v));
      const payload = {
        captureId: this.totalCaptures,
        timestamp: new Date().toISOString(),
        velas,
        ultimaVela: velas[0],
        totalVelas: velas.length,
        maiorVela: Math.max(...values),
        menorVela: Math.min(...values),
        velasAltas: velas.filter((v) => parseFloat(v) >= 10).length,
        velasBaixas: velas.filter((v) => parseFloat(v) < 2).length,
        media: Number((values.reduce((acc, item) => acc + item, 0) / values.length).toFixed(2)),
        servidor: new URL(config.casinoBaseUrl).hostname
      };

      this.records.unshift(payload);
      this.records = this.records.slice(0, config.maxStoredRecords);

      await pushToFirebase(payload);
      this.status.message = `Captura #${this.totalCaptures} salva`;
      this.status.lastError = null;
    } catch (error) {
      this.status.lastError = error.message;
      this.status.message = 'Erro na captura';
    }
  }
}

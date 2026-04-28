# Aviator Auto Script (Servidor/API)

Servidor Node.js com Playwright para:
- iniciar sessão automaticamente no casino,
- entrar na página do Aviator,
- capturar velas/histórico em tempo real,
- disponibilizar API pública (`/api/velas`, `/api/status`, `/api/docs`, `/api/sites/requisicoes`),
- opcionalmente enviar cada captura para Firebase Realtime Database.

## ⚠️ Importante
Use apenas em contas e cenários permitidos pelo casino/plataforma. Respeite ToS e legislação local.

---

## 1) Instalação local (Linux/macOS/Windows com Node 20+)

```bash
npm install
npx playwright install --with-deps chromium
cp .env.example .env
# edite .env com os dados corretos
npm start
```

API disponível em: `http://localhost:3000/api/docs`

---

## 2) Instalação no Termux (Android)

```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts git
npm install
npx playwright install chromium
cp .env.example .env
# edite .env
npm start
```

Se precisar usar Chromium do sistema no Termux, configure `BROWSER_EXECUTABLE_PATH` no `.env`.

---

## 3) Variáveis de ambiente

Use `.env.example` como base.

Campos principais:
- `CASINO_USERNAME`
- `CASINO_PASSWORD`
- `SELECTOR_USERNAME` (`#username_l`)
- `SELECTOR_PASSWORD` (`#password_l`)
- `SELECTOR_SUBMIT` (`button.button-submit-login`)
- `SELECTOR_VELAS` (`div.payout[appcoloredmultiplier]`)
- `POLL_INTERVAL_MS` (default `5000`)
- `FIREBASE_ENABLED` (`true`/`false`)

---

## 4) Endpoints

### `GET /api/velas?limit=50`
Retorna captura mais recente (`latest`) e histórico em memória (`items`).

### `GET /api/status`
Retorna status do bot (rodando, erro, total capturas, etc.).

### `GET /api/docs`
Mini documentação JSON da API.

### `GET /api/sites/requisicoes`
Lista de rotas públicas para outros sites consumirem.

---

## 5) Deploy na Render

Já existe `render.yaml` no projeto.

1. Crie novo Web Service na Render apontando para este repositório.
2. Configure variáveis de ambiente do `.env` no painel.
3. Deploy.

Build usado:
```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/render/.cache/ms-playwright npm install && PLAYWRIGHT_BROWSERS_PATH=/opt/render/.cache/ms-playwright npx playwright install --with-deps chromium
```

Também configure no Render a variável de ambiente:
```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/render/.cache/ms-playwright
```

---

## 6) Deploy na Railway

Já existe `railway.json` no projeto.

1. `railway init`
2. `railway up`
3. Configure as variáveis no painel da Railway.

---

## 7) Deploy na Vercel

Arquivo `vercel.json` incluído para publicar API.

> Observação: Vercel é serverless e não é ideal para um processo contínuo com browser aberto 24/7. Para captura contínua sem interrupção, prefira Render/Railway/VPS.

Mesmo assim, para publicar:
```bash
npm i -g vercel
vercel
```

---

## 8) Logs esperados

- `🚀 API pronta na porta ...`
- `✅ Bot de captura iniciado com sucesso.`
- Em erro de login/captura: `❌ Erro ao iniciar captura: ...` ou status em `/api/status`.

# Escola Instructiva — Vagas

Landing page da vaga de **Vendedor(a) — Toledo-PR** com formulário de candidatura, painel `/admin` para o RH ver as inscrições e baixar os currículos, e notificação opcional no WhatsApp a cada candidatura.

- Frontend: página estática (`public/index.html`)
- Backend: Node.js + Express (`server.js`)
- Persistência: arquivo JSON + currículos em disco (`DATA_DIR`)
- Painel: `public/admin.html` (protegido por senha)

---

## Estrutura

```
instructiva-vagas/
├── server.js            # backend (API + serve os arquivos)
├── package.json
├── .env.example         # copie para .env e ajuste
├── public/
│   ├── index.html       # a página da vaga
│   └── admin.html       # painel de candidaturas
└── data/                # criado sozinho (candidaturas.json + curriculos/)
```

---

## Rodar localmente

```bash
npm install
cp .env.example .env      # ajuste a senha
npm start
```

- Página da vaga: http://localhost:3000
- Painel: http://localhost:3000/admin

---

## Subir no Railway

Você pode fazer de dois jeitos. **Precisa** de um Volume para os dados não sumirem quando o app reinicia.

### Passo 1 — Volume (obrigatório)
1. No projeto do Railway, adicione um **Volume**.
2. Monte ele em `/data` (Mount path = `/data`).

### Passo 2 — Variáveis de ambiente
Em **Variables**, defina:

| Variável | Valor |
|---|---|
| `DATA_DIR` | `/data` |
| `ADMIN_PASSWORD` | sua senha forte do painel |
| `NOTIFY_NUMBER` | `5544997042737` (opcional) |
| `EVOLUTION_URL` | URL da sua Evolution API (opcional) |
| `EVOLUTION_API_KEY` | sua apikey da Evolution (opcional) |
| `EVOLUTION_INSTANCE` | nome da sua instância (opcional) |

`PORT` o Railway define sozinho.

### Passo 3 — Deploy

**Opção A — GitHub (recomendado):** suba esta pasta para um repositório e conecte no Railway (New → Deploy from GitHub repo). Toda atualização depois é só dar `git push`.

**Opção B — Sem GitHub (CLI):** dentro da pasta, rode:
```bash
npm i -g @railway/cli
railway login
railway link      # escolha o projeto
railway up        # faz o deploy do que está na pasta
```

Pronto: a página fica na URL do Railway e o painel em `.../admin`.

---

## Notificação no WhatsApp (opcional)

Se preencher as variáveis `EVOLUTION_*` e `NOTIFY_NUMBER`, cada nova candidatura dispara uma mensagem no seu WhatsApp com os dados do candidato (usa `POST /message/sendText/{instance}` da Evolution API v2). Se sua versão da Evolution usar outro formato de payload, ajuste em `notifyWhatsApp()` no `server.js`. Deixando em branco, nada é enviado e o painel continua funcionando normalmente.

---

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/candidaturas` | Recebe a candidatura + currículo (multipart) |
| `POST` | `/api/admin/login` | Login do painel |
| `GET` | `/api/admin/candidaturas` | Lista as candidaturas (auth) |
| `GET` | `/api/admin/curriculo/:id` | Baixa o currículo (auth) |
| `GET` | `/api/admin/export.csv` | Exporta tudo em CSV (auth) |

Os dados nunca são apagados pelo sistema — o `candidaturas.json` só cresce por append.

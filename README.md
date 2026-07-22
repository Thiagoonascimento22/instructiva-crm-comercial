# Instructiva CRM — Comercial

CRM de vendas com pipeline (kanban arrastável), níveis de acesso (gerente / vendedor)
e base pronta pra integração de WhatsApp. React + Vite no frontend, Node/Express + banco
em arquivo JSON no backend.

## Login inicial
- Usuário: `gerente`
- Senha: `admin123`
(No primeiro acesso o sistema pede pra definir nome e nova senha.)

## Deploy no Railway (resumo)
1. Suba estes arquivos num repositório no GitHub.
2. No Railway: New Project → Deploy from GitHub repo → escolha o repositório.
3. Na aba **Variables**, adicione:
   - `DB_PATH` = `/data/crm.json`
4. Crie um **Volume** montado em `/data` (sem ele os dados somem a cada deploy).
5. Em **Settings → Networking**, clique em **Generate Domain** (porta 3000).
6. Abra a URL e faça login.

O Railway roda `npm install` (que já builda o frontend via `postinstall`) e depois `npm start`.

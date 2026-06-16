# Suporte Instructiva

Sistema de controle de atendimento ao aluno, com dashboard, controle de acessos por permissão e análise de desempenho por IA.

## Stack
- **Frontend:** React + Vite + Recharts
- **Backend:** Node + Express
- **Banco:** SQLite (`better-sqlite3`) — persiste num volume no Railway
- **IA:** API da Anthropic (chave protegida no servidor)

---

## Rodar localmente

```bash
npm install
cp .env.example .env      # preencha ANTHROPIC_API_KEY
npm run build             # gera o frontend em dist/
npm start                 # sobe o servidor em http://localhost:3001
```

Para desenvolvimento com hot-reload (frontend e backend separados):
```bash
npm run dev               # Vite em :5173 + API em :3001 (com proxy)
```

**Primeiro acesso:** usuário `gerente` / senha `admin123`.
Ao entrar pela primeira vez, o sistema pede o nome da gerente. Depois ela troca login/senha em **Configurações** e cria os acessos das colaboradoras em **Equipe & Acessos**.

---

## Deploy no Railway

1. **Suba este projeto para um repositório no GitHub** (pode ser o que você já tem — só substitua o conteúdo por estes arquivos; apague o `index.html` antigo que era o `.jsx` renomeado).

2. No **Railway**: `New Project` → `Deploy from GitHub repo` → selecione o repositório.
   O Railway detecta o `nixpacks.toml` e roda `npm install` → `npm run build` → `npm start` sozinho.

3. **Variáveis de ambiente** (aba *Variables* do serviço):
   - `ANTHROPIC_API_KEY` = sua chave da Anthropic (sem ela, tudo funciona menos a aba Análise IA)
   - `DB_PATH` = `/data/instructiva.db`

4. **Volume para o banco persistir** (aba *Settings* → *Volumes* ou *Data*):
   - Crie um volume e monte em `/data`.
   - Sem o volume, os dados são apagados a cada novo deploy. **Não pule este passo.**

5. **Domínio público** (aba *Settings* → *Networking* → *Generate Domain*): gera a URL que a equipe vai acessar.

Pronto. A cada `git push` na branch principal, o Railway refaz o deploy automaticamente.

---

## Permissões disponíveis por colaboradora
- Registrar atendimentos
- Ver atendimentos de todas (senão vê só os próprios)
- Excluir registros
- Exportar dados (CSV)
- Acessar análise por IA
- Gerenciar usuários

A gerente (admin) tem todas por padrão e não pode ser removida.

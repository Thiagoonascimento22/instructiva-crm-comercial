# Setup — deploy automático (nunca mais zip)

Objetivo: depois de configurado uma vez, o fluxo vira
**você pede a mudança → o Claude Code dá push → o Railway sobe sozinho.**
Sem baixar zip, sem upload manual.

Você faz isso **uma vez**. Depois é tudo automático.

---

## Passo 1 — Instalar o Claude Code

App de desktop (mais fácil) ou terminal via npm:

```bash
npm install -g @anthropic-ai/claude-code
```

Requisitos e download: https://docs.claude.com/en/docs/claude-code/overview

Abra ESTA pasta (`instructiva-crm-comercial`) no Claude Code.

---

## Passo 2 — Repositório no GitHub

Se você **já tem** o repo `instructiva-crm-comercial` no GitHub, pule pro Passo 3.

Se **não tem**: github.com → *New repository* → nome `instructiva-crm-comercial`
→ marque **Private** → *Create repository*. Não marque nada de README/gitignore
(este pacote já traz o `.gitignore`).

---

## Passo 3 — Primeiro push

### Opção A (recomendada) — deixa o Claude Code fazer
No Claude Code, com esta pasta aberta, mande:

> "Faz o primeiro push desta pasta pro meu repositório instructiva-crm-comercial
> no GitHub, no branch main."

Na primeira vez ele pede pra você logar no GitHub (login normal do navegador).
**Não cole token no chat.**

### Opção B — na mão (terminal)
Troque `SEU-USUARIO` pelo seu usuário do GitHub:

```bash
git init
git add .
git commit -m "v61 - Pipeline: email/curso + botao Cadastrar no Pipeline nas duas caixas"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/instructiva-crm-comercial.git
git push -u origin main
```

(Se o repo já existir com conteúdo e o git reclamar, no Claude Code mande
"resolve o conflito e dá push" que ele acerta.)

---

## Passo 4 — Ligar o auto-deploy no Railway

⚠️ **NÃO crie um serviço novo.** Use o serviço do CRM que **já está rodando**.
Criar do zero a partir do GitHub vem com **volume vazio e sem variáveis** — você
perderia o `crm.json` (todos os leads e conversas) e os tokens do
Meta / Evolution / OpenAI.

No serviço existente:
1. Abra o serviço do CRM no Railway.
2. *Settings → Source* → conecte o repositório `instructiva-crm-comercial` do GitHub.
3. Deixe o deploy no branch **main** com **auto-deploy ligado**.
4. Confirme que as *Variables* e o *Volume* continuam lá (é por isso que usamos o
   serviço que já existe).

O build/start já está configurado no projeto:
- `package.json` → `postinstall` roda `vite build`, e `start` roda `node server/index.js`
- `nixpacks.toml` cuida do resto

---

## Daqui pra frente

Toda alteração:
1. Você fala a mudança pro Claude Code.
2. Ele commita e dá push no `main`.
3. O Railway rebuilda e deploya sozinho (~1–2 min).

Zero zip. Zero upload.

# Instructiva Projetos v1.0.0

Sistema de gestão de projetos que transforma documentos da diretoria (playbooks, atas,
planos de ação) em tarefas com responsável, prazo e prioridade.

**Como funciona:** o gestor sobe o PDF/DOCX/TXT. O sistema lê o documento, separa as
ações concretas e cria uma tarefa para cada uma. Se o documento cita o nome de alguém
cadastrado, a tarefa vai direto para essa pessoa. Se não cita nome — ou o nome é
ambíguo — a tarefa cai na fila de triagem do gestor, que valida e distribui.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Back-end | Node 20+ / Express (ESM) |
| Front-end | React 18 + Vite |
| Banco | JSON flat, um arquivo por coleção |
| Leitura de PDF | pdfjs-dist (fallback: pdf-parse) |
| Leitura de DOCX | mammoth |
| IA | OpenAI (gpt-4o-mini por padrão) |
| Login | JWT + bcrypt |

---

## Deploy no Railway

### 1. Subir o código

```bash
git init
git add .
git commit -m "Instructiva Projetos v1.0.0"
git remote add origin https://github.com/SEU-USUARIO/instructiva-projetos.git
git push -u origin main
```

No Railway: **New Project → Deploy from GitHub repo**. O `railway.json` já define
build (`npm install && npm run build`) e start (`npm start`).

### 2. Criar o volume — IMPORTANTE

O disco do Railway é apagado a cada deploy. Sem volume, os PDFs enviados e as tarefas
somem no próximo push.

No serviço → aba **Volumes** → **New Volume** → mount path `/dados`.

Depois, nas variáveis:

```
DATA_DIR=/dados
UPLOAD_DIR=/dados/uploads
```

### 3. Variáveis de ambiente

| Variável | Obrigatória | Para que serve |
|---|---|---|
| `JWT_SEGREDO` | sim | Assina os tokens de login. String longa e aleatória. |
| `DATA_DIR` | sim | Pasta do volume. Ex.: `/dados` |
| `UPLOAD_DIR` | sim | Onde ficam os arquivos. Ex.: `/dados/uploads` |
| `OPENAI_API_KEY` | recomendada | Liga a leitura por IA. Sem ela o sistema usa regras simples de texto. |
| `MODELO_IA` | não | Padrão `gpt-4o-mini`. |
| `ADMIN_NOME` | não | Nome do admin criado no primeiro start. |
| `ADMIN_EMAIL` | não | Login do admin. Padrão `admin@escolainstructiva.com.br`. |
| `ADMIN_SENHA` | não | Senha do admin. Padrão `instructiva2026` — **troque**. |
| `PORT` | não | O Railway define sozinho. |

O admin só é criado quando o banco está vazio. Depois disso, mudar `ADMIN_EMAIL` não
faz nada — use a tela de Equipe.

### 4. Primeiro acesso

1. Entre com o e-mail e senha do admin
2. **Configurações** → troque a senha
3. **Equipe** → cadastre as pessoas e os **apelidos** que o CEO costuma escrever
   ("Thi", "Gi", "Lucas S.") — é isso que faz a tarefa cair direto na pessoa certa
4. **Documentos** → suba o primeiro playbook

---

## Rodar local

```bash
npm install
cp .env.example .env      # preencha JWT_SEGREDO e OPENAI_API_KEY
npm run build             # gera client/dist
npm start                 # http://localhost:3000
```

Durante o desenvolvimento, dois terminais:

```bash
npm run dev               # API na 3000, com --watch
npm run dev:client        # Vite na 5173, com proxy para a API
```

---

## Regra de distribuição

O interruptor fica em **Configurações → Como as tarefas são distribuídas**.

**Desligado (padrão)**
- Documento cita nome cadastrado → tarefa vai direto para a pessoa (status "A fazer")
- Sem nome, ou nome ambíguo → tarefa vai para a triagem do gestor

**Ligado ("Passar tudo pela triagem antes")**
- Nada vai direto. O gestor confere e distribui 100% das tarefas.

**Nome ambíguo:** se houver dois "Lucas" cadastrados e o documento disser só "Lucas",
o sistema **não escolhe** — manda para a triagem. Para resolver, cadastre um apelido
que diferencie (ex.: "Lucas S." para um, "Lucas Salva" para o outro).

---

## Papéis

| Papel | O que pode fazer |
|---|---|
| **admin** | Tudo, incluindo gerenciar equipe e configurações |
| **gestor** | Triagem, distribuir tarefas, gerenciar equipe e projetos |
| **colaborador** | Vê e trabalha só nas tarefas dele; pode subir documentos |

---

## Estrutura

```
server/
  index.js               Express, monta rotas, serve o front
  lib/
    db.js                Banco JSON, escrita debounced + atômica, flush no SIGTERM
    auth.js              JWT, bcrypt, middlewares de papel, seed do admin
    extrator.js          Texto de PDF / DOCX / TXT / MD
    ia.js                Prompt de extração, casamento de nomes, leitura de prazo
    notificacoes.js      Avisos internos
  routes/
    usuarios.js          Login, senha, CRUD de pessoas
    documentos.js        Upload, processamento, criação das tarefas
    tarefas.js           Filtros, edição, lote, comentários
    geral.js             Projetos, painel, notificações, configurações
client/
  src/
    App.jsx              Sessão + rotas
    api.js               Cliente HTTP e formatação
    components/          Layout, cartões, modal de tarefa
    pages/               Entrar, Painel, Documentos, Triagem, Tarefas, Equipe...
```

### Banco de dados

Uma coleção por arquivo dentro de `DATA_DIR`:

```
usuarios.json  projetos.json  documentos.json
tarefas.json   notificacoes.json  config.json
uploads/
```

Arquivos separados de propósito — um blob único não sobrevive a redeploy quando duas
escritas acontecem juntas. As gravações são debounced (400 ms), atômicas
(temp + rename) e há flush garantido no SIGTERM/SIGINT.

---

## Formatos aceitos

PDF, DOCX, TXT, MD, CSV — até 25 MB por arquivo.

**PDF digitalizado (imagem) não funciona.** Sem camada de texto não há o que ler; o
sistema avisa o erro no documento. Converta antes de enviar.

`.doc` antigo também não — salve como `.docx` ou PDF.

---

## Sem a chave da OpenAI

O sistema continua funcionando em modo heurístico: procura itens de lista e verbos de
ação no texto. Serve para testar, mas a qualidade cai bastante — perde tarefas escritas
em prosa, não interpreta prazos e não gera descrição. Configure a `OPENAI_API_KEY`
antes de colocar em produção.

---

## API

Todas as rotas em `/api`, autenticadas com `Authorization: Bearer <token>`.

```
POST   /auth/login                 { email, senha } → { token, usuario }
GET    /auth/me
POST   /auth/senha                 { senhaAtual, senhaNova }

GET    /usuarios
POST   /usuarios                   gestor
PATCH  /usuarios/:id
DELETE /usuarios/:id               desativa, não apaga

POST   /documentos                 multipart, campo "arquivo" → 202 { id }
GET    /documentos
GET    /documentos/:id             inclui as tarefas geradas
GET    /documentos/:id/arquivo     download do original
POST   /documentos/:id/reprocessar gestor
DELETE /documentos/:id?comTarefas=true

GET    /tarefas?status=&responsavelId=&projetoId=&busca=&minhas=true
POST   /tarefas
PATCH  /tarefas/:id
POST   /tarefas/lote/atribuir      { ids[], responsavelId, prazo, prioridade }
POST   /tarefas/lote/status        { ids[], status }
POST   /tarefas/:id/comentarios    { texto }

GET    /projetos                   POST PATCH DELETE
GET    /dashboard
GET    /notificacoes               POST /notificacoes/lidas
GET    /config                     PATCH /config
GET    /saude                      público
```

---

## Manutenção

**Backup:** baixe os `.json` do volume. São legíveis e restauráveis direto.

**Reprocessar um documento:** botão "Ler de novo" na tela do documento. Substitui as
tarefas que ninguém começou; preserva as que estão em andamento ou concluídas.

**Pessoa saiu da empresa:** desative em Equipe. As tarefas e o histórico dela ficam
preservados; ela só some das listas de atribuição.

# Marmitaria Sabor Brasil — Cardápio digital e delivery

Sistema próprio de pedidos: cardápio para o cliente, painel para a loja, chat entre os dois.
Feito para celular (a maioria dos pedidos vem de lá) e instalável como app na tela inicial.

---

## O que tem

**Do lado do cliente** (`/`)
- Cardápio com categorias, busca e "os mais pedidos"
- Montagem da marmita com prévia ilustrada (tamanho, feijão, talheres, adicionais)
- Carrinho e checkout numa tela só, com endereço salvo no celular
- Entrega com taxa por bairro ou retirada no local
- PIX, dinheiro (com cálculo de troco) e cartão na entrega
- Acompanhamento do pedido em tempo real e chat direto com a cozinha
- Funciona como app instalado (PWA)
- Tema claro e escuro, com botão no topo e detecção automática pelo aparelho

**Do lado da loja** (`/admin`)
- Pedidos que chegam sozinhos na tela, com alerta sonoro e vibração
- Um toque para avançar o status (o cliente é avisado automaticamente)
- Chat com respostas rápidas e atalho para o WhatsApp
- Cardápio editável: itens, preços, fotos, grupos de opções, esgotado do dia
- Horários, bairros, taxas, formas de pagamento e cores da marca
- Vendas por dia, ticket médio e ranking dos mais vendidos
- Também em tema claro ou escuro

---

## Subir no Railway

1. Suba esta pasta para um repositório no GitHub.
2. No Railway: **New Project → Deploy from GitHub repo**.
3. Em **Variables**, defina:

| Variável | Valor | Observação |
|---|---|---|
| `ADMIN_SENHA` | *(sua senha)* | **Troque antes de publicar.** Sem ela, o padrão é `marmita2026` |
| `DATA_DIR` | `/data` | Aponta para o volume |
| `PORT` | *(automático)* | O Railway define sozinho |

4. Em **Settings → Volumes**, crie um volume montado em **`/data`**.
   Isso é obrigatório: sem volume, os pedidos e as fotos somem a cada deploy.
5. Em **Settings → Networking**, gere o domínio ou aponte o seu.

O build roda sozinho (`postinstall`) e o servidor sobe com `npm start`.

### Rodando na sua máquina

```bash
npm install
npm run build
ADMIN_SENHA=suasenha npm start
# cliente: http://localhost:3000   |   loja: http://localhost:3000/admin
```

Para desenvolver com recarga automática, use `npm run dev:server` num terminal e `npm run dev` noutro.

---

## Primeiros passos depois de publicar

1. Entre em `/admin` e troque a senha (variável `ADMIN_SENHA` no Railway).
2. Em **Ajustes**, preencha a **chave PIX** — ela só aparece para quem já fez o pedido.
3. Confira horários, bairros e taxas.
4. Em **Cardápio**, tire uma foto de cada marmita pelo próprio celular. Enquanto não houver foto, o sistema desenha a marmita a partir do que ela leva.
5. Coloque o link na bio do Instagram e no status do WhatsApp.

Peça para os clientes usarem "Adicionar à tela de início" — o cardápio vira um app no celular deles.

---

## Como os dados ficam guardados

Três arquivos JSON separados dentro de `DATA_DIR`, para um não sobrescrever o outro:

```
/data
├── config.json     dados da loja, horários, taxas, pagamentos
├── cardapio.json   categorias, itens e grupos de opções
├── pedidos.json    pedidos, histórico de status e conversas
└── uploads/        fotos enviadas pelo painel
```

Gravação atômica (escreve em `.tmp` e renomeia) e salvamento ao receber `SIGTERM`, então um deploy no meio do almoço não perde pedido.

---

## Detalhes que importam

- **Preço é sempre recalculado no servidor** a partir do cardápio real. Mesmo que alguém altere o preço no navegador, o valor cobrado é o seu.
- **A chave PIX nunca aparece no cardápio público** — só para quem já fechou o pedido.
- **Telefone é normalizado** (remove o DDI 55, usa DDD + 8 dígitos), então o mesmo cliente é reconhecido mesmo digitando de jeitos diferentes.
- **Loja fechada recusa pedido** no servidor, não só na tela.
- **Item esgotado** continua no cardápio mas não pode ser pedido.

---

## Stack

Node.js + Express (ESM) · React + Vite · JSON em disco · PWA com service worker.
Sem banco de dados para instalar, sem serviço pago, sem taxa por pedido.

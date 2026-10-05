# Contagem de Dias — Trello Power-Up

Mostra a **idade de cada card em dias úteis** (desde a criação) direto no card:
um badge na frente (`🗓 5d`) e um selo no verso ("Idade: 5 dias úteis").
Opcionalmente colore cards antigos (amarelo/vermelho por limite de dias).

## Por que é seguro (não perde dados)
Este Power-Up **não armazena nada por card**. A idade é calculada na hora, a
partir da data de criação do card (que vem embutida no próprio ID do Trello).
Só há uma configuração de quadro (quais dias contam e as cores), que no pior
caso volta ao padrão — nenhum dado de usuário se perde. Desativar o Power-Up
não apaga nada importante.

## Recursos
- Badge de idade em **dias úteis** na frente e no verso do card.
- Escolha de **quais dias contam** (padrão seg–sex).
- **Cores opcionais**: amarelo a partir de X dias, vermelho a partir de Y dias.
- **Buscar duplicados**: botão no topo do quadro abre um painel com busca por nome e uma lista de possíveis duplicados (nomes **iguais** e **parecidos**), para conferir antes de criar um card e evitar retrabalho. Clicar abre o card.

## Instalação (hospedar + registrar)
É um Power-Up **separado** — precisa da própria hospedagem e do próprio
registro no Trello.

1. **Hospedar (GitHub Pages):** suba o conteúdo desta pasta para a raiz de um
   repositório (o `index.html` na raiz). Em **Settings → Pages**, publique a
   branch `main`, pasta `/root`. Confirme que abrem:
   - `https://SEU-USUARIO.github.io/SEU-REPO/index.html` (página em branco — ok)
   - `https://SEU-USUARIO.github.io/SEU-REPO/manifest.json`
   - `https://SEU-USUARIO.github.io/SEU-REPO/public/icons/icon.png` (ou icon.svg)
2. **Registrar:** em https://trello.com/power-ups/admin → **New**. Cole em
   **Iframe connector URL**: `https://SEU-USUARIO.github.io/SEU-REPO/index.html`
   e no campo de **ícone**: a URL do `public/icons/icon.svg`.
3. **Capabilities** (se houver interruptores): `card-badges`,
   `card-detail-badges`, `show-settings`.
4. **Habilitar no quadro:** Power-Ups → Personalizar → **Contagem de Dias** →
   Adicionar.

## Atualizar
Suba os arquivos, aguarde o Pages republicar (aba Actions verde) e dê
**Ctrl+F5** no quadro. **Não** precisa desativar o Power-Up.

## Estrutura
```
contagem-de-dias/
├── index.html                 # conector
├── manifest.json              # nome, ícone, capabilities
├── src/
│   ├── client.js              # registra badges + configurações
│   ├── services/age.js        # cálculo PURO da idade (dias úteis) — sem gravar nada
│   ├── services/config.js     # config do quadro (dias que contam, cores)
│   ├── views/settingsView.js  # tela de configurações
│   └── styles/powerup.css
├── views/settings.html
└── public/icons/
```

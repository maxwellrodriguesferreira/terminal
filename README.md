# 💊🩺 Terminal de Apoio ao Tratamento

**Projeto Pessoal e Independente · Desenvolvido por Maxwell**

Aplicação web estática com interface de terminal CRT para redação humanizada de mensagens de acompanhamento farmacêutico e pós-atendimento em português do Brasil. Suporta medicamentos e serviços clínicos, gerador em lote com proteção anti-spam, autenticação Firebase, controle de acesso baseado em funções (RBAC) com moderação e auditoria por Super Usuário, regras no Cloud Firestore e integração opcional com o Google Gemini.

- **Produção:** [terminal-apoio.web.app](https://terminal-apoio.web.app)
- **Projeto Firebase:** `terminal-apoio`
- **Modelo de IA:** Google **Gemini 3.6 Flash** (`gemini-3.6-flash`)

> [!IMPORTANT]
> **Aviso Legal / Isenção de Responsabilidade:**
> Esta é uma ferramenta **pessoal, independente e de estudo/apoio profissional**. **NÃO foi desenvolvida por, para ou a pedido da empresa RaiaDrogasil (Drogasil)**, não constituindo produto, canal ou sistema oficial da referida empresa. A revisão, validação técnica e orientação farmacêutica final permanecem sob exclusiva responsabilidade do profissional habilitado.

---

## Funcionalidades Principais

### 👥 Controle de Acesso Baseado em Funções (RBAC) & Moderação

O sistema implementa uma camada completa de autenticação e moderação de farmacêuticos:

- **Aba de Cadastro Guiado**: Na tela inicial, novos profissionais realizam cadastro informando nome completo, drogaria/filial de atuação, e-mail e senha.
- **Fluxo de Aprovação Obrigatório**:
  - Toda nova conta é registrada com status inicial **`Pendente`** (`pending`).
  - O acesso à aplicação é bloqueado até que um Administrador aprove o cadastro.
  - Tentativas de autenticação por contas pendentes, rejeitadas ou suspensas são imediatamente interrompidas com aviso orientativo.
- **Painel Administrativo (`👥 Farmacêuticos` / `/admin/users`)**:
  - **Indicadores em Tempo Real**: Métricas de cadastros *Pendentes*, *Aprovados*, *Rejeitados*, *Bloqueados* e *Total de Usuários*.
  - **Busca e Filtros Dinâmicos**: Localização instantânea por nome, filial ou e-mail, combinada com abas de filtragem por status.
  - **Moderação Completa com 1 Clique**:
    - `✅ Aprovar`: Concede acesso imediato à plataforma.
    - `❌ Rejeitar`: Recusa o cadastro com modal interativo para registro opcional do motivo.
    - `⛔ Bloquear / 🔓 Desbloquear`: Suspende ou reativa contas previamente aprovadas.
    - `⭐ Alternar Função (Role)`: Alterna permissões entre Usuário Comum (`user`) e Administrador (`admin`).
    - `✏️ Editar`: Atualização de nome e drogaria de atuação.
    - `🗑️ Excluir`: Exclusão segura de registros.
  - **Trilha de Auditoria Detalhada**: Modal de detalhes com histórico de carimbos de data/hora, administradores responsáveis pelas ações (`approvedBy`, `rejectedBy`, `blockedBy`) e justificativa de recusa.

---

### 🔄 Sincronização Dinâmica da Sessão

Ao efetuar login, o terminal se adapta automaticamente aos dados do profissional conectado:
- **Barra de Status Inferior**: Exibe a filial (`🏬 Drogaria`) e o nome do profissional (`👨‍⚕️ Farmacêutico`).
- **Prompt CLI & Título**: Adota o formato `<usuario>@<drogaria-slug>:$` na janela e na linha de comando.
- **Assistente de Criação (`novo`)**: Pré-carrega automaticamente o nome e a filial nos formulários.
- **Mensagens & Templates**: Assinaturas automáticas de WhatsApp utilizam as credenciais ativas.
- **Contextualização na IA**: O prompt enviado ao Google Gemini injeta dinamicamente a identidade do profissional e filial de atendimento.

---

### 💬 Mensagens Humanizadas & Classificação Clínica

- **4 Tons de Mensagem**:
  1. **Empática**: Foco no acolhimento, cuidado e bem-estar geral.
  2. **Atenciosa**: Tom clínico, preventivo e focado na correta adesão ao tratamento.
  3. **Descontraída**: Abordagem leve, amigável e direta.
  4. **Pós-Tratamento**: Acompanhamento após o término do tratamento ou serviço.
- **Reconhecimento Automático de Serviços Farmacêuticos**:
  - Aplicação de injetáveis (ex: anti-inflamatórios, antibióticos, vitaminas).
  - Aferição de pressão arterial e monitoramento cardiológico.
  - Testes rápidos e painéis respiratórios (COVID-19, Influenza A/B, Dengue, Estreptococo).
  - Glicemia capilar e colocação de sensor contínuo de glicose (ex: FreeStyle Libre).
  - Bioimpedância e acompanhamento corporal.
  - Vacinação, curativos e perfuração do lóbulo auricular.
- **Ações Rápidas**: Cópia de texto para a área de transferência com 1 clique e botão para abertura direta no WhatsApp Web / Desktop (`wa.me`).

---

### 📦 Processamento em Lote com Proteção Anti-Spam

- Geração em massa a partir de linhas formatadas (`Nome | Item | Telefone | Sintoma`).
- Algoritmo de diferenciação automática para envios em grande escala:
  - Variações léxicas e estruturais de texto.
  - Inserção de caracteres invisíveis (*Zero-Width Spaces*).
  - Hash identificador exclusivo (`SIG_...`) para evitar restrições em disparos de mensagens.
- Exportação dos lotes gerados para planilha CSV.

---

### 🛡️ Regras de Segurança no Cloud Firestore (`firestore.rules`)

As regras de segurança do Firestore garantem conformidade e integridade:
- **Validação de Permissões**: Funções `isAdmin()` e `isApprovedUser()` inspecionam papéis e status em tempo real.
- **Imutabilidade de Privilégios**: Impede que novos cadastros ou usuários comuns injetem status aprovado ou elevação de cargo por conta própria.
- **Proteção de Coleções**: Bloqueia leitura e escrita de dados operacionais para contas não autenticadas ou não aprovadas.

---

## Google Gemini 3.6 Flash

A integração com IA generativa é opcional. Quando inativa, o gerador de templates locais é acionado de forma instantânea. Com chave configurada, o Gemini elabora mensagens personalizadas com base no contexto clínico informado.

Endpoint utilizado:
```text
https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent
```

### Configuração da Chave de API:
1. Abra as **⚙️ Configurações** na barra superior ou digite `ia` no terminal.
2. Gere sua chave gratuita no [Google AI Studio](https://aistudio.google.com/apikey).
3. Cole a chave no campo correspondente ou use o comando:
   ```bash
   apikey AIzaSy...
   ```
4. Verifique a conectividade com `ia status` ou pelo botão **🧪 Testar conexão**.

---

## 💻 Tabela de Comandos da CLI

| Comando | Descrição | Exemplo |
| :--- | :--- | :--- |
| `novo`, `guiado`, `criar` | Abre o assistente visual para criação individual. | `novo` |
| `gerar [nome] [item]` | Gera mensagens diretamente a partir de argumentos posicionais. | `gerar Carlos Amoxicilina 500mg` |
| `gerar --nome ... --medicamento ...` | Gera mensagens utilizando parâmetros nomeados. | `gerar --nome Ana --medicamento "Pressão Arterial"` |
| `lote`, `batch`, `massa` | Abre o assistente de processamento de mensagens em lote. | `lote` |
| `historico` | Lista o histórico das mensagens geradas na sessão. | `historico` |
| `historico limpar`, `zerar`, `reset` | Limpa o histórico de mensagens e zera o contador. | `zerar` |
| `exemplos`, `exemplo` | Gera 3 casos práticos demonstrativos (medicamento e serviços). | `exemplos` |
| `servicos`, `serviço` | Lista os serviços e procedimentos clínicos reconhecidos. | `servicos` |
| `ia`, `gemini`, `apikey` | Abre o painel de configuração da API do Gemini. | `ia` |
| `ia status` / `ia remover` | Consulta o status da IA ou remove a chave configurada. | `ia status` |
| `apikey [chave]` | Salva a chave de API do Gemini via terminal. | `apikey AIza...` |
| `tema [matrix\|amber\|cyberpunk\|dark]` | Alterna ou define o esquema de cores e estilo CRT. | `tema cyber` |
| `limpar`, `clear`, `cls` | Limpa as mensagens da tela do terminal. | `limpar` |
| `usuario`, `whoami`, `perfil` | Exibe os dados do farmacêutico e drogaria da sessão ativa. | `whoami` |
| `senha [nova_senha]` | Altera a senha do usuário local. | `senha 123456` |
| `sair`, `logout`, `desconectar` | Encerra a sessão atual e bloqueia o terminal. | `sair` |
| `ajuda`, `help`, `?`, `menu` | Exibe a lista completa de comandos e atalhos. | `ajuda` |
| **Comandos Administrativos (Super Usuário)** | | |
| `usuarios`, `farmaceuticos`, `admin` | Abre o painel administrativo de gestão e aprovação de usuários. | `usuarios` |
| `aprovar [email\|nome]` | Aprova diretamente o cadastro de um farmacêutico. | `aprovar camila@drogasil.com.br` |
| `rejeitar [email] [motivo]` | Rejeita o cadastro de um usuário com justificativa. | `rejeitar joao@email.com Cadastro incompleto` |
| `bloquear [email\|nome]` | Suspende temporariamente o acesso de uma conta. | `bloquear joao@email.com` |
| `desbloquear [email\|nome]` | Reativa o acesso de uma conta suspensa. | `desbloquear joao@email.com` |
| `role [email] [user\|admin]` | Altera a permissão entre usuário comum e administrador. | `role camila@drogasil.com.br admin` |
| `deletar [email\|nome]` | Exclui permanentemente um registro do sistema. | `deletar teste@email.com` |

---

## 📂 Arquitetura do Projeto

A aplicação é 100% estática, construída com JavaScript moderno (ES6+), CSS modularizado com temas de terminal e integração com serviços Firebase:

| Arquivo | Descrição e Responsabilidade |
| :--- | :--- |
| [`index.html`](file:///home/maxwell/terminal/index.html) | Estrutura semântica, terminal CRT, modais, formulários de autenticação/cadastro e painel administrativo. |
| [`style.css`](file:///home/maxwell/terminal/style.css) | Sistema de design CRT, scanlines, temas visuais (Matrix, Amber, Cyberpunk, Dark), badges de status e tabelas administrativas. |
| [`app.js`](file:///home/maxwell/terminal/app.js) | Núcleo da CLI, lógica de moderação de usuários, geração de mensagens clínicas, proteção anti-spam e integração com Gemini. |
| [`firebase-config.js`](file:///home/maxwell/terminal/firebase-config.js) | Configuração do SDK Firebase, autenticação, controle de persistência de sessão e operações no Firestore. |
| [`firestore.rules`](file:///home/maxwell/terminal/firestore.rules) | Regras de segurança RBAC para proteção das coleções do Cloud Firestore. |
| [`test.js`](file:///home/maxwell/terminal/test.js) | Suíte automatizada de testes (parser JSON da IA, moderação RBAC, segurança e integridade). |
| [`firebase.json`](file:///home/maxwell/terminal/firebase.json) | Configuração de cabeçalhos HTTP, cache e rotas do Firebase Hosting. |

---

## 🧪 Execução e Validação Local

Para executar e testar localmente:

```bash
# Iniciar servidor estático local
cd /home/maxwell/terminal
python3 -m http.server 8080
```

Acesse [http://localhost:8080](http://localhost:8080) no navegador.

Para executar a validação de sintaxe e suíte de testes:

```bash
# Validação estática e execução da suíte de testes
node --check firebase-config.js
node --check app.js
node test.js
git diff --check
```

---

## 🚀 Publicação e Deploy (Firebase)

O projeto está configurado para deploy contínuo no Firebase Hosting e Firestore:

```bash
cd /home/maxwell/terminal

# Deploy completo (Hosting e Regras do Firestore)
firebase deploy --project terminal-apoio

# Ou apenas Hosting
firebase deploy --only hosting --project terminal-apoio

# Ou apenas Regras do Firestore
firebase deploy --only firestore:rules --project terminal-apoio
```

---

## 📌 Versão

**3.3.0** — Implementação completa do sistema de controle de acesso baseado em funções (RBAC), moderação com múltiplos status (pendente, aprovado, rejeitado, bloqueado), trilha de auditoria com modal de detalhes, comandos administrativos expandidos na CLI, regras de segurança no Firestore e integração otimizada com o Google Gemini 3.6 Flash.

# 💊🩺 Terminal de Apoio ao Tratamento

**Projeto Pessoal e Independente · Desenvolvido por Maxwell**

Aplicação web estática com interface de terminal/CRT para auxiliar na redação de mensagens humanizadas de acompanhamento farmacêutico em português do Brasil. Gera textos para medicamentos e serviços, mantém histórico local, conta com fluxo de cadastro e moderação por Super Usuário e oferece integração opcional com o Google Gemini e Firebase Authentication.

- **Produção:** [terminal-apoio.web.app](https://terminal-apoio.web.app)
- **Projeto Firebase:** `terminal-apoio`
- **Modelo de IA:** Google **Gemini 3.6 Flash**

> [!IMPORTANT]
> **Aviso Legal / Isenção de Responsabilidade:**
> Esta é uma ferramenta **pessoal, independente e de estudo/apoio profissional**. **NÃO foi desenvolvida por, para ou a pedido da empresa RaiaDrogasil (Drogasil)**, não constituindo produto, canal ou sistema oficial da referida empresa. A revisão, validação técnica e orientação farmacêutica final permanecem sob exclusiva responsabilidade do profissional habilitado.

---

## Funcionalidades

### 👥 Cadastro de Farmacêuticos & Moderação por Super Usuário

- **Novo Cadastro Guiado**: Na tela de autenticação, o profissional pode alternar para a aba **"📝 Novo Farmacêutico (Cadastro)"** informando:
  - Nome completo do farmacêutico (ex: *Dra. Camila Santos*, *Dr. Maxwell*).
  - Drogaria onde trabalha / filial (ex: *Drogasil Mogilar*, *Drogasil Vila Oliveira*, *Raia Centro*).
  - E-mail de acesso e senha segura com confirmação.
- **Bloqueio Estrito de Acesso Não Aprovado**:
  - Toda nova conta é registrada no sistema com status inicial **`pendente`**.
  - O sistema **impede qualquer autenticação** de contas pendentes ou recusadas, desconectando imediatamente sessões não autorizadas e exibindo aviso orientativo.
- **Painel Administrativo do Super Usuário**:
  - Usuários raiz pré-definidos: `maxwellrodriguesferreira1@gmail.com` e usuário local `maxwell`.
  - Ao autenticar como Super Usuário, o botão **`👥 Farmacêuticos`** exibe um contador em tempo real de cadastros pendentes.
  - Painel com listagem completa, contadores estatísticos e ações com 1 clique: **`✅ Aprovar`**, **`❌ Recusar`**, **`✏️ Editar`** e **`🗑️ Remover`**.

### 🔄 Alteração e Sincronização Automática

Assim que um farmacêutico aprovado se conecta ao terminal, a aplicação adapta-se automaticamente:
- **Barra de status inferior**: exibe a drogaria (`🏬 Drogaria`) e o nome (`👨‍⚕️ Farmacêutico`) da sessão ativa.
- **Prompt da CLI e cabeçalho**: adota o formato dinâmico `<usuario>@<drogaria-slug>:$` e o título correspondente na janela.
- **Assistente de mensagens (`novo`)**: os campos de drogaria e farmacêutico já vêm pré-preenchidos automaticamente com a filial e o nome do profissional conectado.
- **Mensagens em lote WhatsApp e templates**: assinaturas e apresentações automáticas utilizam os dados do profissional logado.
- **Prompt do Google Gemini**: a IA é instruída dinamicamente com *"Você é o Farmacêutico ${farmaceutico} da filial ${drogaria}"*.

### Mensagens e Classificação Clínica

- Formulário guiado com quatro versões: **empática**, **atenciosa**, **descontraída** e **pós-tratamento**.
- Geração rápida pela CLI com nome, item, telefone, sintoma, tempo e dica de saúde.
- Classificação contextual entre medicamento e serviço farmacêutico.
- Reconhecimento de aplicação de injetáveis, Sensor Libre, pressão arterial, perfuração auricular, testes de influenza/COVID/painel respiratório, bioimpedância, glicemia, vacinas e curativos.
- Botões para copiar mensagens e abrir o WhatsApp quando houver telefone informado.

### Lote Anti-Spam, Histórico e Interface CRT

- Lotes a partir de linhas no formato `Nome | Item | Telefone | Sintoma`.
- Variações textuais, preenchimento invisível (`Zero-Width Space`) e assinatura `SIG_...` para diferenciar os textos e evitar bloqueios.
- Exportação de lotes em CSV e histórico salvo no navegador.
- Temas **Matrix**, **Amber**, **Cyberpunk** e **Dark**, além do efeito CRT de scanlines.

---

## Google Gemini 3.6 Flash

A integração é opcional. Sem chave, a aplicação usa o gerador local de templates. Com chave válida, o Gemini gera mensagens contextualizadas. Em caso de erro da API, a aplicação volta automaticamente ao gerador local.

Endpoint utilizado:

```text
https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent
```

### Configurar a chave

1. Na aplicação, clique em **⚙️ Configurações**.
2. Obtenha uma chave em [Google AI Studio](https://aistudio.google.com/apikey).
3. Cole-a em **Chave de API do Gemini**.
4. Clique em **💾 Salvar chave** e em **🧪 Testar conexão**.
5. Use **🗑️ Remover chave** para desativar a IA naquele navegador.

---

## Comandos da CLI

| Comando | Descrição | Exemplo |
| --- | --- | --- |
| `novo`, `guiado`, `criar`, `iniciar` | Abre o formulário guiado de criação individual. | `novo` |
| `gerar [nome] [item]` | Gera mensagens diretamente pelo terminal. | `gerar Maria Dipirona 1g` |
| `gerar --nome ... --medicamento ...` | Gera mensagens com parâmetros nomeados. | `gerar --nome Maria --medicamento "Dipirona 1g"` |
| `lote`, `batch`, `massa` | Abre o gerador de mensagens em lote (Anti-Spam). | `lote` |
| `usuarios`, `farmaceuticos`, `admin` | Abre o painel do Super Usuário para aprovação de cadastros. | `usuarios` |
| `aprovar [email]` | Aprova diretamente o cadastro de um farmacêutico pelo CLI. | `aprovar camila@drogasil.com.br` |
| `recusar [email]` | Recusa ou suspende o cadastro de um farmacêutico pelo CLI. | `recusar camila@drogasil.com.br` |
| `ia`, `gemini`, `apikey` | Abre o painel de configurações da chave Gemini. | `ia` |
| `ia status` / `ia remover` | Consulta ou remove a chave local do Gemini. | `ia status` |
| `apikey [chave]` | Salva a chave do Gemini pela CLI. | `apikey AIza...` |
| `historico` / `historico limpar` | Exibe ou apaga o histórico local de mensagens. | `historico` |
| `servicos` | Exibe os serviços farmacêuticos e testes reconhecidos. | `servicos` |
| `tema [matrix\|amber\|cyberpunk\|dark]` | Define ou alterna o tema visual da interface. | `tema amber` |
| `limpar`, `clear`, `cls` | Limpa a saída da tela do terminal. | `limpar` |
| `usuario`, `whoami` | Exibe o farmacêutico ativo e a drogaria da sessão. | `usuario` |
| `senha [nova_senha]` | Altera a senha de acesso local. | `senha 123456` |
| `sair`, `logout` | Encerra a sessão e bloqueia o terminal. | `sair` |
| `ajuda`, `help`, `?`, `menu` | Exibe a tabela de ajuda e comandos disponíveis. | `ajuda` |

---

## Tecnologias e Estrutura

- **HTML5**, **CSS3** e **JavaScript ES6+**, sem frameworks ou dependências externas pesadas.
- **Firebase Authentication** com persistência segura de sessão e controle de moderação.
- **Google Generative Language API** para geração inteligente com Gemini 3.6 Flash.
- **Firebase Hosting** para entrega estática global em HTTPS.
- **`localStorage`** para histórico, perfis moderados e chaves de IA.

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Terminal, formulário de cadastro, login, ações rápidas e modal do Super Usuário. |
| `style.css` | Temas visuais (Matrix/Amber/Cyber/Dark), scanlines CRT, abas e estilos do painel administrativo. |
| `app.js` | CLI, fluxo de aprovação de usuários, sincronização dinâmica, geração de mensagens e Gemini. |
| `firebase-config.js` | Configuração central, inicialização, autenticação e registro no Firebase Auth. |
| `test.js` | Suíte de testes automatizados cobrindo estrutura, IA, moderação e sincronização de perfis. |
| `firebase.json` | Configurações de cache e rotas do Firebase Hosting. |

---

## Executar e Validar Localmente

```bash
cd /home/maxwell/terminal
python3 -m http.server 8080
```

Abra [http://localhost:8080](http://localhost:8080). Para validar o código e a suíte de testes:

```bash
node --check firebase-config.js
node --check app.js
node test.js
git diff --check
```

---

## Deploy no Firebase Hosting

O projeto padrão configurado em `.firebaserc` é `terminal-apoio`:

```bash
cd /home/maxwell/terminal
firebase deploy --only hosting --project terminal-apoio
```

---

## Versão

**3.2.0** — Sistema de cadastro de farmacêuticos, controle de moderação e aprovação por Super Usuário, sincronização dinâmica automática de drogaria e farmacêutico e comandos administrativos na CLI.

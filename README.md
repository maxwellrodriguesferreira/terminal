# 💊🩺 Terminal de Apoio ao Tratamento

**Drogasil Mogilar · Farmacêutico responsável: Maxwell**

Aplicação web estática com interface de terminal/CRT para criar mensagens de acompanhamento farmacêutico em português do Brasil. Gera textos para medicamentos e serviços, mantém histórico local e oferece integração opcional com o Google Gemini.

- **Produção:** [terminal-apoio.web.app](https://terminal-apoio.web.app)
- **Projeto Firebase:** `terminal-apoio`
- **Modelo de IA:** Google **Gemini 3.6 Flash**

> A ferramenta auxilia a redação de mensagens. A revisão e a orientação farmacêutica final continuam sob responsabilidade do profissional habilitado.

---

## Funcionalidades

### Mensagens e classificação

- Formulário guiado com quatro versões: **empática**, **atenciosa**, **descontraída** e **pós-tratamento**.
- Geração rápida pela CLI com nome, item, telefone, sintoma, tempo e dica de saúde.
- Classificação contextual entre medicamento e serviço farmacêutico.
- Reconhecimento de aplicação de injetáveis, Sensor Libre, pressão arterial, perfuração auricular, testes de influenza/COVID/painel respiratório, bioimpedância, glicemia, vacinas e curativos.
- Botões para copiar mensagens e abrir o WhatsApp quando houver telefone informado.

### Lote, histórico e interface

- Lotes a partir de linhas no formato `Nome | Item | Telefone | Sintoma`.
- Variações textuais, preenchimento invisível (`Zero-Width Space`) e assinatura `SIG_...` para diferenciar os textos.
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

O painel permite mostrar/ocultar a chave e pode ser fechado pelo botão, com `Esc` ou clicando fora dele.

### Segurança e privacidade

A chave e o histórico ficam somente no `localStorage` do navegador:

- `apoio_gemini_api_key`
- `apoio_tratamento_history`

Esses dados **não são enviados ao Firebase**. Não compartilhe a API key em chats, commits, imagens ou arquivos. Como a aplicação não usa backend, a chave pode ser acessada por quem utiliza o mesmo perfil de navegador. Para uso multiusuário ou maior proteção, mova a chamada da IA para um backend autenticado.

---

## Comandos da CLI

| Comando | Descrição | Exemplo |
| --- | --- | --- |
| `novo`, `guiado`, `criar`, `iniciar` | Abre o formulário guiado. | `novo` |
| `gerar [nome] [item]` | Gera mensagens diretamente. | `gerar Maria Dipirona 1g` |
| `gerar --nome ... --medicamento ...` | Gera com campos nomeados. | `gerar --nome Maria --medicamento "Dipirona 1g"` |
| `lote`, `batch`, `massa` | Abre a geração em lote. | `lote` |
| `ia`, `gemini`, `apikey` | Abre o painel da chave Gemini. | `ia` |
| `ia status` / `ia remover` | Consulta ou remove a chave local. | `ia status` |
| `apikey [chave]` | Salva a chave pela CLI. Evite em computador compartilhado. | `apikey AIza...` |
| `historico` / `historico limpar` | Exibe ou apaga o histórico local. | `historico` |
| `servicos` | Exibe serviços reconhecidos. | `servicos` |
| `tema [matrix\|amber\|cyberpunk\|dark]` | Define ou alterna o tema. | `tema cyberpunk` |
| `limpar`, `clear`, `cls` | Limpa a saída do terminal. | `limpar` |
| `ajuda`, `help`, `?`, `menu` | Exibe a ajuda. | `ajuda` |

---

## Tecnologias e estrutura

- **HTML5**, **CSS3** e **JavaScript ES6+**, sem frameworks ou dependências de runtime.
- **Google Generative Language API** para o Gemini.
- **Firebase Hosting** para publicação HTTPS.
- **`localStorage`** para dados locais.

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Terminal, ações rápidas e painel Gemini. |
| `style.css` | Temas, layout CRT e modal de configurações. |
| `app.js` | CLI, geração local/IA, lote, histórico e Gemini. |
| `test.js` | Verificações estruturais do painel e modelo. |
| `firebase.json` | Hosting e cache de uma hora. |

---

## Executar e validar localmente

```bash
cd /home/maxwell/terminal
python3 -m http.server 8080
```

Abra [http://localhost:8080](http://localhost:8080). Para validar o código:

```bash
node --check app.js
node test.js
git diff --check
```

---

## Deploy no Firebase Hosting

O projeto padrão em `.firebaserc` é `terminal-apoio`.

```bash
cd /home/maxwell/terminal
firebase deploy --only hosting --project terminal-apoio
```

Se o navegador mantiver arquivos antigos em cache, use um parâmetro na URL, por exemplo:

```text
https://terminal-apoio.web.app/?v=gemini-3-6-flash
```

---

## Versão

**3.1.0** — painel de configuração de API, fallback local e integração com Gemini 3.6 Flash.

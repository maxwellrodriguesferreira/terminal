# 💊🩺 Terminal Apoio ao Tratamento & Serviços Farmacêuticos
### 📍 Drogasil Mogilar | Farmacêutico: Maxwell

Aplicação web estática em formato de **Terminal CLI/CRT Retro** desenvolvida para a **Drogasil Mogilar** (Mogi das Cruzes). A ferramenta automatiza e humaniza a geração de mensagens de acompanhamento pós-venda e pós-atendimento farmacêutico, integrando inteligência de classificação contextual de medicamentos e serviços, suporte a disparos via WhatsApp e proteção contra bloqueio por spam.

🌐 **Link de Produção (Firebase Hosting):** [https://terminal-apoio.web.app](https://terminal-apoio.web.app)

---

## ✨ Principais Funcionalidades

### 1. 🩺 Classificação Automática e Inteligente (`classifyItem`)
O motor da aplicação analisa o texto inserido e diferencia automaticamente se a entrada é um **Medicamento** (`💊`) ou um **Serviço Farmacêutico** (`🩺`), identificando sub-tipos específicos e ajustando o tom das perguntas de acompanhamento:

* 💉 **Aplicação de Injetáveis**: Pergunta sobre dor ou desconforto no local da aplicação.
* 📲 **Aplicação Sensor Libre**: Pergunta sobre a fixação do sensor no braço e o funcionamento das leituras de glicose no app/leitor.
* 🩺 **Aferição de Pressão Arterial**: Acompanha o bem-estar e o alívio de sintomas de mal-estar/tontura.
* 👂 **Perfuração do Lóbulo Auricular**: Pergunta sobre cicatrização, uso do antisséptico e ausência de inchaço.
* 🤧 **Teste de Influenza (Gripe)**: Acompanha a evolução da febre, coriza e indisposição.
* 🦠 **Teste de COVID-19**: Pergunta sobre o protocolo de isolamento, repouso e hidratação.
* 🫁 **Teste de Painel Respiratório**: Acompanha a melhora dos sintomas respiratórios e tosse.
* ⚖️ **Avaliação de Bioimpedância**: Acompanha o entendimento do relatório de composição corporal (massa magra/gordura) e metas de saúde.
* 🩸 **Glicemia Capilar, Vacinas e Curativos**: Acompanhamento dinâmico personalizado.

### 2. 🛡️ Geração em Lote com Proteção Anti-Spam (WhatsApp Safe)
Permite cadastrar múltiplos clientes de uma só vez (colando texto no formato `Nome | Item | Telefone | Sintoma`).
* 🧬 **Permutação Semântica (Text Spinning)**: Combina variações dinâmicas de saudações, introduções, abordagens e despedidas.
* 👁️🗨️ **Assinatura de Byte Invisível (`Zero-Width Space`)**: Aplica marcas d'água binárias invisíveis (`\u200B`) para garantir **100% de unicidade** de cada texto.
* 🔒 **Hash Signature (`SIG_...`)**: Bloqueia repetições de texto para evitar que os filtros automatizados da Meta/WhatsApp classifiquem o número como spam.
* 📥 **Exportação em CSV**: Permite baixar a lista de mensagens geradas em arquivo CSV para gestão ou planilhas.

### 3. 🎨 Interface Estilo Terminal CRT
* **4 Temas Visuais**: Matrix Green, Cyberpunk, Amber CRT e Dark Modern.
* **Efeito Tubo CRT**: Botão toggle para efeito vintage de scanlines.
* **Barra de Ações Rápidas**: Acesso direto com 1 clique a `Nova Mensagem`, `Lote Anti-Spam`, `Histórico` e `Limpar Terminal`.

---

## 🛠️ Tecnologias Utilizadas

* **HTML5 Semantic & CSS3**: Variáveis CSS, Flexbox/Grid, animações de varredura CRT.
* **JavaScript Puro (ES6+)**: Sem dependências externas de frameworks pesados.
* **LocalPersistence API**: Histórico salvo automaticamente no `localStorage` do navegador.
* **Firebase Hosting**: Hospedagem global de alta performance com certificado SSL (HTTPS) automático.

---

## 💻 Comandos da Linha de Comando (CLI)

Além dos botões visuais, o usuário pode interagir diretamente via terminal:

| Comando | Descrição | Exemplo de Uso |
| :--- | :--- | :--- |
| `novo` / `guiado` | Abre o formulário guiado interativo. | `novo` |
| `lote` / `batch` / `massa` | Abre o gerador em lote com proteção anti-spam. | `lote` |
| `gerar [nome] [item]` | Gera mensagem rápida pela linha de comando. | `gerar "Maria" "Dipirona 1g"` |
| `apikey [chave]` | Configura a chave da API do Google Gemini (IA). | `apikey AIzaSy...` |
| `ia` / `gemini` | Exibe o status da IA ou remove a chave (`ia remover`). | `ia status` |
| `historico` | Exibe o histórico de mensagens geradas no dia. | `historico` |
| `historico limpar` | Limpa o histórico salvo localmente. | `historico limpar` |
| `limpar` / `clear` | Limpa a tela do terminal CRT. | `limpar` |
| `tema [matrix\|amber...]` | Altera o tema visual da interface. | `tema cyberpunk` |

---

## 🚀 Como Executar Localmente

1. Clone ou navegue até o diretório do projeto:
   ```bash
   cd /home/maxwell/terminal
   ```

2. Inicie um servidor HTTP local simples (usando Python ou Node.js):
   ```bash
   python3 -m http.server 8080
   ```

3. Abra no navegador:
   ```text
   http://localhost:8080
   ```

---

## ☁️ Deploy no Firebase Hosting

O projeto já está vinculado ao projeto Firebase `terminal-apoio`.

Para publicar novas atualizações:
```bash
firebase deploy
```

URL de Produção:
👉 **[https://terminal-apoio.web.app](https://terminal-apoio.web.app)**

---

### 👨⚕️ Créditos
* **Farmácia**: Drogasil Mogilar
* **Farmacêutico Responsável**: Maxwell
* **Versão**: 3.1.0 (Gemini 3.6 Flash IA + Anti-Spam & Multi-Services Ready)

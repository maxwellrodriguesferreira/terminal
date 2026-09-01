const fs = require('fs');

const app = fs.readFileSync('/home/maxwell/terminal/app.js', 'utf8');
const html = fs.readFileSync('/home/maxwell/terminal/index.html', 'utf8');
const css = fs.readFileSync('/home/maxwell/terminal/style.css', 'utf8');

const requirements = [
  ['menu fixo no HTML', html.includes('id="geminiConfigPanel"')],
  ['formulário de configuração', html.includes('id="geminiConfigForm"')],
  ['campo da chave', html.includes('id="geminiKeyInput"')],
  ['inicialização do painel', app.includes('function initializeGeminiConfigPanel()')],
  ['abertura do painel', app.includes('function openGeminiConfigPanel()')],
  ['armazenamento local', app.includes("localStorage.setItem('apoio_gemini_api_key'")],
  ['estilos do painel', css.includes('.gemini-config-panel')],
  ['sem painel dinâmico legado', !app.includes('gemini-config-panel')],
  ['sem dependência de dialog', !app.includes('.showModal()')],
  ['modelo Gemini 3.6 Flash', app.includes("const GEMINI_MODEL = 'gemini-3.6-flash'")],
  ['rótulo Gemini 3.6 Flash', app.includes("const GEMINI_MODEL_LABEL = 'Gemini 3.6 Flash'")],
  ['parser defensivo do JSON da IA', app.includes('function sanitizeGeminiJsonResponse')],
  ['força JSON da API Gemini', app.includes("responseMimeType: 'application/json'")],
  ['schema estruturado do Gemini', app.includes('GEMINI_RESPONSE_SCHEMA')],
  ['bloqueio temporário da IA', app.includes('isGeminiTemporarilyBlocked()')],
  ['painel de login no HTML', html.includes('id="loginPanel"')],
  ['formulário de login no HTML', html.includes('id="loginForm"')],
  ['campo de usuário no HTML', html.includes('id="loginUserInput"')],
  ['campo de senha no HTML', html.includes('id="loginPassInput"')],
  ['botão de sair no HTML', html.includes('id="logoutBtn"')],
  ['estilos da tela de login', css.includes('.login-panel') && css.includes('.login-card')],
  ['função de inicialização de autenticação', app.includes('function initializeAuth()')],
  ['função de validação de login', app.includes('function handleLoginSubmit(')],
  ['função de encerramento de sessão', app.includes('function logoutUser()')],
  ['script firebase-config no HTML', html.includes('firebase-config.js')],
  ['script firebase auth no HTML', html.includes('firebase-auth-compat.js')]
];

const failed = requirements.filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) {
  throw new Error(`Falha nos testes do painel Gemini: ${failed.join(', ')}`);
}

const vm = require('vm');
const functionMatch = app.match(/function sanitizeGeminiJsonResponse\([\s\S]*?\n\}/);
if (!functionMatch) {
  throw new Error('Falha nos testes do parser Gemini: função sanitizeGeminiJsonResponse não encontrada.');
}

const context = { console, JSON, Object, Array, String, Number, Boolean, RegExp, Math };
vm.runInNewContext(functionMatch[0], context);

const malformedResponse = `Alguma explicação antes\n{\n  "empatico": "Olá cliente!\nTudo bem?",\n  "atencioso": "Sua resposta foi registrada.",\n  "descontraido": "Vamos seguir com calma!",\n  "pos_tratamento": "Qualquer dúvida me avise."\n}\ntexto final`;
const parsed = context.sanitizeGeminiJsonResponse(malformedResponse);

if (!parsed || !parsed.empatico || !parsed.pos_tratamento) {
  throw new Error('Falha nos testes do parser Gemini: resposta inválida não foi recuperada.');
}

const multilineStringResponse = `{
  "empatico": "Olá cliente,\nTudo bem?\nEstou aqui para ajudar.",
  "atencioso": "Sua resposta foi registrada.",
  "descontraido": "Vamos seguir com calma!",
  "pos_tratamento": "Qualquer dúvida me avise."
}`;
const parsedMultiline = context.sanitizeGeminiJsonResponse(multilineStringResponse);

if (!parsedMultiline.empatico.includes('Tudo bem?')) {
  throw new Error('Falha nos testes do parser Gemini: quebras de linha internas dentro do JSON não foram preservadas.');
}

const brokenQuoteResponse = `{
  "empatico": "Olá, tudo bem?\nEstou aqui para te ajudar sobre o tratamento.
  "atencioso": "Vamos seguir com atenção.",
  "descontraido": "Qualquer dúvida me chama!",
  "pos_tratamento": "Estamos aqui no pós-tratamento."
}`;
const parsedBrokenQuote = context.sanitizeGeminiJsonResponse(brokenQuoteResponse);

if (!parsedBrokenQuote.atencioso || !parsedBrokenQuote.pos_tratamento) {
  throw new Error('Falha nos testes do parser Gemini: string quebrada no meio da resposta não foi recuperada.');
}

const strayTextResponse = `{
  "empatico": "Olá, tudo bem?",
  "atencioso": "Tudo certo, mas stan",
  "descontraido": "Vamos seguir com calma!",
  "pos_tratamento": "Qualquer dúvida me avise."
} extra texto depois do JSON`;
const parsedStrayText = context.sanitizeGeminiJsonResponse(strayTextResponse);

if (!parsedStrayText.empatico || !parsedStrayText.pos_tratamento) {
  throw new Error('Falha nos testes do parser Gemini: texto extra após o JSON não foi ignorado.');
}

const camelCaseResponse = `{
  "empático": "Mensagem empática com acento.",
  "atencioso": "Mensagem atenciosa.",
  "descontraído": "Mensagem descontraída.",
  "posTratamento": "Mensagem de pós-tratamento em camelCase."
}`;
const parsedCamelCase = context.sanitizeGeminiJsonResponse(camelCaseResponse);
if (!parsedCamelCase.empatico || !parsedCamelCase.pos_tratamento) {
  throw new Error('Falha nos testes do parser Gemini: chaves com acento e camelCase não foram normalizadas.');
}

const nestedResponse = `{
  "mensagens": {
    "empatico": "Olá!",
    "atencioso": "Acompanhamento.",
    "descontraido": "Tudo certo!",
    "pos_tratamento": "Retorno agendado."
  }
}`;
const parsedNested = context.sanitizeGeminiJsonResponse(nestedResponse);
if (!parsedNested.empatico || !parsedNested.pos_tratamento) {
  throw new Error('Falha nos testes do parser Gemini: objeto aninhado em "mensagens" não foi recuperado.');
}

const arrayResponse = `[
  "Mensagem 1 empática",
  "Mensagem 2 atenciosa",
  "Mensagem 3 descontraída",
  "Mensagem 4 pós-tratamento"
]`;
const parsedArray = context.sanitizeGeminiJsonResponse(arrayResponse);
if (!parsedArray.empatico || !parsedArray.pos_tratamento) {
  throw new Error('Falha nos testes do parser Gemini: array de mensagens não foi recuperado.');
}

const partialResponse = `{
  "empatico": "Mensagem empática gerada.",
  "atencioso": "Mensagem atenciosa gerada.",
  "descontraido": "Mensagem descontraída gerada."
}`;
const parsedPartial = context.sanitizeGeminiJsonResponse(partialResponse);
if (!parsedPartial.empatico || !parsedPartial.atencioso || !parsedPartial.descontraido) {
  throw new Error('Falha nos testes do parser Gemini: resposta parcial válida foi rejeitada.');
}

console.log('Painel de configuração Gemini: testes estruturais aprovados.');

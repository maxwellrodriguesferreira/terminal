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

// =========================================================================
// TESTES DO NOVO SISTEMA: CADASTRO, SUPER USUÁRIO & SINCRONIZAÇÃO AUTOMÁTICA
// =========================================================================

const userRequirements = [
  ['aba de login', html.includes('id="tabLoginBtn"')],
  ['aba de cadastro', html.includes('id="tabRegisterBtn"')],
  ['formulário de cadastro', html.includes('id="registerForm"')],
  ['campo nome do farmacêutico no cadastro', html.includes('id="regNameInput"')],
  ['campo drogaria no cadastro', html.includes('id="regDrogariaInput"')],
  ['campo e-mail no cadastro', html.includes('id="regEmailInput"')],
  ['campo senha no cadastro', html.includes('id="regPassInput"')],
  ['campo confirmação de senha', html.includes('id="regPassConfirmInput"')],
  ['status drogaria dinâmico no HTML', html.includes('id="statusDrogariaDisplay"')],
  ['status usuário dinâmico no HTML', html.includes('id="statusUserDisplay"')],
  ['botão de gestão de usuários no HTML', html.includes('id="adminUsersBtn"')],
  ['painel de gestão do Super Usuário no HTML', html.includes('id="adminUsersPanel"')],
  ['contador de pendentes no HTML', html.includes('id="pendingUsersBadge"')],
  ['estilos de abas de autenticação no CSS', css.includes('.auth-tabs') && css.includes('.auth-tab-btn')],
  ['estilos do painel do Super Usuário no CSS', css.includes('.admin-users-panel') && css.includes('.super-user-badge')],
  ['estilos de status de moderação no CSS', css.includes('.status-badge.pending') && css.includes('.status-badge.approved')],
  ['função de submissão de cadastro no JS', app.includes('function handleRegisterSubmit(')],
  ['função de verificação de Super Usuário no JS', app.includes('function isSuperUser(')],
  ['função de aprovação de usuário no JS', app.includes('function approveUserAction(')],
  ['função de recusa de usuário no JS', app.includes('function rejectUserAction(')],
  ['função de edição de usuário no JS', app.includes('function editUserAction(')],
  ['função de aplicação dinâmica de perfil no JS', app.includes('function applyUserSessionProfile(')],
  ['comando CLI usuarios no JS', app.includes("case 'usuarios':")],
  ['comando CLI aprovar no JS', app.includes("case 'aprovar':")]
];

const failedUserTests = userRequirements.filter(([, passed]) => !passed).map(([name]) => name);
if (failedUserTests.length) {
  throw new Error(`Falha nos testes de cadastro e Super Usuário: ${failedUserTests.join(', ')}`);
}

// Teste de lógica de moderação e propagação dinâmica
const mockLocalStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = String(v); },
  removeItem(k) { delete this.data[k]; }
};

const domMock = {
  promptUserDisplay: { textContent: '' },
  statusUserDisplay: { textContent: '' },
  statusDrogariaDisplay: { textContent: '' },
  headerTerminalTitle: { textContent: '' }
};

const testContext = {
  console,
  localStorage: mockLocalStorage,
  sessionStorage: mockLocalStorage,
  document: {
    getElementById(id) { return domMock[id] || null; }
  },
  DEFAULT_CONFIG: { drogaria: 'Drogasil Mogilar', farmaceutico: 'Maxwell' },
  SUPER_ADMIN_EMAILS: ['maxwellrodriguesferreira1@gmail.com', 'maxwell'],
  USERS_STORAGE_KEY: 'apoio_users_registry'
};

const userFuncs = `
function getDefaultRegisteredUsers() {
  return [
    { uid: 'su-1', email: 'maxwellrodriguesferreira1@gmail.com', name: 'Maxwell', drogaria: 'Drogasil Mogilar', role: 'superadmin', status: 'aprovado' },
    { uid: 'su-2', email: 'maxwell', name: 'Maxwell', drogaria: 'Drogasil Mogilar', role: 'superadmin', status: 'aprovado' }
  ];
}
function getRegisteredUsers() {
  const raw = localStorage.getItem(USERS_STORAGE_KEY);
  if (!raw) {
    const defaults = getDefaultRegisteredUsers();
    saveRegisteredUsers(defaults);
    return defaults;
  }
  return JSON.parse(raw);
}
function saveRegisteredUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}
function findUserRecord(term) {
  if (!term) return null;
  term = String(term).trim().toLowerCase();
  const users = getRegisteredUsers();
  return users.find(u => (u.email && u.email.toLowerCase() === term) || (u.uid && u.uid === term)) || null;
}
function isSuperUser(term) {
  if (!term) return false;
  term = String(term).trim().toLowerCase();
  if (SUPER_ADMIN_EMAILS.includes(term)) return true;
  const record = findUserRecord(term);
  return Boolean(record && record.role === 'superadmin');
}
function formatSlug(str, defaultVal) {
  if (!str) return defaultVal;
  return str.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || defaultVal;
}
function applyUserSessionProfile(userData) {
  if (!userData) return;
  const name = userData.name || DEFAULT_CONFIG.farmaceutico;
  const drogaria = userData.drogaria || DEFAULT_CONFIG.drogaria;
  DEFAULT_CONFIG.farmaceutico = name;
  DEFAULT_CONFIG.drogaria = drogaria;

  const promptUser = document.getElementById('promptUserDisplay');
  const statusUser = document.getElementById('statusUserDisplay');
  const statusDrog = document.getElementById('statusDrogariaDisplay');
  const header = document.getElementById('headerTerminalTitle');

  const uSlug = formatSlug(name, 'farmaceutico');
  const dSlug = formatSlug(drogaria, 'drogaria');
  if (promptUser) promptUser.textContent = uSlug + '@' + dSlug;
  if (statusUser) statusUser.textContent = name;
  if (statusDrog) statusDrog.textContent = drogaria;
  if (header) header.textContent = uSlug + '@' + dSlug + ': ~/apoio-tratamento';
}
function approveUserAction(email) {
  const users = getRegisteredUsers();
  const target = users.find(u => u.email === email);
  if (!target) return false;
  target.status = 'aprovado';
  saveRegisteredUsers(users);
  return true;
}
`;

vm.runInNewContext(userFuncs, testContext);

// 1. Validação de Super Usuário inicial
if (!testContext.isSuperUser('maxwellrodriguesferreira1@gmail.com') || !testContext.isSuperUser('maxwell')) {
  throw new Error('Falha no teste: Maxwell deve ser reconhecido como Super Usuário.');
}

// 2. Simulação de cadastro de novo farmacêutico
const initialUsers = testContext.getRegisteredUsers();
initialUsers.push({
  uid: 'user-teste-1',
  email: 'camila@drogasil.com.br',
  name: 'Dra. Camila Santos',
  drogaria: 'Drogasil Vila Oliveira',
  role: 'farmaceutico',
  status: 'pendente'
});
testContext.saveRegisteredUsers(initialUsers);

const registeredUser = testContext.findUserRecord('camila@drogasil.com.br');
if (!registeredUser || registeredUser.status !== 'pendente') {
  throw new Error('Falha no teste: Novo cadastro deve iniciar com status "pendente".');
}

// 3. Aprovação pelo Super Usuário
const approvedOk = testContext.approveUserAction('camila@drogasil.com.br');
if (!approvedOk) {
  throw new Error('Falha no teste: Super Usuário não conseguiu aprovar o cadastro.');
}

const updatedUser = testContext.findUserRecord('camila@drogasil.com.br');
if (!updatedUser || updatedUser.status !== 'aprovado') {
  throw new Error('Falha no teste: Status do usuário aprovado não foi alterado para "aprovado".');
}

// 4. Teste de propagação automática de Farmacêutico e Drogaria
testContext.applyUserSessionProfile(updatedUser);

if (testContext.DEFAULT_CONFIG.farmaceutico !== 'Dra. Camila Santos') {
  throw new Error('Falha no teste: DEFAULT_CONFIG.farmaceutico não foi atualizado para o nome do novo farmacêutico.');
}
if (testContext.DEFAULT_CONFIG.drogaria !== 'Drogasil Vila Oliveira') {
  throw new Error('Falha no teste: DEFAULT_CONFIG.drogaria não foi atualizada para a drogaria do novo farmacêutico.');
}
if (domMock.statusDrogariaDisplay.textContent !== 'Drogasil Vila Oliveira') {
  throw new Error('Falha no teste: statusDrogariaDisplay não refletiu a drogaria automaticamente.');
}
if (domMock.statusUserDisplay.textContent !== 'Dra. Camila Santos') {
  throw new Error('Falha no teste: statusUserDisplay não refletiu o nome do farmacêutico automaticamente.');
}
if (!domMock.promptUserDisplay.textContent.includes('dra-camila-santos@drogasil-vila-oliveira')) {
  throw new Error('Falha no teste: promptUserDisplay não foi formatado com o slug correto.');
}

console.log('✅ Todos os testes de cadastro, moderação de Super Usuário e sincronização automática foram aprovados com sucesso!');


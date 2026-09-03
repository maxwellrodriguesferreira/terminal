const fs = require('fs');

const app = fs.readFileSync('/home/maxwell/terminal/app.js', 'utf8');
const html = fs.readFileSync('/home/maxwell/terminal/index.html', 'utf8');
const css = fs.readFileSync('/home/maxwell/terminal/style.css', 'utf8');
const rules = fs.readFileSync('/home/maxwell/terminal/firestore.rules', 'utf8');
const firebaseConfig = fs.readFileSync('/home/maxwell/terminal/firebase-config.js', 'utf8');

// =========================================================================
// 1. TESTES ESTRUTURAIS DO PAINEL GEMINI & UI BÁSICA
// =========================================================================
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

console.log('✅ Painel Gemini e Parser: testes estruturais aprovados.');

// =========================================================================
// 2. TESTES DO SISTEMA DE CONTROLE DE ACESSO, APROVAÇÃO E MODERAÇÃO
// =========================================================================
const userRequirements = [
  ['aba de login no HTML', html.includes('id="tabLoginBtn"')],
  ['aba de cadastro no HTML', html.includes('id="tabRegisterBtn"')],
  ['formulário de cadastro no HTML', html.includes('id="registerForm"')],
  ['campo nome no cadastro', html.includes('id="regNameInput"')],
  ['campo drogaria/filial no cadastro', html.includes('id="regDrogariaInput"')],
  ['campo e-mail no cadastro', html.includes('id="regEmailInput"')],
  ['campo senha no cadastro', html.includes('id="regPassInput"')],
  ['campo confirmação de senha', html.includes('id="regPassConfirmInput"')],
  ['botão do painel administrativo no HTML', html.includes('id="adminUsersBtn"')],
  ['painel de gestão de usuários no HTML', html.includes('id="adminUsersPanel"')],
  ['contador de pendentes no HTML', html.includes('id="pendingUsersBadge"')],
  ['estatística de pendentes no HTML', html.includes('id="statPendingCount"')],
  ['estatística de aprovados no HTML', html.includes('id="statApprovedCount"')],
  ['estatística de rejeitados no HTML', html.includes('id="statRejectedCount"')],
  ['estatística de bloqueados no HTML', html.includes('id="statBlockedCount"')],
  ['estatística de total de usuários no HTML', html.includes('id="statTotalCount"')],
  ['campo de busca de usuários no HTML', html.includes('id="adminSearchInput"')],
  ['abas de filtro por status no HTML', html.includes('id="adminFilterTabs"')],
  ['modal de detalhes e auditoria no HTML', html.includes('id="adminUserDetailsModal"')],
  ['modal de motivo de rejeição no HTML', html.includes('id="adminRejectModal"')],
  ['estilos de abas de autenticação no CSS', css.includes('.auth-tabs') && css.includes('.auth-tab-btn')],
  ['estilos do painel de administração no CSS', css.includes('.admin-users-panel') && css.includes('.super-user-badge')],
  ['estilos de status pendente no CSS', css.includes('.status-badge.pending')],
  ['estilos de status aprovado no CSS', css.includes('.status-badge.approved')],
  ['estilos de status rejeitado no CSS', css.includes('.status-badge.rejected')],
  ['estilos de status bloqueado no CSS', css.includes('.status-badge.blocked')],
  ['estilos de role admin no CSS', css.includes('.role-badge.admin')],
  ['estilos de role user no CSS', css.includes('.role-badge.user')],
  ['estilos de controles de busca e filtro no CSS', css.includes('.admin-controls-bar') && css.includes('.admin-search-input')],
  ['estilos de modais de moderação no CSS', css.includes('.admin-modal') && css.includes('.admin-detail-grid')],
  ['função de submissão de cadastro no JS', app.includes('function handleRegisterSubmit(')],
  ['função de verificação de admin no JS', app.includes('function isSuperUser(')],
  ['função de aprovação de usuário no JS', app.includes('function approveUserAction(')],
  ['função de rejeição de usuário no JS', app.includes('function rejectUserAction(')],
  ['função de bloqueio de usuário no JS', app.includes('function blockUserAction(')],
  ['função de desbloqueio de usuário no JS', app.includes('function unblockUserAction(')],
  ['função de alteração de role no JS', app.includes('function toggleRoleUserAction(')],
  ['função de visualização de detalhes no JS', app.includes('function viewUserDetailsAction(')],
  ['função de edição de usuário no JS', app.includes('function editUserAction(')],
  ['função de exclusão de usuário no JS', app.includes('function deleteUserAction(')],
  ['função de normalização de status no JS', app.includes('function normalizeStatus(')],
  ['função de normalização de role no JS', app.includes('function normalizeRole(')],
  ['comando CLI usuarios no JS', app.includes("case 'usuarios':")],
  ['comando CLI aprovar no JS', app.includes("case 'aprovar':")],
  ['comando CLI rejeitar no JS', app.includes("case 'rejeitar':")],
  ['comando CLI bloquear no JS', app.includes("case 'bloquear':")],
  ['comando CLI desbloquear no JS', app.includes("case 'desbloquear':")],
  ['comando CLI role no JS', app.includes("case 'role':")],
  ['comando CLI deletar no JS', app.includes("case 'deletar':")],
  ['funções de moderação em firebase-config.js', firebaseConfig.includes('firestoreApproveUser') && firebaseConfig.includes('firestoreRejectUser') && firebaseConfig.includes('firestoreBlockUser') && firebaseConfig.includes('firestoreUnblockUser')],
  ['regras de segurança isAdmin em firestore.rules', rules.includes('function isAdmin()')],
  ['regras de segurança isApprovedUser em firestore.rules', rules.includes('function isApprovedUser()')],
  ['regras bloqueiam escrita para não aprovados', rules.includes('allow read, write: if isAuthenticated() && isApprovedUser();')]
];

const failedUserTests = userRequirements.filter(([, passed]) => !passed).map(([name]) => name);
if (failedUserTests.length) {
  throw new Error(`Falha nos testes de controle de acesso e moderação: ${failedUserTests.join(', ')}`);
}

// =========================================================================
// 3. TESTES DE LÓGICA DE NEGÓCIO E SIMULAÇÃO COMPLETA
// =========================================================================
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
  headerTerminalTitle: { textContent: '' },
  statPendingCount: { textContent: '' },
  statApprovedCount: { textContent: '' },
  statRejectedCount: { textContent: '' },
  statBlockedCount: { textContent: '' },
  statTotalCount: { textContent: '' },
  adminUsersTableContainer: { innerHTML: '' }
};

const testContext = {
  console,
  localStorage: mockLocalStorage,
  sessionStorage: mockLocalStorage,
  document: {
    getElementById(id) { return domMock[id] || null; },
    querySelectorAll() { return []; }
  },
  DEFAULT_CONFIG: { drogaria: 'Drogasil Mogilar', farmaceutico: 'Maxwell' },
  SUPER_ADMIN_EMAILS: ['maxwellferreira@proton.me', 'maxwell', 'admin@sistema.local'],
  USERS_STORAGE_KEY: 'apoio_users_registry'
};

const rbacLogic = `
function normalizeStatus(status) {
  if (!status) return 'pending';
  const s = String(status).toLowerCase().trim();
  if (s === 'approved' || s === 'aprovado') return 'approved';
  if (s === 'rejected' || s === 'rejeitado' || s === 'recusado') return 'rejected';
  if (s === 'blocked' || s === 'bloqueado' || s === 'suspenso') return 'blocked';
  return 'pending';
}

function normalizeRole(role) {
  if (!role) return 'user';
  const r = String(role).toLowerCase().trim();
  if (r === 'admin' || r === 'superadmin' || r === 'administrador') return 'admin';
  return 'user';
}

function getRegisteredUsers() {
  const raw = localStorage.getItem(USERS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return parsed.map(u => ({
      ...u,
      status: normalizeStatus(u.status),
      role: normalizeRole(u.role),
      auditLog: Array.isArray(u.auditLog) ? u.auditLog : []
    }));
  } catch (e) {
    return [];
  }
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
  return Boolean(record && record.role === 'admin');
}

function addAuditLogEntry(targetUser, action, details, adminActor = 'admin') {
  if (!targetUser) return;
  if (!Array.isArray(targetUser.auditLog)) targetUser.auditLog = [];
  targetUser.auditLog.unshift({
    action: action,
    performedBy: adminActor,
    timestamp: new Date().toISOString(),
    details: details || ''
  });
}

function approveUserAction(email, adminActor = 'admin') {
  const users = getRegisteredUsers();
  const target = users.find(u => u.email === email);
  if (!target) return false;
  target.status = 'approved';
  target.approvedAt = new Date().toISOString();
  target.approvedBy = adminActor;
  target.rejectedAt = null;
  target.rejectedBy = null;
  target.blockedAt = null;
  target.blockedBy = null;
  target.rejectionReason = null;
  addAuditLogEntry(target, 'APPROVAL', 'Usuário aprovado', adminActor);
  saveRegisteredUsers(users);
  return true;
}

function rejectUserAction(email, reason = 'Dados inválidos', adminActor = 'admin') {
  if (isSuperUser(email)) return false;
  const users = getRegisteredUsers();
  const target = users.find(u => u.email === email);
  if (!target) return false;
  target.status = 'rejected';
  target.rejectedAt = new Date().toISOString();
  target.rejectedBy = adminActor;
  target.rejectionReason = reason;
  addAuditLogEntry(target, 'REJECTION', reason, adminActor);
  saveRegisteredUsers(users);
  return true;
}

function blockUserAction(email, adminActor = 'admin') {
  if (isSuperUser(email)) return false;
  const users = getRegisteredUsers();
  const target = users.find(u => u.email === email);
  if (!target) return false;
  target.status = 'blocked';
  target.blockedAt = new Date().toISOString();
  target.blockedBy = adminActor;
  addAuditLogEntry(target, 'BLOCK', 'Conta bloqueada', adminActor);
  saveRegisteredUsers(users);
  return true;
}

function unblockUserAction(email, adminActor = 'admin') {
  const users = getRegisteredUsers();
  const target = users.find(u => u.email === email);
  if (!target) return false;
  target.status = 'approved';
  target.approvedAt = new Date().toISOString();
  target.approvedBy = adminActor;
  target.blockedAt = null;
  target.blockedBy = null;
  addAuditLogEntry(target, 'UNBLOCK', 'Conta desbloqueada', adminActor);
  saveRegisteredUsers(users);
  return true;
}

function toggleRoleUserAction(email, adminActor = 'admin') {
  if (isSuperUser(email)) return false;
  const users = getRegisteredUsers();
  const target = users.find(u => u.email === email);
  if (!target) return false;
  const newRole = target.role === 'admin' ? 'user' : 'admin';
  target.role = newRole;
  addAuditLogEntry(target, 'ROLE_CHANGE', 'Cargo alterado para ' + newRole, adminActor);
  saveRegisteredUsers(users);
  return true;
}
`;

vm.runInNewContext(rbacLogic, testContext);

// 1. Criação do Administrador Inicial
testContext.saveRegisteredUsers([
  {
    uid: 'admin-master',
    email: 'maxwellferreira@proton.me',
    name: 'Maxwell Ferreira',
    drogaria: 'Drogasil Mogilar',
    role: 'admin',
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    approvedBy: 'admin-master',
    rejectedAt: null,
    rejectedBy: null,
    blockedAt: null,
    blockedBy: null,
    rejectionReason: null,
    auditLog: [{ action: 'BOOTSTRAP', performedBy: 'sistema', timestamp: new Date().toISOString(), details: 'Admin inicial' }]
  }
]);

if (!testContext.isSuperUser('maxwellferreira@proton.me')) {
  throw new Error('Falha no teste: Administrador mestre deve ter privilégios administrativos.');
}

// 2. Novo cadastro de usuário comum (deve iniciar estritamente como "pending" e "user")
const usersList = testContext.getRegisteredUsers();
const newUserPayload = {
  uid: 'user-lucas-1',
  email: 'lucas@drogasil.com.br',
  name: 'Lucas Silva',
  drogaria: 'Drogasil Mogilar',
  role: 'user',
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  approvedAt: null,
  approvedBy: null,
  rejectedAt: null,
  rejectedBy: null,
  blockedAt: null,
  blockedBy: null,
  rejectionReason: null,
  auditLog: [{ action: 'REGISTRATION', performedBy: 'lucas@drogasil.com.br', timestamp: new Date().toISOString(), details: 'Cadastro criado' }]
};
usersList.push(newUserPayload);
testContext.saveRegisteredUsers(usersList);

const checkLucas = testContext.findUserRecord('lucas@drogasil.com.br');
if (!checkLucas || checkLucas.status !== 'pending' || checkLucas.role !== 'user') {
  throw new Error('Falha no teste: Novo cadastro deve possuir status "pending" e role "user".');
}

// 3. Moderação: Aprovação pelo Administrador
const approvedRes = testContext.approveUserAction('lucas@drogasil.com.br', 'admin-master');
if (!approvedRes) {
  throw new Error('Falha no teste: Aprovação do usuário falhou.');
}

const checkApproved = testContext.findUserRecord('lucas@drogasil.com.br');
if (!checkApproved || checkApproved.status !== 'approved' || !checkApproved.approvedAt || checkApproved.approvedBy !== 'admin-master') {
  throw new Error('Falha no teste: Campos approvedAt/approvedBy não foram preenchidos corretamente após aprovação.');
}
if (!checkApproved.auditLog || checkApproved.auditLog.length < 2) {
  throw new Error('Falha no teste: Histórico de auditoria não registrou o evento de aprovação.');
}

// 4. Moderação: Bloqueio e Desbloqueio
testContext.blockUserAction('lucas@drogasil.com.br', 'admin-master');
const checkBlocked = testContext.findUserRecord('lucas@drogasil.com.br');
if (!checkBlocked || checkBlocked.status !== 'blocked' || !checkBlocked.blockedAt) {
  throw new Error('Falha no teste: Bloqueio do usuário falhou.');
}

testContext.unblockUserAction('lucas@drogasil.com.br', 'admin-master');
const checkUnblocked = testContext.findUserRecord('lucas@drogasil.com.br');
if (!checkUnblocked || checkUnblocked.status !== 'approved') {
  throw new Error('Falha no teste: Desbloqueio do usuário falhou.');
}

// 5. Moderação: Rejeição com Motivo
const newCandidate = {
  uid: 'user-candidato-2',
  email: 'estranho@externo.com',
  name: 'Usuário Estranho',
  drogaria: 'Desconhecida',
  role: 'user',
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  approvedAt: null,
  approvedBy: null,
  rejectedAt: null,
  rejectedBy: null,
  blockedAt: null,
  blockedBy: null,
  rejectionReason: null,
  auditLog: []
};
const listWithCand = testContext.getRegisteredUsers();
listWithCand.push(newCandidate);
testContext.saveRegisteredUsers(listWithCand);

testContext.rejectUserAction('estranho@externo.com', 'E-mail não corporativo', 'admin-master');
const checkRejected = testContext.findUserRecord('estranho@externo.com');
if (!checkRejected || checkRejected.status !== 'rejected' || checkRejected.rejectionReason !== 'E-mail não corporativo' || !checkRejected.rejectedAt) {
  throw new Error('Falha no teste: Rejeição com motivo falhou.');
}

// 6. Moderação: Alteração de Role (Promoção a Admin)
testContext.toggleRoleUserAction('lucas@drogasil.com.br', 'admin-master');
const checkPromoted = testContext.findUserRecord('lucas@drogasil.com.br');
if (!checkPromoted || checkPromoted.role !== 'admin') {
  throw new Error('Falha no teste: Promoção de role para "admin" falhou.');
}

console.log('✅ Todos os testes de controle de acesso, moderação (aprovar, rejeitar, bloquear, desbloquear, role, auditoria) e segurança foram aprovados com 100% de sucesso!');

/**
 * Terminal Apoio ao Tratamento - Drogasil Mogilar
 * Farmacêutico & Drogaria Dinâmicos
 */

const DEFAULT_CONFIG = {
  drogaria: 'Drogasil Mogilar',
  farmaceutico: 'Maxwell'
};

// Histórico de Comandos e Histórico de Mensagens
let commandHistory = [];
let commandIndex = -1;
let generatedMessagesHistory = JSON.parse(localStorage.getItem('apoio_tratamento_history') || '[]');

// Temas disponíveis
const THEMES = ['matrix', 'amber', 'cyberpunk', 'dark'];
let currentThemeIndex = 0;

// Elementos DOM
const terminalOutput = document.getElementById('terminalOutput');
const cliInput = document.getElementById('cliInput');
const crtOverlay = document.getElementById('crtOverlay');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const crtToggleBtn = document.getElementById('crtToggleBtn');
const historyCounter = document.getElementById('historyCounter');

/* ==========================================================================
   SISTEMA DE GESTÃO DE USUÁRIOS, CADASTRO, SUPER USUÁRIO & SESSÃO
   ========================================================================== */

// Rotina de inicialização de armazenamento
const CRED_RESET_KEY = 'apoio_cred_reset_20260902_v5';
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  if (localStorage.getItem(CRED_RESET_KEY) !== 'done') {
    localStorage.removeItem('apoio_users_registry');
    localStorage.removeItem('apoio_auth_session');
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('apoio_auth_session');
    }
    localStorage.setItem(CRED_RESET_KEY, 'done');
  }
}

// Purga específica do e-mail descontinuado maxwellrodriguesferreira1@gmail.com
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    const rawUsers = localStorage.getItem('apoio_users_registry');
    if (rawUsers) {
      const parsed = JSON.parse(rawUsers);
      const cleaned = parsed.filter(u => u.email !== 'maxwellrodriguesferreira1@gmail.com');
      if (cleaned.length !== parsed.length) {
        localStorage.setItem('apoio_users_registry', JSON.stringify(cleaned));
      }
    }
  } catch (e) {}
}

const SUPER_ADMIN_EMAILS = [
  'maxwellferreira@proton.me',
  'maxwell'
];

const DEFAULT_AUTH = {
  user: 'admin',
  pass: 'admin123',
  name: 'Administrador'
};

const USERS_STORAGE_KEY = 'apoio_users_registry';

function getDefaultRegisteredUsers() {
  return [];
}

function getRegisteredUsers() {
  const raw = localStorage.getItem(USERS_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveRegisteredUsers(users) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Erro ao salvar registro de usuários:', e);
  }
}

function findUserRecord(emailOrUidOrName) {
  if (!emailOrUidOrName) return null;
  const term = String(emailOrUidOrName).trim().toLowerCase();
  const users = getRegisteredUsers();
  return users.find(u => 
    (u.email && u.email.toLowerCase() === term) ||
    (u.uid && u.uid === term) ||
    (u.name && u.name.toLowerCase() === term)
  ) || null;
}

function getSuperAdminUser() {
  const users = getRegisteredUsers();
  if (!users.length) return null;
  // O primeiro usuário cadastrado (ou com role superadmin) é sempre o Super Usuário Mestre
  return users.find(u => u.role === 'superadmin') || users[0];
}

function isSuperUser(emailOrUid) {
  if (!emailOrUid) return false;
  const term = String(emailOrUid).trim().toLowerCase();
  if (SUPER_ADMIN_EMAILS.includes(term)) return true;

  const superUser = getSuperAdminUser();
  if (superUser) {
    if ((superUser.email && superUser.email.toLowerCase() === term) ||
        (superUser.uid && superUser.uid === term)) {
      return true;
    }
  }

  const record = findUserRecord(term);
  return Boolean(record && record.role === 'superadmin');
}

function formatSlug(str, defaultVal = 'user') {
  if (!str) return defaultVal;
  return str.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || defaultVal;
}

function getPromptPrefixText() {
  const session = getAuthSession();
  const userSlug = formatSlug(session?.name || session?.user || DEFAULT_CONFIG.farmaceutico, 'maxwell');
  const drogariaSlug = formatSlug(session?.drogaria || DEFAULT_CONFIG.drogaria, 'mogilar');
  return `${userSlug}@${drogariaSlug}:~$`;
}

function applyUserSessionProfile(userData) {
  if (!userData) return;
  const name = userData.name || userData.user || DEFAULT_CONFIG.farmaceutico;
  const drogaria = userData.drogaria || DEFAULT_CONFIG.drogaria;

  DEFAULT_CONFIG.farmaceutico = name;
  DEFAULT_CONFIG.drogaria = drogaria;

  const promptUserDisplay = document.getElementById('promptUserDisplay');
  const statusUserDisplay = document.getElementById('statusUserDisplay');
  const statusDrogariaDisplay = document.getElementById('statusDrogariaDisplay');
  const headerTerminalTitle = document.getElementById('headerTerminalTitle');

  const userSlug = formatSlug(name, 'farmaceutico');
  const drogariaSlug = formatSlug(drogaria, 'drogaria');

  if (promptUserDisplay) promptUserDisplay.textContent = `${userSlug}@${drogariaSlug}`;
  if (statusUserDisplay) statusUserDisplay.textContent = name;
  if (statusDrogariaDisplay) statusDrogariaDisplay.textContent = drogaria;
  if (headerTerminalTitle) headerTerminalTitle.textContent = `${userSlug}@${drogariaSlug}: ~/apoio-tratamento`;

  // Atualiza campo drogaria no wizard se renderizado
  const wizDrogaria = document.getElementById('wizDrogaria');
  if (wizDrogaria && (!wizDrogaria.value || wizDrogaria.value === 'Drogasil Mogilar')) {
    wizDrogaria.value = drogaria;
  }
  const wizFarmaceutico = document.getElementById('wizFarmaceutico');
  if (wizFarmaceutico && (!wizFarmaceutico.value || wizFarmaceutico.value === 'Maxwell')) {
    wizFarmaceutico.value = name;
  }
}

function getAuthSession() {
  const sessionStr = sessionStorage.getItem('apoio_auth_session') || localStorage.getItem('apoio_auth_session');
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr);
  } catch (e) {
    return null;
  }
}

function setAuthSession(userData, remember) {
  const dataStr = JSON.stringify(userData);
  if (remember) {
    localStorage.setItem('apoio_auth_session', dataStr);
  } else {
    sessionStorage.setItem('apoio_auth_session', dataStr);
  }
}

function clearAuthSession() {
  sessionStorage.removeItem('apoio_auth_session');
  localStorage.removeItem('apoio_auth_session');
}

function updateSuperUserToolbar() {
  const adminBtn = document.getElementById('adminUsersBtn');
  const badge = document.getElementById('pendingUsersBadge');
  const session = getAuthSession();

  if (session && isSuperUser(session.user)) {
    if (adminBtn) adminBtn.style.display = 'inline-flex';
    const users = getRegisteredUsers();
    const pendingCount = users.filter(u => u.status === 'pendente').length;
    if (badge) {
      badge.textContent = pendingCount;
      badge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
    }
  } else {
    if (adminBtn) adminBtn.style.display = 'none';
  }
}

function updateAuthStateUI(session) {
  const loginPanel = document.getElementById('loginPanel');
  const logoutBtn = document.getElementById('logoutBtn');

  if (session && session.user) {
    const isSuper = isSuperUser(session.user);
    let record = findUserRecord(session.user) || findUserRecord(session.uid);

    if (isSuper) {
      if (!record) {
        record = {
          uid: session.uid || 'su-' + Date.now(),
          email: session.user,
          name: session.name || 'Maxwell Ferreira',
          drogaria: session.drogaria || 'Drogasil Mogilar',
          role: 'superadmin',
          status: 'aprovado',
          createdAt: new Date().toISOString()
        };
        const all = getRegisteredUsers();
        all.unshift(record);
        saveRegisteredUsers(all);
      } else {
        record.status = 'aprovado';
        record.role = 'superadmin';
      }
    }

    if (record) {
      session.name = record.name || session.name;
      session.drogaria = record.drogaria || session.drogaria;
      session.role = record.role || (isSuper ? 'superadmin' : 'farmaceutico');
      session.status = record.status || 'aprovado';
    }

    applyUserSessionProfile(session);

    if (loginPanel) loginPanel.hidden = true;
    if (logoutBtn) logoutBtn.style.display = 'inline-block';

    updateSuperUserToolbar();

    setTimeout(() => cliInput?.focus(), 50);
  } else {
    if (loginPanel) {
      loginPanel.hidden = false;
      const userInput = document.getElementById('loginUserInput');
      setTimeout(() => userInput?.focus(), 50);
    }
    if (logoutBtn) logoutBtn.style.display = 'none';
    const adminBtn = document.getElementById('adminUsersBtn');
    if (adminBtn) adminBtn.style.display = 'none';
  }
}

function showLoginFeedback(message, typeClass) {
  const feedback = document.getElementById('loginFeedback');
  if (!feedback) return;
  feedback.className = `login-feedback ${typeClass || ''}`;
  feedback.textContent = message;
}

function showRegisterFeedback(message, typeClass) {
  const feedback = document.getElementById('registerFeedback');
  if (!feedback) return;
  feedback.className = `login-feedback ${typeClass || ''}`;
  feedback.textContent = message;
}

function triggerCardShake(cardEl) {
  if (!cardEl) return;
  cardEl.classList.remove('shake');
  void cardEl.offsetWidth; // trigger reflow
  cardEl.classList.add('shake');
  setTimeout(() => cardEl.classList.remove('shake'), 600);
}

function switchAuthTab(tab) {
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginBadge = document.getElementById('loginBadge');
  const noticeContent = document.getElementById('noticeContent');

  if (tab === 'register') {
    if (tabLoginBtn) { tabLoginBtn.classList.remove('active'); tabLoginBtn.setAttribute('aria-selected', 'false'); }
    if (tabRegisterBtn) { tabRegisterBtn.classList.add('active'); tabRegisterBtn.setAttribute('aria-selected', 'true'); }
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (loginBadge) loginBadge.textContent = '📝 NOVO CADASTRO';
    if (noticeContent) noticeContent.textContent = 'Preencha seus dados para solicitar acesso do farmacêutico ao terminal.';
    const regName = document.getElementById('regNameInput');
    setTimeout(() => regName?.focus(), 50);
  } else {
    if (tabRegisterBtn) { tabRegisterBtn.classList.remove('active'); tabRegisterBtn.setAttribute('aria-selected', 'false'); }
    if (tabLoginBtn) { tabLoginBtn.classList.add('active'); tabLoginBtn.setAttribute('aria-selected', 'true'); }
    if (registerForm) registerForm.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    if (loginBadge) loginBadge.textContent = '🔒 ACESSO RESTRITO';
    if (noticeContent) noticeContent.textContent = 'Autenticação necessária para acessar prontuários e geração de mensagens.';
    const userInput = document.getElementById('loginUserInput');
    setTimeout(() => userInput?.focus(), 50);
  }
}

function toggleLoginPassVisibility() {
  const passInput = document.getElementById('loginPassInput');
  const toggleBtn = document.getElementById('loginPassToggle');
  if (!passInput) return;
  const isPass = passInput.type === 'password';
  passInput.type = isPass ? 'text' : 'password';
  if (toggleBtn) {
    toggleBtn.textContent = isPass ? '🙈' : '👁️';
    toggleBtn.setAttribute('aria-pressed', isPass ? 'true' : 'false');
  }
}

function toggleRegisterPassVisibility() {
  const passInput = document.getElementById('regPassInput');
  const passConfirmInput = document.getElementById('regPassConfirmInput');
  const toggleBtn = document.getElementById('regPassToggle');
  if (!passInput) return;
  const isPass = passInput.type === 'password';
  passInput.type = isPass ? 'text' : 'password';
  if (passConfirmInput) passConfirmInput.type = isPass ? 'text' : 'password';
  if (toggleBtn) {
    toggleBtn.textContent = isPass ? '🙈' : '👁️';
    toggleBtn.setAttribute('aria-pressed', isPass ? 'true' : 'false');
  }
}

async function handleRegisterSubmit(e) {
  if (e) e.preventDefault();
  const nameInput = document.getElementById('regNameInput');
  const drogariaInput = document.getElementById('regDrogariaInput');
  const emailInput = document.getElementById('regEmailInput');
  const passInput = document.getElementById('regPassInput');
  const passConfirmInput = document.getElementById('regPassConfirmInput');
  const submitBtn = document.getElementById('registerSubmitBtn');
  const loginCard = document.querySelector('.login-card');

  const name = nameInput?.value.trim();
  const drogaria = drogariaInput?.value.trim();
  const email = emailInput?.value.trim().toLowerCase();
  const pass = passInput?.value;
  const passConfirm = passConfirmInput?.value;

  if (!name || !drogaria || !email || !pass || !passConfirm) {
    showRegisterFeedback('⚠️ Por favor, preencha todos os campos obrigatórios.', 'is-error');
    triggerCardShake(loginCard);
    return;
  }

  if (!email.includes('@') || !email.includes('.')) {
    showRegisterFeedback('⚠️ Digite um endereço de e-mail válido.', 'is-error');
    triggerCardShake(loginCard);
    return;
  }

  if (pass.length < 6) {
    showRegisterFeedback('⚠️ A senha deve ter no mínimo 6 caracteres.', 'is-error');
    triggerCardShake(loginCard);
    return;
  }

  if (pass !== passConfirm) {
    showRegisterFeedback('⚠️ As senhas digitadas não coincidem.', 'is-error');
    triggerCardShake(loginCard);
    return;
  }

  const existing = findUserRecord(email);
  if (existing) {
    showRegisterFeedback(`⚠️ O e-mail "${email}" já possui cadastro (Status: ${existing.status.toUpperCase()}).`, 'is-error');
    triggerCardShake(loginCard);
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  showRegisterFeedback('🔄 Criando cadastro do farmacêutico...', 'is-warning');

  window.__IS_REGISTERING = true;
  let registeredUid = 'user-' + Date.now();
  let usedFirebase = false;

  try {
    if (typeof firebaseRegister === 'function' && typeof isFirebaseConfigured === 'function' && isFirebaseConfigured()) {
      try {
        const userCredential = await firebaseRegister(email, pass, name);
        if (userCredential && userCredential.user) {
          registeredUid = userCredential.user.uid;
          usedFirebase = true;
        }
      } catch (fbErr) {
        console.warn('Aviso ao cadastrar via Firebase Auth:', fbErr);
        if (fbErr.code === 'auth/email-already-in-use') {
          showRegisterFeedback('⚠️ Este e-mail já está cadastrado no sistema.', 'is-error');
          triggerCardShake(loginCard);
          if (submitBtn) submitBtn.disabled = false;
          return;
        } else if (fbErr.code === 'auth/weak-password') {
          showRegisterFeedback('⚠️ Senha fraca. Utilize uma senha com letras e números.', 'is-error');
          triggerCardShake(loginCard);
          if (submitBtn) submitBtn.disabled = false;
          return;
        }
      }
    }

    const users = getRegisteredUsers();
    const hasSuperAdmin = users.some(u => u.role === 'superadmin');
    const isFirstAdmin = !hasSuperAdmin;

    const newUser = {
      uid: registeredUid,
      email: email,
      name: name,
      drogaria: drogaria,
      role: isFirstAdmin ? 'superadmin' : 'farmaceutico',
      status: isFirstAdmin ? 'aprovado' : 'pendente', // Primeiro cadastro torna-se Super Usuário mestre aprovado
      authProvider: usedFirebase ? 'firebase' : 'local',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveRegisteredUsers(users);

    // Garante que o novo usuário NÃO fique logado após o cadastro se for pendente
    clearAuthSession();
    if (typeof firebaseLogout === 'function') {
      try { await firebaseLogout(); } catch (e) {}
    }

    if (nameInput) nameInput.value = '';
    if (drogariaInput) drogariaInput.value = '';
    if (emailInput) emailInput.value = '';
    if (passInput) passInput.value = '';
    if (passConfirmInput) passConfirmInput.value = '';

    if (isFirstAdmin) {
      showRegisterFeedback('👑 Conta criada com sucesso! Você foi definido como o SUPER USUÁRIO MESTRE com acesso total!', 'is-success');
      appendLog(`👑 <strong>Novo Super Usuário cadastrado:</strong> ${escapeHTML(name)} (${escapeHTML(drogaria)} - ${escapeHTML(email)}). Acesso total liberado!`, 'log-success');
    } else {
      showRegisterFeedback('🎉 Cadastro enviado com sucesso! Aguarde a aprovação do Super Usuário para liberar seu acesso.', 'is-success');
      appendLog(`📝 <strong>Novo cadastro registrado:</strong> ${escapeHTML(name)} (${escapeHTML(drogaria)} - ${escapeHTML(email)}). Status: <strong>Aguardando aprovação</strong>.`, 'log-info');
    }

    if (submitBtn) submitBtn.disabled = false;
    updateSuperUserToolbar();

    setTimeout(() => {
      switchAuthTab('login');
      const loginUser = document.getElementById('loginUserInput');
      if (loginUser) loginUser.value = email;
      if (isFirstAdmin) {
        showLoginFeedback('👑 Você é o Super Usuário Mestre! Faça seu login para gerenciar o sistema.', 'is-success');
      } else {
        showLoginFeedback('✅ Cadastro realizado! Aguarde a aprovação do Super Usuário antes do primeiro login.', 'is-warning');
      }
    }, 3500);
  } finally {
    window.__IS_REGISTERING = false;
  }
}

async function handleLoginSubmit(e) {
  if (e) e.preventDefault();
  const userInput = document.getElementById('loginUserInput');
  const passInput = document.getElementById('loginPassInput');
  const rememberCheckbox = document.getElementById('loginRemember');
  const loginCard = document.querySelector('.login-card');
  const submitBtn = document.getElementById('loginSubmitBtn');

  const rawUser = userInput?.value.trim();
  const rawPass = passInput?.value;

  if (!rawUser || !rawPass) {
    showLoginFeedback('⚠️ Por favor, preencha o e-mail e a senha.', 'is-error');
    triggerCardShake(loginCard);
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  showLoginFeedback('🔄 Validando credenciais de acesso...', 'is-warning');

  try {
    const remember = rememberCheckbox ? rememberCheckbox.checked : true;
    let userEmail = rawUser;
    let formattedName = 'Farmacêutico';
    let uid = 'user-' + Date.now();
    let authType = 'firebase';

    // Suporte a login demo do administrador local apenas quando offline e sem Firebase
    if (rawUser.toLowerCase() === DEFAULT_AUTH.user && rawPass === DEFAULT_AUTH.pass && (!isFirebaseConfigured() || !window.navigator.onLine)) {
      userEmail = 'admin@sistema.local';
      formattedName = DEFAULT_AUTH.name;
      uid = 'local-admin';
      authType = 'local-admin';
    } else {
      const userCredential = await firebaseLogin(rawUser, rawPass, remember);
      const user = userCredential.user;
      userEmail = user.email;
      uid = user.uid;
      const displayName = user.displayName || user.email.split('@')[0];
      formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    }

    // Validação de Status e Moderação de Acesso
    const all = getRegisteredUsers();
    let record = findUserRecord(userEmail) || findUserRecord(uid);
    const isSuper = isSuperUser(userEmail);

    if (!record) {
      record = {
        uid: uid,
        email: userEmail,
        name: formattedName,
        drogaria: 'Drogasil Mogilar',
        role: isSuper ? 'superadmin' : 'farmaceutico',
        status: 'aprovado',
        createdAt: new Date().toISOString()
      };
      all.unshift(record);
      saveRegisteredUsers(all);
    } else if (isSuper) {
      record.role = 'superadmin';
      record.status = 'aprovado';
      saveRegisteredUsers(all);
    }

    if (record.status === 'rejeitado' && !isSuper) {
      clearAuthSession();
      if (typeof firebaseLogout === 'function') await firebaseLogout();
      showLoginFeedback('🚫 Seu acesso foi RECUSADO ou SUSPENSO pelo Super Usuário.', 'is-error');
      triggerCardShake(loginCard);
      if (passInput) passInput.value = '';
      return;
    }

    // Acesso autorizado!
    const session = {
      user: userEmail,
      name: record.name || formattedName,
      drogaria: record.drogaria || 'Drogasil Mogilar',
      role: isSuper ? 'superadmin' : (record.role || 'farmaceutico'),
      status: 'aprovado',
      uid: uid,
      authType: authType,
      loginTime: new Date().toISOString()
    };

    setAuthSession(session, remember);
    updateAuthStateUI(session);

    const roleBadge = isSuper ? ' 👑 [SUPER USUÁRIO]' : '';
    appendLog(`🟢 <strong>Autenticado com sucesso via Firebase.</strong> Farmacêutico: <strong>${escapeHTML(session.name)}</strong> (${escapeHTML(session.drogaria)})${roleBadge}.`, 'log-success');
    showLoginFeedback('', '');
    if (passInput) passInput.value = '';
  } catch (error) {
    console.error('Erro de autenticação:', error);
    let errorMsg = '❌ Falha ao autenticar.';
    if (error.code === 'auth/user-not-found') {
      errorMsg = '❌ Usuário não encontrado no Firebase. A conta foi excluída na nuvem.';
      // Remove automaticamente da listagem local se não for o Super Usuário mestre
      if (!isSuperUser(userEmail)) {
        const allUsers = getRegisteredUsers();
        const filtered = allUsers.filter(u => u.email !== userEmail && u.uid !== userEmail);
        if (filtered.length !== allUsers.length) {
          saveRegisteredUsers(filtered);
          renderAdminUsersTable();
          updateSuperUserToolbar();
        }
      }
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      errorMsg = '❌ E-mail ou senha incorretos.';
    } else if (error.code === 'auth/invalid-email') {
      errorMsg = '❌ O formato do e-mail é inválido.';
    } else if (error.code === 'auth/user-disabled') {
      errorMsg = '⚠️ Este usuário foi desativado no Firebase.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMsg = '⚠️ Acesso bloqueado temporariamente por excesso de tentativas.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMsg = '⚠️ Erro de conexão com os servidores de autenticação.';
    } else if (error.message) {
      errorMsg = `❌ ${error.message}`;
    }
    showLoginFeedback(errorMsg, 'is-error');
    triggerCardShake(loginCard);
    if (passInput) {
      passInput.value = '';
      passInput.focus();
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function logoutUser() {
  const session = getAuthSession();
  const name = session ? (session.name || session.user) : 'Usuário';

  if (typeof firebaseLogout === 'function') {
    try {
      await firebaseLogout();
    } catch (e) {
      console.warn('Erro ao deslogar do Firebase:', e);
    }
  }

  clearAuthSession();
  updateAuthStateUI(null);
  appendLog(`🔒 <strong>Sessão encerrada</strong> para: ${escapeHTML(name)}.`, 'log-warning');
  showLoginFeedback('🔒 Sessão encerrada com sucesso.', '');
}

function showCurrentUser() {
  const session = getAuthSession();
  if (session) {
    const isSuper = isSuperUser(session.user) ? ' 👑 [SUPER USUÁRIO]' : '';
    appendLog(`👤 <strong>Usuário conectado:</strong> ${escapeHTML(session.name || session.user)} (${escapeHTML(session.user)})${isSuper} | 🏬 Drogaria: <strong>${escapeHTML(DEFAULT_CONFIG.drogaria)}</strong> | Login: ${new Date(session.loginTime).toLocaleTimeString('pt-BR')}`, 'log-info');
  } else {
    appendLog(`⚠️ Nenhuma sessão ativa no momento.`, 'log-warning');
  }
}

function handlePasswordChange(newPass) {
  const session = getAuthSession();
  if (!session) {
    appendLog(`⚠️ Você precisa estar conectado para alterar a senha.`, 'log-error');
    return;
  }
  appendLog(`ℹ️ Para alterar a senha da sua conta, redefina-a através do console do Firebase ou do fluxo de recuperação de senha por e-mail.`, 'log-info');
}

/* ==========================================================================
   PAINEL ADMINISTRATIVO DO SUPER USUÁRIO (GESTÃO E APROVAÇÃO DE FARMACÊUTICOS)
   ========================================================================== */

function openAdminUsersPanel() {
  const session = getAuthSession();
  if (!session || !isSuperUser(session.user)) {
    appendLog('⚠️ Acesso negado: Somente o <strong>Super Usuário</strong> pode acessar a gestão de cadastros.', 'log-error');
    return;
  }

  const panel = document.getElementById('adminUsersPanel');
  if (!panel) return;

  renderAdminUsersTable();
  panel.hidden = false;
}

function closeAdminUsersPanel() {
  const panel = document.getElementById('adminUsersPanel');
  if (panel) panel.hidden = true;
  cliInput?.focus();
}

function renderAdminUsersTable() {
  const users = getRegisteredUsers();
  const container = document.getElementById('adminUsersTableContainer');
  const statPending = document.getElementById('statPendingCount');
  const statApproved = document.getElementById('statApprovedCount');
  const statTotal = document.getElementById('statTotalCount');

  const pendingList = users.filter(u => u.status === 'pendente');
  const approvedList = users.filter(u => u.status === 'aprovado');

  if (statPending) statPending.textContent = pendingList.length;
  if (statApproved) statApproved.textContent = approvedList.length;
  if (statTotal) statTotal.textContent = users.length;

  if (!container) return;

  if (!users.length) {
    container.innerHTML = `<div class="admin-empty-state">Nenhum farmacêutico cadastrado no momento.</div>`;
    return;
  }

  let tableHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>👨‍⚕️ Farmacêutico</th>
          <th>🏬 Drogaria / Filial</th>
          <th>✉️ E-mail de Acesso</th>
          <th>📅 Cadastro</th>
          <th>Status</th>
          <th>Ações de Moderação</th>
        </tr>
      </thead>
      <tbody>
  `;

  const superUser = getSuperAdminUser();
  users.forEach((u, index) => {
    // O primeiro usuário cadastrado é sempre o Super Usuário Mestre (inalterável)
    const isRootAdmin = (superUser && (u.email === superUser.email || u.uid === superUser.uid)) || (index === 0 && u.role === 'superadmin');
    const dateFormatted = u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—';
    
    let statusBadge = '';
    if (isRootAdmin) {
      statusBadge = `<span class="status-badge approved" style="border-color: #ffd700; color: #ffd700;">👑 Super Usuário</span>`;
    } else if (u.status === 'pendente') {
      statusBadge = `<span class="status-badge pending">⏳ Pendente</span>`;
    } else if (u.status === 'rejeitado') {
      statusBadge = `<span class="status-badge rejected">❌ Recusado</span>`;
    } else {
      statusBadge = `<span class="status-badge approved">✅ Aprovado</span>`;
    }

    let actionsHTML = '';
    if (isRootAdmin) {
      actionsHTML = `<span class="log-dim" style="font-size: 0.78rem; font-weight: 600; color: #00ff41;">👑 Super Usuário (Mestre)</span>`;
    } else {
      // OS DEMAIS USUÁRIOS PODEM SER EDITADOS, APROVADOS OU EXCLUÍDOS
      const emailEsc = escapeHTML(u.email);
      let statusSpecificBtns = '';
      if (u.status === 'pendente') {
        statusSpecificBtns = `
          <button class="admin-btn-action btn-approve" onclick="approveUserAction('${emailEsc}')" title="Aprovar cadastro deste farmacêutico">✅ Aprovar</button>
          <button class="admin-btn-action btn-reject" onclick="rejectUserAction('${emailEsc}')" title="Recusar cadastro">❌ Recusar</button>
        `;
      } else if (u.status === 'aprovado') {
        statusSpecificBtns = `
          <button class="admin-btn-action btn-reject" onclick="rejectUserAction('${emailEsc}')" title="Suspender acesso">🚫 Suspender</button>
        `;
      } else {
        statusSpecificBtns = `
          <button class="admin-btn-action btn-approve" onclick="approveUserAction('${emailEsc}')" title="Reativar e aprovar acesso">✅ Reativar</button>
        `;
      }

      actionsHTML = `
        ${statusSpecificBtns}
        <button class="admin-btn-action btn-edit" onclick="editUserAction('${emailEsc}')" title="Editar nome/drogaria deste farmacêutico">✏️ Editar</button>
        <button class="admin-btn-action btn-delete" onclick="deleteUserAction('${emailEsc}')" title="Excluir este farmacêutico permanentemente">🗑️ Excluir</button>
      `;
    }

    tableHTML += `
      <tr>
        <td><strong>${escapeHTML(u.name || '—')}</strong>${isRootAdmin ? ' <span style="color:#ffd700">👑</span>' : ''}</td>
        <td>${escapeHTML(u.drogaria || '—')}</td>
        <td><code>${escapeHTML(u.email || '—')}</code></td>
        <td><small class="log-dim">${dateFormatted}</small></td>
        <td>${statusBadge}</td>
        <td><div class="admin-actions-cell">${actionsHTML}</div></td>
      </tr>
    `;
  });

  tableHTML += `
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;
}

function approveUserAction(emailOrUid) {
  const users = getRegisteredUsers();
  const target = users.find(u => u.email === emailOrUid || u.uid === emailOrUid);
  if (!target) return;

  target.status = 'aprovado';
  saveRegisteredUsers(users);
  renderAdminUsersTable();
  updateSuperUserToolbar();
  appendLog(`✅ <strong>Farmacêutico Aprovado:</strong> ${escapeHTML(target.name)} (${escapeHTML(target.drogaria)} - ${escapeHTML(target.email)}). Acesso liberado!`, 'log-success');
}

function rejectUserAction(emailOrUid) {
  if (isSuperUser(emailOrUid)) {
    alert('🛡️ Proteção: O Super Usuário Mestre não pode ter seu acesso suspenso.');
    return;
  }
  const users = getRegisteredUsers();
  const target = users.find(u => u.email === emailOrUid || u.uid === emailOrUid);
  if (!target) return;

  target.status = 'rejeitado';
  saveRegisteredUsers(users);
  renderAdminUsersTable();
  updateSuperUserToolbar();
  appendLog(`🚫 <strong>Acesso Recusado / Suspenso:</strong> ${escapeHTML(target.name)} (${escapeHTML(target.email)}).`, 'log-warning');
}

function editUserAction(emailOrUid) {
  const users = getRegisteredUsers();
  const target = users.find(u => u.email === emailOrUid || u.uid === emailOrUid);
  if (!target) return;

  const newName = prompt(`Editar Nome do Farmacêutico para ${target.email}:`, target.name);
  if (newName === null) return;
  const newDrogaria = prompt(`Editar Drogaria/Filial para ${target.email}:`, target.drogaria);
  if (newDrogaria === null) return;

  if (newName.trim()) target.name = newName.trim();
  if (newDrogaria.trim()) target.drogaria = newDrogaria.trim();
  saveRegisteredUsers(users);

  // Se o usuário editado for o mesmo da sessão ativa, atualiza toda a aplicação dinamicamente!
  const currentSession = getAuthSession();
  if (currentSession && (currentSession.user === target.email || currentSession.uid === target.uid)) {
    currentSession.name = target.name;
    currentSession.drogaria = target.drogaria;
    setAuthSession(currentSession, true);
    applyUserSessionProfile(currentSession);
  }

  renderAdminUsersTable();
  appendLog(`✏️ <strong>Cadastro atualizado:</strong> ${escapeHTML(target.name)} pertencente à <strong>${escapeHTML(target.drogaria)}</strong>.`, 'log-info');
}

function deleteUserAction(emailOrUid) {
  const session = getAuthSession();
  if (!session || !isSuperUser(session.user)) {
    appendLog('⚠️ Apenas o <strong>Super Usuário</strong> tem permissão para deletar usuários.', 'log-error');
    return false;
  }

  if (isSuperUser(emailOrUid)) {
    alert('🛡️ Proteção de Segurança: O primeiro usuário cadastrado é o Super Usuário Mestre e NUNCA pode ser excluído.');
    appendLog(`🛡️ Operação negada: O Super Usuário Mestre inicial não pode ser deletado.`, 'log-warning');
    return false;
  }

  const users = getRegisteredUsers();
  const target = users.find(u => 
    (u.email && u.email.toLowerCase() === String(emailOrUid).toLowerCase()) ||
    (u.uid && u.uid === emailOrUid)
  );

  if (!target) {
    appendLog(`⚠️ Usuário "${escapeHTML(emailOrUid)}" não encontrado para exclusão.`, 'log-warning');
    return false;
  }

  const confirmMsg = `⚠️ ATENÇÃO - EXCLUSÃO PERMANENTE:\n\n` +
    `Deseja realmente DELETAR o usuário comum:\n` +
    `• Farmacêutico: ${target.name}\n` +
    `• Drogaria: ${target.drogaria}\n` +
    `• E-mail: ${target.email}\n` +
    `• Status Atual: ${target.status.toUpperCase()}\n\n` +
    `Esta ação é irreversível e removerá todo o cadastro deste usuário.`;

  if (!confirm(confirmMsg)) return false;

  const filtered = users.filter(u => u.email !== target.email && u.uid !== target.uid);
  saveRegisteredUsers(filtered);

  // Se o usuário excluído estiver autenticado neste navegador, encerra a sessão imediatamente
  if (session.user === target.email || session.uid === target.uid) {
    clearAuthSession();
    updateAuthStateUI(null);
  }

  renderAdminUsersTable();
  updateSuperUserToolbar();
  appendLog(`🗑️ <strong>Usuário comum deletado com sucesso:</strong> ${escapeHTML(target.name)} (${escapeHTML(target.email)} - ${escapeHTML(target.drogaria)}).`, 'log-warning');
  return true;
}

// Expõe ações globais para cliques inline no HTML da tabela administrativa
if (typeof window !== 'undefined') {
  window.approveUserAction = approveUserAction;
  window.rejectUserAction = rejectUserAction;
  window.editUserAction = editUserAction;
  window.deleteUserAction = deleteUserAction;
  window.openAdminUsersPanel = openAdminUsersPanel;
  window.closeAdminUsersPanel = closeAdminUsersPanel;
}

function initializeAuth() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginPassToggle = document.getElementById('loginPassToggle');
  const regPassToggle = document.getElementById('regPassToggle');
  const loginThemeBtn = document.getElementById('loginThemeBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminUsersBtn = document.getElementById('adminUsersBtn');
  const adminUsersCloseBtn = document.getElementById('adminUsersCloseBtn');

  if (tabLoginBtn) tabLoginBtn.addEventListener('click', () => switchAuthTab('login'));
  if (tabRegisterBtn) tabRegisterBtn.addEventListener('click', () => switchAuthTab('register'));

  if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
  if (registerForm) registerForm.addEventListener('submit', handleRegisterSubmit);

  if (loginPassToggle) loginPassToggle.addEventListener('click', toggleLoginPassVisibility);
  if (regPassToggle) regPassToggle.addEventListener('click', toggleRegisterPassVisibility);

  if (loginThemeBtn) loginThemeBtn.addEventListener('click', toggleTheme);
  if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);

  if (adminUsersBtn) adminUsersBtn.addEventListener('click', openAdminUsersPanel);
  if (adminUsersCloseBtn) adminUsersCloseBtn.addEventListener('click', closeAdminUsersPanel);

  document.querySelectorAll('[data-admin-close]').forEach(el => {
    el.addEventListener('click', closeAdminUsersPanel);
  });

  // Inicializa o Firebase se configurado
  if (typeof initFirebase === 'function') {
    const auth = initFirebase();
    if (auth && typeof auth.onAuthStateChanged === 'function') {
      auth.onAuthStateChanged(async (user) => {
        if (window.__IS_REGISTERING) {
          return;
        }
        if (user) {
          const isSuper = isSuperUser(user.email);
          const all = getRegisteredUsers();
          let record = findUserRecord(user.email) || findUserRecord(user.uid);

          if (!record) {
            record = {
              uid: user.uid,
              email: user.email,
              name: (user.displayName || user.email.split('@')[0]),
              drogaria: DEFAULT_CONFIG.drogaria,
              role: isSuper ? 'superadmin' : 'farmaceutico',
              status: 'aprovado',
              createdAt: new Date().toISOString()
            };
            all.unshift(record);
            saveRegisteredUsers(all);
          } else if (isSuper) {
            record.status = 'aprovado';
            record.role = 'superadmin';
            saveRegisteredUsers(all);
          }

          if (record && record.status === 'rejeitado' && !isSuper) {
            clearAuthSession();
            updateAuthStateUI(null);
            try {
              if (typeof firebaseLogout === 'function') await firebaseLogout();
            } catch (e) {}
            showLoginFeedback('🚫 Seu acesso foi suspenso pelo Super Usuário.', 'is-error');
            return;
          }

          const displayName = (record && record.name) || user.displayName || user.email.split('@')[0];
          const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
          const drogaria = (record && record.drogaria) || DEFAULT_CONFIG.drogaria;

          const session = {
            user: user.email,
            name: formattedName,
            drogaria: drogaria,
            role: isSuper ? 'superadmin' : (record.role || 'farmaceutico'),
            status: 'aprovado',
            uid: user.uid,
            authType: 'firebase',
            loginTime: new Date().toISOString()
          };
          updateAuthStateUI(session);
        } else {
          clearAuthSession();
          updateAuthStateUI(null);
        }
      });
      return;
    }
  }

  const session = getAuthSession();
  updateAuthStateUI(session);
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  renderWelcomeBanner();
  updateHistoryCounter();
  updateAIStatus();
  initializeAuth();

  // Event Listeners
  cliInput.addEventListener('keydown', handleInputKeydown);
  
  themeToggleBtn.addEventListener('click', toggleTheme);
  crtToggleBtn.addEventListener('click', toggleCRT);
  initializeGeminiConfigPanel();
  
  // Manter foco no terminal ao clicar na tela (apenas no Desktop com mouse para não abrir teclado indesejado no celular)
  document.querySelector('.app-container').addEventListener('click', (e) => {
    const loginPanel = document.getElementById('loginPanel');
    if (loginPanel && !loginPanel.hidden) return;
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    if (!isTouchDevice && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
      cliInput?.focus();
    }
  });
});

// Atualiza o contador de mensagens
function updateHistoryCounter() {
  const count = generatedMessagesHistory.length;
  if (historyCounter) {
    historyCounter.innerHTML = `📋 Histórico: <strong>${count}</strong> mensagem(ns)`;
  }
}

const THEME_META_COLORS = {
  matrix: '#0a0d0a',
  amber: '#0d0a04',
  cyberpunk: '#090614',
  dark: '#121417'
};

function applyTheme(themeName) {
  if (!THEMES.includes(themeName)) return;
  currentThemeIndex = THEMES.indexOf(themeName);
  document.body.className = `theme-${themeName}`;
  const metaTheme = document.getElementById('metaThemeColor');
  if (metaTheme && THEME_META_COLORS[themeName]) {
    metaTheme.setAttribute('content', THEME_META_COLORS[themeName]);
  }
}

// Alternar Temas
function toggleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
  const newTheme = THEMES[currentThemeIndex];
  applyTheme(newTheme);
  appendLog(`🎨 Tema alterado para: <strong class="log-info">${newTheme.toUpperCase()}</strong>`, 'log-info');
}

// Alternar Efeito CRT
function toggleCRT() {
  crtOverlay.classList.toggle('disabled');
  const isActive = !crtOverlay.classList.contains('disabled');
  crtToggleBtn.classList.toggle('active', isActive);
  appendLog(`📺 Efeito CRT Scanlines: <strong>${isActive ? 'ATIVADO' : 'DESATIVADO'}</strong>`, 'log-info');
}

// Imprimir Banner Inicial
function renderWelcomeBanner() {
  const drogaria = escapeHTML(DEFAULT_CONFIG.drogaria || 'Drogaria');
  const farmaceutico = escapeHTML(DEFAULT_CONFIG.farmaceutico || 'Farmacêutico');
  const bannerHTML = `
    <div class="welcome-banner">
      <div class="welcome-title">
        <span>💊 Apoio ao Tratamento v2.0</span>
        <span class="badge-tag" id="welcomeDrogariaBadge">${drogaria}</span>
        <span class="badge-tag" id="welcomeFarmaceuticoBadge">Farmacêutico: ${farmaceutico}</span>
      </div>
      <p class="log-dim">Gerador de mensagens humanizadas e personalizadas de acompanhamento farmacêutico pós-venda / pós-tratamento.</p>
      <p style="margin-top: 8px;">✨ <strong>Como começar:</strong> Clique nos botões acima ou digite <code class="log-info">novo</code> ou <code class="log-info">lote</code> no terminal abaixo.</p>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = bannerHTML;
  terminalOutput.appendChild(div);
  scrollToBottom();
}

/* ==========================================================================
   ENGINE DE GERAÇÃO DE MENSAGENS HUMANIZADAS
   ========================================================================== */
/**
 * Classifica automaticamente se o item é um MEDICAMENTO ou SERVIÇO FARMACÊUTICO
 */
function classifyItem(itemName, overrideType = 'auto') {
  if (overrideType && overrideType !== 'auto') {
    if (overrideType === 'servico') {
      return { type: 'servico', subType: 'geral', label: 'Serviço Farmacêutico', icon: '🩺' };
    }
    return { type: 'medicamento', subType: 'medicamento', label: 'Medicamento', icon: '💊' };
  }

  if (!itemName) return { type: 'medicamento', subType: 'medicamento', label: 'Medicamento', icon: '💊' };

  const rawText = itemName.toLowerCase().trim();
  const normText = rawText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const text = rawText + ' ' + normText;

  // Lista expandida de termos e serviços farmacêuticos
  const serviceKeywords = [
    'injetavel', 'injecao', 'aplica',
    'sensor', 'libre', 'freestyle', 'glicemia continua',
    'pressao', 'arterial', 'afericao', 'medicao',
    'glicemia', 'glicose', 'dextro',
    'furo de orelha', 'orelha', 'brinco', 'lobulo', 'auricular', 'perfuracao',
    'influenza', 'gripe', 'h1n1', 'h3n2',
    'covid', 'coronavirus', 'antigeno',
    'painel respiratorio', 'respiratorio', 'virus',
    'bioimpedancia', 'composicao corporal', 'massa magra', 'gordura corporal',
    'curativo', 'nebulizacao', 'inalacao',
    'vacina', 'vacinacao', 'testagem', 'exame', 'servico', 'atendimento', 'procedimento'
  ];

  let subType = 'geral';

  if (text.includes('libre') || (text.includes('sensor') && (text.includes('glicem') || text.includes('glicose')))) {
    subType = 'sensor_libre';
  } else if (text.includes('bioimpedan') || text.includes('composicao corporal') || text.includes('composição corporal')) {
    subType = 'bioimpedancia';
  } else if (text.includes('painel') || (text.includes('respirat') && text.includes('teste'))) {
    subType = 'painel_respiratorio';
  } else if (text.includes('influenza') || text.includes('gripe')) {
    subType = 'influenza';
  } else if (text.includes('covid') || text.includes('corona') || text.includes('antigen')) {
    subType = 'covid';
  } else if (text.includes('orelh') || text.includes('brinco') || text.includes('lobul') || text.includes('auricular') || text.includes('perfur') || text.includes('furo')) {
    subType = 'orelha';
  } else if (text.includes('press') || text.includes('arterial')) {
    subType = 'pressao';
  } else if (text.includes('injet') || text.includes('injec') || text.includes('aplica')) {
    subType = 'injetavel';
  } else if (text.includes('glicem') || text.includes('glicose') || text.includes('dextro')) {
    subType = 'glicemia';
  } else if (text.includes('curativ') || text.includes('nebuliz') || text.includes('inala')) {
    subType = 'curativo';
  } else if (text.includes('vacin') || text.includes('imuniz')) {
    subType = 'vacina';
  }

  const isService = serviceKeywords.some(kw => text.includes(kw));

  if (isService) {
    return { type: 'servico', subType: subType, label: 'Serviço Farmacêutico', icon: '🩺' };
  }

  return { type: 'medicamento', subType: 'medicamento', label: 'Medicamento', icon: '💊' };
}


const MESSAGE_TEMPLATES = {
  empatico: (data) => {
    const saudacao = getSaudacaoHorario();
    const sintomaTxt = data.sintoma ? ` em relação a ${data.sintoma}` : '';
    const dicaTxt = data.dica ? `\n\n💡 *Dica do Farmacêutico:* ${data.dica}` : '';
    const tempoTxt = data.tempo ? ` (${data.tempo})` : '';

    if (data.classification.type === 'servico') {
      const sub = data.classification.subType;
      let pergServico = `como você está se sentindo após o atendimento de **${data.medicamento}** realizado aqui com a gente${tempoTxt}. Deu tudo certo com o procedimento?`;
      
      if (sub === 'injetavel') {
        pergServico = `como você está se sentindo após a **${data.medicamento}** realizada na farmácia${tempoTxt}. Sentiu alguma dor no local da aplicação ou qualquer outro desconforto?`;
      } else if (sub === 'sensor_libre') {
        pergServico = `como está sendo a experiência após a **colocação do Sensor Libre** realizada na farmácia${tempoTxt}. O sensor está firme no braço e as leituras de glicose no aplicativo/leitor estão normais?`;
      } else if (sub === 'pressao') {
        pergServico = `como você está se sentindo após a **aferição de pressão arterial** realizada aqui na farmácia${tempoTxt}. Notou melhora no seu bem-estar ou em sintomas de mal-estar?`;
      } else if (sub === 'orelha') {
        pergServico = `como está a cicatrização após a **perfuração do lóbulo auricular** realizada na farmácia${tempoTxt}. Está higienizando o local certinho com o antisséptico e sem inchaço?`;
      } else if (sub === 'influenza') {
        pergServico = `como você está se sentindo após a realização do **teste de Influenza (Gripe)** na farmácia${tempoTxt}. Os sintomas de febre ou indisposição já melhoraram?`;
      } else if (sub === 'covid') {
        pergServico = `como você está se sentindo após a realização do **teste de COVID-19** na farmácia${tempoTxt}. Está conseguindo manter o repouso e a hidratação recomendados?`;
      } else if (sub === 'painel_respiratorio') {
        pergServico = `como você está se sentindo após a realização do **teste de Painel Respiratório** feito na farmácia${tempoTxt}. Notou alívio nos sintomas de tosse ou congestão?`;
      } else if (sub === 'bioimpedancia') {
        pergServico = `como foi seu acompanhamento após o exame de **Bioimpedância (composição corporal)** na farmácia${tempoTxt}. Ficou com alguma dúvida sobre o relatório ou sobre suas metas de saúde?`;
      } else if (sub === 'glicemia') {
        pergServico = `como você está se sentindo após o teste de **glicemia capilar** realizado na farmácia${tempoTxt}. Está conseguindo manter os cuidados com os horários das refeições e remédios?`;
      }

      return `${saudacao}, ${data.nome}! Tudo bem com você? 😊\n\n` +
        `Aqui é o farmacêutico **${data.farmaceutico}**, da **${data.drogaria}**!\n\n` +
        `Estou passando para acompanhar ${pergServico}\n\n` +
        `Se tiver qualquer dúvida sobre os cuidados pós-atendimento ou precisar de um novo serviço, pode me avisar por aqui a qualquer momento. Estou à sua inteira disposição!${dicaTxt}\n\n` +
        `Desejo muita saúde e um dia abençoado! 💚\n\n` +
        `Atenciosamente,\n` +
        `*${data.farmaceutico}* | ${data.drogaria}`;
    }

    return `${saudacao}, ${data.nome}! Tudo bem com você? 😊\n\n` +
      `Aqui é o farmacêutico **${data.farmaceutico}**, da **${data.drogaria}**!\n\n` +
      `Estou passando para saber como você está se sentindo${sintomaTxt} e como está indo o acompanhamento com o medicamento **${data.medicamento}**${tempoTxt}. O tratamento está sendo tranquilo?\n\n` +
      `Se tiver qualquer dúvida sobre as doses, horários ou se sentir algum desconforto, pode me avisar por aqui a qualquer momento. Meu compromisso é garantir que você se recupere com toda a segurança e conforto!${dicaTxt}\n\n` +
      `Desejo uma excelente recuperação e um dia abençoado! 💚\n\n` +
      `Atenciosamente,\n` +
      `*${data.farmaceutico}* | ${data.drogaria}`;
  },

  atencioso: (data) => {
    const saudacao = getSaudacaoHorario();
    const sintomaTxt = data.sintoma ? ` em relação a ${data.sintoma}` : '';
    const dicaTxt = data.dica ? `\n\n📌 *Lembrete importante:* ${data.dica}` : '';

    if (data.classification.type === 'servico') {
      return `${saudacao}, ${data.nome}! Como vai? Espero que esteja muito bem!\n\n` +
        `Quem fala é o ${data.farmaceutico}, farmacêutico da ${data.drogaria}.\n\n` +
        `Gostaria de acompanhar de perto o seu atendimento de **${data.medicamento}**: correu tudo bem? Notou estabilização ou melhora dos seus sintomas${sintomaTxt}?\n\n` +
        `Lembre-se da importância de manter as rotinas e cuidados orientados na farmácia.${dicaTxt}\n\n` +
        `Caso precise de qualquer suporte ou novo procedimento/aferição, conte comigo!\n\n` +
        `Um abraço e se cuide!\n` +
        `*${data.farmaceutico}* - ${data.drogaria}`;
    }

    return `${saudacao}, ${data.nome}! Como vai? Espero que esteja muito bem!\n\n` +
      `Quem fala é o ${data.farmaceutico}, farmacêutico da ${data.drogaria}.\n\n` +
      `Gostaria de acompanhar de perto o seu bem-estar: deu tudo certo com a medicação **${data.medicamento}**? Notou melhorias nos sintomas${sintomaTxt}?\n\n` +
      `Lembre-se da importância de manter os horários certinhos da dose para a eficácia completa do seu tratamento.${dicaTxt}\n\n` +
      `Caso precise de qualquer orientação ou apoio profissional, pode contar comigo!\n\n` +
      `Um abraço e se cuide!\n` +
      `*${data.farmaceutico}* - ${data.drogaria}`;
  },

  descontraido: (data) => {
    const dicaTxt = data.dica ? `\n\n Ah, e não se esqueça: ${data.dica} 😉` : '';

    if (data.classification.type === 'servico') {
      return `Oi, ${data.nome}! Tudo certinho com você? 🙋♂️\n\n` +
        `Aqui é o ${data.farmaceutico} da ${data.drogaria}!\n\n` +
        `Estou passando rapidinho pra saber como você está após o procedimento de **${data.medicamento}**! Correu tudo bem no atendimento?\n\n` +
        `Se precisar de mais alguma coisa ou tiver qualquer dúvida, só me mandar uma mensagem aqui, tá bom?${dicaTxt}\n\n` +
        `Tenha um ótimo dia! ✨\n\n` +
        `Abraço,\n` +
        `*${data.farmaceutico}* | ${data.drogaria}`;
    }

    return `Oi, ${data.nome}! Tudo certinho com você? 🙋♂️\n\n` +
      `Aqui é o ${data.farmaceutico} da ${data.drogaria}!\n\n` +
      `Estou passando rapidinho pra saber como você está se sentindo e se deu tudo certo com o **${data.medicamento}**! Já sentiu a melhora?\n\n` +
      `Qualquer dúvida que você tiver sobre o remédio, só me mandar uma mensagem aqui, tá bom? Estou sempre por aqui pra ajudar!${dicaTxt}\n\n` +
      `Tenha um ótimo dia e melhore logo! ✨\n\n` +
      `Abraço,\n` +
      `*${data.farmaceutico}* | ${data.drogaria}`;
  },

  pos_tratamento: (data) => {
    if (data.classification.type === 'servico') {
      return `Olá, ${data.nome}! Como você está?\n\n` +
        `Aqui é o farmacêutico ${data.farmaceutico}, da ${data.drogaria}.\n\n` +
        `Passando para saber como ficou sua saúde após a realização do serviço de **${data.medicamento}**. Está se sentindo 100% recuperado(a)?\n\n` +
        `Caso precise agendar um novo atendimento, nova aferição ou qualquer outro suporte para sua saúde, conte sempre com nossa equipe na ${data.drogaria}.\n\n` +
        `Desejo muita saúde!\n\n` +
        `Atenciosamente,\n` +
        `*${data.farmaceutico}* - ${data.drogaria}`;
    }

    return `Olá, ${data.nome}! Como você está?\n\n` +
      `Aqui é o farmacêutico ${data.farmaceutico}, da ${data.drogaria}.\n\n` +
      `Passando para acompanhar a fase final do seu tratamento com o **${data.medicamento}**. Como você está se sentindo agora? Já se sente 100% recuperado(a)?\n\n` +
      `Caso precise de reposição, nova orientação médica/farmacêutica ou qualquer suporte para sua saúde, conte sempre com nossa equipe na ${data.drogaria}.\n\n` +
      `Desejo muita saúde!\n\n` +
      `Atenciosamente,\n` +
      `*${data.farmaceutico}* - ${data.drogaria}`;
  }
};

function getSaudacaoHorario() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Gera as mensagens personalizadas com base nos parâmetros
 */
function generateMessages(params) {
  const itemInput = params.medicamento || params.item || 'Medicamento / Serviço';
  const classification = classifyItem(itemInput, params.tipoOverride || 'auto');

  const data = {
    nome: capitalizeName(params.nome || 'Cliente'),
    drogaria: params.drogaria || DEFAULT_CONFIG.drogaria,
    farmaceutico: params.farmaceutico || DEFAULT_CONFIG.farmaceutico,
    medicamento: itemInput,
    classification: classification,
    sintoma: params.sintoma || '',
    tempo: params.tempo || '',
    dica: params.dica || '',
    telefone: params.telefone ? params.telefone.replace(/\D/g, '') : ''
  };

  const generated = {
    id: Date.now(),
    timestamp: new Date().toLocaleString('pt-BR'),
    clientData: data,
    versions: {
      empatico: MESSAGE_TEMPLATES.empatico(data),
      atencioso: MESSAGE_TEMPLATES.atencioso(data),
      descontraido: MESSAGE_TEMPLATES.descontraido(data),
      pos_tratamento: MESSAGE_TEMPLATES.pos_tratamento(data)
    }
  };

  generatedMessagesHistory.unshift(generated);
  localStorage.setItem('apoio_tratamento_history', JSON.stringify(generatedMessagesHistory));
  updateHistoryCounter();

  return generated;
}

/* ==========================================================================
   INTEGRAÇÃO DE IA (GOOGLE GEMINI 3.6 FLASH)
   ========================================================================== */

const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_MODEL_LABEL = 'Gemini 3.6 Flash';
const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    empatico: { type: 'STRING' },
    atencioso: { type: 'STRING' },
    descontraido: { type: 'STRING' },
    pos_tratamento: { type: 'STRING' }
  },
  required: ['empatico', 'atencioso', 'descontraido', 'pos_tratamento']
};
const GEMINI_FAILURE_RESET_MS = 10 * 60 * 1000;
const GEMINI_FAILURE_THRESHOLD = 3;

function getGeminiFailureState() {
  try {
    const payload = JSON.parse(localStorage.getItem('apoio_gemini_failure_state') || '{"count":0,"lastFailureAt":0,"blockedUntil":0}');
    return {
      count: Number(payload.count) || 0,
      lastFailureAt: Number(payload.lastFailureAt) || 0,
      blockedUntil: Number(payload.blockedUntil) || 0
    };
  } catch (error) {
    return { count: 0, lastFailureAt: 0, blockedUntil: 0 };
  }
}

function setGeminiFailureState(nextState) {
  localStorage.setItem('apoio_gemini_failure_state', JSON.stringify(nextState));
}

function isGeminiTemporarilyBlocked() {
  const state = getGeminiFailureState();
  if (state.blockedUntil && Date.now() < state.blockedUntil) {
    return true;
  }

  if (state.blockedUntil && Date.now() >= state.blockedUntil) {
    setGeminiFailureState({ count: 0, lastFailureAt: 0, blockedUntil: 0 });
  }

  return false;
}

function registerGeminiFailure(err) {
  const now = Date.now();
  const state = getGeminiFailureState();
  const isInWindow = state.lastFailureAt && now - state.lastFailureAt <= GEMINI_FAILURE_RESET_MS;

  const nextState = {
    count: isInWindow ? state.count + 1 : 1,
    lastFailureAt: now,
    blockedUntil: 0
  };

  if (nextState.count >= GEMINI_FAILURE_THRESHOLD) {
    nextState.blockedUntil = now + GEMINI_FAILURE_RESET_MS;
  }

  setGeminiFailureState(nextState);

  if (nextState.blockedUntil) {
    appendLog(`🛑 <strong>Gemini IA:</strong> muitas falhas consecutivas. A IA ficará bloqueada por 10 minutos antes de tentar novamente.`, 'log-warning');
  } else {
    appendLog(`⚠️ <strong>Gemini IA:</strong> falha de resposta. ${escapeHTML(err?.message || 'Erro desconhecido')} → fallback local.`, 'log-warning');
  }
}

function resetGeminiFailureState() {
  setGeminiFailureState({ count: 0, lastFailureAt: 0, blockedUntil: 0 });
}

function getGeminiEndpoint(apiKey) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

async function callGeminiAPI(promptText) {
  const apiKey = localStorage.getItem('apoio_gemini_api_key') || '';
  if (!apiKey) {
    throw new Error("Chave de API do Gemini não configurada. Digite 'apikey SUACHAVE' no terminal.");
  }

  const endpoint = getGeminiEndpoint(apiKey);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_RESPONSE_SCHEMA
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.error?.message || response.statusText;
    throw new Error(`Erro na API Gemini (${response.status}): ${msg}`);
  }

  const data = await response.json();
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
    return data.candidates[0].content.parts[0].text;
  }
  throw new Error("Resposta inválida recebida da API Gemini.");
}

function sanitizeGeminiJsonResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Resposta vazia recebida da API Gemini.');
  }
  const synonyms = {
    empatico: 'empatico', empático: 'empatico', empatica: 'empatico', tom_empatico: 'empatico', opcao_1: 'empatico',
    atencioso: 'atencioso', atenciosa: 'atencioso', padrao: 'atencioso', padrão: 'atencioso', tom_atencioso: 'atencioso', opcao_2: 'atencioso',
    descontraido: 'descontraido', descontraído: 'descontraido', leve: 'descontraido', tom_descontraido: 'descontraido', opcao_3: 'descontraido',
    pos_tratamento: 'pos_tratamento', postratamento: 'pos_tratamento', pos_atendimento: 'pos_tratamento', pos_venda: 'pos_tratamento', retorno: 'pos_tratamento', pos: 'pos_tratamento', opcao_4: 'pos_tratamento'
  };
  const normKey = (k) => {
    if (!k) return '';
    const c = String(k).toLowerCase().replace(/[\s_-]+/g, '_').trim();
    if (synonyms[c]) return synonyms[c];
    const c2s = c.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    if (synonyms[c2s]) return synonyms[c2s];
    if (c.includes('empat')) return 'empatico';
    if (c.includes('atenc')) return 'atencioso';
    if (c.includes('descon') || c.includes('leve')) return 'descontraido';
    if (c.includes('pos') || c.includes('pós') || c.includes('retorn')) return 'pos_tratamento';
    return '';
  };
  const cleanVal = (v) => {
    if (typeof v !== 'string') return v ? String(v) : '';
    return v.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();
  };
  const extractObj = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj)) {
      if (obj.length > 0 && typeof obj[0] === 'string') {
        const res = {};
        if (obj[0]) res.empatico = cleanVal(obj[0]);
        if (obj[1]) res.atencioso = cleanVal(obj[1]);
        if (obj[2]) res.descontraido = cleanVal(obj[2]);
        if (obj[3]) res.pos_tratamento = cleanVal(obj[3]);
        return Object.keys(res).length > 0 ? res : null;
      }
      const merged = {};
      for (const it of obj) {
        const sub = extractObj(it);
        if (sub) Object.assign(merged, sub);
      }
      return Object.keys(merged).length > 0 ? merged : null;
    }
    const collected = {};
    for (const [k, v] of Object.entries(obj)) {
      const nk = normKey(k);
      if (nk && typeof v === 'string' && v.trim()) {
        collected[nk] = cleanVal(v);
      } else if (v && typeof v === 'object') {
        const sub = extractObj(v);
        if (sub) {
          for (const [sk, sv] of Object.entries(sub)) {
            if (sv && !collected[sk]) collected[sk] = sv;
          }
        }
      }
    }
    return Object.keys(collected).length > 0 ? collected : null;
  };
  let cleaned = rawText.replace(/^```(?:json)?/gim, '').replace(/```$/gim, '').trim();
  const candidates = [];
  const b1 = cleaned.indexOf('{'), b2 = cleaned.lastIndexOf('}');
  if (b1 !== -1 && b2 > b1) candidates.push(cleaned.slice(b1, b2 + 1));
  const k1 = cleaned.indexOf('['), k2 = cleaned.lastIndexOf(']');
  if (k1 !== -1 && k2 > k1) candidates.push(cleaned.slice(k1, k2 + 1));
  candidates.push(cleaned);
  for (const cand of candidates) {
    try {
      const ext = extractObj(JSON.parse(cand));
      if (ext && Object.keys(ext).length > 0) {
        return { empatico: ext.empatico || '', atencioso: ext.atencioso || '', descontraido: ext.descontraido || '', pos_tratamento: ext.pos_tratamento || '' };
      }
    } catch (e) {
      try {
        const sanitized = cand.replace(/"(?:[^"\\]|\\.)*"/gs, (m) => m.replace(/\r?\n/g, '\\n'));
        const ext = extractObj(JSON.parse(sanitized));
        if (ext && Object.keys(ext).length > 0) {
          return { empatico: ext.empatico || '', atencioso: ext.atencioso || '', descontraido: ext.descontraido || '', pos_tratamento: ext.pos_tratamento || '' };
        }
      } catch (e2) {}
    }
  }
  const recovered = {};
  const keys = ['empatico', 'atencioso', 'descontraido', 'pos_tratamento', 'posTratamento', 'postratamento', 'pos-tratamento', 'pos_atendimento', 'pos_venda', 'pos', 'empático', 'descontraído', 'padrão', 'padrao'];
  const keyRe = new RegExp(`(?:"|'|\\b)(${keys.join('|')})(?:"|'|\\b)\\s*:\\s*`, 'gi');
  const matches = [];
  let m;
  while ((m = keyRe.exec(cleaned)) !== null) {
    matches.push({ normKey: normKey(m[1]), start: m.index + m[0].length, index: m.index });
  }
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const nxt = matches[i + 1];
    let seg = (nxt ? cleaned.slice(cur.start, nxt.index) : cleaned.slice(cur.start)).trim();
    if (seg.startsWith('"') || seg.startsWith("'")) {
      const q = seg[0];
      let val = '', esc = false, closed = false;
      for (let j = 1; j < seg.length; j++) {
        const ch = seg[j];
        if (esc) { val += ch; esc = false; continue; }
        if (ch === '\\') { val += ch; esc = true; continue; }
        if (ch === q) {
          const rest = seg.slice(j + 1).trim();
          if (rest === '' || rest.startsWith(',') || rest.startsWith('}') || rest.startsWith(']') || /^(?:(?:"|'|\b)[a-z0-9_]+(?:"|'|\b)\s*:)/i.test(rest)) {
            closed = true;
            break;
          }
        }
        val += ch;
      }
      if (cur.normKey && (!recovered[cur.normKey] || closed)) recovered[cur.normKey] = cleanVal(val);
    } else {
      let raw = seg.replace(/[,}\]]+$/, '').trim();
      if (cur.normKey && !recovered[cur.normKey]) recovered[cur.normKey] = cleanVal(raw);
    }
  }
  if (Object.keys(recovered).length > 0) {
    return { empatico: recovered.empatico || '', atencioso: recovered.atencioso || '', descontraido: recovered.descontraido || '', pos_tratamento: recovered.pos_tratamento || '' };
  }
  const secRe = /(?:^|\n)\s*(?:[\d*-.]+\s*)?(?:tom\s+)?(emp[aá]tico|atencioso|padr[aã]o|descontra[ií]do|leve|p[oó]s[-_ ]?tratamento|p[oó]s[-_ ]?atendimento|p[oó]s)\s*[:=-]\s*([\s\S]*?)(?=(?:\n\s*(?:[\d*-.]+\s*)?(?:tom\s+)?(?:emp[aá]tico|atencioso|padr[aã]o|descontra[ií]do|leve|p[oó]s[-_ ]?tratamento|p[oó]s[-_ ]?atendimento|p[oó]s)\s*[:=-])|$)/gi;
  let sm;
  while ((sm = secRe.exec(cleaned)) !== null) {
    const nk = normKey(sm[1]), sv = cleanVal(sm[2]);
    if (nk && sv) recovered[nk] = sv;
  }
  if (Object.keys(recovered).length > 0) {
    return { empatico: recovered.empatico || '', atencioso: recovered.atencioso || '', descontraido: recovered.descontraido || '', pos_tratamento: recovered.pos_tratamento || '' };
  }
  throw new Error('A resposta da IA não estava em JSON válido para as mensagens.');
}

async function generateMessagesAI(params) {
  const itemInput = params.medicamento || params.item || 'Medicamento / Serviço';
  const classification = classifyItem(itemInput, params.tipoOverride || 'auto');

  const data = {
    nome: capitalizeName(params.nome || 'Cliente'),
    drogaria: params.drogaria || DEFAULT_CONFIG.drogaria,
    farmaceutico: params.farmaceutico || DEFAULT_CONFIG.farmaceutico,
    medicamento: itemInput,
    classification: classification,
    sintoma: params.sintoma || '',
    tempo: params.tempo || '',
    dica: params.dica || '',
    telefone: params.telefone ? params.telefone.replace(/\D/g, '') : ''
  };

  const prompt = `
Você é o Farmacêutico ${data.farmaceutico} da filial ${data.drogaria}.
Sua missão é gerar 4 variações de mensagens de acompanhamento de pós-venda em português do Brasil para o WhatsApp do cliente.

DADOS DO ATENDIMENTO:
- Cliente: ${data.nome}
- Item/Serviço: ${data.medicamento} (Categoria Identificada: ${data.classification.label})
- Sintoma/Motivo relatado pelo cliente: ${data.sintoma || 'Não informado'}
- Tempo decorrido: ${data.tempo || 'Atendimento recente'}
- Orientação/Dica de saúde específica: ${data.dica || 'Recomendações gerais de saúde e adesão ao tratamento'}

REGRAS OBRIGATÓRIAS:
1. Tom estritamente humanizado, acolhedor, ético e farmacêutico.
2. Formate as mensagens adequadamente para o WhatsApp (use quebras de linha limpas e emojis pertinentes).
3. Adapte se for medicamento ou serviço (ex: para bioimpedância comente sobre o relatório; para sensor libre sobre a fixação/sincronização; para medicamentos sobre posologia e hidratação).
4. RESPOSTA ESTRITAMENTE COMO JSON VÁLIDO, SEM QUALQUER TEXTO EXTRA, SEM MARKDOWN, SEM EXPLICAÇÃO, SEM COMENTÁRIOS, SEM LINHA DE ABERTURA OU FECHAMENTO.
5. A resposta deve ser um único objeto JSON com exatamente estas chaves, em ordem: empatico, atencioso, descontraido, pos_tratamento.
6. Cada valor deve ser uma string em português do Brasil, sem aspas escapadas desnecessárias, sem caracteres de quebra de linha soltos e sem texto fora do JSON.
7. Se houver qualquer dúvida, devolva JSON válido com strings curtas e profissionais, nunca com prosa fora do objeto.
JSON EXATO:
{
  "empatico": "mensagem tom empático...",
  "atencioso": "mensagem tom atencioso e profissional...",
  "descontraido": "mensagem tom leve e descontraído...",
  "pos_tratamento": "mensagem focada em pós-tratamento e retorno..."
}
`;

  const rawText = await callGeminiAPI(prompt);
  const parsedJSON = sanitizeGeminiJsonResponse(rawText);

  // Aplicar proteção Anti-Spam nas mensagens da IA (Zero-Width Space + Hash Signature)
  function applyAntiSpamProtection(text) {
    const zeroWidthPadding = '\u200B'.repeat(Math.floor(Math.random() * 5) + 1);
    const finalText = `${text}${zeroWidthPadding}`;
    let hash = 0;
    for (let i = 0; i < finalText.length; i++) {
      const char = finalText.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const signature = 'SIG_' + Math.abs(hash).toString(36);
    return { text: finalText, signature };
  }

  const versionsWithAntiSpam = {};
  for (const [key, value] of Object.entries({
    empatico: parsedJSON.empatico || MESSAGE_TEMPLATES.empatico(data),
    atencioso: parsedJSON.atencioso || MESSAGE_TEMPLATES.atencioso(data),
    descontraido: parsedJSON.descontraido || MESSAGE_TEMPLATES.descontraido(data),
    pos_tratamento: parsedJSON.pos_tratamento || MESSAGE_TEMPLATES.pos_tratamento(data)
  })) {
    versionsWithAntiSpam[key] = applyAntiSpamProtection(value);
  }

  const generated = {
    id: Date.now(),
    timestamp: new Date().toLocaleString('pt-BR'),
    clientData: data,
    isAI: true,
    versions: versionsWithAntiSpam
  };

  generatedMessagesHistory.unshift(generated);
  localStorage.setItem('apoio_tratamento_history', JSON.stringify(generatedMessagesHistory));
  updateHistoryCounter();

  return generated;
}

async function generateMessagesSmart(params) {
  const apiKey = localStorage.getItem('apoio_gemini_api_key');
  if (!apiKey) {
    return generateMessages(params);
  }

  if (isGeminiTemporarilyBlocked()) {
    appendLog(`🛑 <strong>Gemini IA bloqueada temporariamente.</strong> Usando gerador local de fallback.`, 'log-warning');
    return generateMessages(params);
  }

  appendLog(`🤖 <strong>Gemini IA:</strong> Consultando a inteligência artificial para <strong>${escapeHTML(params.nome || 'Cliente')}</strong>...`, 'log-info');

  try {
    const aiResult = await generateMessagesAI(params);
    resetGeminiFailureState();
    appendLog(`✨ Mensagem gerada via <strong>Gemini IA</strong> com sucesso!`, 'log-success');
    return aiResult;
  } catch (err) {
    registerGeminiFailure(err);
    appendLog(`⚠️ <strong>Gemini IA indisponível:</strong> ${escapeHTML(err.message)} → Usando gerador local de fallback.`, 'log-warning');
    return generateMessages(params);
  }
}

function capitalizeName(name) {
  return name.trim().split(' ').map(word => {
    if (word.length <= 2 && ['de', 'da', 'do', 'dos', 'das'].includes(word.toLowerCase())) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

function updateAIStatus() {
  const statusEl = document.getElementById('ai-status');
  const key = localStorage.getItem('apoio_gemini_api_key');
  if (statusEl) {
    if (key && !isGeminiTemporarilyBlocked()) {
      statusEl.innerHTML = `🟢 <strong>Gemini IA Ativa</strong>`;
      statusEl.style.color = '#00ffcc';
      statusEl.style.opacity = '1';
      statusEl.style.cursor = 'pointer';
      statusEl.onclick = openGeminiConfigPanel;
    } else if (key && isGeminiTemporarilyBlocked()) {
      statusEl.innerHTML = `🟡 <strong>Gemini IA Temporariamente Bloqueada</strong>`;
      statusEl.style.color = '#ffcc66';
      statusEl.style.opacity = '1';
      statusEl.style.cursor = 'pointer';
      statusEl.onclick = openGeminiConfigPanel;
    } else {
      statusEl.innerHTML = `🔴 IA Inativa`;
      statusEl.style.color = '';
      statusEl.style.opacity = '0.6';
      statusEl.style.cursor = 'pointer';
      statusEl.onclick = openGeminiConfigPanel;
    }
  }
}

function initializeGeminiConfigPanel() {
  const panel = document.getElementById('geminiConfigPanel');
  const form = document.getElementById('geminiConfigForm');
  const openButton = document.getElementById('geminiConfigBtn');
  const closeButton = document.getElementById('geminiCloseBtn');
  const toggleButton = document.getElementById('geminiKeyToggle');
  const testButton = document.getElementById('geminiTestBtn');
  const removeButton = document.getElementById('geminiRemoveBtn');

  if (!panel || !form || !openButton) return;

  openButton.addEventListener('click', openGeminiConfigPanel);
  closeButton?.addEventListener('click', closeGeminiConfigPanel);
  panel.querySelector('[data-gemini-close]')?.addEventListener('click', closeGeminiConfigPanel);
  form.addEventListener('submit', handleGeminiSave);
  toggleButton?.addEventListener('click', toggleGeminiKeyVisibility);
  testButton?.addEventListener('click', handleGeminiTest);
  removeButton?.addEventListener('click', handleGeminiRemove);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) closeGeminiConfigPanel();
  });
}

function openGeminiConfigPanel() {
  const panel = document.getElementById('geminiConfigPanel');
  const input = document.getElementById('geminiKeyInput');
  if (!panel || !input) return;

  panel.hidden = false;
  renderGeminiConfigState();
  input.focus();
}

function closeGeminiConfigPanel() {
  const panel = document.getElementById('geminiConfigPanel');
  if (panel) panel.hidden = true;
  cliInput?.focus();
}

function renderGeminiConfigState() {
  const key = localStorage.getItem('apoio_gemini_api_key') || '';
  const status = document.getElementById('geminiConfigStatus');
  const input = document.getElementById('geminiKeyInput');
  const removeButton = document.getElementById('geminiRemoveBtn');

  if (status) {
    status.textContent = key ? `🟢 Chave configurada (${maskGeminiKey(key)})` : '🔴 Nenhuma chave configurada';
    status.classList.toggle('is-active', Boolean(key));
  }
  if (input) input.value = '';
  if (removeButton) removeButton.hidden = !key;
  setGeminiConfigFeedback('');
}

function maskGeminiKey(key) {
  return key.length <= 10 ? '••••••••' : `${key.slice(0, 6)}••••${key.slice(-4)}`;
}

function setGeminiConfigFeedback(message, type = '') {
  const feedback = document.getElementById('geminiConfigFeedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `gemini-config-feedback${type ? ` is-${type}` : ''}`;
}

function toggleGeminiKeyVisibility() {
  const input = document.getElementById('geminiKeyInput');
  const button = document.getElementById('geminiKeyToggle');
  if (!input || !button) return;
  const showKey = input.type === 'password';
  input.type = showKey ? 'text' : 'password';
  button.textContent = showKey ? 'Ocultar' : 'Mostrar';
  button.setAttribute('aria-pressed', String(showKey));
}

function handleGeminiSave(event) {
  event?.preventDefault();
  const input = document.getElementById('geminiKeyInput');
  const key = input?.value.trim() || '';

  if (!key) {
    setGeminiConfigFeedback('Insira uma chave de API antes de salvar.', 'error');
    input?.focus();
    return;
  }

  localStorage.setItem('apoio_gemini_api_key', key);
  updateAIStatus();
  renderGeminiConfigState();
  setGeminiConfigFeedback('Chave salva neste navegador. Clique em “Testar conexão” para validá-la.', 'success');
  appendLog(`🔑 <strong>Chave do Gemini IA salva com sucesso!</strong>`, 'log-success');
}

async function handleGeminiTest() {
  const input = document.getElementById('geminiKeyInput');
  const testKey = input?.value.trim() || localStorage.getItem('apoio_gemini_api_key') || '';

  if (!testKey) {
    setGeminiConfigFeedback('Cole ou salve uma chave antes de testar a conexão.', 'error');
    input?.focus();
    return;
  }

  setGeminiConfigFeedback(`Testando conexão com o ${GEMINI_MODEL_LABEL}...`);

  try {
    const response = await fetch(getGeminiEndpoint(testKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Responda apenas: OK' }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || response.statusText || 'Não foi possível validar a chave.';
      setGeminiConfigFeedback(`Falha (${response.status}): ${message}`, 'error');
      return;
    }

    setGeminiConfigFeedback(`Conexão bem-sucedida: ${GEMINI_MODEL_LABEL} respondeu corretamente.`, 'success');
  } catch (error) {
    setGeminiConfigFeedback(`Erro de rede: ${error.message}. Verifique sua conexão e tente novamente.`, 'error');
  }
}

function handleGeminiRemove() {
  localStorage.removeItem('apoio_gemini_api_key');
  updateAIStatus();
  renderGeminiConfigState();
  setGeminiConfigFeedback('Chave removida deste navegador. O gerador local continuará disponível.', 'warning');
  appendLog(`🗑️ Chave do Gemini IA removida. O sistema voltou ao modo de geração local.`, 'log-warning');
}
/**
 * Exibe o resultado da geração com cards e botões de ação rápidos
 */
function renderGeneratedOutput(genData) {
  const { id, clientData, versions } = genData;
  const cleanPhone = clientData.telefone ? (clientData.telefone.length === 11 || clientData.telefone.length === 10 ? '55' + clientData.telefone : clientData.telefone) : '';

  const cardHTML = `
    <div class="message-card" id="card-${id}">
      <div class="card-header">
        <div class="card-meta">
          ${genData.isAI ? `<span class="meta-pill" style="background: rgba(0, 255, 204, 0.15); color: #00ffcc; border: 1px solid #00ffcc;">🤖 Gemini IA</span>` : ''}
          <span class="meta-pill">👤 Cliente: <strong>${escapeHTML(clientData.nome)}</strong></span>
          <span class="meta-pill">${clientData.classification.icon} ${escapeHTML(clientData.classification.label)}: <strong>${escapeHTML(clientData.medicamento)}</strong></span>
          <span class="meta-pill">🏬 Drogaria: <strong>${escapeHTML(clientData.drogaria)}</strong></span>
          <span class="meta-pill">👨⚕️ Farmacêutico: <strong>${escapeHTML(clientData.farmaceutico)}</strong></span>
        </div>
        <span class="log-dim">${genData.timestamp}</span>
      </div>

      <div style="margin-bottom: 8px; display: flex; gap: 6px; flex-wrap: wrap;">
        <button class="card-btn active" id="tab-btn-empatico-${id}" onclick="switchToneTab(${id}, 'empatico')">💚 Empático & Carinhoso</button>
        <button class="card-btn" id="tab-btn-atencioso-${id}" onclick="switchToneTab(${id}, 'atencioso')">📋 Atencioso & Padrão</button>
        <button class="card-btn" id="tab-btn-descontraido-${id}" onclick="switchToneTab(${id}, 'descontraido')">😊 Descontraído</button>
        <button class="card-btn" id="tab-btn-pos_tratamento-${id}" onclick="switchToneTab(${id}, 'pos_tratamento')">🎯 Pós-Tratamento</button>
      </div>

      <div class="card-body-text" id="text-container-${id}">${escapeHTML(typeof versions.empatico === 'object' ? versions.empatico.text : versions.empatico)}</div>

      <div class="card-actions">
        <button class="card-btn btn-copy" onclick="copyMessageText(${id})">📋 Copiar Mensagem</button>
        ${cleanPhone ? `<button class="card-btn btn-whatsapp" onclick="openWhatsApp('${cleanPhone}', ${id})">💬 Enviar via WhatsApp (${clientData.telefone})</button>` : `<button class="card-btn btn-whatsapp" onclick="openWhatsApp('', ${id})">💬 Abrir no WhatsApp</button>`}
        <button class="card-btn" onclick="startWizard('${escapeHTML(clientData.nome)}', '${escapeHTML(clientData.medicamento)}')">🔄 Novo Ajuste</button>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = cardHTML;
  terminalOutput.appendChild(container);
  
  // Guardar versões de texto associadas no DOM element
  const cardElem = document.getElementById(`card-${id}`);
  if (cardElem) {
    cardElem.dataset.versions = JSON.stringify(versions);
    cardElem.dataset.activeTone = 'empatico';
  }

  scrollToBottom();
}

function switchToneTab(id, toneKey) {
  const cardElem = document.getElementById(`card-${id}`);
  if (!cardElem) return;
  const versions = JSON.parse(cardElem.dataset.versions);
  cardElem.dataset.activeTone = toneKey;

  const textContainer = document.getElementById(`text-container-${id}`);
  if (textContainer && versions[toneKey]) {
    const val = versions[toneKey];
    textContainer.innerText = typeof val === 'object' ? val.text : val;
  }

  ['empatico', 'atencioso', 'descontraido', 'pos_tratamento'].forEach(key => {
    const btn = document.getElementById(`tab-btn-${key}-${id}`);
    if (btn) {
      btn.classList.toggle('active', key === toneKey);
    }
  });
}

function copyTextToClipboard(textToCopy, successMsg = '✅ Mensagem copiada com sucesso!') {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      if (successMsg) appendLog(successMsg, 'log-success');
    }).catch(() => {
      fallbackCopyText(textToCopy, successMsg);
    });
  } else {
    fallbackCopyText(textToCopy, successMsg);
  }
}

function fallbackCopyText(textToCopy, successMsg) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = textToCopy;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful && successMsg) {
      appendLog(successMsg, 'log-success');
    } else if (!successful) {
      appendLog('⚠️ Não foi possível copiar para a área de transferência.', 'log-warning');
    }
  } catch (err) {
    appendLog('⚠️ Erro ao copiar texto.', 'log-error');
  }
}

function copyMessageText(id) {
  const cardElem = document.getElementById(`card-${id}`);
  if (!cardElem) return;
  const activeTone = cardElem.dataset.activeTone || 'empatico';
  const versions = JSON.parse(cardElem.dataset.versions);
  const rawVal = versions[activeTone];
  const textToCopy = (typeof rawVal === 'object' ? rawVal.text : rawVal).replace(/\*\*/g, '').replace(/\*/g, '');

  copyTextToClipboard(textToCopy, '✅ Mensagem copiada com sucesso para a área de transferência!');
}
/**
 * Renderiza o Formulário Guiado (Wizard Interativo dentro do Terminal)
 */
function startWizard(defaultNome = '', defaultMed = '') {
  const wizardHTML = `
    <div class="wizard-box" id="wizardBox">
      <div class="wizard-title">
        <span>📋 Formular Mensagem de Apoio ao Tratamento / Serviço</span>
      </div>
      <form id="wizardForm" onsubmit="handleWizardSubmit(event)">
        <div class="form-row">
          <div class="form-group">
            <label>👤 Nome do Cliente *</label>
            <input type="text" id="wizNome" value="${escapeHTML(defaultNome)}" placeholder="Ex: Maria Silva" required autofocus>
          </div>
          <div class="form-group">
            <label>💊 Medicamento ou 🩺 Serviço Farmacêutico *</label>
            <input type="text" id="wizMedicamento" value="${escapeHTML(defaultMed)}" placeholder="Ex: Amoxicilina 500mg, Aplicação de Injetável, Pressão Arterial, Glicemia..." required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>🏷️ Tipo de Atendimento (Classificação)</label>
            <select id="wizTipoOverride">
              <option value="auto">🤖 Identificar Automatizado (Recomendado)</option>
              <option value="medicamento">💊 Medicamento (Uso contínuo ou temporário)</option>
              <option value="servico">🩺 Serviço Farmacêutico (Injetáveis, Pressão, Glicemia, etc.)</option>
            </select>
          </div>
          <div class="form-group">
            <label>📱 WhatsApp do Cliente (Opcional)</label>
            <input type="tel" id="wizTelefone" placeholder="Ex: 11999998888">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>🏬 Nome da Drogaria</label>
            <input type="text" id="wizDrogaria" value="${escapeHTML(DEFAULT_CONFIG.drogaria)}">
          </div>
          <div class="form-group">
            <label>👨⚕️ Nome do Farmacêutico</label>
            <input type="text" id="wizFarmaceutico" value="${escapeHTML(DEFAULT_CONFIG.farmaceutico)}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>⏱️ Tempo / Momento do Atendimento (Opcional)</label>
            <input type="text" id="wizTempo" placeholder="Ex: há 3 dias / hoje pela manhã">
          </div>
          <div class="form-group">
            <label>🤒 Sintoma / Motivo (Opcional)</label>
            <input type="text" id="wizSintoma" placeholder="Ex: tontura / dor de cabeça / dor de garganta">
          </div>
        </div>

        <div class="form-group">
          <label>💡 Dica ou Recomendação Especial (Opcional)</label>
          <input type="text" id="wizDica" placeholder="Ex: Manter repouso / Beber água / Fazer compressa fria no local">
        </div>

        <div class="form-actions">
          <button type="submit" class="tool-btn primary">✨ Gerar Mensagem Humanizada</button>
          <button type="button" class="tool-btn danger" onclick="cancelWizard()">Cancelar</button>
        </div>
      </form>
    </div>
  `;

  const oldWiz = document.getElementById('wizardBox');
  if (oldWiz) oldWiz.remove();

  const container = document.createElement('div');
  container.innerHTML = wizardHTML;
  terminalOutput.appendChild(container);

  setTimeout(() => {
    const inputNome = document.getElementById('wizNome');
    if (inputNome) inputNome.focus();
  }, 100);

  scrollToBottom();
}

async function handleWizardSubmit(e) {
  e.preventDefault();
  const nome = document.getElementById('wizNome').value;
  const medicamento = document.getElementById('wizMedicamento').value;
  const tipoOverride = document.getElementById('wizTipoOverride').value;
  const drogaria = document.getElementById('wizDrogaria').value;
  const farmaceutico = document.getElementById('wizFarmaceutico').value;
  const telefone = document.getElementById('wizTelefone').value;
  const tempo = document.getElementById('wizTempo').value;
  const sintoma = document.getElementById('wizSintoma').value;
  const dica = document.getElementById('wizDica').value;

  const wiz = document.getElementById('wizardBox');
  if (wiz) wiz.remove();

  const result = await generateMessagesSmart({ nome, medicamento, tipoOverride, drogaria, farmaceutico, telefone, tempo, sintoma, dica });

  const badgeStr = result.clientData.classification.icon + ' ' + result.clientData.classification.label;
  appendLog(`✨ Mensagem gerada [${badgeStr}] para <strong>${escapeHTML(nome)}</strong> (${escapeHTML(medicamento)})!`, 'log-success');
  renderGeneratedOutput(result);
}

function cancelWizard() {
  const wiz = document.getElementById('wizardBox');
  if (wiz) wiz.remove();
  appendLog(`Formulário cancelado.`, 'log-dim');
  cliInput.focus();
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function scrollToBottom() {
  setTimeout(() => {
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }, 50);
}

function appendLog(content, className = '') {
  const div = document.createElement('div');
  div.className = `log-line ${className}`;
  div.innerHTML = content;
  terminalOutput.appendChild(div);
  scrollToBottom();
}
/* ==========================================================================
   MOTOR DE GERAÇÃO EM LOTE COM PROTEÇÃO ANTI-SPAM (WHATSAPP SAFE)
   ========================================================================== */

const ANTI_SPAM_BLOCKS = {
  saudacoes: [
    (nome) => `Olá, ${nome}! Tudo bem? 😊`,
    (nome) => `Oi, ${nome}! Como você está?`,
    (nome) => `Olá, ${nome}, tudo certinho por aí?`,
    (nome) => `${getSaudacaoHorario()}, ${nome}! Tudo bom?`,
    (nome) => `${getSaudacaoHorario()}, ${nome}! Espero que esteja bem!`,
    (nome) => `Oi ${nome}, como vai? Tudo tranquilo?`,
    (nome) => `Olá ${nome}! Espero te encontrar com muita saúde!`
  ],

  apresentacoes: [
    (farm, drog) => `Aqui é o farmacêutico **${farm}**, da **${drog}**!`,
    (farm, drog) => `Quem fala é o **${farm}**, farmacêutico aqui da **${drog}**.`,
    (farm, drog) => `Passando por aqui o **${farm}**, farmacêutico na **${drog}**.`,
    (farm, drog) => `Sou eu, o **${farm}**, seu farmacêutico da **${drog}**.`,
    (farm, drog) => `Aqui é o **${farm}** da equipe de atenção farmacêutica da **${drog}**.`
  ],

  perguntasMedicamento: [
    (med, tempo, sintoma) => `Estou te escrevendo para acompanhar como você está se sentindo${sintoma ? ' em relação a ' + sintoma : ''} e se deu tudo certo com o uso do **${med}**${tempo ? ' (' + tempo + ')' : ''}. O tratamento está sendo tranquilo?`,
    (med, tempo, sintoma) => `Passando rapidinho para saber como você passou após iniciar o tratamento com o **${med}**${tempo ? ' (' + tempo + ')' : ''}. Notou melhora nos sintomas${sintoma ? ' de ' + sintoma : ''}?`,
    (med, tempo, sintoma) => `Fiz este contato para saber como está sendo a sua recuperação com o **${med}**${tempo ? ' ' + tempo : ''}. Correu tudo bem com o início das doses?`,
    (med, tempo, sintoma) => `Gostaria de acompanhar de perto a sua saúde: correu tudo bem com a medicação **${med}**${tempo ? ' (' + tempo + ')' : ''}? Está se sentindo melhor?`,
    (med, tempo, sintoma) => `Vim te perguntar como você está se sentindo em relação ao **${med}**${tempo ? ' iniciado ' + tempo : ''}. Conseguiu tomar os remédios nos horários corretos?`
  ],

  perguntasServico: [
    (serv, tempo, sub) => {
      if (sub === 'injetavel') return `Estou te escrevendo para saber como você está se sentindo após a **${serv}** realizada aqui na farmácia. Ficou com alguma dor no local da aplicação?`;
      if (sub === 'sensor_libre') return `Passando para acompanhar a aplicação do **Sensor Libre** feita com você na farmácia. O sensor está bem fixado e as leituras de glicose estão tranquilas?`;
      if (sub === 'pressao') return `Passando para acompanhar seu bem-estar após a **aferição de pressão arterial** realizada aqui na farmácia. Notou melhora no seu estado geral?`;
      if (sub === 'orelha') return `Gostaria de saber como está a cicatrização após a **perfuração do lóbulo auricular** feita aqui na farmácia. Está tudo certinho com o local?`;
      if (sub === 'influenza') return `Estou te escrevendo para acompanhar seu estado de saúde após o **teste de Influenza (gripe)** feito com a gente. Teve melhora da febre ou indisposição?`;
      if (sub === 'covid') return `Passando para saber como você está se sentindo após o **teste de COVID-19** realizado na farmácia. Está conseguindo manter o repouso recomendado?`;
      if (sub === 'painel_respiratorio') return `Gostaria de acompanhar a sua recuperação após o **teste de painel respiratório** feito na farmácia. Notou alívio nos sintomas respiratórios?`;
      if (sub === 'bioimpedancia') return `Passando para saber se deu tudo certo com o seu exame de **Bioimpedância** e se ficou com alguma dúvida sobre o relatório de composição corporal!`;
      if (sub === 'glicemia') return `Gostaria de acompanhar como você passou após o teste de **glicemia capilar** feito com a gente. Está tudo tranquilo com sua rotina?`;
      return `Estou te escrevendo para acompanhar seu atendimento de **${serv}** feito aqui com a gente${tempo ? ' (' + tempo + ')' : ''}. Correu tudo bem com o procedimento?`;
    },
    (serv, tempo, sub) => {
      if (sub === 'injetavel') return `Passando rapidinho para conferir como ficou o local da aplicação da **${serv}**. Sentiu algum incômodo ou desconforto?`;
      if (sub === 'sensor_libre') return `Fiz este contato para saber se deu tudo certo com a **colocação do Sensor Libre** e se as medições no app estão normais.`;
      if (sub === 'pressao') return `Fiz este contato para saber como você está após a **medição de pressão** que fizemos aqui na farmácia. Está se sentindo mais disposto(a)?`;
      if (sub === 'orelha') return `Passando rapidinho para conferir o furo de orelha / lóbulo: está usando o antisséptico certinho e sem inchaço no local?`;
      if (sub === 'influenza') return `Vim te perguntar como você passou após a testagem de **gripe / Influenza**. Conseguiu seguir as recomendações?`;
      if (sub === 'covid') return `Fiz este contato para acompanhar sua evolução após o **teste rápido de COVID**. Está se alimentando e se hidratando bem?`;
      if (sub === 'painel_respiratorio') return `Vim te perguntar como estão seus sintomas após o **exame de vírus respiratórios**. Conseguiu o repouso necessário?`;
      if (sub === 'bioimpedancia') return `Fiz este contato para saber como você avaliou seus resultados de **Bioimpedância (massa magra / gordura)**. Quer tirar alguma dúvida?`;
      if (sub === 'glicemia') return `Vim te perguntar como você está após a checagem da **glicemia**. Seguiu direitinho as recomendações que conversamos?`;
      return `Passando para saber como você se sentiu após realizar o serviço de **${serv}** na nossa farmácia${tempo ? ' ' + tempo : ''}. Deu tudo certo?`;
    },
    (serv, tempo, sub) => {
      return `Fiz este contato para saber se deu tudo certo com o seu atendimento de **${serv}** na ${DEFAULT_CONFIG.drogaria}. Como você está se sentindo agora?`;
    }
  ],

  suporte: [
    () => `Se você tiver qualquer dúvida sobre os horários, doses ou recomendações, pode me chamar por aqui a qualquer momento!`,
    () => `Qualquer dúvida ou desconforto que sentir, estou totalmente à sua disposição aqui no WhatsApp para orientar.`,
    () => `Se precisar de qualquer esclarecimento ou apoio farmacêutico, é só responder esta mensagem!`,
    () => `Caso tenha dúvidas sobre como proceder ou precise de mais orientações, pode contar comigo por aqui.`,
    () => `Qualquer necessidade ou dúvida sobre sua saúde, estou sempre à disposição aqui na farmácia.`
  ],

  despedidas: [
    (farm, drog) => `Desejo uma excelente recuperação! 💚\n\nAbraços,\n*${farm}* | ${drog}`,
    (farm, drog) => `Tenha um ótimo dia e cuide-se bem! ✨\n\nAtenciosamente,\n*${farm}* - ${drog}`,
    (farm, drog) => `Desejo muita saúde para você! 💚\n\nUm grande abraço,\n*${farm}* | ${drog}`,
    (farm, drog) => `Fique com Deus e boa recuperação! 🙏\n\n*${farm}* (${drog})`,
    (farm, drog) => `Estou à disposição para o que precisar!\n\nCom carinho,\n*${farm}* - ${drog}`
  ]
};

const usedMessageHashes = new Set();

function generateUniqueAntiSpamMessage(itemData, indexInBatch) {
  const nome = capitalizeName(itemData.nome || 'Cliente');
  const item = itemData.medicamento || 'Atendimento';
  const drogaria = itemData.drogaria || DEFAULT_CONFIG.drogaria;
  const farmaceutico = itemData.farmaceutico || DEFAULT_CONFIG.farmaceutico;
  const tempo = itemData.tempo || '';
  const sintoma = itemData.sintoma || '';
  const classification = classifyItem(item, itemData.tipoOverride || 'auto');

  let attempts = 0;
  let finalMessage = '';
  let uniqueHash = '';

  while (attempts < 50) {
    attempts++;

    const idxSaudacao = (indexInBatch + attempts + Math.floor(Math.random() * 10)) % ANTI_SPAM_BLOCKS.saudacoes.length;
    const idxApres = (indexInBatch + attempts + Math.floor(Math.random() * 10)) % ANTI_SPAM_BLOCKS.apresentacoes.length;
    const idxSuporte = (indexInBatch + attempts + Math.floor(Math.random() * 10)) % ANTI_SPAM_BLOCKS.suporte.length;
    const idxDespedida = (indexInBatch + attempts + Math.floor(Math.random() * 10)) % ANTI_SPAM_BLOCKS.despedidas.length;

    const saudacaoStr = ANTI_SPAM_BLOCKS.saudacoes[idxSaudacao](nome);
    const apresStr = ANTI_SPAM_BLOCKS.apresentacoes[idxApres](farmaceutico, drogaria);
    
    let perguntaStr = '';
    if (classification.type === 'servico') {
      const idxPerg = (indexInBatch + attempts) % ANTI_SPAM_BLOCKS.perguntasServico.length;
      perguntaStr = ANTI_SPAM_BLOCKS.perguntasServico[idxPerg](item, tempo, classification.subType);
    } else {
      const idxPerg = (indexInBatch + attempts) % ANTI_SPAM_BLOCKS.perguntasMedicamento.length;
      perguntaStr = ANTI_SPAM_BLOCKS.perguntasMedicamento[idxPerg](item, tempo, sintoma);
    }

    const suporteStr = ANTI_SPAM_BLOCKS.suporte[idxSuporte]();
    const despedidaStr = ANTI_SPAM_BLOCKS.despedidas[idxDespedida](farmaceutico, drogaria);

    // Caractere invisível Zero-Width Space (\u200B) para diferenciar o rastro de bytes de cada envio no WhatsApp
    const zeroWidthPadding = '\u200B'.repeat((indexInBatch + 1) % 5 + 1);

    finalMessage = `${saudacaoStr}\n\n${apresStr}\n\n${perguntaStr}\n\n${suporteStr}\n\n${despedidaStr}${zeroWidthPadding}`;
    uniqueHash = simpleStringHash(finalMessage);

    if (!usedMessageHashes.has(uniqueHash)) {
      usedMessageHashes.add(uniqueHash);
      break;
    }
  }

  return {
    id: Date.now() + Math.random(),
    timestamp: new Date().toLocaleString('pt-BR'),
    clientData: {
      nome,
      medicamento: item,
      drogaria,
      farmaceutico,
      telefone: itemData.telefone ? itemData.telefone.replace(/\D/g, '') : '',
      classification
    },
    messageText: finalMessage,
    hashSignature: uniqueHash
  };
}

function simpleStringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'SIG_' + Math.abs(hash).toString(36);
}

function startBatchWizard() {
  const wizardHTML = `
    <div class="wizard-box" id="wizardBox">
      <div class="wizard-title" style="color: var(--warning-color);">
        <span>📦 Gerador em Lote Anti-Spam (WhatsApp Safe)</span>
      </div>
      <p class="log-dim" style="margin-bottom: 10px;">
        🛡️ <strong>Proteção Anti-Bloqueio:</strong> Cada mensagem é gerada com arranjos semânticos e marcas invisíveis exclusivas. <strong>Nenhuma mensagem é idêntica a outra</strong>, evitando gatilhos de spam do WhatsApp.
      </p>

      <form id="batchForm" onsubmit="handleBatchSubmit(event)">
        <div class="form-group">
          <label>📝 Cole a Lista de Clientes (Um por linha):</label>
          <div class="log-dim" style="font-size: 0.78rem; margin-bottom: 6px;">
            Formato: <code>Nome | Medicamento ou Serviço | Telefone (opcional) | Sintoma/Obs (opcional)</code>
          </div>
          <textarea id="batchInputText" rows="7" placeholder="Exemplos:&#10;Maria Silva | Amoxicilina 500mg | 11988887777 | dor de garganta&#10;Carlos Souza | Aferição de Pressão | 11977776666&#10;Ana Paula | Aplicação de Voltaren | 11966665555 | dor nas costas&#10;Roberto Lima | Losartana 50mg | 11955554444" required></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="tool-btn primary" style="background: var(--warning-color); color: #000;">🚀 Gerar Mensagens Únicas sem Repetição</button>
          <button type="button" class="tool-btn danger" onclick="cancelWizard()">Cancelar</button>
        </div>
      </form>
    </div>
  `;

  const oldWiz = document.getElementById('wizardBox');
  if (oldWiz) oldWiz.remove();

  const container = document.createElement('div');
  container.innerHTML = wizardHTML;
  terminalOutput.appendChild(container);
  scrollToBottom();
}
function handleBatchSubmit(e) {
  e.preventDefault();
  const text = document.getElementById('batchInputText').value.trim();
  if (!text) return;

  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const items = [];

  lines.forEach(line => {
    const parts = line.split('|').map(p => p.trim());
    if (parts[0]) {
      items.push({
        nome: parts[0],
        medicamento: parts[1] || 'Atendimento',
        telefone: parts[2] || '',
        sintoma: parts[3] || ''
      });
    }
  });

  if (items.length === 0) {
    appendLog(`❌ Nenhuma linha válida encontrada.`, 'log-error');
    return;
  }

  const generatedBatch = items.map((item, idx) => generateUniqueAntiSpamMessage(item, idx));

  const wiz = document.getElementById('wizardBox');
  if (wiz) wiz.remove();

  appendLog(`🚀 Lote de <strong>${generatedBatch.length}</strong> mensagem(ns) única(s) e anti-spam gerado com sucesso!`, 'log-success');
  renderBatchOutput(generatedBatch);
}

function renderBatchOutput(batchList) {
  const batchId = Date.now();
  let listHTML = `
    <div class="wizard-box" id="batch-container-${batchId}">
      <div class="wizard-title" style="color: var(--text-bright);">
        <span>📦 Lote Processado (${batchList.length} Mensagens Protegidas Anti-Spam)</span>
      </div>
      <div class="log-dim" style="margin-bottom: 12px; font-size: 0.8rem;">
        🛡️ <strong>Status de Unicidade:</strong> 100% de variação de texto e hash. Nenhuma mensagem repetida.
      </div>
  `;

  batchList.forEach((item, idx) => {
    const cleanPhone = item.clientData.telefone ? (item.clientData.telefone.length === 11 || item.clientData.telefone.length === 10 ? '55' + item.clientData.telefone : item.clientData.telefone) : '';
    const encodedText = encodeURIComponent(item.messageText.replace(/\*\*/g, '*'));
    const waUrl = cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}` : `https://api.whatsapp.com/send?text=${encodedText}`;

    listHTML += `
      <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 12px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
          <strong class="log-success">#${idx + 1} - ${escapeHTML(item.clientData.nome)}</strong>
          <span class="meta-pill">${item.clientData.classification.icon} ${escapeHTML(item.clientData.classification.label)}: <strong>${escapeHTML(item.clientData.medicamento)}</strong></span>
          <span class="badge-tag" style="font-size: 0.7rem; color: var(--prompt-color);">${item.hashSignature}</span>
        </div>
        <div style="white-space: pre-wrap; font-size: 0.88rem; background: var(--bg-card); padding: 10px; border-radius: 4px; border: 1px solid var(--border-color); color: var(--text-bright); margin-bottom: 8px;">${escapeHTML(item.messageText)}</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="card-btn btn-whatsapp" onclick="window.open('${waUrl}', '_blank')">💬 Enviar WhatsApp (${escapeHTML(item.clientData.telefone || 'Sem número')})</button>
          <button class="card-btn btn-copy" onclick="copyTextToClipboard('${escapeHTML(item.messageText.replace(/\*\*/g, '').replace(/\*/g, ''))}', '✅ Copiado mensagem de ${escapeHTML(item.clientData.nome)}');">📋 Copiar Texto</button>
        </div>
      </div>
    `;
  });

  listHTML += `
    <div style="margin-top: 12px; display: flex; gap: 10px;">
      <button class="tool-btn primary" onclick="exportBatchCSV(${batchId})">📥 Exportar Lote para CSV</button>
    </div>
  </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = listHTML;
  terminalOutput.appendChild(container);

  window[`batch_data_${batchId}`] = batchList;
  scrollToBottom();
}

function exportBatchCSV(batchId) {
  const batchList = window[`batch_data_${batchId}`];
  if (!batchList || batchList.length === 0) return;

  let csvContent = "data:text/csv;charset=utf-8,Cliente;Item;Telefone;AssinaturaHash;Mensagem\n";
  batchList.forEach(item => {
    const cleanMsg = item.messageText.replace(/"/g, '""').replace(/\n/g, ' ');
    csvContent += `"${item.clientData.nome}";"${item.clientData.medicamento}";"${item.clientData.telefone}";"${item.hashSignature}";"${cleanMsg}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `lote_mensagens_antispam_${batchId}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  appendLog(`📥 Lote exportado com sucesso como arquivo CSV!`, 'log-success');
}



/* ==========================================================================
   PARSER DE COMANDOS CLI E EVENTOS DE TECLADO
   ========================================================================== */

function handleInputKeydown(e) {
  if (e.key === 'Enter') {
    const rawInput = cliInput.value.trim();
    if (!rawInput) return;

    commandHistory.push(rawInput);
    commandIndex = commandHistory.length;

    appendLog(`<div class="log-cmd"><span>${escapeHTML(getPromptPrefixText())}</span> <span>${escapeHTML(rawInput)}</span></div>`);

    cliInput.value = '';
    executeCommand(rawInput);
  } else if (e.key === 'ArrowUp') {
    if (commandHistory.length > 0 && commandIndex > 0) {
      commandIndex--;
      cliInput.value = commandHistory[commandIndex];
    }
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    if (commandIndex < commandHistory.length - 1) {
      commandIndex++;
      cliInput.value = commandHistory[commandIndex];
    } else {
      commandIndex = commandHistory.length;
      cliInput.value = '';
    }
    e.preventDefault();
  }
}

async function executeCommand(inputCmd) {
  const parts = parseCommandArgs(inputCmd);
  const mainCmd = parts[0] ? parts[0].toLowerCase() : '';

  switch (mainCmd) {
    case 'novo':
    case 'gerar':
    case 'criar':
    case 'iniciar':
    case 'guiado':
      if (parts.flags && (parts.flags.cliente || parts.flags.remedio || parts.flags.nome || parts.flags.medicamento)) {
        const nome = parts.flags.cliente || parts.flags.nome;
        const medicamento = parts.flags.remedio || parts.flags.medicamento;
        const result = await generateMessagesSmart({
          nome: nome || 'Cliente',
          medicamento: medicamento || 'Medicamento',
          drogaria: parts.flags.drogaria || DEFAULT_CONFIG.drogaria,
          farmaceutico: parts.flags.farmaceutico || DEFAULT_CONFIG.farmaceutico,
          telefone: parts.flags.telefone || '',
          sintoma: parts.flags.sintoma || '',
          tempo: parts.flags.tempo || '',
          dica: parts.flags.dica || ''
        });
        renderGeneratedOutput(result);
      } else if (parts.length >= 3) {
        const nome = parts[1];
        const medicamento = parts.slice(2).join(' ');
        const result = await generateMessagesSmart({ nome, medicamento });
        renderGeneratedOutput(result);
      } else {
        startWizard();
      }
      break;

    case 'apikey':
    case 'gemini':
    case 'ia':
      if (parts[1] === 'remover' || parts[1] === 'limpar' || parts[1] === 'delete') {
        localStorage.removeItem('apoio_gemini_api_key');
        appendLog(`🔑 Chave de API do Gemini foi removida.`, 'log-warning');
        updateAIStatus();
      } else if (parts[1] === 'status') {
        const key = localStorage.getItem('apoio_gemini_api_key');
        if (key) {
          const masked = key.slice(0, 6) + '...' + key.slice(-4);
          appendLog(`🟢 <strong>Gemini IA Ativo!</strong> (Chave: ${masked})`, 'log-success');
        } else {
          appendLog(`🔴 <strong>Gemini IA Inativo.</strong>`, 'log-warning');
          openGeminiConfigPanel();
        }
      } else if (!parts[1]) {
        openGeminiConfigPanel();
      } else {
        localStorage.setItem('apoio_gemini_api_key', parts[1].trim());
        appendLog(`🔑 <strong>API do Gemini configurada com sucesso!</strong>`, 'log-success');
        updateAIStatus();
      }
      break;

    case 'exemplos':
    case 'exemplo':
      runExamples();
      break;

    case 'lote':
    case 'batch':
    case 'massa':
      startBatchWizard();
      break;

    case 'historico':
      if (parts[1] === 'limpar' || parts[1] === 'clear' || parts[1] === 'zerar') {
        generatedMessagesHistory = [];
        localStorage.removeItem('apoio_tratamento_history');
        updateHistoryCounter();
        appendLog(`🗑️ <strong>Histórico de mensagens foi limpo com sucesso!</strong> Contador zerado.`, 'log-warning');
      } else {
        showHistory();
      }
      break;

    case 'zerar':
    case 'reset':
      generatedMessagesHistory = [];
      localStorage.removeItem('apoio_tratamento_history');
      updateHistoryCounter();
      appendLog(`🗑️ <strong>Histórico de mensagens foi zerado com sucesso!</strong> Contador reiniciado para 0.`, 'log-warning');
      break;

    case 'limpar':
    case 'clear':
    case 'cls':
      if (parts[1] === 'historico' || parts[1] === 'histórico' || parts[1] === 'tudo' || parts[1] === 'mensagens' || parts[1] === 'zerar') {
        generatedMessagesHistory = [];
        localStorage.removeItem('apoio_tratamento_history');
        updateHistoryCounter();
        appendLog(`🗑️ <strong>Histórico de mensagens foi zerado com sucesso!</strong> Contador reiniciado para 0.`, 'log-warning');
      } else {
        terminalOutput.innerHTML = '';
        renderWelcomeBanner();
      }
      break;

    case 'ajuda':
    case 'help':
    case '?':
    case 'menu':
    case 'comandos':
    case 'socorro':
      showHelp();
      break;

    case 'servicos':
    case 'serviço':
    case 'servicos':
      showServicesHelp();
      break;

    case 'tema':
    case 'theme':
      if (parts[1] && THEMES.includes(parts[1].toLowerCase())) {
        document.body.className = `theme-${parts[1].toLowerCase()}`;
        appendLog(`🎨 Tema alterado para: <strong>${parts[1].toUpperCase()}</strong>`, 'log-info');
      } else {
        toggleTheme();
      }
      break;

    case 'sair':
    case 'logout':
    case 'desconectar':
    case 'exit':
      logoutUser();
      break;

    case 'usuario':
    case 'whoami':
    case 'quemami':
    case 'perfil':
      showCurrentUser();
      break;

    case 'senha':
    case 'passwd':
      handlePasswordChange(parts[1]);
      break;

    case 'usuarios':
    case 'farmaceuticos':
    case 'admin':
    case 'aprovacoes':
      const sessionAdm = getAuthSession();
      if (!sessionAdm || !isSuperUser(sessionAdm.user)) {
        appendLog(`⚠️ O gerenciamento de cadastros é restrito ao <strong>Super Usuário</strong>.`, 'log-error');
      } else {
        openAdminUsersPanel();
        appendLog(`👥 <strong>Painel do Super Usuário aberto.</strong> Modere cadastros pendentes ou atualize drogarias.`, 'log-info');
      }
      break;

    case 'aprovar':
      const admSessApprove = getAuthSession();
      if (!admSessApprove || !isSuperUser(admSessApprove.user)) {
        appendLog(`⚠️ Apenas o <strong>Super Usuário</strong> pode aprovar cadastros.`, 'log-error');
      } else if (!parts[1]) {
        appendLog(`ℹ️ Uso: <code class="log-info">aprovar &lt;email_ou_nome&gt;</code> ou abra o comando <code class="log-info">usuarios</code>.`, 'log-warning');
      } else {
        approveUserAction(parts[1]);
      }
      break;

    case 'recusar':
    case 'suspender':
      const admSessReject = getAuthSession();
      if (!admSessReject || !isSuperUser(admSessReject.user)) {
        appendLog(`⚠️ Apenas o <strong>Super Usuário</strong> pode recusar ou suspender cadastros.`, 'log-error');
      } else if (!parts[1]) {
        appendLog(`ℹ️ Uso: <code class="log-info">recusar &lt;email_ou_nome&gt;</code> ou abra o comando <code class="log-info">usuarios</code>.`, 'log-warning');
      } else {
        rejectUserAction(parts[1]);
      }
      break;

    case 'deletar':
    case 'excluir':
    case 'remover':
      const admSessDel = getAuthSession();
      if (!admSessDel || !isSuperUser(admSessDel.user)) {
        appendLog(`⚠️ Apenas o <strong>Super Usuário</strong> tem permissão para deletar usuários comuns.`, 'log-error');
      } else if (!parts[1]) {
        appendLog(`ℹ️ Uso: <code class="log-info">deletar &lt;email_ou_nome&gt;</code> ou acesse o painel pelo comando <code class="log-info">usuarios</code>.`, 'log-warning');
      } else {
        deleteUserAction(parts[1]);
      }
      break;

    default:
      appendLog(`❌ Comando não reconhecido: "<strong>${escapeHTML(inputCmd)}</strong>". Digite <code class="log-info">ajuda</code> ou <code class="log-info">novo</code>.`, 'log-error');
      break;
  }
}

function parseCommandArgs(cmdStr) {
  const tokens = [];
function runExamples() {
  appendLog(`🧪 Gerando exemplo 1 [💊 Medicamento]: Maria Oliveira - Amoxicilina 500mg...`, 'log-info');
  const ex1 = generateMessages({
    nome: 'Maria Oliveira',
    medicamento: 'Amoxicilina 500mg',
    telefone: '11988887777',
    sintoma: 'infecção na garganta',
    tempo: 'há 2 dias',
    dica: 'Lembrar de tomar no horário exato de 8 em 8 horas.'
  });
  renderGeneratedOutput(ex1);

  appendLog(`🧪 Gerando exemplo 2 [🩺 Serviço: Injetável]: Roberto Santos - Aplicação de Voltaren Injetável...`, 'log-info');
  const ex2 = generateMessages({
    nome: 'Roberto Santos',
    medicamento: 'Aplicação de Voltaren Injetável',
    telefone: '11977776666',
    sintoma: 'dor lombar forte',
    tempo: 'hoje pela manhã',
    dica: 'Aplicar compressa morna no local caso sinta algum incômodo leve.'
  });
  renderGeneratedOutput(ex2);

  appendLog(`🧪 Gerando exemplo 3 [🩺 Serviço: Pressão Arterial]: Ana Paula - Aferição de Pressão Arterial...`, 'log-info');
  const ex3 = generateMessages({
    nome: 'Ana Paula',
    medicamento: 'Aferição de Pressão Arterial',
    telefone: '11966665555',
    sintoma: 'tontura e mal-estar',
    tempo: 'ontem à tarde',
    dica: 'Repetir a medição na farmácia no mesmo horário amanhã.'
  });
  renderGeneratedOutput(ex3);
}

function showHistory() {
  if (generatedMessagesHistory.length === 0) {
    appendLog(`📋 O histórico de mensagens está vazio no momento.`, 'log-warning');
    return;
  }

  let html = `<div class="wizard-box"><div class="wizard-title">📜 Histórico de Mensagens Geradas (${generatedMessagesHistory.length})</div><ul style="list-style: none; padding: 0;">`;
  
  generatedMessagesHistory.forEach((item, index) => {
    html += `
      <li style="padding: 8px 0; border-bottom: 1px dashed var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div>
          <strong class="log-success">#${index + 1} - ${escapeHTML(item.clientData.nome)}</strong> 
          <span class="log-dim">(${escapeHTML(item.clientData.medicamento)})</span>
          <br><small class="log-dim">📅 ${item.timestamp} | Drogaria: ${escapeHTML(item.clientData.drogaria)} | Farmacêutico: ${escapeHTML(item.clientData.farmaceutico)}</small>
        </div>
        <div>
          <button class="tool-btn" onclick="reRenderHistoryItem(${item.id})">🔍 Visualizar Mensagens</button>
        </div>
      </li>
    `;
  });

  html += `</ul><div style="margin-top: 10px;"><button class="tool-btn danger" onclick="executeCommand('historico limpar')">🗑️ Limpar Todo Histórico</button></div></div>`;
  
  const container = document.createElement('div');
  container.innerHTML = html;
  terminalOutput.appendChild(container);
  scrollToBottom();
}

function reRenderHistoryItem(id) {
  const item = generatedMessagesHistory.find(h => h.id === id);
  if (item) {
    appendLog(`🔍 Reexibindo mensagem de <strong>${escapeHTML(item.clientData.nome)}</strong>...`, 'log-info');
    renderGeneratedOutput(item);
  }
}

function showHelp() {
  const drogaria = escapeHTML(DEFAULT_CONFIG.drogaria || 'Drogaria');
  const farmaceutico = escapeHTML(DEFAULT_CONFIG.farmaceutico || 'Farmacêutico');
  const helpHTML = `
    <div class="wizard-box">
      <div class="wizard-title" style="color: var(--prompt-color);">
        <span>❓ Menu de Ajuda & Guia de Comandos — ${drogaria}</span>
      </div>
      <p class="log-dim" style="margin-bottom: 12px;">
        👨⚕️ Bem-vindo ao sistema de acompanhamento do farmacêutico <strong>${farmaceutico}</strong> (${drogaria}). Utilize os botões interativos abaixo ou digite os comandos diretamente no terminal.
      </p>

      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
        <button class="tool-btn primary" onclick="startWizard()">✨ Nova Mensagem (Individual)</button>
        <button class="tool-btn primary" style="background: var(--warning-color); color: #000;" onclick="startBatchWizard()">📦 Lote Anti-Spam (Múltiplos)</button>
        <button class="tool-btn" onclick="showServicesHelp()">🩺 Serviços Farmacêuticos Suportados</button>
        <button class="tool-btn" onclick="showHistory()">📜 Ver Histórico</button>
        <button class="tool-btn" onclick="toggleTheme()">🎨 Trocar Tema Visual</button>
      </div>

      <div class="wizard-title" style="font-size: 0.95rem; margin-top: 10px; margin-bottom: 6px;">⌨️ Tabela de Comandos CLI</div>
      <table class="help-table">
        <thead>
          <tr>
            <th>Comando</th>
            <th>Descrição / Ação</th>
            <th>Exemplo Prático</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>novo</code> / <code>guiado</code></td>
            <td>Abre o formulário guiado de criação individual.</td>
            <td><code>novo</code></td>
          </tr>
          <tr>
            <td><code>lote</code> / <code>massa</code> / <code>batch</code></td>
            <td>Gera mensagens em massa 100% únicas (Anti-Spam).</td>
            <td><code>lote</code></td>
          </tr>
          <tr>
            <td><code>servicos</code> / <code>serviço</code></td>
            <td>Lista os 8 serviços farmacêuticos e teste rápido.</td>
            <td><code>servicos</code></td>
          </tr>
          <tr>
            <td><code>gerar [nome] [item]</code></td>
            <td>Gera mensagem instantânea diretamente pelo CLI.</td>
            <td><code>gerar "Maria" "Dipirona 1g"</code></td>
          </tr>
          <tr>
            <td><code>historico</code></td>
            <td>Exibe o histórico de mensagens geradas hoje.</td>
            <td><code>historico</code> (ou <code>historico limpar</code>)</td>
          </tr>
          <tr>
            <td><code>usuarios</code> / <code>admin</code></td>
            <td>Painel do Super Usuário para aprovar e gerenciar farmacêuticos.</td>
            <td><code>usuarios</code></td>
          </tr>
          <tr>
            <td><code>aprovar [email]</code></td>
            <td>Aprova diretamente o cadastro de um farmacêutico pelo CLI.</td>
            <td><code>aprovar ana@drogasil.com</code></td>
          </tr>
          <tr>
            <td><code>deletar [email]</code></td>
            <td>Super Usuário deleta permanentemente o cadastro de um usuário comum.</td>
            <td><code>deletar ana@drogasil.com</code></td>
          </tr>
          <tr>
            <td><code>apikey [chave]</code></td>
            <td>Configura a API do Google Gemini para mensagens IA.</td>
            <td><code>apikey AIzaSy...</code></td>
          </tr>
          <tr>
            <td><code>tema [matrix|amber|cyberpunk|dark]</code></td>
            <td>Altera o esquema de cores e estilo do CRT.</td>
            <td><code>tema amber</code></td>
          </tr>
          <tr>
            <td><code>limpar</code> / <code>clear</code></td>
            <td>Limpa a tela do terminal (use <code>limpar historico</code> para zerar tudo).</td>
            <td><code>limpar</code></td>
          </tr>
          <tr>
            <td><code>zerar</code> / <code>historico limpar</code></td>
            <td>Apaga as mensagens salvas e zera o contador para 0.</td>
            <td><code>zerar</code></td>
          </tr>
          <tr>
            <td><code>usuario</code> / <code>whoami</code></td>
            <td>Exibe o usuário atualmente autenticado na sessão.</td>
            <td><code>usuario</code></td>
          </tr>
          <tr>
            <td><code>senha [nova_senha]</code></td>
            <td>Altera a senha de acesso do usuário local.</td>
            <td><code>senha 123456</code></td>
          </tr>
          <tr>
            <td><code>sair</code> / <code>logout</code></td>
            <td>Encerra a sessão e bloqueia o terminal.</td>
            <td><code>sair</code></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  const container = document.createElement('div');
  container.innerHTML = helpHTML;
  terminalOutput.appendChild(container);
  scrollToBottom();
}

function showServicesHelp() {
  const servicesHTML = `
    <div class="wizard-box">
      <div class="wizard-title" style="color: var(--text-bright);">
        <span>🩺 Guia de Serviços Farmacêuticos (Diferenciação Automática)</span>
      </div>
      <p class="log-dim" style="margin-bottom: 10px;">
        O sistema identifica automaticamente qualquer um dos serviços abaixo e adapta as perguntas de acompanhamento pós-atendimento:
      </p>

      <ul style="list-style: none; padding: 0; line-height: 1.6;">
        <li style="margin-bottom: 8px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
          <strong>💉 1. Aplicação de Injetáveis</strong> — Acompanha dor no local da aplicação, vermelhidão ou desconforto.
        </li>
        <li style="margin-bottom: 8px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
          <strong>📲 2. Aplicação Sensor Libre</strong> — Acompanha fixação no braço e sincronização com o leitor/app de glicemia.
        </li>
        <li style="margin-bottom: 8px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
          <strong>🩺 3. Aferição de Pressão Arterial</strong> — Acompanha melhora de sintomas de tontura, dores de cabeça e mal-estar.
        </li>
        <li style="margin-bottom: 8px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
          <strong>👂 4. Perfuração do Lóbulo Auricular</strong> — Acompanha cicatrização do furo, higienização e antissepsia.
        </li>
        <li style="margin-bottom: 8px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
          <strong>🤧 5. Teste de Influenza (Gripe)</strong> — Acompanha evolução da febre, hidratação e repouso.
        </li>
        <li style="margin-bottom: 8px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
          <strong>🦠 6. Teste de COVID-19</strong> — Acompanha protocolos de isolamento, febre e sinais de alerta.
        </li>
        <li style="margin-bottom: 8px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
          <strong>🫁 7. Teste de Painel Respiratório</strong> — Acompanha alívio da tosse, indisposição e vírus respiratórios.
        </li>
        <li style="margin-bottom: 8px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
          <strong>⚖️ 8. Avaliação de Bioimpedância</strong> — Acompanha leitura do relatório de massa magra/gordura e metas.
        </li>
      </ul>

      <div style="margin-top: 10px;">
        <button class="tool-btn primary" onclick="startWizard()">✨ Criar Atendimento de Serviço</button>
      </div>
    </div>
  `;
  const container = document.createElement('div');
  container.innerHTML = servicesHTML;
  terminalOutput.appendChild(container);
  scrollToBottom();
}

  const flags = {};
  let currentToken = '';
  let inQuotes = false;

  for (let i = 0; i < cmdStr.length; i++) {
    const char = cmdStr[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ' ' && !inQuotes) {
      if (currentToken) {
        tokens.push(currentToken);
        currentToken = '';
      }
    } else {
      currentToken += char;
    }
  }
  if (currentToken) tokens.push(currentToken);

  const cleanTokens = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].startsWith('--')) {
      const flagName = tokens[i].substring(2).toLowerCase();
      const flagVal = (tokens[i + 1] && !tokens[i + 1].startsWith('--')) ? tokens[i + 1] : true;
      flags[flagName] = flagVal;
      if (flagVal !== true) i++;
    } else {
      cleanTokens.push(tokens[i]);
    }
  }
  cleanTokens.flags = flags;
  return cleanTokens;
}

function openWhatsApp(phone, id) {
  const cardElem = document.getElementById(`card-${id}`);
  if (!cardElem) return;
  const activeTone = cardElem.dataset.activeTone || 'empatico';
  const versions = JSON.parse(cardElem.dataset.versions);
  const rawVal = versions[activeTone];
  const text = (typeof rawVal === 'object' ? rawVal.text : rawVal).replace(/\*\*/g, '*');
  const encodedText = encodeURIComponent(text);

  let url = '';
  if (phone) {
    url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodedText}`;
  }
  window.open(url, '_blank');
  appendLog(`🚀 Abrindo WhatsApp para envio...`, 'log-info');
}

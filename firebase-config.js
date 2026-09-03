/**
 * Terminal Apoio ao Tratamento - Drogasil Mogilar
 * Arquivo de Configuração e Inicialização do Firebase
 *
 * Sistema de Controle de Acesso e Aprovação de Usuários
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAATwd7_r256J_4TWAFwMw_CZ9AmvZOv6g",
  authDomain: "terminal-apoio.firebaseapp.com",
  projectId: "terminal-apoio",
  storageBucket: "terminal-apoio.firebasestorage.app",
  messagingSenderId: "917231555845",
  appId: "1:917231555845:web:55676648363c3f3972136c",
  measurementId: "G-G54SWDLYRC"
};

// Permite carregar configuração salva localmente (caso configurada dinamicamente)
function getActiveFirebaseConfig() {
  const localConfig = typeof localStorage !== 'undefined' ? localStorage.getItem('apoio_firebase_config') : null;
  if (localConfig) {
    try {
      return JSON.parse(localConfig);
    } catch (e) {
      console.warn('Erro ao ler apoio_firebase_config local:', e);
    }
  }
  return FIREBASE_CONFIG;
}

// Verifica se o Firebase foi preenchido com credenciais reais
function isFirebaseConfigured() {
  const cfg = getActiveFirebaseConfig();
  return Boolean(
    cfg &&
    cfg.apiKey &&
    !cfg.apiKey.includes('SUA_API_KEY') &&
    cfg.projectId &&
    typeof firebase !== 'undefined'
  );
}

// Inicialização segura do Firebase App, Auth e Firestore
let firebaseAuthInstance = null;
let firebaseFirestoreInstance = null;

function initFirebase() {
  if (typeof firebase === 'undefined') {
    return null;
  }

  const cfg = getActiveFirebaseConfig();
  if (!isFirebaseConfigured()) {
    return null;
  }

  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(cfg);
    }
    firebaseAuthInstance = firebase.auth();
    if (typeof firebase.firestore === 'function') {
      try {
        firebaseFirestoreInstance = firebase.firestore();
      } catch (fsErr) {
        console.warn('Aviso ao inicializar Firestore:', fsErr);
      }
    }
    return firebaseAuthInstance;
  } catch (error) {
    console.error('Falha ao inicializar Firebase:', error);
    return null;
  }
}

function getFirestoreDb() {
  if (firebaseFirestoreInstance) return firebaseFirestoreInstance;
  if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') return null;
  initFirebase();
  try {
    firebaseFirestoreInstance = firebase.firestore();
    return firebaseFirestoreInstance;
  } catch (e) {
    console.warn('Falha ao obter instância do Firestore:', e);
    return null;
  }
}

// Função auxiliar de login
async function firebaseLogin(email, password, remember = true) {
  const auth = firebaseAuthInstance || initFirebase();
  if (!auth) {
    throw new Error('FIREBASE_NOT_CONFIGURED');
  }

  const persistence = remember
    ? firebase.auth.Auth.Persistence.LOCAL
    : firebase.auth.Auth.Persistence.SESSION;

  await auth.setPersistence(persistence);
  return await auth.signInWithEmailAndPassword(email, password);
}

// Função auxiliar de cadastro de novo usuário
async function firebaseRegister(email, password, displayName) {
  const auth = firebaseAuthInstance || initFirebase();
  if (!auth) {
    throw new Error('FIREBASE_NOT_CONFIGURED');
  }

  const userCredential = await auth.createUserWithEmailAndPassword(email, password);
  if (displayName && userCredential.user && typeof userCredential.user.updateProfile === 'function') {
    try {
      await userCredential.user.updateProfile({ displayName: displayName });
    } catch (e) {
      console.warn('Erro ao definir displayName no Firebase:', e);
    }
  }

  // Desconecta imediatamente para impedir que contas com status pendente acessem diretamente
  try {
    await auth.signOut();
  } catch (errSignOut) {
    console.warn('Aviso ao deslogar após registro:', errSignOut);
  }

  return userCredential;
}

// Função auxiliar de logout
async function firebaseLogout() {
  const auth = firebaseAuthInstance || initFirebase();
  if (!auth) return;
  return await auth.signOut();
}

/* ==========================================================================
   FUNÇÕES DE INTEGRAÇÃO COM CLOUD FIRESTORE (USUÁRIOS E CONTROLE DE ACESSO)
   ========================================================================== */

/**
 * Salva ou atualiza um usuário na coleção 'users' do Firestore com todos os campos padronizados
 */
async function firestoreSaveUser(userData) {
  const db = getFirestoreDb();
  if (!db || !userData || (!userData.email && !userData.uid)) return null;

  try {
    const docId = userData.uid || userData.email.replace(/[^a-zA-Z0-9_-]/g, '_');
    const docRef = db.collection('users').doc(docId);
    const nowIso = new Date().toISOString();

    const payload = {
      uid: userData.uid || docId,
      name: userData.name || '',
      email: String(userData.email || '').toLowerCase().trim(),
      role: userData.role || 'user',
      status: userData.status || 'pending',
      drogaria: userData.drogaria || 'Drogasil Mogilar',
      createdAt: userData.createdAt || nowIso,
      updatedAt: userData.updatedAt || nowIso,
      approvedAt: userData.approvedAt !== undefined ? userData.approvedAt : null,
      approvedBy: userData.approvedBy !== undefined ? userData.approvedBy : null,
      rejectedAt: userData.rejectedAt !== undefined ? userData.rejectedAt : null,
      rejectedBy: userData.rejectedBy !== undefined ? userData.rejectedBy : null,
      blockedAt: userData.blockedAt !== undefined ? userData.blockedAt : null,
      blockedBy: userData.blockedBy !== undefined ? userData.blockedBy : null,
      rejectionReason: userData.rejectionReason !== undefined ? userData.rejectionReason : null,
      auditLog: Array.isArray(userData.auditLog) ? userData.auditLog : []
    };

    await docRef.set(payload, { merge: true });
    return payload;
  } catch (error) {
    console.warn('Erro ao salvar usuário no Firestore:', error);
    return null;
  }
}

/**
 * Busca um registro de usuário no Firestore por uid ou e-mail
 */
async function firestoreGetUser(uidOrEmail) {
  const db = getFirestoreDb();
  if (!db || !uidOrEmail) return null;

  const term = String(uidOrEmail).trim().toLowerCase();

  try {
    // 1. Tenta buscar pelo doc(id) direto
    const docRef = db.collection('users').doc(uidOrEmail);
    const snap = await docRef.get();
    if (snap.exists) {
      return snap.data();
    }

    // 2. Busca por query pelo campo email
    const emailQuery = await db.collection('users')
      .where('email', '==', term)
      .limit(1)
      .get();

    if (!emailQuery.empty) {
      return emailQuery.docs[0].data();
    }

    // 3. Busca por query pelo campo uid
    const uidQuery = await db.collection('users')
      .where('uid', '==', uidOrEmail)
      .limit(1)
      .get();

    if (!uidQuery.empty) {
      return uidQuery.docs[0].data();
    }

    return null;
  } catch (error) {
    console.warn('Erro ao consultar usuário no Firestore:', error);
    return null;
  }
}

/**
 * Retorna todos os usuários cadastrados no Firestore
 */
async function firestoreGetUsersList() {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const snap = await db.collection('users').get();
    const users = [];
    snap.forEach(doc => {
      users.push(doc.data());
    });
    return users;
  } catch (error) {
    console.warn('Erro ao listar usuários do Firestore:', error);
    return [];
  }
}

/**
 * Atualiza campos e status de um usuário no Firestore
 */
async function firestoreUpdateUserStatus(uidOrEmail, newStatus, extraFields = {}) {
  const db = getFirestoreDb();
  if (!db || !uidOrEmail) return false;

  try {
    let docRef = null;
    const directDoc = await db.collection('users').doc(uidOrEmail).get();
    if (directDoc.exists) {
      docRef = directDoc.ref;
    } else {
      const emailQuery = await db.collection('users')
        .where('email', '==', String(uidOrEmail).toLowerCase().trim())
        .limit(1)
        .get();
      if (!emailQuery.empty) {
        docRef = emailQuery.docs[0].ref;
      }
    }

    if (!docRef) return false;

    const updates = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      ...extraFields
    };

    await docRef.update(updates);
    return true;
  } catch (error) {
    console.warn('Erro ao atualizar status no Firestore:', error);
    return false;
  }
}

/**
 * Aprova um usuário no Firestore
 */
async function firestoreApproveUser(uidOrEmail, adminUid, adminEmail) {
  const nowIso = new Date().toISOString();
  return await firestoreUpdateUserStatus(uidOrEmail, 'approved', {
    approvedAt: nowIso,
    approvedBy: adminUid || adminEmail || 'admin',
    rejectedAt: null,
    rejectedBy: null,
    blockedAt: null,
    blockedBy: null,
    rejectionReason: null
  });
}

/**
 * Rejeita um usuário no Firestore informando motivo
 */
async function firestoreRejectUser(uidOrEmail, adminUid, adminEmail, rejectionReason = '') {
  const nowIso = new Date().toISOString();
  return await firestoreUpdateUserStatus(uidOrEmail, 'rejected', {
    rejectedAt: nowIso,
    rejectedBy: adminUid || adminEmail || 'admin',
    rejectionReason: rejectionReason || 'Não especificado pelo administrador.'
  });
}

/**
 * Bloqueia um usuário no Firestore
 */
async function firestoreBlockUser(uidOrEmail, adminUid, adminEmail) {
  const nowIso = new Date().toISOString();
  return await firestoreUpdateUserStatus(uidOrEmail, 'blocked', {
    blockedAt: nowIso,
    blockedBy: adminUid || adminEmail || 'admin'
  });
}

/**
 * Desbloqueia um usuário no Firestore retornando para status approved
 */
async function firestoreUnblockUser(uidOrEmail, adminUid, adminEmail) {
  const nowIso = new Date().toISOString();
  return await firestoreUpdateUserStatus(uidOrEmail, 'approved', {
    approvedAt: nowIso,
    approvedBy: adminUid || adminEmail || 'admin',
    blockedAt: null,
    blockedBy: null
  });
}

/**
 * Altera o papel (role) de um usuário no Firestore
 */
async function firestoreChangeUserRole(uidOrEmail, newRole) {
  return await firestoreUpdateUserStatus(uidOrEmail, undefined, {
    role: newRole,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Deleta o usuário da coleção 'users' no Firestore
 */
async function firestoreDeleteUser(uidOrEmail) {
  const db = getFirestoreDb();
  if (!db || !uidOrEmail) return false;

  try {
    const directDoc = await db.collection('users').doc(uidOrEmail).get();
    if (directDoc.exists) {
      await directDoc.ref.delete();
      return true;
    }

    const emailQuery = await db.collection('users')
      .where('email', '==', String(uidOrEmail).toLowerCase().trim())
      .limit(1)
      .get();
    if (!emailQuery.empty) {
      await emailQuery.docs[0].ref.delete();
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Erro ao remover usuário do Firestore:', error);
    return false;
  }
}

// Exporta para escopo global no navegador
if (typeof window !== 'undefined') {
  window.FIREBASE_CONFIG = FIREBASE_CONFIG;
  window.getActiveFirebaseConfig = getActiveFirebaseConfig;
  window.isFirebaseConfigured = isFirebaseConfigured;
  window.initFirebase = initFirebase;
  window.getFirestoreDb = getFirestoreDb;
  window.firebaseLogin = firebaseLogin;
  window.firebaseRegister = firebaseRegister;
  window.firebaseLogout = firebaseLogout;
  window.firestoreSaveUser = firestoreSaveUser;
  window.firestoreGetUser = firestoreGetUser;
  window.firestoreGetUsersList = firestoreGetUsersList;
  window.firestoreUpdateUserStatus = firestoreUpdateUserStatus;
  window.firestoreApproveUser = firestoreApproveUser;
  window.firestoreRejectUser = firestoreRejectUser;
  window.firestoreBlockUser = firestoreBlockUser;
  window.firestoreUnblockUser = firestoreUnblockUser;
  window.firestoreChangeUserRole = firestoreChangeUserRole;
  window.firestoreDeleteUser = firestoreDeleteUser;
}

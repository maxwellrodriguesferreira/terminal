/**
 * Terminal Apoio ao Tratamento - Drogasil Mogilar
 * Arquivo de Configuração e Inicialização do Firebase
 *
 * Instruções:
 * 1. Obtenha suas credenciais no Firebase Console (Configurações do Projeto > Seus Aplicativos > Web App </>)
 * 2. Preencha os campos abaixo no objeto FIREBASE_CONFIG.
 * 3. O sistema detectará automaticamente quando o Firebase estiver configurado e ativará a autenticação em nuvem.
 */

const FIREBASE_CONFIG = {

};

// Permite carregar configuração salva localmente (caso configurada dinamicamente)
function getActiveFirebaseConfig() {
  const localConfig = localStorage.getItem('apoio_firebase_config');
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

// Inicialização segura do Firebase App e Auth
let firebaseAuthInstance = null;

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
    return firebaseAuthInstance;
  } catch (error) {
    console.error('Falha ao inicializar Firebase:', error);
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

// Função auxiliar de logout
async function firebaseLogout() {
  const auth = firebaseAuthInstance || initFirebase();
  if (!auth) return;
  return await auth.signOut();
}

// Exporta para escopo global no navegador
if (typeof window !== 'undefined') {
  window.FIREBASE_CONFIG = FIREBASE_CONFIG;
  window.getActiveFirebaseConfig = getActiveFirebaseConfig;
  window.isFirebaseConfigured = isFirebaseConfigured;
  window.initFirebase = initFirebase;
  window.firebaseLogin = firebaseLogin;
  window.firebaseLogout = firebaseLogout;
}

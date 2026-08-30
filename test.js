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
  ['sem dependência de dialog', !app.includes('.showModal()')]
];

const failed = requirements.filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) {
  throw new Error(`Falha nos testes do painel Gemini: ${failed.join(', ')}`);
}

console.log('Painel de configuração Gemini: testes estruturais aprovados.');

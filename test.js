const fs = require('fs');
const js = fs.readFileSync('/home/maxwell/terminal/app.js', 'utf8');

if (js.includes('function openGeminiConfigPanel()')) {
  console.log('Function exists');
} else {
  console.log('Function missing');
}

const fs = require('fs');
const path = require('path');

console.log('Testing server patch script...');
// 1. PlatformSettings.js
const psPath = path.join(__dirname, '..', 'server', 'src', 'models', 'PlatformSettings.js');
let psContent = fs.readFileSync(psPath, 'utf8');
if (!psContent.includes('derivBotBuilderEnabled')) {
  psContent = psContent.replace(
    /derivWsUrl:\s*\{\s*type:\s*String[^\}]*\},/,
    "$& \n  derivBotBuilderEnabled: { type: Boolean, default: true },"
  );
  fs.writeFileSync(psPath, psContent);
  console.log('PlatformSettings updated');
}

// 2. DerivBot.js
const dbPath = path.join(__dirname, '..', 'server', 'src', 'models', 'DerivBot.js');
let dbContent = fs.readFileSync(dbPath, 'utf8');
if (!dbContent.includes('lossFactor')) {
  dbContent = dbContent.replace(
    /cooldownSeconds:\s*\{\s*type:\s*Number[^\}]*\},/,
    "$& \n    lossFactor: { type: Number, default: 1 },\n    customLogicCode: { type: String, default: '' },"
  );
  fs.writeFileSync(dbPath, dbContent);
  console.log('DerivBot updated');
}

console.log('Test patch passed!');

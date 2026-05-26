console.log('process.type:', process.type);
console.log('electron version:', process.versions.electron);
// In Electron main process require('electron') should be intercepted
const e = require('electron');
console.log('electron type:', typeof e);
if (typeof e === 'object' && e !== null) {
  console.log('app defined:', !!e.app);
}
process.exit(0);

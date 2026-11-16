const fs = require('fs');
const path = require('path');

const appFile = path.join(__dirname, '..', 'frontend', 'src', 'App.tsx');
let code = fs.readFileSync(appFile, 'utf8');

code = code.replace(
  /setIsLaunchpadOpen\(true\);\s*localStorage\.setItem\('pos_locked', 'false'\);/,
  `if (user.role === 'rep') {
      setActiveTab('rep');
      setIsLaunchpadOpen(false);
    } else {
      setIsLaunchpadOpen(true);
    }
    localStorage.setItem('pos_locked', 'false');`
);

fs.writeFileSync(appFile, code, 'utf8');
console.log('Successfully updated handleUnlock');

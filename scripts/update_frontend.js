const fs = require('fs');
const path = require('path');

// 1. Update LaunchpadHub.tsx
const hubFile = path.join(__dirname, '..', 'frontend', 'src', 'components', 'LaunchpadHub.tsx');
let hubCode = fs.readFileSync(hubFile, 'utf8');

const targetHub = '  const allCards: HubCardItem[] = [';
const repHubCard = `  const allCards: HubCardItem[] = [
    {
      id: 'rep',
      title: 'Sales Rep Portal (ටැබ් / මොබයිල්)',
      icon: <Truck className="w-9 h-9 text-white" />,
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 55%, #34d399 100%)',
      shadow: '0 14px 28px -6px rgba(16, 185, 129, 0.45)',
      borderColor: '#34d399',
      visible: true,
    },`;

if (!hubCode.includes("id: 'rep'")) {
  hubCode = hubCode.replace(targetHub, repHubCard);
  fs.writeFileSync(hubFile, hubCode, 'utf8');
  console.log('Updated LaunchpadHub.tsx');
}

// 2. Update Sidebar.tsx
const sidebarFile = path.join(__dirname, '..', 'frontend', 'src', 'components', 'Sidebar.tsx');
let sidebarCode = fs.readFileSync(sidebarFile, 'utf8');

const targetSidebar = "visible: hasModuleAccess('pos'),\n    },";
const repSidebarItem = `visible: hasModuleAccess('pos'),
    },
    {
      id: 'rep',
      label: 'Sales Rep (ටැබ් / මොබයිල්)',
      icon: <Truck className="w-4 h-4 shrink-0 text-emerald-400" />,
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold',
      visible: true,
    },`;

if (!sidebarCode.includes("id: 'rep'")) {
  sidebarCode = sidebarCode.replace(targetSidebar, repSidebarItem);
  fs.writeFileSync(sidebarFile, sidebarCode, 'utf8');
  console.log('Updated Sidebar.tsx');
}

// 3. Update App.tsx
const appFile = path.join(__dirname, '..', 'frontend', 'src', 'App.tsx');
let appCode = fs.readFileSync(appFile, 'utf8');

// Add import RepPortal if missing
if (!appCode.includes("import { RepPortal }")) {
  appCode = appCode.replace(
    "import { PosTerminal } from './pages/PosTerminal';",
    "import { PosTerminal } from './pages/PosTerminal';\nimport { RepPortal } from './pages/RepPortal';"
  );
}

// Add hasModuleAccess check for 'rep'
if (!appCode.includes("if (mod === 'rep') return true;")) {
  appCode = appCode.replace(
    "const hasModuleAccess = (mod: string) => {\n    if (!currentUser) return false;",
    "const hasModuleAccess = (mod: string) => {\n    if (!currentUser) return false;\n    if (mod === 'rep') return true;"
  );
}

// Add allTabs include 'rep'
appCode = appCode.replace(
  "'pos', 'wholesale', 'catalog', 'inventory', 'grn', 'customers', 'shifts', 'procurement', 'expenses', 'reports', 'staff', 'settings'",
  "'rep', 'pos', 'wholesale', 'catalog', 'inventory', 'grn', 'customers', 'shifts', 'procurement', 'expenses', 'reports', 'staff', 'settings'"
);

// Add Tab render
const targetTabRender = "{activeTab === 'pos' && hasModuleAccess('pos') && (";
const repTabRender = `{activeTab === 'rep' && (
          <RepPortal
            currentUser={currentUser}
            onBackToPos={() => setActiveTab('pos')}
          />
        )}

        {activeTab === 'pos' && hasModuleAccess('pos') && (`;

if (!appCode.includes("{activeTab === 'rep' && (")) {
  appCode = appCode.replace(targetTabRender, repTabRender);
}

fs.writeFileSync(appFile, appCode, 'utf8');
console.log('Updated App.tsx');

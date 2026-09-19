const fs = require('fs');
const path = require('path');

const storePath = path.resolve('apps/api/data/store.json');
const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));

if (!store.knowledge) store.knowledge = {};

const itemsFromAa = store.knowledge['aaaaaaaa-0000-0000-0000-000000000001'] || [];
console.log('Items in aaaaaaaa-0000-0000-0000-000000000001:', itemsFromAa.length);

if (!store.knowledge['demo-tenant-1']) store.knowledge['demo-tenant-1'] = [];
if (!store.knowledge['8c579042-01a0-4736-87e0-a24e9d4e6c07']) store.knowledge['8c579042-01a0-4736-87e0-a24e9d4e6c07'] = [];

for (const item of itemsFromAa) {
  const existsDemo = store.knowledge['demo-tenant-1'].some((k) => k.title === item.title);
  if (!existsDemo) {
    store.knowledge['demo-tenant-1'].push({
      ...item,
      id: `kn_migrated_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: 'demo-tenant-1',
    });
    console.log('Copied to demo-tenant-1:', item.title);
  }

  const existsUuid = store.knowledge['8c579042-01a0-4736-87e0-a24e9d4e6c07'].some((k) => k.title === item.title);
  if (!existsUuid) {
    store.knowledge['8c579042-01a0-4736-87e0-a24e9d4e6c07'].push({
      ...item,
      id: `kn_migrated_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: '8c579042-01a0-4736-87e0-a24e9d4e6c07',
    });
    console.log('Copied to 8c579042-01a0-4736-87e0-a24e9d4e6c07:', item.title);
  }
}

// Also ensure aiProvider in demo-tenant-1 is 'gemini' since OpenRouter has no balance
if (store.settings && store.settings['demo-tenant-1']) {
  store.settings['demo-tenant-1'].aiProvider = 'gemini';
  store.settings['demo-tenant-1'].geminiModel = 'gemini-2.5-flash';
  console.log('Updated demo-tenant-1 aiProvider to gemini 2.5-flash!');
}

fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
console.log('store.json updated successfully!');

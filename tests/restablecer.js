// Prueba de main/restablecer.js: borrar todo, o todo menos las cuentas premium y sus skins.
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const { borrar, cuentasPremium } = require('../main/restablecer.js');
const mk = () => {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-rst-'));
  for (const d of ['instances/a', 'versions', 'nova/skins', 'nova/otro', 'logs']) fs.mkdirSync(path.join(r, d), { recursive: true });
  fs.writeFileSync(path.join(r, 'instances.json'), '[{"id":"a"}]'); fs.writeFileSync(path.join(r, 'instances/a/x.txt'), 'x');
  fs.writeFileSync(path.join(r, 'nova/skins/s1.png'), 'png'); fs.writeFileSync(path.join(r, 'nova/otro/y'), 'y'); fs.writeFileSync(path.join(r, 'nova/menu.json'), '{}');
  fs.writeFileSync(path.join(r, 'config.json'), JSON.stringify({ ram: 8, theme: 'claro', username: 'Off', activeAccount: 'ms1', ms: { name: 'Prem', token: 'enc:abc' },
    accounts: [{ id: 'off1', type: 'offline', name: 'Off' }, { id: 'ms1', type: 'microsoft', name: 'Prem', token: 'enc:abc' }], skinSel: { ms1: 's1', off1: 's2' } }));
  return r;
};
(async () => {
  let r = mk();
  assert.strictEqual(await borrar(r, true), true);
  assert.deepStrictEqual(fs.readdirSync(r).sort(), ['config.json', 'nova']);
  assert.deepStrictEqual(fs.readdirSync(path.join(r, 'nova')), ['skins']);
  const c = JSON.parse(fs.readFileSync(path.join(r, 'config.json'), 'utf8'));
  assert.strictEqual(c.accounts.length, 1); assert.strictEqual(c.accounts[0].id, 'ms1'); assert.strictEqual(c.activeAccount, 'ms1');
  assert.strictEqual(c.theme, undefined); assert.strictEqual(c.ram, undefined); assert.deepStrictEqual(c.skinSel, { ms1: 's1' });
  assert.ok(fs.existsSync(path.join(r, 'nova/skins/s1.png')));
  r = mk(); assert.strictEqual(await borrar(r, false), false); assert.deepStrictEqual(fs.readdirSync(r), []);
  // conservar sin ninguna cuenta premium = borrar todo
  r = mk(); fs.writeFileSync(path.join(r, 'config.json'), JSON.stringify({ accounts: [{ id: 'off1', type: 'offline', name: 'Off' }] }));
  assert.strictEqual(await borrar(r, true), false); assert.deepStrictEqual(fs.readdirSync(r), []);
  assert.strictEqual(cuentasPremium({}), null);
  console.log('Restablecer correcto: borra todo, o todo menos las cuentas premium con sus skins');
})().catch(e => { console.error(e); process.exit(1); });

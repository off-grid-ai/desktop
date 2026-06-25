// PRO screenshot harness: launches the built app with Pro ACTIVE (no OFFGRID_PRO=0),
// navigates each pro screen, saves PNGs to pro/docs/screenshots/ (private repo).
//   node scripts/screenshots-pro.mjs
import { _electron as electron } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = 'pro/docs/screenshots';
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const app = await electron.launch({ args: ['.'], env: { ...process.env, OFFGRID_PRO: '1' } });
const win = await app.firstWindow();
await win.waitForLoadState('domcontentloaded');
await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; if (w) { w.setSize(1480, 940); w.center(); } });
// Skip onboarding + any capture-permission gate for the shot.
await win.evaluate(() => { localStorage.setItem('onboarding_completed', 'true'); });
await wait(3500);

const shot = async (name) => { await wait(1000); await win.screenshot({ path: `${OUT}/${name}.png` }); console.log('✓', name); };
const nav = async (label) => {
  try { await win.getByRole('button', { name: label, exact: false }).first().click({ timeout: 6000 }); await wait(1800); }
  catch (e) { console.error('nav fail:', label, e.message); }
};

try { await win.getByRole('button', { name: 'Expand sidebar' }).click({ timeout: 4000 }); } catch { /* open */ }
try { await win.getByRole('button', { name: 'Dismiss' }).click({ timeout: 3000 }); } catch { /* no nudge */ }
await wait(600);
await shot('00-launch');                 // whatever the pro build shows first
for (const [label, file] of [
  ['Day', 'day'], ['Reflect', 'reflect'], ['Replay', 'replay'],
  ['Meetings', 'meetings'], ['Actions', 'actions'], ['Entities', 'entities'],
  ['Search', 'search'], ['Notifications', 'notifications'],
]) { await nav(label); await shot(`pro-${file}`); }
await app.close();
console.log('done →', OUT);

const MROWS: [string, string][] = [['KeyQ','Q'],['KeyW','W'],['KeyE','E'],['KeyR','R'],['KeyT','T'],['KeyY','Y'],['KeyU','U'],['KeyI','I'],['KeyO','O'],['KeyP','P']];
const MROW2: [string, string][] = [['KeyA','A'],['KeyS','S'],['KeyD','D'],['KeyF','F'],['KeyG','G'],['KeyH','H'],['KeyJ','J'],['KeyK','K'],['KeyL','L']];
const MROW3: [string, string][] = [['KeyZ','Z'],['KeyX','X'],['KeyC','C'],['KeyV','V'],['KeyB','B'],['KeyN','N'],['KeyM','M']];
const CHROME: Record<string, string> = { KeyT:'New tab',KeyW:'Close tab',KeyR:'Reload',KeyP:'Print',KeyD:'Bookmark',KeyF:'Find',KeyH:'History',KeyJ:'Downloads',KeyL:'Address',KeyN:'New win',KeyS:'Save' };
const CURSOR: Record<string, string> = { KeyH:'◀',KeyJ:'▼',KeyK:'▲',KeyL:'▶',KeyF:'Slow',KeyD:'Click',KeyS:'R-clk',KeyG:'Drag',KeyY:'◀scr',KeyU:'▼scr',KeyI:'▲scr',KeyO:'▶scr' };
type Layer = 'base' | 'ctrl' | 'caps';
let state: Layer = 'ctrl';
const keys: Record<string, { el: HTMLElement; main: HTMLElement; tag: HTMLElement; letter: string }> = {};

function build(root: HTMLElement) {
  for (const row of [MROWS, MROW2, MROW3]) {
    const r = document.createElement('div'); r.className = 'mrow';
    for (const [code, letter] of row) {
      const el = document.createElement('div'); el.className = 'mk';
      const tag = document.createElement('span'); tag.className = 'tg'; tag.textContent = letter;
      const main = document.createElement('span'); main.className = 'm';
      el.append(tag, main); r.append(el);
      keys[code] = { el, main, tag, letter };
    }
    root.append(r);
  }
}

function render() {
  for (const [code, k] of Object.entries(keys)) {
    const label = state === 'ctrl' ? CHROME[code] : state === 'caps' ? CURSOR[code] : undefined;
    k.main.textContent = label ?? k.letter;
    k.el.className = 'mk' + (state === 'base' ? '' : label ? (state === 'ctrl' ? ' rl a' : ' rl co') : ' dim');
  }
  document.querySelectorAll<HTMLButtonElement>('.layerseg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === state)));
}

const root = document.getElementById('minikbd');
if (root) {
  build(root);
  render();
  document.querySelectorAll<HTMLButtonElement>('.layerseg button').forEach((b) =>
    b.addEventListener('click', () => { state = b.dataset.l as Layer; render(); }));
  document.querySelectorAll<HTMLElement>('[data-needs-js]').forEach((el) => { el.hidden = false; });
}

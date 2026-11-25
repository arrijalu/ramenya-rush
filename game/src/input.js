// Keyboard and mouse input handling for Ramen-ya Rush.

export const ACTION_ACT = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SELECT_1 = 4;
export const ACTION_SELECT_2 = 8;
export const ACTION_SELECT_3 = 16;
export const ACTION_SELECT_4 = 32;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const ACT = new Set(['Space', 'KeyE', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const NUM1 = new Set(['Digit1', 'Numpad1']);
const NUM2 = new Set(['Digit2', 'Numpad2']);
const NUM3 = new Set(['Digit3', 'Numpad3']);
const NUM4 = new Set(['Digit4', 'Numpad4']);

export function createInput(target) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let actions = 0;
  let clickCoords = null;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (ACT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_ACT;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (NUM1.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SELECT_1;
    } else if (NUM2.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SELECT_2;
    } else if (NUM3.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SELECT_3;
    } else if (NUM4.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SELECT_4;
    } else return;
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
  });

  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
  });

  target.addEventListener('pointerdown', (event) => {
    actions |= ACTION_ACT;
    const rect = target.getBoundingClientRect();
    clickCoords = {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720
    };
  });

  return {
    vector() {
      return {
        x: (right ? 1 : 0) - (left ? 1 : 0),
        y: (down ? 1 : 0) - (up ? 1 : 0)
      };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      const c = clickCoords;
      clickCoords = null;
      return c;
    }
  };
}

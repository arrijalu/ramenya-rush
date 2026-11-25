// Main entrypoint and game loop for Ramen-ya Rush.
// Includes error handler contract and screenshot rendering runner.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { sound } from './audio.js';

window.onerror = function (message, source, lineno, colno, error) {
  document.title = 'ERR: ' + message;
};

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {}
}

function runShot(name) {
  const scene = stageShot(name, world);
  renderer.draw(world.state, scene.screen, scene.best);

  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    sound.add();
    announce('Shift started. Cook ramen for waiting customers!');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    sound.fail();
    announce(`Shift ended. Score $${world.state.score}. Best $${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & 1 && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (actions & 2 && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (2 | 1) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    handleActions();

    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, 0, null, true);
    } else if (screen === SCREEN_PLAY) {
      const click = input.takeClick();
      const actions = input.takeActions();
      const vec = input.vector();
      world.step(STEP, vec, actions, click, false);
      if (world.state.shiftEnded) {
        endGame();
      }
    } else {
      accumulator = 0;
    }

    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Ramen-ya Rush. Press Space or click to start.');
  renderer.draw(world.state, screen, best);
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

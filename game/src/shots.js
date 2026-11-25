// Deterministic screenshot staging for Ramen-ya Rush (shots.js).
// Each shot scene runs real rules forward from a fresh world using scripted actions so screenshots
// are authentic gameplay frames.

import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { ORDER_STATE } from './world.js';

export function stageShot(name, world) {
  world.reset();

  if (name === 'board') {
    // Scene 1: Kitchen wide shot with live tickets on order board
    for (let i = 0; i < 120; i++) {
      world.step(STEP, { x: 0, y: 0 }, 0, null, true);
    }
    return { screen: SCREEN_PLAY, best: 250 };
  }

  if (name === 'counter') {
    // Scene 2: Counter view with an order claimed and ingredients ready
    for (let i = 0; i < 60; i++) {
      world.step(STEP, { x: 0, y: 0 }, 0, null, true);
    }
    world.interactStation('board'); // Claim ticket
    for (let i = 0; i < 30; i++) {
      world.step(STEP, { x: 0, y: 0 }, 0, null, true);
    }
    return { screen: SCREEN_PLAY, best: 450 };
  }

  if (name === 'assembly') {
    // Scene 3: Dish mid-assembly (broth and noodles added, adding toppings)
    for (let i = 0; i < 30; i++) {
      world.step(STEP, { x: 0, y: 0 }, 0, null, true);
    }
    world.interactStation('board');
    world.interactStation('broth', 'shoyu');
    world.interactStation('noodles');
    world.state.boiler.timer = 5.0; // Perfect firmness
    world.interactStation('noodles'); // Pull noodles into bowl
    world.interactStation('toppings', 'chashu');
    for (let i = 0; i < 30; i++) {
      world.step(STEP, { x: 0, y: 0 }, 0, null, true);
    }
    return { screen: SCREEN_PLAY, best: 620 };
  }

  if (name === 'serve') {
    // Scene 4: Finished bowl ready to serve, timer running
    for (let i = 0; i < 30; i++) {
      world.step(STEP, { x: 0, y: 0 }, 0, null, true);
    }
    const waitingOrder = world.state.orders[0];
    if (waitingOrder) {
      waitingOrder.state = ORDER_STATE.CLAIMED;
      world.state.claimedOrder = waitingOrder;
      world.interactStation('broth', waitingOrder.broth);
      world.state.boiler.timer = 5.0;
      world.interactStation('noodles');
      waitingOrder.toppings.forEach(t => world.interactStation('toppings', t));
    }
    for (let i = 0; i < 30; i++) {
      world.step(STEP, { x: 0, y: 0 }, 0, null, true);
    }
    return { screen: SCREEN_PLAY, best: 850 };
  }

  // Default title fallback
  for (let i = 0; i < 60; i++) {
    world.step(STEP, { x: 0, y: 0 }, 0, null, true);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}

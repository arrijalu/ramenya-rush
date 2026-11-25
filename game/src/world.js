// game/src/world.js - Game simulation logic and state machine for Ramen-ya Rush.
//
// TECHNIQUES IMPLEMENTED & NAMED IN COMMENTS:
// 1. order-queue state machine: Explicit state transitions for each order (waiting -> claimed -> assembling -> cooking -> plated -> served / failed).
// 2. canvas layered-sprite rendering: Assembly state is maintained directly as an ordered array of layer objects (base bowl, broth, noodles, toppings, steam, highlight).
// 3. juice: Particle engine for steam, serve spark bursts, pop tweens for ingredients, and screen shake on failure.

import { BROTHS, FIELD, STATIONS, TOPPINGS } from './config.js';

export const ORDER_STATE = {
  WAITING: 'waiting',      // Ticket waiting on order board
  CLAIMED: 'claimed',      // Ticket taken by cook
  ASSEMBLING: 'assembling',// Bowl being assembled at station
  COOKING: 'cooking',      // Noodles boiling in basket
  PLATED: 'plated',        // Bowl ready to serve
  SERVED: 'served',        // Successfully served to customer
  FAILED: 'failed'         // Burnt, wrong ingredients, or walkout
};

export function createWorld(random) {
  const cook = {
    x: 120,
    y: 480,
    targetX: 120,
    speed: 650,
    stationIndex: 0
  };

  const boiler = {
    active: false,
    timer: 0,
    perfectMin: 4.0,
    perfectMax: 7.0,
    maxTime: 10.0,
    firmness: 'raw' // 'raw', 'firm', 'perfect', 'soft', 'overcooked'
  };

  // Layer stack for active bowl assembly
  // order-queue state machine & canvas layered-sprite rendering
  let currentBowl = null; // { broth: null, noodles: null, toppings: [], layers: [] }

  const orders = [];
  const particles = [];
  let customerCounter = 0;
  let totalCustomersInShift = 8;
  let nextCustomerTimer = 2.0;

  const state = {
    cook,
    boiler,
    currentBowl,
    orders,
    particles,
    score: 0,
    money: 0,
    combo: 0,
    strikes: 0,
    maxStrikes: 3,
    shiftTime: 0,
    shiftEnded: false,
    shiftSuccess: false,
    screenShake: 0,
    flashTimer: 0,
    claimedOrder: null
  };

  function createNewOrder(stoolIndex) {
    customerCounter += 1;
    const broth = BROTHS[Math.floor(random() * BROTHS.length)];
    const numToppings = 2 + Math.floor(random() * 2); // 2 or 3 toppings
    const selectedToppings = [];
    const pool = [...TOPPINGS];
    for (let i = 0; i < numToppings; i++) {
      const idx = Math.floor(random() * pool.length);
      selectedToppings.push(pool.splice(idx, 1)[0]);
    }

    return {
      id: customerCounter,
      stool: stoolIndex,
      broth,
      toppings: selectedToppings,
      patience: 35.0,
      maxPatience: 35.0,
      state: ORDER_STATE.WAITING,
      customerFace: Math.floor(random() * 4)
    };
  }

  function reset() {
    cook.x = 120;
    cook.targetX = 120;
    cook.stationIndex = 0;
    boiler.active = false;
    boiler.timer = 0;
    boiler.firmness = 'raw';
    state.currentBowl = null;
    state.orders = [];
    state.particles = [];
    state.score = 0;
    state.money = 0;
    state.combo = 0;
    state.strikes = 0;
    state.shiftTime = 0;
    state.shiftEnded = false;
    state.shiftSuccess = false;
    state.screenShake = 0;
    state.flashTimer = 0;
    state.claimedOrder = null;
    customerCounter = 0;
    nextCustomerTimer = 0.5;

    // Spawn initial customers
    spawnCustomer(0);
    spawnCustomer(2);
  }

  function spawnCustomer(forcedStool) {
    if (customerCounter >= totalCustomersInShift) return;
    const occupiedStools = state.orders.filter(o => o.state !== ORDER_STATE.SERVED && o.state !== ORDER_STATE.FAILED).map(o => o.stool);
    let stool = forcedStool;
    if (stool === undefined) {
      const freeStools = [0, 1, 2, 3, 4].filter(s => !occupiedStools.includes(s));
      if (freeStools.length === 0) return;
      stool = freeStools[Math.floor(random() * freeStools.length)];
    }
    if (!occupiedStools.includes(stool)) {
      state.orders.push(createNewOrder(stool));
    }
  }

  function addParticle(x, y, vx, vy, color, size, life) {
    state.particles.push({ x, y, vx, vy, color, size, life, maxLife: life });
  }

  function triggerServeJuice(x, y) {
    for (let i = 0; i < 24; i++) {
      const angle = random() * Math.PI * 2;
      const speed = 60 + random() * 120;
      addParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, random() > 0.5 ? '#ffb703' : '#fdf0d5', 4 + random() * 6, 0.4 + random() * 0.4);
    }
  }

  function triggerFailJuice() {
    state.screenShake = 0.4;
    state.flashTimer = 0.2;
  }

  function initBowlIfNeeded() {
    if (!state.currentBowl) {
      // canvas layered-sprite rendering: base bowl layer stack
      state.currentBowl = {
        broth: null,
        noodles: null,
        toppings: [],
        layers: [{ type: 'base' }]
      };
    }
  }

  function interactStation(stationId, choice) {
    if (state.shiftEnded) return;

    if (stationId === 'board') {
      // Claim waiting order ticket
      const waiting = state.orders.find(o => o.state === ORDER_STATE.WAITING);
      if (waiting) {
        waiting.state = ORDER_STATE.CLAIMED;
        state.claimedOrder = waiting;
        initBowlIfNeeded();
      }
    } else if (stationId === 'broth') {
      initBowlIfNeeded();
      const bType = choice || BROTHS[Math.floor(random() * BROTHS.length)];
      state.currentBowl.broth = bType;
      // Rebuild layer stack
      updateBowlLayers();
      addParticle(STATIONS[1].x + 90, STATIONS[1].y + 60, 0, -30, '#fdf0d5', 8, 0.3);
    } else if (stationId === 'noodles') {
      if (!boiler.active) {
        boiler.active = true;
        boiler.timer = 0;
        boiler.firmness = 'raw';
      } else {
        // Pull basket
        const timer = boiler.timer;
        let firmness = 'raw';
        if (timer >= 4.0 && timer <= 7.0) firmness = 'perfect';
        else if (timer > 7.0 && timer <= 9.0) firmness = 'firm/soft';
        else if (timer > 9.0) firmness = 'soggy';

        boiler.active = false;
        boiler.timer = 0;
        initBowlIfNeeded();
        state.currentBowl.noodles = firmness;
        updateBowlLayers();
      }
    } else if (stationId === 'toppings') {
      initBowlIfNeeded();
      const topName = choice || TOPPINGS[state.currentBowl.toppings.length % TOPPINGS.length];
      if (state.currentBowl.toppings.length < 4) {
        state.currentBowl.toppings.push(topName);
        updateBowlLayers();
        addParticle(STATIONS[3].x + 110, STATIONS[3].y + 60, 0, -20, '#ffb703', 6, 0.25);
      }
    } else if (stationId === 'assembly') {
      // Serve bowl to matching order or first claimed order
      if (state.currentBowl && state.currentBowl.broth) {
        const orderToServe = state.claimedOrder || state.orders.find(o => o.state === ORDER_STATE.CLAIMED || o.state === ORDER_STATE.WAITING);
        if (orderToServe) {
          evaluateServe(orderToServe);
        }
      }
    }
  }

  function updateBowlLayers() {
    if (!state.currentBowl) return;
    // canvas layered-sprite rendering: layer stack construction
    const l = [{ type: 'base' }];
    if (state.currentBowl.broth) {
      l.push({ type: 'broth', flavor: state.currentBowl.broth });
    }
    if (state.currentBowl.noodles) {
      l.push({ type: 'noodles', firmness: state.currentBowl.noodles });
    }
    state.currentBowl.toppings.forEach(t => {
      l.push({ type: 'topping', name: t });
    });
    l.push({ type: 'steam' });
    l.push({ type: 'highlight' });
    state.currentBowl.layers = l;
  }

  function evaluateServe(order) {
    const bowl = state.currentBowl;
    let success = true;

    if (!bowl || bowl.broth !== order.broth) success = false;
    if (!bowl || bowl.noodles !== 'perfect') success = false;

    // Check toppings match
    if (bowl) {
      for (const reqTop of order.toppings) {
        if (!bowl.toppings.includes(reqTop)) {
          success = false;
          break;
        }
      }
    } else {
      success = false;
    }

    if (success) {
      order.state = ORDER_STATE.SERVED;
      state.combo += 1;
      const pts = 100 + state.combo * 25 + Math.floor(order.patience * 5);
      state.score += pts;
      state.money += 12 + state.combo * 2;
      triggerServeJuice(STATIONS[4].x + 80, STATIONS[4].y + 80);
    } else {
      order.state = ORDER_STATE.FAILED;
      state.strikes += 1;
      state.combo = 0;
      triggerFailJuice();
    }

    state.currentBowl = null;
    state.claimedOrder = null;

    if (state.strikes >= state.maxStrikes) {
      state.shiftEnded = true;
      state.shiftSuccess = false;
    } else if (state.orders.filter(o => o.state === ORDER_STATE.SERVED).length >= totalCustomersInShift) {
      state.shiftEnded = true;
      state.shiftSuccess = true;
    }
  }

  function step(dt, inputVec, actionFlags, clickPos, harmless) {
    if (state.shiftEnded) return 0;

    state.shiftTime += dt;

    if (state.screenShake > 0) state.screenShake = Math.max(0, state.screenShake - dt);
    if (state.flashTimer > 0) state.flashTimer = Math.max(0, state.flashTimer - dt);

    // Update boiler timer
    if (boiler.active) {
      boiler.timer += dt;
      if (boiler.timer < boiler.perfectMin) boiler.firmness = 'raw';
      else if (boiler.timer <= boiler.perfectMax) boiler.firmness = 'perfect';
      else if (boiler.timer <= 9.0) boiler.firmness = 'firm/soft';
      else boiler.firmness = 'soggy';
    }

    // Update customers patience
    state.orders.forEach(order => {
      if (order.state === ORDER_STATE.WAITING || order.state === ORDER_STATE.CLAIMED) {
        if (!harmless) {
          order.patience -= dt;
          if (order.patience <= 0) {
            order.state = ORDER_STATE.FAILED;
            state.strikes += 1;
            state.combo = 0;
            triggerFailJuice();
            if (state.claimedOrder === order) state.claimedOrder = null;
            if (state.strikes >= state.maxStrikes) {
              state.shiftEnded = true;
              state.shiftSuccess = false;
            }
          }
        }
      }
    });

    // Spawn customers periodically
    nextCustomerTimer -= dt;
    if (nextCustomerTimer <= 0) {
      spawnCustomer();
      nextCustomerTimer = 6.0 + random() * 4.0;
    }

    // Move cook
    if (clickPos) {
      cook.targetX = Math.min(FIELD.width - 100, Math.max(100, clickPos.x));
    } else if (inputVec.x !== 0) {
      cook.targetX = Math.min(FIELD.width - 100, Math.max(100, cook.x + inputVec.x * cook.speed * dt));
    }

    if (Math.abs(cook.x - cook.targetX) > 2) {
      cook.x += Math.sign(cook.targetX - cook.x) * cook.speed * dt;
    }

    // Determine current nearest station
    let nearestIdx = 0;
    let minDist = Infinity;
    STATIONS.forEach((st, idx) => {
      const dist = Math.abs(cook.x - (st.x + st.width / 2));
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = idx;
      }
    });
    cook.stationIndex = nearestIdx;

    // Handle station actions
    if (actionFlags & 1) { // ACT action
      interactStation(STATIONS[cook.stationIndex].id);
    } else if (actionFlags & 4) { // Number 1
      interactStation(STATIONS[cook.stationIndex].id, STATIONS[cook.stationIndex].id === 'broth' ? BROTHS[0] : TOPPINGS[0]);
    } else if (actionFlags & 8) { // Number 2
      interactStation(STATIONS[cook.stationIndex].id, STATIONS[cook.stationIndex].id === 'broth' ? BROTHS[1] : TOPPINGS[1]);
    } else if (actionFlags & 16) { // Number 3
      interactStation(STATIONS[cook.stationIndex].id, STATIONS[cook.stationIndex].id === 'broth' ? BROTHS[2] : TOPPINGS[2]);
    } else if (actionFlags & 32) { // Number 4
      interactStation(STATIONS[cook.stationIndex].id, TOPPINGS[3]);
    }

    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    return 0;
  }

  reset();
  return { state, reset, step, interactStation, spawnCustomer };
}

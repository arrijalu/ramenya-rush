// game/src/render.js - Procedural canvas rendering for Ramen-ya Rush.
//
// TECHNIQUES IMPLEMENTED & NAMED IN COMMENTS:
// 1. canvas layered-sprite rendering: Layer stack rendering function drawLayeredBowl() iterates through ordered components (base, contents, garnish, highlight).
// 2. order-queue state machine visual representation: Renders order board tickets with explicit state indicators (waiting, claimed, cooking, plated).
// 3. juice: Renders animated steam particles, pop tweens, camera screen shake, and failure flashes.

import { BROTHS, BROTH_COLORS, FIELD, FONT, PALETTE, STATIONS, TOPPINGS, TOPPING_COLORS } from './config.js';
import { ORDER_STATE } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score: $');
  const comboLabel = cachedLabel('Combo: x');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = window.innerWidth || FIELD.width;
    const h = window.innerHeight || FIELD.height;
    const width = Math.round(w * ratio);
    const height = Math.round(h * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    if (!Number.isFinite(view.scale) || view.scale <= 0) view.scale = 1;
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align = 'left', weight = 'bold') {
    const key = `${weight} ${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  // canvas layered-sprite rendering: Bowl drawing function
  function drawLayeredBowl(x, y, radius, bowl) {
    if (!bowl) return;
    context.save();
    context.translate(x, y);

    // Layer 1: Base Ceramic Bowl
    context.fillStyle = '#f8f9fa';
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();

    // Red Ceramic Rim Ring
    context.strokeStyle = PALETTE.vermilion;
    context.lineWidth = 6;
    context.stroke();

    context.strokeStyle = '#212529';
    context.lineWidth = 2;
    context.stroke();

    // Inner Bowl Fill / Background
    context.fillStyle = '#2b2d42';
    context.beginPath();
    context.arc(0, 0, radius - 6, 0, Math.PI * 2);
    context.fill();

    // Render layers in stack order
    const layers = bowl.layers || [];
    layers.forEach(layer => {
      if (layer.type === 'broth') {
        const color = BROTH_COLORS[layer.flavor] || BROTH_COLORS.shoyu;
        context.fillStyle = color;
        context.beginPath();
        context.arc(0, 0, radius - 10, 0, Math.PI * 2);
        context.fill();
        // Broth sheen
        context.fillStyle = 'rgba(255, 255, 255, 0.15)';
        context.beginPath();
        context.arc(-radius * 0.3, -radius * 0.3, radius * 0.35, 0, Math.PI * 2);
        context.fill();
      } else if (layer.type === 'noodles') {
        // Noodle bed (wavy lines)
        context.strokeStyle = '#ffd166';
        context.lineWidth = 4;
        context.beginPath();
        for (let i = -radius * 0.5; i <= radius * 0.5; i += 12) {
          context.moveTo(i, -radius * 0.4);
          context.quadraticCurveTo(i + 6, 0, i, radius * 0.4);
        }
        context.stroke();
      } else if (layer.type === 'topping') {
        // Garnish toppings
        const tColor = TOPPING_COLORS[layer.name] || '#ffffff';
        if (layer.name === 'chashu') {
          // Pork slice
          context.fillStyle = tColor;
          context.beginPath();
          context.ellipse(-14, -10, 18, 12, Math.PI / 6, 0, Math.PI * 2);
          context.fill();
          context.strokeStyle = '#521f14';
          context.lineWidth = 2;
          context.stroke();
        } else if (layer.name === 'ajitama') {
          // Soft boiled egg half
          context.fillStyle = '#ffffff';
          context.beginPath();
          context.ellipse(14, -10, 14, 10, -Math.PI / 6, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = '#f4a261';
          context.beginPath();
          context.arc(14, -10, 6, 0, Math.PI * 2);
          context.fill();
        } else if (layer.name === 'nori') {
          // Seaweed sheet
          context.fillStyle = tColor;
          context.fillRect(-22, -radius * 0.6, 16, 26);
        } else if (layer.name === 'menma') {
          // Bamboo shoots
          context.fillStyle = tColor;
          context.fillRect(4, 8, 20, 6);
          context.fillRect(8, 16, 18, 5);
        } else if (layer.name === 'negi') {
          // Chopped scallions
          context.fillStyle = tColor;
          context.beginPath();
          context.arc(-5, 12, 3, 0, Math.PI * 2);
          context.arc(2, 18, 3, 0, Math.PI * 2);
          context.arc(-12, 18, 3, 0, Math.PI * 2);
          context.fill();
        }
      }
    });

    // Glassy Highlight
    context.fillStyle = 'rgba(255, 255, 255, 0.12)';
    context.beginPath();
    context.arc(0, -radius * 0.2, radius * 0.7, Math.PI * 1.1, Math.PI * 1.9);
    context.fill();

    context.restore();
  }

  function drawBackground() {
    // Wall
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Warm Wooden Counter
    context.fillStyle = PALETTE.woodCounter;
    context.fillRect(0, 260, FIELD.width, 360);
    context.fillStyle = PALETTE.woodEdge;
    context.fillRect(0, 260, FIELD.width, 14);
    context.fillRect(0, 610, FIELD.width, 10);

    // Vermilion Noren Curtains at top
    context.fillStyle = PALETTE.vermilion;
    const curtainWidth = FIELD.width / 5;
    for (let i = 0; i < 5; i++) {
      context.fillRect(i * curtainWidth + 4, 0, curtainWidth - 8, 90);
      context.fillStyle = PALETTE.cream;
      context.font = 'bold 24px ' + FONT;
      context.textAlign = 'center';
      context.fillText(['ラーメン', '拉面', 'RAMEN', 'のれん', '一膳'][i], i * curtainWidth + curtainWidth / 2, 55);
      context.fillStyle = PALETTE.vermilion;
    }

    // Glowing Lanterns
    [80, FIELD.width - 80].forEach(lx => {
      const grad = context.createRadialGradient(lx, 140, 10, lx, 140, 90);
      grad.addColorStop(0, 'rgba(255, 183, 3, 0.7)');
      grad.addColorStop(1, 'rgba(255, 183, 3, 0)');
      context.fillStyle = grad;
      context.beginPath();
      context.arc(lx, 140, 90, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = PALETTE.lanternGold;
      context.beginPath();
      context.ellipse(lx, 130, 24, 32, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#d90429';
      context.lineWidth = 3;
      context.stroke();
    });
  }

  function drawStations(state) {
    STATIONS.forEach((st, idx) => {
      const isSelected = state.cook.stationIndex === idx;

      // Station Base Frame
      context.fillStyle = isSelected ? 'rgba(255, 183, 3, 0.25)' : 'rgba(0, 0, 0, 0.3)';
      context.fillRect(st.x, st.y, st.width, st.height);
      context.strokeStyle = isSelected ? PALETTE.lanternGold : PALETTE.woodDark;
      context.lineWidth = isSelected ? 4 : 2;
      context.strokeRect(st.x, st.y, st.width, st.height);

      // Station Label (>= 20px)
      text(st.name, st.x + st.width / 2, st.y - 12, 22, PALETTE.cream, 'center', 'bold');

      // Visual Contents of Stations
      if (st.id === 'broth') {
        // 3 Broth Pots
        BROTHS.forEach((b, i) => {
          const px = st.x + 30 + i * 50;
          const py = st.y + 80;
          context.fillStyle = BROTH_COLORS[b];
          context.beginPath();
          context.arc(px, py, 20, 0, Math.PI * 2);
          context.fill();
          context.strokeStyle = '#495057';
          context.lineWidth = 3;
          context.stroke();
          text(b.substring(0, 1).toUpperCase(), px, py + 6, 18, '#ffffff', 'center', 'bold');
        });
      } else if (st.id === 'noodles') {
        // Noodle Boiler Pot
        context.fillStyle = '#343a40';
        context.fillRect(st.x + 35, st.y + 40, 80, 80);
        context.fillStyle = state.boiler.active ? '#e76f51' : '#495057';
        context.fillRect(st.x + 40, st.y + 45, 70, 70);

        // Boiler Live Timer / Status
        if (state.boiler.active) {
          const t = state.boiler.timer;
          const pct = Math.min(1.0, t / state.boiler.maxTime);
          context.fillStyle = '#212529';
          context.fillRect(st.x + 10, st.y + 130, 130, 16);
          context.fillStyle = t >= 4.0 && t <= 7.0 ? PALETTE.success : (t > 7.0 ? PALETTE.danger : '#ffb703');
          context.fillRect(st.x + 12, st.y + 132, 126 * pct, 12);

          text(`${t.toFixed(1)}s (${state.boiler.firmness})`, st.x + st.width / 2, st.y + 125, 20, PALETTE.cream, 'center', 'bold');
        } else {
          text('Basket Ready', st.x + st.width / 2, st.y + 85, 20, PALETTE.muted, 'center', 'bold');
        }
      } else if (st.id === 'toppings') {
        // Topping bowls preview
        TOPPINGS.forEach((t, i) => {
          const tx = st.x + 25 + (i % 3) * 60;
          const ty = st.y + 45 + Math.floor(i / 3) * 55;
          context.fillStyle = TOPPING_COLORS[t];
          context.beginPath();
          context.arc(tx, ty, 18, 0, Math.PI * 2);
          context.fill();
          text(t.substring(0, 2).toUpperCase(), tx, ty + 5, 14, '#ffffff', 'center', 'bold');
        });
      } else if (st.id === 'assembly') {
        // Plating / Assembly Bowl
        if (state.currentBowl) {
          drawLayeredBowl(st.x + st.width / 2, st.y + st.height / 2, 50, state.currentBowl);
        } else {
          context.strokeStyle = PALETTE.muted;
          context.lineWidth = 2;
          context.beginPath();
          context.arc(st.x + st.width / 2, st.y + st.height / 2, 45, 0, Math.PI * 2);
          context.stroke();
          text('Empty Bowl', st.x + st.width / 2, st.y + st.height / 2 + 6, 20, PALETTE.muted, 'center', 'bold');
        }
      }
    });
  }

  // order-queue state machine visual rendering
  function drawOrderBoard(state) {
    const st = STATIONS[0];
    context.fillStyle = '#fdf0d5';
    context.fillRect(st.x + 10, st.y + 20, st.width - 20, st.height - 30);
    context.strokeStyle = '#c4823d';
    context.lineWidth = 3;
    context.strokeRect(st.x + 10, st.y + 20, st.width - 20, st.height - 30);

    const liveOrders = state.orders.filter(o => o.state === ORDER_STATE.WAITING || o.state === ORDER_STATE.CLAIMED);

    text(`Tickets (${liveOrders.length})`, st.x + st.width / 2, st.y + 45, 22, '#2c1810', 'center', 'bold');

    liveOrders.slice(0, 2).forEach((ord, i) => {
      const ty = st.y + 65 + i * 55;
      context.fillStyle = ord.state === ORDER_STATE.CLAIMED ? '#ffb703' : '#ffffff';
      context.fillRect(st.x + 20, ty, st.width - 40, 48);
      context.strokeStyle = '#2c1810';
      context.lineWidth = 1;
      context.strokeRect(st.x + 20, ty, st.width - 40, 48);

      text(`#${ord.id} ${ord.broth.toUpperCase()}`, st.x + 25, ty + 20, 18, '#2c1810', 'left', 'bold');
      text(ord.toppings.join(','), st.x + 25, ty + 38, 14, '#555555', 'left', 'normal');

      // Patience Bar
      const pPct = Math.max(0, ord.patience / ord.maxPatience);
      context.fillStyle = '#e9ecef';
      context.fillRect(st.x + 20, ty + 44, st.width - 40, 4);
      context.fillStyle = pPct > 0.4 ? PALETTE.success : PALETTE.danger;
      context.fillRect(st.x + 20, ty + 44, (st.width - 40) * pPct, 4);
    });
  }

  function drawCustomersAndStools(state) {
    const stoolY = 660;
    const stoolSpacing = 220;
    const startX = 180;

    for (let i = 0; i < 5; i++) {
      const sx = startX + i * stoolSpacing;

      // Stool
      context.fillStyle = '#a0582a';
      context.fillRect(sx - 25, stoolY, 50, 40);
      context.fillStyle = '#2c1810';
      context.fillRect(sx - 20, stoolY - 10, 40, 10);

      // Customer matching this stool
      const order = state.orders.find(o => o.stool === i && o.state !== ORDER_STATE.SERVED && o.state !== ORDER_STATE.FAILED);
      if (order) {
        // Customer Silhouette / Head
        context.fillStyle = order.state === ORDER_STATE.CLAIMED ? '#457b9d' : '#e63946';
        context.beginPath();
        context.arc(sx, stoolY - 35, 24, 0, Math.PI * 2);
        context.fill();

        // Customer Ticket Bubble
        context.fillStyle = '#ffffff';
        context.fillRect(sx - 45, stoolY - 110, 90, 50);
        context.strokeStyle = '#212529';
        context.lineWidth = 2;
        context.strokeRect(sx - 45, stoolY - 110, 90, 50);

        text(order.broth, sx, stoolY - 92, 16, '#212529', 'center', 'bold');
        text(order.toppings.slice(0, 2).join(' '), sx, stoolY - 74, 14, '#6c757d', 'center', 'normal');

        // Live Patience Bar above head
        const pPct = Math.max(0, order.patience / order.maxPatience);
        context.fillStyle = '#212529';
        context.fillRect(sx - 35, stoolY - 120, 70, 6);
        context.fillStyle = pPct > 0.35 ? PALETTE.success : PALETTE.danger;
        context.fillRect(sx - 35, stoolY - 120, 70 * pPct, 6);
      }
    }
  }

  function drawCook(cook) {
    // Cook Sprite / Silhouette
    context.fillStyle = '#fdf0d5';
    context.beginPath();
    context.arc(cook.x, 430, 22, 0, Math.PI * 2); // Head
    context.fill();

    // Cook Apron
    context.fillStyle = PALETTE.vermilion;
    context.fillRect(cook.x - 24, 452, 48, 55); // Body
    context.fillStyle = '#ffffff';
    context.fillRect(cook.x - 16, 452, 32, 45); // Apron front
  }

  function drawJuiceParticles(particles) {
    particles.forEach(p => {
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      context.fill();
    });
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 30, 20, 28, PALETTE.cream, 'left', 'bold');
    text(comboLabel(state.combo), 280, 20, 28, PALETTE.lanternGold, 'left', 'bold');

    // Strikes / Lives
    text('Strikes:', FIELD.width - 240, 20, 28, PALETTE.cream, 'left', 'bold');
    for (let i = 0; i < state.maxStrikes; i++) {
      context.fillStyle = i < state.strikes ? PALETTE.danger : '#495057';
      context.beginPath();
      context.arc(FIELD.width - 120 + i * 35, 34, 12, 0, Math.PI * 2);
      context.fill();
    }

    // Shift Timer
    const shiftMin = Math.floor(state.shiftTime / 60);
    const shiftSec = Math.floor(state.shiftTime % 60);
    const clockStr = `${shiftMin}:${shiftSec < 10 ? '0' : ''}${shiftSec}`;
    text(`Shift: ${clockStr}`, FIELD.width / 2, 20, 28, PALETTE.cream, 'center', 'bold');
  }

  function drawPanel(title, lines, prompt) {
    const pWidth = 640;
    const pHeight = 320;
    const x = (FIELD.width - pWidth) / 2;
    const y = (FIELD.height - pHeight) / 2;

    context.fillStyle = 'rgba(28, 18, 16, 0.95)';
    context.fillRect(x, y, pWidth, pHeight);
    context.strokeStyle = PALETTE.lanternGold;
    context.lineWidth = 4;
    context.strokeRect(x, y, pWidth, pHeight);

    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 80, 52, PALETTE.cream, 'center', 'bold');
    lines.forEach((l, i) => {
      text(l, FIELD.width / 2, y + 140 + i * 40, 26, PALETTE.muted, 'center', 'normal');
    });
    text(prompt, FIELD.width / 2, y + pHeight - 40, 28, PALETTE.lanternGold, 'center', 'bold');
  }

  function draw(state, screen, best) {
    try {
      resize();

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = PALETTE.backdrop;
      context.fillRect(0, 0, canvas.width, canvas.height);

      let shakeX = 0;
      let shakeY = 0;
      if (state.screenShake > 0) {
        shakeX = (Math.random() - 0.5) * 16;
        shakeY = (Math.random() - 0.5) * 16;
      }

      context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX, view.y + shakeY);

      drawBackground();
      drawStations(state);
      drawOrderBoard(state);
      drawCustomersAndStools(state);
      drawCook(state.cook);
      drawJuiceParticles(state.particles);

      if (state.flashTimer > 0) {
        context.fillStyle = 'rgba(217, 4, 41, 0.3)';
        context.fillRect(0, 0, FIELD.width, FIELD.height);
      }

      if (screen === SCREEN_TITLE) {
        drawPanel('Ramen-ya Rush', ['Work the late-night Tokyo counter.', 'Boil noodles, ladle broth, assemble bowls!', `Best Score: $${best}`], 'Press Space or Click to Start Shift');
        return;
      }

      drawHud(state);

      if (screen === SCREEN_PAUSED) {
        drawPanel('Shift Paused', ['Take a breath, Chef!'], 'Press P or Esc to Resume');
      } else if (screen === SCREEN_OVER || state.shiftEnded) {
        const win = state.shiftSuccess;
        drawPanel(win ? 'Shift Complete!' : 'Shift Closed!', [`Final Score: $${state.score}`, `Best Score: $${best}`], 'Press Space or Click to Play Again');
      }
    } catch (e) {
      console.error('DRAW ERROR:', e);
      document.title = 'DRAW ERR: ' + e.message;
      throw e;
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, drawLayeredBowl };
}

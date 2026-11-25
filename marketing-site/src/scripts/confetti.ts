// One burst of flat pixel confetti over the page, from a point. A throwaway canvas: it takes no clicks, and goes when
// the last piece falls. With reduced motion the caller does not ask for it.
const COLORS = ["#E8892B", "#F6A848", "#FFD66B", "#1B1B18", "#BFE3D0", "#A9C4F5"];
const PIECES = 110, GRAVITY = 1500, DRAG = 1.9, LIFE = 2.8, FADE = 0.6;

interface Piece { x: number; y: number; vx: number; vy: number; w: number; h: number; angle: number; spin: number; flip: number; flipSpeed: number; color: string; shape: boolean }

const between = (a: number, b: number) => a + Math.random() * (b - a);

/** Two cones, up and out to each side of the point */
function piece(x: number, y: number, i: number): Piece {
  const side = i % 2 ? 1 : -1, tilt = between(0.06, 0.95) * side, speed = between(650, 1500), shape = i % 7 === 0;
  return {
    x: x + side * between(0, 10), y, vx: Math.sin(tilt) * speed, vy: -Math.cos(tilt) * speed,
    w: shape ? 20 : between(6, 10), h: shape ? 20 : between(6, 14),
    angle: between(0, Math.PI), spin: between(-6, 6), flip: between(0, Math.PI * 2), flipSpeed: shape ? 0 : between(5, 11),
    color: COLORS[Math.floor(Math.random() * COLORS.length)], shape,
  };
}

/** `shape` is an SVG path of 24 by 24 that some of the pieces take */
export function confetti(x: number, y: number, shape?: string | null): void {
  const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
  if (!ctx) return;
  const vw = innerWidth, vh = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = vw * dpr;
  canvas.height = vh * dpr;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:60;pointer-events:none";
  document.body.append(canvas);

  const path = shape ? new Path2D(shape) : null;
  const pieces = Array.from({ length: PIECES }, (_, i) => piece(x, y, i));
  const start = performance.now();
  let last = start;
  const frame = (now: number) => {
    const dt = Math.min(0.034, Math.max(0, now - last) / 1000), age = (now - start) / 1000, slow = Math.exp(-DRAG * dt);
    last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = Math.min(1, Math.max(0, (LIFE - age) / FADE));
    let falling = false;
    for (const p of pieces) {
      p.vx *= slow;
      p.vy = p.vy * slow + GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      p.flip += p.flipSpeed * dt;
      if (p.y > vh + 30) continue;
      falling = true;
      ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      if (p.shape && path) {
        ctx.scale(p.w / 24, p.h / 24);
        ctx.translate(-12, -12);
        ctx.fill(path);
      } else {
        ctx.scale(1, Math.cos(p.flip));
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
    }
    if (falling && age < LIFE) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

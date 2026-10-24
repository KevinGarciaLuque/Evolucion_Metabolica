import { useEffect, useRef } from "react";

// Fondo animado: doble hélice de ADN + red de nodos metabólicos + partículas.
// Un solo <canvas>, DPR limitado a 2, se pausa fuera de pantalla / pestaña oculta
// y con prefers-reduced-motion dibuja un único cuadro estático.

const TEAL = "45, 212, 191";
const CYAN = "56, 189, 248";
const WHITE = "226, 240, 255";

function rand(a, b) { return a + Math.random() * (b - a); }

export default function GenomeBackground({ className = "", parallax = true, variant = "genome" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, last = 0, t = 0;
    let nodes = [], dust = [];
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    function build() {
      const mobile = w < 720;
      const particles = variant === "particles";
      const nCount = particles ? 0 : Math.round(Math.min(46, (w * h) / (mobile ? 16000 : 26000)));
      nodes = Array.from({ length: nCount }, () => ({
        x: rand(0, w), y: rand(0, h), vx: rand(-0.12, 0.12), vy: rand(-0.12, 0.12),
        r: rand(1.4, 3.2), z: rand(0.4, 1), hue: Math.random() < 0.7 ? TEAL : CYAN,
      }));
      dust = Array.from({ length: particles ? (w < 1024 ? 26 : 60) : mobile ? 22 : 48 }, () => ({
        x: rand(0, w), y: rand(0, h), vy: rand(-0.18, -0.04), r: rand(0.5, 1.4), a: rand(0.15, 0.5),
      }));
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      draw();
    }

    // Una hélice: eje inclinado, dos hebras sinusoidales desfasadas 180° y peldaños.
    function helix(cx, cy, len, amp, angle, phase, alpha, px, py) {
      const steps = Math.round(len / 9);
      const pitch = 150;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const s = (i / steps - 0.5) * len;
        const a = (s / pitch) * Math.PI * 2 + phase;
        const off = Math.sin(a) * amp;       // desplazamiento perpendicular al eje
        const depth = Math.cos(a);           // -1 (atrás) … 1 (adelante)
        const bx = cx + px + cos * s, by = cy + py + sin * s;
        pts.push({ ax: bx - sin * off, ay: by + cos * off, bx: bx + sin * off, by: by - cos * off, depth });
      }
      // peldaños
      for (let i = 0; i < pts.length; i += 3) {
        const p = pts[i];
        const fade = Math.min(1, Math.min(i, pts.length - i) / 14);
        ctx.strokeStyle = `rgba(${CYAN}, ${0.16 * alpha * fade * (0.5 + Math.abs(p.depth) * 0.5)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.ax, p.ay); ctx.lineTo(p.bx, p.by); ctx.stroke();
        for (const [x, y, d] of [[p.ax, p.ay, p.depth], [p.bx, p.by, -p.depth]]) {
          ctx.fillStyle = `rgba(${d > 0 ? TEAL : CYAN}, ${(0.35 + 0.35 * d) * alpha * fade})`;
          ctx.beginPath(); ctx.arc(x, y, 2 + d * 1.1, 0, Math.PI * 2); ctx.fill();
        }
      }
      // hebras
      for (const key of ["a", "b"]) {
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[key + "x"], p[key + "y"]) : ctx.moveTo(p[key + "x"], p[key + "y"])));
        const g = ctx.createLinearGradient(pts[0].ax, pts[0].ay, pts[pts.length - 1].ax, pts[pts.length - 1].ay);
        g.addColorStop(0, `rgba(${TEAL}, 0)`);
        g.addColorStop(0.5, `rgba(${key === "a" ? TEAL : CYAN}, ${0.5 * alpha})`);
        g.addColorStop(1, `rgba(${CYAN}, 0)`);
        ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.stroke();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const px = mouse.x * 14, py = mouse.y * 10;
      const mobile = w < 720;

      // ADN principal (derecha) y secundario más tenue (izquierda)
      if (variant !== "particles") helix(w * (mobile ? 0.82 : 0.86), h * 0.5, h * 1.35, mobile ? 46 : 74, -1.15, t * 0.5, mobile ? 0.55 : 0.95, px * 1.4, py * 1.4);
      if (!mobile && variant !== "particles") helix(w * 0.08, h * 0.62, h * 1.1, 46, -1.15, t * 0.4 + 2, 0.45, px * 0.7, py * 0.7);

      // red de nodos
      const maxD = mobile ? 110 : 150;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const ax = a.x + px * a.z, ay = a.y + py * a.z;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < maxD) {
            ctx.strokeStyle = `rgba(${CYAN}, ${(1 - d / maxD) * 0.16})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(b.x + px * b.z, b.y + py * b.z); ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        const x = n.x + px * n.z, y = n.y + py * n.z;
        const g = ctx.createRadialGradient(x, y, 0, x, y, n.r * 5);
        g.addColorStop(0, `rgba(${n.hue}, ${0.35 * n.z})`);
        g.addColorStop(1, `rgba(${n.hue}, 0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, n.r * 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${WHITE}, ${0.55 * n.z})`;
        ctx.beginPath(); ctx.arc(x, y, n.r * 0.7, 0, Math.PI * 2); ctx.fill();
      }
      // partículas
      for (const d of dust) {
        ctx.fillStyle = `rgba(${WHITE}, ${d.a})`;
        ctx.beginPath(); ctx.arc(d.x + px * d.r * 2.5, d.y + py * d.r * 2.5, d.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    function step(now) {
      raf = requestAnimationFrame(step);
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      t += dt * 0.6; // giro lento del ADN
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
      }
      for (const d of dust) {
        d.y += d.vy;
        if (d.y < -4) { d.y = h + 4; d.x = rand(0, w); }
      }
      draw();
    }

    function onMove(e) {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let io;
    if (!reduce) {
      io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
      io.observe(canvas);
      if (parallax) window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [parallax, variant]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

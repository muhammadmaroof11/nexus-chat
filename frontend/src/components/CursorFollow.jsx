import { useEffect, useRef } from 'react';

/**
 * CursorFollow / SplashCursor component inspired by React Bits (reactbits.dev)
 * Creates a fluid particle trail and luminous spring-damped ambient glow that follows the cursor
 * in the chat area, with interactive ripples on click and velocity-based droplet dispersion.
 */
export default function CursorFollow({ theme = 'light' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;
    let isVisible = false;

    // Pointer coordinates & velocities
    const pointer = {
      x: -1000,
      y: -1000,
      prevX: -1000,
      prevY: -1000,
      vx: 0,
      vy: 0,
      isDown: false,
    };

    // Smooth spring follower orb
    const follower = {
      x: -1000,
      y: -1000,
      vx: 0,
      vy: 0,
    };

    // Particle pool for fluid splash droplets
    const MAX_PARTICLES = 65;
    const particles = [];

    // Click ripples
    const ripples = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    resize();

    // Theme-based fluid color palettes (React Bits aesthetic)
    const getColors = () => {
      const isDark = theme === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        return [
          { r: 99, g: 102, b: 241 },   // Indigo
          { r: 139, g: 92, b: 246 },  // Violet
          { r: 56, g: 189, b: 248 },  // Cyan
          { r: 168, g: 85, b: 247 },  // Purple
        ];
      }
      return [
        { r: 99, g: 102, b: 241 },   // Indigo
        { r: 79, g: 70, b: 229 },   // Deep Indigo
        { r: 129, g: 140, b: 248 },  // Soft Iris
        { r: 14, g: 165, b: 233 },  // Sky
      ];
    };

    let colorIndex = 0;
    const spawnParticle = (x, y, vx, vy) => {
      if (particles.length >= MAX_PARTICLES) {
        particles.shift();
      }
      const palette = getColors();
      colorIndex = (colorIndex + 1) % palette.length;
      const color = palette[colorIndex];
      const speed = Math.hypot(vx, vy);
      const angle = Math.atan2(vy, vx) + (Math.random() - 0.5) * 1.2;
      const particleSpeed = Math.random() * 2.2 + speed * 0.12;

      particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * particleSpeed + (Math.random() - 0.5) * 0.7,
        vy: Math.sin(angle) * particleSpeed + (Math.random() - 0.5) * 0.7,
        size: Math.random() * 7 + 5,
        alpha: 0.5,
        decay: Math.random() * 0.02 + 0.016,
        color,
      });
    };

    const spawnRipple = (x, y) => {
      const palette = getColors();
      ripples.push({
        x,
        y,
        radius: 10,
        maxRadius: 85,
        alpha: 0.55,
        color: palette[Math.floor(Math.random() * palette.length)],
      });
    };

    const onPointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (pointer.x === -1000) {
        pointer.x = x;
        pointer.y = y;
        follower.x = x;
        follower.y = y;
      }

      pointer.vx = x - pointer.prevX;
      pointer.vy = y - pointer.prevY;
      pointer.prevX = pointer.x;
      pointer.prevY = pointer.y;
      pointer.x = x;
      pointer.y = y;
      isVisible = true;

      // Spawn fluid trail particles along velocity vector
      const dist = Math.hypot(pointer.vx, pointer.vy);
      if (dist > 3) {
        const steps = Math.min(Math.floor(dist / 7), 4);
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          const px = pointer.prevX + pointer.vx * t;
          const py = pointer.prevY + pointer.vy * t;
          spawnParticle(px, py, pointer.vx, pointer.vy);
        }
      }
    };

    const onPointerDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pointer.isDown = true;
      spawnRipple(x, y);
      for (let i = 0; i < 7; i++) {
        const angle = (Math.PI * 2 * i) / 7;
        spawnParticle(x, y, Math.cos(angle) * 3.5, Math.sin(angle) * 3.5);
      }
    };

    const onPointerUp = () => {
      pointer.isDown = false;
    };

    const onPointerLeave = () => {
      isVisible = false;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('pointermove', onPointerMove, { passive: true });
      parent.addEventListener('pointerdown', onPointerDown, { passive: true });
      window.addEventListener('pointerup', onPointerUp, { passive: true });
      parent.addEventListener('pointerleave', onPointerLeave, { passive: true });
    }

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const isDark = theme === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark';
      ctx.globalCompositeOperation = isDark ? 'screen' : 'source-over';

      // 1. Update and draw smooth spring follower orb
      if (isVisible && pointer.x !== -1000) {
        const spring = 0.16;
        const damping = 0.82;
        follower.vx = (follower.vx + (pointer.x - follower.x) * spring) * damping;
        follower.vy = (follower.vy + (pointer.y - follower.y) * spring) * damping;
        follower.x += follower.vx;
        follower.y += follower.vy;

        // Render ambient soft luminous halo behind the cursor
        const haloRadius = isDark ? 90 : 70;
        const gradient = ctx.createRadialGradient(
          follower.x,
          follower.y,
          0,
          follower.x,
          follower.y,
          haloRadius
        );
        const palette = getColors();
        const primary = palette[0];
        const secondary = palette[1];

        if (isDark) {
          gradient.addColorStop(0, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.2)`);
          gradient.addColorStop(0.45, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, 0.1)`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          gradient.addColorStop(0, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.12)`);
          gradient.addColorStop(0.5, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, 0.05)`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(follower.x, follower.y, haloRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Update and draw fluid splash droplets
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.size *= 0.97;
        p.alpha -= p.decay;

        if (p.alpha <= 0.01 || p.size <= 0.5) {
          particles.splice(i, 1);
          continue;
        }

        const radGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        radGrad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`);
        radGrad.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Update and draw click ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += (r.maxRadius - r.radius) * 0.15;
        r.alpha *= 0.91;

        if (r.alpha <= 0.02) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.strokeStyle = `rgba(${r.color.r}, ${r.color.g}, ${r.color.b}, ${r.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (parent) {
        parent.removeEventListener('pointermove', onPointerMove);
        parent.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
        parent.removeEventListener('pointerleave', onPointerLeave);
      }
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="cursor-follow-canvas"
      aria-hidden="true"
    />
  );
}

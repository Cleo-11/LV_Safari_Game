'use client';

import { useEffect, useRef } from 'react';

const FONT_SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_SERIF = 'Georgia, "Times New Roman", serif';

export default function SafariRunner() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const scRef = useRef(null);
  const tkRef = useRef(null);
  const multRef = useRef(null);
  const splashRef = useRef(null);
  const overRef = useRef(null);
  const fsRef = useRef(null);
  const ftRef = useRef(null);
  const nftRef = useRef(null);
  const playBtnRef = useRef(null);
  const retryRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const cv = canvasRef.current;
    const cx = cv.getContext('2d');
    const wr = wrapRef.current;

    let W, H, dpr;

    function sz() {
      dpr = window.devicePixelRatio || 1;
      W = wr.clientWidth;
      H = wr.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    sz();
    window.addEventListener('resize', sz);

    const G = {
      run: false, sc: 0, tk: 0, spd: 5, lane: 1, tgtLane: 1,
      px: 0, py: 0, jmpV: 0, jmp: false,
      obs: [], col: [], ptc: [], dist: 0, best: 0, multi: 1, mTimer: 0,
    };

    const LW = () => W / 3;
    const laneX = (l) => LW() * l + LW() / 2;
    const HORIZON = 0.3;

    function lerp(a, b, t) { return a + (b - a) * t; }

    function proj(z) {
      const t = Math.max(0, Math.min(1, z));
      const y = H * HORIZON + t * (H - H * HORIZON);
      const scale = 0.15 + t * 0.85;
      return { y, scale };
    }

    function projX(lane, z) {
      const p = proj(z);
      const cxP = W / 2;
      const spread = p.scale;
      const lx = laneX(lane);
      return cxP + (lx - cxP) * spread;
    }

    function drawSky() {
      cx.fillStyle = '#87CEEB'; cx.fillRect(0, 0, W, H * HORIZON * 0.6);
      cx.fillStyle = '#c4915a'; cx.fillRect(0, H * HORIZON * 0.6, W, H * HORIZON * 0.4);
      cx.fillStyle = '#e8a832'; cx.beginPath(); cx.arc(W * 0.8, H * 0.08, 20, 0, Math.PI * 2); cx.fill();
      for (let i = 0; i < 5; i++) {
        const tx = W * 0.1 + i * W * 0.22;
        cx.fillStyle = '#6b8040';
        cx.beginPath(); cx.arc(tx, H * HORIZON - 4, 8 + i % 3 * 3, 0, Math.PI * 2); cx.fill();
        cx.fillStyle = '#5a3a1a'; cx.fillRect(tx - 2, H * HORIZON - 4, 4, 8);
      }
    }

    function drawRoad() {
      const hY = H * HORIZON;
      cx.fillStyle = '#c49a4a';
      cx.beginPath();
      cx.moveTo(W / 2 - 25, hY); cx.lineTo(0, H); cx.lineTo(W, H); cx.lineTo(W / 2 + 25, hY);
      cx.fill();
      cx.fillStyle = '#b88a3a';
      cx.beginPath();
      const lOff = 15;
      cx.moveTo(W / 2 - lOff / 3, hY); cx.lineTo(W / 3 - 10, H); cx.lineTo(W / 3 + 10, H); cx.lineTo(W / 2 - lOff / 3 + 3, hY); cx.fill();
      cx.beginPath();
      cx.moveTo(W / 2 + lOff / 3, hY); cx.lineTo(W * 2 / 3 - 10, H); cx.lineTo(W * 2 / 3 + 10, H); cx.lineTo(W / 2 + lOff / 3 + 3, hY); cx.fill();
      cx.strokeStyle = 'rgba(90,58,26,0.25)'; cx.lineWidth = 1;
      for (let d = 0; d < 20; d++) {
        const z = d / 20 + (G.dist * 0.01) % 0.05;
        if (z > 1) continue;
        const p = proj(z);
        const leftX = projX(0, z) - 20 * p.scale;
        const rightX = projX(2, z) + 20 * p.scale;
        cx.beginPath(); cx.moveTo(leftX, p.y); cx.lineTo(rightX, p.y); cx.stroke();
      }
    }

    function drawPlayer() {
      const bx = lerp(G.px, laneX(G.tgtLane), 0.18);
      G.px = bx;
      const by = H * 0.78 + G.py;
      const bob = Math.sin(G.dist * 0.2) * 2 * (G.jmp ? 0 : 1);
      cx.save(); cx.translate(bx, by + bob);
      cx.fillStyle = '#2a1a08'; cx.fillRect(-14, -55, 28, 28);
      cx.fillStyle = '#f5d5a0'; cx.beginPath(); cx.arc(0, -62, 12, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#2a1a08'; cx.fillRect(-3, -66, 6, 3);
      cx.fillStyle = '#5c3a1e'; cx.fillRect(-16, -27, 32, 22);
      cx.fillStyle = '#d4a44a'; cx.fillRect(-16, -27, 32, 3);
      cx.fillRect(-16, -8, 32, 3);
      cx.fillStyle = '#d4a44a';
      cx.font = `500 8px ${FONT_SANS}`; cx.textAlign = 'center';
      cx.fillText('LV', 0, -14);
      const legKick = Math.sin(G.dist * 0.3) * 6 * (G.jmp ? 0 : 1);
      cx.fillStyle = '#1a1008';
      cx.fillRect(-10, -5, 8, 18 + legKick);
      cx.fillRect(2, -5, 8, 18 - legKick);
      cx.fillStyle = '#f5d5a0';
      const armSwing = Math.sin(G.dist * 0.3) * 8 * (G.jmp ? 0 : 1);
      cx.fillRect(-18, -25, 6, 14 + armSwing);
      cx.fillRect(12, -25, 6, 14 - armSwing);
      cx.fillStyle = '#8b6914'; cx.fillRect(-5, 14, 10, 6);
      cx.restore();
    }

    function drawObstacle(o) {
      const p = proj(o.z);
      const x = projX(o.lane, o.z);
      const s = p.scale;
      const y = p.y;
      cx.save(); cx.translate(x, y); cx.scale(s, s);
      if (o.type === 0) {
        cx.fillStyle = '#888070';
        cx.beginPath(); cx.moveTo(-22, 0); cx.lineTo(-10, -28); cx.lineTo(12, -32); cx.lineTo(24, 0); cx.fill();
        cx.fillStyle = '#706858';
        cx.beginPath(); cx.moveTo(-10, -28); cx.lineTo(12, -32); cx.lineTo(24, 0); cx.lineTo(5, 0); cx.fill();
      } else if (o.type === 1) {
        cx.fillStyle = '#4a7030';
        cx.beginPath(); cx.ellipse(0, -14, 24, 16, 0, 0, Math.PI * 2); cx.fill();
        cx.fillStyle = '#3a5820';
        cx.beginPath(); cx.ellipse(-6, -18, 14, 10, 0, 0, Math.PI * 2); cx.fill();
      } else {
        cx.fillStyle = '#7a5a2a'; cx.fillRect(-4, -50, 8, 50);
        cx.fillStyle = '#5a8030';
        cx.beginPath(); cx.arc(0, -50, 20, 0, Math.PI * 2); cx.fill();
        cx.fillStyle = '#4a6820';
        cx.beginPath(); cx.arc(-8, -55, 12, 0, Math.PI * 2); cx.fill();
      }
      cx.restore();
    }

    function drawCollectible(c) {
      const p = proj(c.z);
      const x = projX(c.lane, c.z);
      const s = p.scale;
      const y = p.y;
      const float = Math.sin(G.dist * 0.08 + c.id) * 5;
      cx.save(); cx.translate(x, y - 20 * s + float * s); cx.scale(s, s);
      if (c.type === 0) {
        cx.fillStyle = '#5c3a1e'; cx.strokeStyle = '#d4a44a'; cx.lineWidth = 2;
        cx.beginPath(); cx.roundRect(-14, -12, 28, 24, 3); cx.fill(); cx.stroke();
        cx.fillStyle = '#d4a44a'; cx.fillRect(-12, -10, 24, 3); cx.fillRect(-12, 9, 24, 3);
        cx.font = `500 9px ${FONT_SANS}`; cx.textAlign = 'center'; cx.fillText('LV', 0, 4);
        cx.fillStyle = '#8b6914'; cx.fillRect(-3, -16, 6, 4);
      } else {
        cx.fillStyle = '#ffd700';
        cx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = Math.PI * 2 * i / 8;
          const r = i % 2 === 0 ? 10 : 5;
          cx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        cx.closePath(); cx.fill();
        cx.fillStyle = '#ffed80'; cx.beginPath(); cx.arc(0, 0, 4, 0, Math.PI * 2); cx.fill();
      }
      cx.restore();
    }

    function drawParticles() {
      for (const p of G.ptc) {
        cx.globalAlpha = p.l; cx.fillStyle = p.c;
        cx.fillRect(p.x - 3, p.y - 3, 6, 6);
      }
      cx.globalAlpha = 1;
    }

    function spawnObs() {
      const lane = Math.floor(Math.random() * 3);
      let ok = true;
      for (const o of G.obs) { if (o.lane === lane && o.z < 0.15) ok = false; }
      if (!ok) return;
      G.obs.push({ lane, type: Math.floor(Math.random() * 3), z: 0 });
    }

    function spawnCol() {
      const lane = Math.floor(Math.random() * 3);
      let ok = true;
      for (const o of G.obs) { if (o.lane === lane && o.z < 0.2) ok = false; }
      for (const c of G.col) { if (c.lane === lane && c.z < 0.15) ok = false; }
      if (!ok) return;
      G.col.push({ lane, type: Math.random() < 0.3 ? 0 : 1, z: 0, id: Math.random() * 100 });
    }

    function burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        G.ptc.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 6 - 2, l: 1, c: color });
      }
    }

    function die() {
      G.run = false;
      if (G.sc > G.best) G.best = G.sc;
      if (fsRef.current) fsRef.current.textContent = 'Score: ' + G.sc + (G.sc >= G.best ? ' (New best!)' : '');
      if (ftRef.current) ftRef.current.textContent = G.tk + ' LV trunks collected';
      const h = '0x' + Array.from({ length: 10 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      if (nftRef.current) nftRef.current.textContent = G.tk >= 3 ? 'NFT minted: ' + h : 'Collect 3+ trunks to mint a run NFT';
      if (overRef.current) overRef.current.style.display = 'flex';
    }

    function update(dt) {
      if (!G.run) return;
      const s = G.spd * dt * 60;
      G.dist += s;
      G.sc += Math.round(s * G.multi);
      G.spd = 5 + G.dist * 0.0008;
      if (G.mTimer > 0) { G.mTimer -= dt; if (G.mTimer <= 0) G.multi = 1; }
      if (G.jmp) { G.jmpV += 28 * dt; G.py += G.jmpV; if (G.py >= 0) { G.py = 0; G.jmp = false; G.jmpV = 0; } }
      G.px = lerp(G.px, laneX(G.tgtLane), 8 * dt);
      if (Math.random() < 0.035 * s) spawnObs();
      if (Math.random() < 0.025 * s) spawnCol();
      const zSpd = s * 0.012;
      for (const o of G.obs) o.z += zSpd;
      for (const c of G.col) c.z += zSpd;
      const pZ = 0.92;
      G.obs = G.obs.filter((o) => {
        if (o.z > pZ && o.z < pZ + 0.08 && o.lane === G.tgtLane && G.py > -25) {
          die(); return false;
        }
        return o.z < 1.15;
      });
      G.col = G.col.filter((c) => {
        if (c.z > pZ - 0.05 && c.z < pZ + 0.05 && c.lane === G.tgtLane) {
          const cx2 = projX(c.lane, c.z);
          const cy2 = proj(c.z).y;
          if (c.type === 0) { G.tk++; G.multi = Math.min(G.multi + 1, 5); G.mTimer = 4; burst(cx2, cy2 - 15, '#d4a44a', 12); }
          else { G.sc += 25 * G.multi; burst(cx2, cy2 - 15, '#ffd700', 8); }
          return false;
        }
        return c.z < 1.15;
      });
      G.ptc = G.ptc.filter((p) => { p.x += p.vx; p.y += p.vy; p.vy += 12 * dt; p.l -= 1.8 * dt; return p.l > 0; });
      if (scRef.current) scRef.current.textContent = G.sc;
      if (tkRef.current) tkRef.current.textContent = G.tk;
      if (multRef.current) {
        multRef.current.textContent = 'x' + G.multi;
        multRef.current.style.color = G.multi > 1 ? '#ff6b35' : '#ffd700';
      }
    }

    function draw() {
      cx.clearRect(0, 0, W, H);
      drawSky();
      drawRoad();
      const all = [
        ...G.obs.map((o) => ({ ...o, kind: 'o' })),
        ...G.col.map((c) => ({ ...c, kind: 'c' })),
      ];
      all.sort((a, b) => a.z - b.z);
      for (const item of all) {
        if (item.kind === 'o') drawObstacle(item);
        else drawCollectible(item);
      }
      drawPlayer();
      drawParticles();
      if (G.mTimer > 0) {
        cx.fillStyle = 'rgba(212,164,74,0.15)';
        cx.fillRect(0, H - 4, W * (G.mTimer / 4), 4);
      }
    }

    function start() {
      G.run = true; G.sc = 0; G.tk = 0; G.spd = 5; G.lane = 1; G.tgtLane = 1;
      G.px = laneX(1); G.py = 0; G.jmpV = 0; G.jmp = false;
      G.obs = []; G.col = []; G.ptc = []; G.dist = 0; G.multi = 1; G.mTimer = 0;
      if (splashRef.current) splashRef.current.style.display = 'none';
      if (overRef.current) overRef.current.style.display = 'none';
    }

    const playBtnEl = playBtnRef.current;
    const retryEl = retryRef.current;
    playBtnEl.addEventListener('click', start);
    retryEl.addEventListener('click', start);

    let tx0 = 0, ty0 = 0, t0 = 0;

    function handleTouchStart(e) {
      e.preventDefault();
      tx0 = e.touches[0].clientX;
      ty0 = e.touches[0].clientY;
      t0 = Date.now();
    }

    function handleTouchEnd(e) {
      e.preventDefault();
      if (!G.run) return;
      const dx = e.changedTouches[0].clientX - tx0;
      const dy = e.changedTouches[0].clientY - ty0;
      const elapsed = Date.now() - t0;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20 && elapsed < 300) {
        const rect = wr.getBoundingClientRect();
        const rx = e.changedTouches[0].clientX - rect.left;
        if (rx < W / 3 && G.tgtLane > 0) G.tgtLane--;
        else if (rx > W * 2 / 3 && G.tgtLane < 2) G.tgtLane++;
        return;
      }
      if (Math.abs(dy) > Math.abs(dx) && dy < -30) { if (!G.jmp) { G.jmp = true; G.jmpV = -14; } }
      else if (dx > 30 && G.tgtLane < 2) G.tgtLane++;
      else if (dx < -30 && G.tgtLane > 0) G.tgtLane--;
    }

    wr.addEventListener('touchstart', handleTouchStart, { passive: false });
    wr.addEventListener('touchend', handleTouchEnd, { passive: false });

    function handleKeyDown(e) {
      if (!G.run) return;
      if (e.key === 'ArrowLeft' && G.tgtLane > 0) G.tgtLane--;
      if (e.key === 'ArrowRight' && G.tgtLane < 2) G.tgtLane++;
      if ((e.key === 'ArrowUp' || e.key === ' ') && !G.jmp) { G.jmp = true; G.jmpV = -14; }
    }
    document.addEventListener('keydown', handleKeyDown);

    let last = 0;
    function loop(ts) {
      const dt = Math.min((ts - last) / 1000, 0.05);
      last = ts;
      update(dt);
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame((ts) => { last = ts; rafRef.current = requestAnimationFrame(loop); });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', sz);
      document.removeEventListener('keydown', handleKeyDown);
      wr.removeEventListener('touchstart', handleTouchStart);
      wr.removeEventListener('touchend', handleTouchEnd);
      playBtnEl.removeEventListener('click', start);
      retryEl.removeEventListener('click', start);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '440px',
        margin: '0 auto',
        aspectRatio: '9/16',
        borderRadius: '16px',
        overflow: 'hidden',
        touchAction: 'none',
        userSelect: 'none',
        background: '#d4a44a',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {/* HUD */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          fontFamily: FONT_SANS,
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', letterSpacing: '1px' }}>SCORE</div>
          <div ref={scRef} style={{ fontSize: '22px', fontWeight: 500, color: '#fff' }}>0</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', letterSpacing: '1px' }}>MULTIPLIER</div>
          <div ref={multRef} style={{ fontSize: '22px', fontWeight: 500, color: '#ffd700' }}>x1</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', letterSpacing: '1px' }}>LV TRUNKS</div>
          <div ref={tkRef} style={{ fontSize: '22px', fontWeight: 500, color: '#ffd700' }}>0</div>
        </div>
      </div>

      {/* Splash screen */}
      <div
        ref={splashRef}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(42,26,8,0.92)',
          zIndex: 5,
        }}
      >
        <div style={{ fontFamily: FONT_SERIF, color: '#d4a44a', fontSize: '11px', letterSpacing: '8px', marginBottom: '2px' }}>
          LOUIS VUITTON
        </div>
        <div style={{ fontFamily: FONT_SERIF, color: '#f5e6c8', fontSize: '26px', letterSpacing: '2px', marginBottom: '28px' }}>
          Safari runner
        </div>
        <div
          ref={playBtnRef}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: '2px solid #d4a44a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#d4a44a">
            <polygon points="8,5 19,12 8,19" />
          </svg>
        </div>
        <div style={{ marginTop: '20px', fontFamily: FONT_SANS, color: 'rgba(245,230,200,0.5)', fontSize: '12px' }}>
          Swipe left/right or tap sides to move
        </div>
        <div style={{ fontFamily: FONT_SANS, color: 'rgba(245,230,200,0.5)', fontSize: '12px' }}>
          Swipe up to jump
        </div>
      </div>

      {/* Game over screen */}
      <div
        ref={overRef}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'none',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(42,26,8,0.92)',
          zIndex: 5,
          fontFamily: FONT_SANS,
        }}
      >
        <div style={{ fontFamily: FONT_SERIF, color: '#d4a44a', fontSize: '22px', marginBottom: '12px' }}>
          Run complete
        </div>
        <div ref={fsRef} style={{ color: '#f5e6c8', fontSize: '16px', marginBottom: '4px' }} />
        <div ref={ftRef} style={{ color: '#d4a44a', fontSize: '14px', marginBottom: '6px' }} />
        <div ref={nftRef} style={{ color: 'rgba(245,230,200,0.4)', fontSize: '11px', marginBottom: '28px' }} />
        <div
          ref={retryRef}
          style={{
            padding: '10px 28px',
            border: '1px solid #d4a44a',
            borderRadius: '24px',
            color: '#d4a44a',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Run again
        </div>
      </div>
    </div>
  );
}

//
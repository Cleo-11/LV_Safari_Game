'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  STICKERS, CANVAS_OPTIONS, TRUNK_DEFAULTS, TRUNK_NAMES,
  HW_COLORS, HANDLE_COLORS,
  type TrunkState, DEFAULT_STATE,
} from '@/lib/trunk-data';
import { getTexCanvas } from '@/lib/textures';
import { calcScores, type Scores } from '@/lib/scoring';

interface MintedEntry {
  token: string;
  scores: Scores;
  trunkName: string;
}

export default function TrunkAtelier() {
  const [state, setState] = useState<TrunkState>({ ...DEFAULT_STATE });
  const [scores, setScores] = useState<Scores>({ heritage: 0, creativity: 0, rarity: 0 });
  const [mintOverlay, setMintOverlay] = useState(false);
  const [mintDisplay, setMintDisplay] = useState({ token: '', scores: '' });
  const [mintedList, setMintedList] = useState<MintedEntry[]>([]);
  const mintedCombos = useRef(new Map<string, MintedEntry>());

  // Three.js refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const trunkGroupRef = useRef<THREE.Group | null>(null);
  const animIdRef = useRef<number>(0);
  const isDragRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const tgtRef = useRef({ x: 0.18, y: -0.45 });
  const curRef = useRef({ x: 0.18, y: -0.45 });

  // Thumbnail refs
  const thumbMonoRef = useRef<HTMLCanvasElement>(null);
  const thumbDamierRef = useRef<HTMLCanvasElement>(null);
  const thumbArchivalRef = useRef<HTMLCanvasElement>(null);

  // Use a ref for state to avoid stale closures in Three.js rebuild
  const stateRef = useRef(state);
  stateRef.current = state;

  const comboKey = useCallback((s: TrunkState) => {
    return [s.trunk, s.canvasColor, s.hardware, s.handle, s.initials, [...s.stickers].sort().join(',')].join('|');
  }, []);

  // ── Scores ──
  useEffect(() => {
    setScores(calcScores(state));
  }, [state]);

  // ── Thumbnails ──
  useEffect(() => {
    const renders: [React.RefObject<HTMLCanvasElement | null>, string, string][] = [
      [thumbMonoRef, 'monogram', 'traditional'],
      [thumbDamierRef, 'damier', 'ebene'],
      [thumbArchivalRef, 'archival', 'original'],
    ];
    renders.forEach(([ref, t, c]) => {
      const dest = ref.current;
      if (!dest) return;
      const ctx = dest.getContext('2d');
      if (!ctx) return;
      const src = getTexCanvas(t, c);
      ctx.drawImage(src, 0, 0, 90, 90);
    });
  }, []);

  // ── Build trunk geometry ──
  const buildTrunk = useCallback(() => {
    const trunkGroup = trunkGroupRef.current;
    if (!trunkGroup) return;
    const S = stateRef.current;

    // Clear old children
    while (trunkGroup.children.length) {
      const child = trunkGroup.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.map) mat.map.dispose();
        mat.dispose();
      }
      trunkGroup.remove(child);
    }

    const W = 3.0, H = 1.52, D = 1.22;
    const LID = 0.44, BODY = H - LID;

    const texSrc = getTexCanvas(S.trunk, S.canvasColor);
    const tex = new THREE.CanvasTexture(texSrc);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.2, 1.1);

    const cMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0.0 });
    const hwCol = HW_COLORS[S.hardware];
    const hwMat = new THREE.MeshStandardMaterial({ color: hwCol, roughness: 0.22, metalness: 0.88 });

    const leatherCol = S.handle === 'chain' ? hwCol : HANDLE_COLORS[S.handle]!;
    const lMat = new THREE.MeshStandardMaterial({
      color: leatherCol,
      roughness: S.handle === 'chain' ? 0.22 : 0.72,
      metalness: S.handle === 'chain' ? 0.88 : 0.0,
    });

    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, shadow = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      m.rotation.set(rx, ry, rz);
      if (shadow) { m.castShadow = true; m.receiveShadow = true; }
      trunkGroup.add(m);
      return m;
    };

    // Body & lid
    add(new THREE.BoxGeometry(W, BODY, D), cMat, 0, BODY / 2, 0);
    add(new THREE.BoxGeometry(W, LID, D), cMat, 0, BODY + LID / 2, 0);

    // Horizontal brass strips
    [0.14, BODY - 0.07, BODY + 0.05, H - 0.1].forEach(y =>
      add(new THREE.BoxGeometry(W + 0.04, 0.056, D + 0.04), hwMat, 0, y, 0)
    );
    add(new THREE.BoxGeometry(W + 0.04, 0.038, D + 0.04), hwMat, 0, H + 0.01, 0);
    add(new THREE.BoxGeometry(W + 0.04, 0.038, D + 0.04), hwMat, 0, 0.019, 0);

    // Vertical corner strips
    const corners4: [number, number][] = [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]];
    corners4.forEach(([cx, cz]) =>
      add(new THREE.BoxGeometry(0.056, H + 0.04, 0.056), hwMat, cx, H / 2, cz)
    );

    // Corner studs
    [0.03, H + 0.01].forEach(cy =>
      corners4.forEach(([cx, cz]) =>
        add(new THREE.SphereGeometry(0.065, 10, 10), hwMat, cx, cy, cz)
      )
    );

    // Feet
    corners4.forEach(([cx, cz]) =>
      add(new THREE.SphereGeometry(0.052, 8, 8), hwMat, cx * 0.8, -0.04, cz * 0.8)
    );

    // Lock body
    add(new THREE.BoxGeometry(0.22, 0.3, 0.07), hwMat, 0, BODY, D / 2 + 0.035);
    // Lock shackle
    add(new THREE.TorusGeometry(0.068, 0.018, 8, 12, Math.PI), hwMat,
      0, BODY + 0.16, D / 2 + 0.035, Math.PI, 0, 0);
    // Keyhole
    add(new THREE.CylinderGeometry(0.033, 0.033, 0.09, 8),
      new THREE.MeshStandardMaterial({ color: 0x0d0b09, roughness: 0.9 }),
      0, BODY - 0.04, D / 2 + 0.078, Math.PI / 2, 0, 0, false);

    // Side clasps
    [-0.88, 0.88].forEach(x =>
      add(new THREE.BoxGeometry(0.14, 0.18, 0.06), hwMat, x, BODY, D / 2 + 0.03)
    );

    // Handle base plates + rods
    [-0.33, 0.33].forEach(x => {
      add(new THREE.BoxGeometry(0.15, 0.04, 0.1), hwMat, x, H + 0.02, 0);
      add(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8), hwMat, x, H + 0.1, 0);
    });

    // Handle grip
    if (S.handle === 'chain') {
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const gx = -0.27 + t * 0.54;
        const gy = H + 0.18 + Math.sin(t * Math.PI) * 0.06;
        const ring = add(new THREE.TorusGeometry(0.033, 0.012, 6, 8), lMat, gx, gy, 0);
        ring.rotation.y = i % 2 === 0 ? 0 : Math.PI / 2;
      }
    } else {
      add(new THREE.CylinderGeometry(0.026, 0.026, 0.66, 10), lMat,
        0, H + 0.19, 0, 0, 0, Math.PI / 2);
    }

    // Initials sprite
    if (S.initials.length > 0) {
      const sc = document.createElement('canvas');
      sc.width = 256; sc.height = 112;
      const ctx = sc.getContext('2d')!;
      const hexStr = '#' + hwCol.toString(16).padStart(6, '0');
      ctx.fillStyle = hexStr;
      ctx.font = 'bold 62px Georgia, serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(S.initials.toUpperCase(), 128, 56);
      const spTex = new THREE.CanvasTexture(sc);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: spTex, transparent: true, opacity: 0.92 }));
      sp.position.set(0.45, BODY * 0.58, D / 2 + 0.01);
      sp.scale.set(0.65, 0.29, 1);
      trunkGroup.add(sp);
    }

    // Sticker sprites
    if (S.stickers.length > 0) {
      S.stickers.forEach((s, i) => {
        const sc = document.createElement('canvas');
        sc.width = sc.height = 128;
        const ctx = sc.getContext('2d')!;
        ctx.font = '80px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(s, 64, 64);
        const spTex = new THREE.CanvasTexture(sc);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: spTex, transparent: true }));
        const xOff = (i - (S.stickers.length - 1) / 2) * 0.48;
        sp.position.set(xOff - 0.5, BODY * 0.3, D / 2 + 0.01);
        sp.scale.set(0.28, 0.28, 1);
        trunkGroup.add(sp);
      });
    }
  }, []);

  // Rebuild trunk whenever state changes
  useEffect(() => {
    buildTrunk();
  }, [state, buildTrunk]);

  // ── Init Three.js ──
  useEffect(() => {
    const vp = viewportRef.current;
    const cv = canvasRef.current;
    if (!vp || !cv) return;

    const W = vp.clientWidth, H = vp.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0806);
    scene.fog = new THREE.Fog(0x0a0806, 16, 30);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 100);
    camera.position.set(0, 1.6, 7.5);
    camera.lookAt(0, 0.75, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0xe8dcc8, 0.45));
    const key = new THREE.DirectionalLight(0xffedd0, 1.3);
    key.position.set(3, 6, 4); key.castShadow = true;
    key.shadow.mapSize.width = key.shadow.mapSize.height = 1024;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc8d4ff, 0.35);
    fill.position.set(-4, 2, -2); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe8a0, 0.55);
    rim.position.set(0.5, 4, -5); scene.add(rim);

    // Ground
    const gnd = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x0d0b09, roughness: 0.85, metalness: 0.08 })
    );
    gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true;
    scene.add(gnd);

    // Reflection ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 2.8, 64),
      new THREE.MeshBasicMaterial({ color: 0xc4a35a, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.001;
    scene.add(ring);

    const trunkGroup = new THREE.Group();
    trunkGroup.position.y = 0.12;
    scene.add(trunkGroup);
    trunkGroupRef.current = trunkGroup;

    buildTrunk();

    // Mouse events
    const onMouseDown = (e: MouseEvent) => { isDragRef.current = true; prevMouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onMouseUp = () => { isDragRef.current = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragRef.current) return;
      tgtRef.current.y += (e.clientX - prevMouseRef.current.x) * 0.013;
      tgtRef.current.x += (e.clientY - prevMouseRef.current.y) * 0.006;
      tgtRef.current.x = Math.max(-0.55, Math.min(0.75, tgtRef.current.x));
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(3.5, Math.min(13, camera.position.z + e.deltaY * 0.01));
    };

    // Touch events
    let t0: { x: number; y: number } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) { isDragRef.current = true; t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
    };
    const onTouchEnd = () => { isDragRef.current = false; };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragRef.current || !t0 || e.touches.length !== 1) return;
      tgtRef.current.y += (e.touches[0].clientX - t0.x) * 0.013;
      tgtRef.current.x += (e.touches[0].clientY - t0.y) * 0.006;
      tgtRef.current.x = Math.max(-0.55, Math.min(0.75, tgtRef.current.x));
      t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    cv.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    cv.addEventListener('wheel', onWheel, { passive: true });
    cv.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    const onResize = () => {
      const W2 = vp.clientWidth, H2 = vp.clientHeight;
      camera.aspect = W2 / H2; camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener('resize', onResize);

    // Animation loop
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      if (!isDragRef.current) tgtRef.current.y += 0.0018;
      curRef.current.y += (tgtRef.current.y - curRef.current.y) * 0.07;
      curRef.current.x += (tgtRef.current.x - curRef.current.x) * 0.07;
      if (trunkGroup) {
        trunkGroup.rotation.y = curRef.current.y;
        trunkGroup.rotation.x = curRef.current.x;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animIdRef.current);
      cv.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      cv.removeEventListener('wheel', onWheel);
      cv.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──
  const selectTrunk = (type: string) => {
    setState(prev => ({ ...prev, trunk: type, canvasColor: TRUNK_DEFAULTS[type] }));
  };

  const selectCanvasColor = (id: string) => {
    setState(prev => ({ ...prev, canvasColor: id }));
  };

  const selectHardware = (type: string) => {
    setState(prev => ({ ...prev, hardware: type }));
  };

  const selectHandle = (type: string) => {
    setState(prev => ({ ...prev, handle: type }));
  };

  const onInitials = (val: string) => {
    setState(prev => ({ ...prev, initials: val.toUpperCase().slice(0, 3) }));
  };

  const toggleSticker = (s: string) => {
    setState(prev => {
      const stickers = [...prev.stickers];
      const idx = stickers.indexOf(s);
      if (idx > -1) {
        stickers.splice(idx, 1);
      } else {
        if (stickers.length >= 3) stickers.shift();
        stickers.push(s);
      }
      return { ...prev, stickers };
    });
  };

  const mintTrunk = () => {
    const key = comboKey(state);
    if (mintedCombos.current.has(key)) {
      alert('This exact combination has already been minted.\nTry a different configuration.');
      return;
    }
    const sc = calcScores(state);
    const token = '#' + Math.random().toString(16).slice(2, 8).toUpperCase();
    const entry: MintedEntry = { token, scores: sc, trunkName: TRUNK_NAMES[state.trunk] };
    mintedCombos.current.set(key, entry);

    setMintDisplay({
      token,
      scores: `Heritage ${sc.heritage}  ·  Creativity ${sc.creativity}  ·  Rarity ${sc.rarity}`,
    });
    setMintOverlay(true);
    setMintedList(prev => [entry, ...prev]);
  };

  const prestige = Math.round((scores.heritage + scores.creativity + scores.rarity) / 3);

  return (
    <>
      <header>
        <div className="header-logo">L · V</div>
        <div className="header-title">Trunk Atelier</div>
        <div className="header-right">
          Digital Heritage<br />Collection
        </div>
      </header>

      <main>
        {/* ═══ LEFT: Customization Panel ═══ */}
        <div className="panel left-panel">
          <div className="panel-section">
            <div className="section-label">Select Base Trunk</div>
            <div className="trunk-grid">
              {(['monogram', 'damier', 'archival'] as const).map(type => (
                <div
                  key={type}
                  className={`trunk-card${state.trunk === type ? ' active' : ''}`}
                  onClick={() => selectTrunk(type)}
                >
                  <canvas
                    ref={type === 'monogram' ? thumbMonoRef : type === 'damier' ? thumbDamierRef : thumbArchivalRef}
                    width={90}
                    height={90}
                  />
                  <div className="trunk-card-label">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <div className="section-label">Canvas Colorway</div>
            <div className="color-row">
              {CANVAS_OPTIONS[state.trunk]?.map(opt => (
                <div
                  key={opt.id}
                  className={`color-chip${state.canvasColor === opt.id ? ' active' : ''}`}
                  style={{ background: opt.hex }}
                  onClick={() => selectCanvasColor(opt.id)}
                >
                  <div className="chip-tip">{opt.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <div className="section-label">Hardware Finish</div>
            <div className="color-row">
              {[
                { id: 'brass', hex: '#C9A84C', label: 'Brass' },
                { id: 'silver', hex: '#AAADB2', label: 'Silver' },
                { id: 'gold', hex: '#F5C400', label: 'Yellow Gold' },
                { id: 'rosegold', hex: '#C0737A', label: 'Rose Gold' },
              ].map(hw => (
                <div
                  key={hw.id}
                  className={`color-chip${state.hardware === hw.id ? ' active' : ''}`}
                  style={{ background: hw.hex }}
                  onClick={() => selectHardware(hw.id)}
                >
                  <div className="chip-tip">{hw.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <div className="section-label">Handle</div>
            <div className="option-row">
              {['natural', 'dark', 'chain'].map(h => (
                <div
                  key={h}
                  className={`option-pill${state.handle === h ? ' active' : ''}`}
                  onClick={() => selectHandle(h)}
                >
                  {h.charAt(0).toUpperCase() + h.slice(1)}
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <div className="section-label">Hot-Stamp Initials</div>
            <input
              className="initials-input"
              type="text"
              maxLength={3}
              placeholder="—"
              value={state.initials}
              onChange={e => onInitials(e.target.value)}
            />
            <div className="initials-hint">Up to 3 characters · Embossed in gold</div>
          </div>

          <div className="panel-section">
            <div className="section-label">Digital Stickers · Max 3</div>
            <div className="sticker-grid">
              {STICKERS.map(s => (
                <div
                  key={s}
                  className={`sticker-btn${state.stickers.includes(s) ? ' active' : ''}`}
                  onClick={() => toggleSticker(s)}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ CENTER: 3D Viewport ═══ */}
        <div id="viewport" ref={viewportRef}>
          <canvas id="canvas3d" ref={canvasRef} />
          <div className="trunk-badge">{TRUNK_NAMES[state.trunk]}</div>
          <div className="viewport-hint">Drag to rotate · Scroll to zoom</div>

          <div id="minted-overlay" className={mintOverlay ? 'visible' : ''}>
            <div className="minted-wrap">
              <div className="minted-hex">⬡</div>
              <div className="minted-title">Trunk Minted</div>
              <div className="minted-sub">Token ID</div>
              <div className="minted-token">{mintDisplay.token}</div>
              <div className="minted-scores">{mintDisplay.scores}</div>
              <button className="minted-close" onClick={() => setMintOverlay(false)}>
                Continue Designing
              </button>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: Scores + Mint ═══ */}
        <div className="panel right-panel">
          <div className="prestige-block">
            <div className="prestige-label">Prestige Score</div>
            <div className="prestige-value">{prestige || '—'}</div>
            <div className="prestige-sub">Heritage · Creativity · Rarity</div>
          </div>

          <div className="scores-block">
            {([
              { key: 'heritage', label: 'Heritage', desc: 'Fidelity to LV craft codes & tradition' },
              { key: 'creativity', label: 'Creativity', desc: 'Divergence from canon · Personal expression' },
              { key: 'rarity', label: 'Rarity', desc: 'Exclusivity of components chosen' },
            ] as const).map(s => (
              <div className="score-row" key={s.key}>
                <div className="score-head">
                  <div className="score-name">{s.label}</div>
                  <div className="score-num">{scores[s.key]}</div>
                </div>
                <div className="score-track">
                  <div className="score-fill" style={{ width: `${scores[s.key]}%` }} />
                </div>
                <div className="score-desc">{s.desc}</div>
              </div>
            ))}
          </div>

          <div className="mint-block">
            <button className="mint-btn" onClick={mintTrunk}>
              <span>✦ &nbsp;Mint as NFT</span>
            </button>
            <div className="mint-note">
              Once minted, this exact combination<br />
              is locked forever on-chain.<br />
              Requires LV product ownership.
            </div>
          </div>

          {mintedList.length > 0 && (
            <div className="minted-list">
              <div className="minted-list-label">Minted This Session</div>
              <div>
                {mintedList.map((m, i) => (
                  <div className="minted-item" key={i}>
                    <span>{m.trunkName}</span>
                    <span className="minted-item-token">{m.token}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

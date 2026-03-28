function drawPetals(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    ctx.beginPath();
    ctx.ellipse(
      cx + Math.cos(angle) * r, cy + Math.sin(angle) * r,
      r * 0.45, r * 0.88, angle, 0, Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

export function makeMonogramTex(colorId: string): HTMLCanvasElement {
  const cfg: Record<string, { bg: string; stripe: string; fg: string; lt: string }> = {
    traditional: { bg: '#7B4F2C', stripe: '#6A4226', fg: '#5A3318', lt: '#C4936A' },
    reverse: { bg: '#E8D5B0', stripe: '#DCC89E', fg: '#C4A878', lt: '#7B4F2C' },
    pastel: { bg: '#C4A0A0', stripe: '#B89090', fg: '#A07878', lt: '#E8D5D5' },
  };
  const c = cfg[colorId] || cfg.traditional;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const x = canvas.getContext('2d')!;

  x.fillStyle = c.bg;
  x.fillRect(0, 0, 512, 512);

  const tile = 56;
  for (let row = -1; row < 512 / tile + 2; row++) {
    for (let col = -1; col < 512 / tile + 2; col++) {
      const px = col * tile + (row % 2 === 0 ? 0 : tile / 2);
      const py = row * tile;
      if ((row + col) % 2 === 0) {
        x.fillStyle = c.fg;
        x.font = `bold ${Math.round(tile * 0.33)}px Georgia, serif`;
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('LV', px + tile / 2, py + tile * 0.33);
        drawPetals(x, px + tile / 2, py + tile * 0.72, tile * 0.11, c.fg);
      } else {
        drawPetals(x, px + tile / 2, py + tile * 0.3, tile * 0.11, c.fg);
        x.fillStyle = c.fg;
        x.font = `${Math.round(tile * 0.22)}px Georgia, serif`;
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('✦', px + tile / 2, py + tile * 0.72);
      }
    }
  }
  return canvas;
}

export function makeDamierTex(colorId: string): HTMLCanvasElement {
  const cfgs: Record<string, [string, string]> = {
    ebene: ['#6B4423', '#3D2411'],
    azur: ['#C8D8E4', '#7A9BB0'],
    graphite: ['#5A5A5A', '#282828'],
  };
  const cfg = cfgs[colorId] || cfgs.ebene;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const x = canvas.getContext('2d')!;
  const tile = 64;
  for (let r = 0; r < 8; r++) {
    for (let col = 0; col < 8; col++) {
      x.fillStyle = (r + col) % 2 === 0 ? cfg[0] : cfg[1];
      x.fillRect(col * tile, r * tile, tile, tile);
    }
  }
  x.globalAlpha = 0.1;
  x.fillStyle = '#FFFFFF';
  x.font = `bold ${Math.round(tile * 0.28)}px Georgia, serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let r = 0; r < 8; r++) {
    for (let col = 0; col < 8; col++) {
      if ((r + col) % 2 === 0)
        x.fillText('LV', col * tile + tile / 2, r * tile + tile / 2);
    }
  }
  x.globalAlpha = 1;
  return canvas;
}

export function makeArchivalTex(colorId: string): HTMLCanvasElement {
  const cfgs: Record<string, { bg: string; s1: string; s2: string; acc: string }> = {
    original: { bg: '#2C3020', s1: '#222618', s2: '#363D28', acc: '#4A5030' },
    camel: { bg: '#8B6B45', s1: '#7A5C38', s2: '#9A7A52', acc: '#B09060' },
    noir: { bg: '#1A1A1A', s1: '#111111', s2: '#222222', acc: '#303030' },
  };
  const cfg = cfgs[colorId] || cfgs.original;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const x = canvas.getContext('2d')!;

  x.fillStyle = cfg.bg;
  x.fillRect(0, 0, 512, 512);

  const sh = 28;
  for (let r = 0; r < 512 / sh; r++) {
    x.fillStyle = r % 2 === 0 ? cfg.s1 : cfg.s2;
    x.fillRect(0, r * sh, 512, sh);
  }

  x.globalAlpha = 0.2;
  x.strokeStyle = cfg.acc;
  x.lineWidth = 1;
  const dm = 52;
  for (let i = -dm; i < 512 + dm; i += dm) {
    for (let j = -dm; j < 512 + dm; j += dm) {
      x.beginPath();
      x.moveTo(i + dm / 2, j);
      x.lineTo(i + dm, j + dm / 2);
      x.lineTo(i + dm / 2, j + dm);
      x.lineTo(i, j + dm / 2);
      x.closePath();
      x.stroke();
    }
  }

  x.globalAlpha = 0.18;
  x.fillStyle = cfg.acc;
  x.font = 'bold 22px Georgia, serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let r = 0; r < 6; r++) {
    for (let col = 0; col < 6; col++) {
      x.fillText('LV', col * 96 + 48, r * 96 + 48);
    }
  }
  x.globalAlpha = 1;
  return canvas;
}

export function getTexCanvas(trunkType: string, colorId: string): HTMLCanvasElement {
  if (trunkType === 'monogram') return makeMonogramTex(colorId);
  if (trunkType === 'damier') return makeDamierTex(colorId);
  return makeArchivalTex(colorId);
}
//
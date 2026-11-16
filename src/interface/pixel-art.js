// Arte original em uma grade de pixels; não depende de imagens externas.
import { LARGURA, ALTURA, PES_GATO } from './mapa-arvore.js';
export { LARGURA, ALTURA };

const cores = {
  b: '#49382d', o: '#c47d38', O: '#eea74d', a: '#ffd27b',
  w: '#fff1c0', p: '#e79281', t: '#7e5438', T: '#ad7947',
  d: '#35563b', g: '#507941', G: '#719b43', l: '#98b94d', h: '#c1ce68',
};
const gatoFrente = [
  '...bb.......bb...',
  '...bOb.....bOb...',
  '...bOpbbbbbpOb...',
  '...bOOOaOOOaOb...',
  '..bOOOaOOOaOOOb..',
  '..bOOOOOOOOOOOb..',
  '..bOObwOOwbOOOb..',
  '..bOObbOObbOOOb..',
  '..bOOOOpOOOOOOb..',
  '..bOwwbbbwwOOOb..',
  '...bOwwwwwOOOb...',
  '....bOOOOOOOb....',
  '....bOawwaOOb..o.',
  '....bOwwwwOOb.oo.',
  '....bOwwwwOOb.oo.',
  '....bOOOOOOOboo..',
  '....bOObbOOObo...',
  '....bwwbbwwb.....',
];
const gatoLado = [
  '...........bb..bb...',
  '...........bObbOb...',
  '...........bOpOOb...',
  '..........bOOOOOOb..',
  '..........bOOOOwbb..',
  '..oo......bOOOOwbb..',
  '.oOOo.....bOOOOpOb..',
  '.oOOo.bbbbbOOwwwwb..',
  '..oOobOOOOOOOOwbb...',
  '...oObOOaOOOOOOb....',
  '....bOOOaOOOOOOb....',
  '....bOOOOOwwOOOb....',
  '....bOOOOOwwOOOb....',
  '.....bOObbbOOOb.....',
  '.....bOOb.bOOOb.....',
  '.....bwwb.bwwwb.....',
];
const gatoCostas = [
  '...bb.......bb...', '...bOb.....bOb...', '...bOObbbbbOOb...',
  '...bOOOaOOaOOb...', '..bOOOOaOOaOOOb..', '..bOOOOaOOaOOOb..',
  '..bOOOOOOOOOOOb..', '..bOOOOOOOOOOOb..', '...bOOOOOOOOOb...',
  '....bOOOOOOOb....', '....bOOaaOOOb....', '....bOOaaOOOb....',
  '....bOOaaOOOb....', '....bOOaaOOOb....', '....bOOooOOOb....',
  '....bOObbOOOb....', '....bwwbbwwb.....',
];
const arvore = [
  '........ddddd........', '......ddGGGGGdd......', '....ddGGllhllGGdd....',
  '...dGGllhhhhllGGGd...', '..dGGllhhhlllllGGGd..', '..dGlllhlhllGGllGGd..',
  '.dGGllhlhlllGGGllGGd.', '.dGlllllllGGGGGllGGd.', 'dGGllGGlllGGGllGGGGGd',
  'dGllGGGGGllGlllGGGGGd', 'dGGGGGGGGGGGllGGGgGGd', '.dGGGGGllGGGGGGGggGd.',
  '.dGGGllllGGGGGggggGd.', '..dGGllGGGGggggggGd..', '..dGGGGGGggggggggGd..',
  '...dGGGgggggggggGd...', '....ddgggggggggdd....', '......dddtttddd......',
  '........tTTtt........', '........tTTtt........', '........tTTtt........',
  '.......ttTTttt.......', '......ttTTTtttt......',
];
const numeros = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'],
  '-': ['000', '000', '111', '000', '000'],
};
const peixe = [
  '.......oo.......', '......occco.....', 'oo...occccco....',
  'oco.occccccbo...', 'occcoccccccco...', 'oco.occccccco...',
  'oo...occccco....', '......occco.....', '.......oo.......',
];

function sprite(ctx, linhas, x, y, escala = 1, paleta = cores) {
  linhas.forEach((linha, i) => [...linha].forEach((cor, j) => {
    if (!paleta[cor]) return;
    ctx.fillStyle = paleta[cor];
    ctx.fillRect(x + j * escala, y + i * escala, escala, escala);
  }));
}
function aleatorio(semente) {
  let valor = semente;
  return () => { valor = (Math.imul(valor, 1664525) + 1013904223) >>> 0; return valor / 4294967296; };
}

export function desenharGato(ctx, gato) {
  const x = Math.round(gato.x), y = Math.round(gato.y);
  const escala = gato.escala ?? 2;
  const passo = gato.andando && gato.quadro % 2 === 1 ? 1 : 0;
  ctx.fillStyle = '#45613d'; ctx.fillRect(x - 7 * escala, y - 2 * escala, 15 * escala, 3 * escala);
  ctx.save(); ctx.translate(x, y - passo * escala); ctx.scale(escala, escala);
  const lateral = gato.direcao === 'esquerda' || gato.direcao === 'direita';
  if (gato.direcao === 'esquerda') ctx.scale(-1, 1);
  const linhas = lateral ? gatoLado : gato.direcao === 'cima' ? gatoCostas : gatoFrente;
  sprite(ctx, linhas, lateral ? -10 : -8, -linhas.length);
  if (gato.andando) {
    ctx.fillStyle = '#fff1c0'; ctx.fillRect(passo ? -5 : 3, -2, 4, 2);
  }
  if (gato.acao === 'abrindo') {
    ctx.fillStyle = '#49382d'; ctx.fillRect(-9, -20, 4, 5); ctx.fillRect(7, -20, 4, 5);
    ctx.fillStyle = '#fff1c0'; ctx.fillRect(-8, -20, 3, 3); ctx.fillRect(7, -20, 3, 3);
  }
  ctx.restore();
  if (gato.temPeixe) {
    desenharPeixeSolto(ctx, x, y - 19);
    ctx.fillStyle = '#fff1c0'; ctx.fillRect(x - 10, y - 17, 4, 4); ctx.fillRect(x + 7, y - 17, 4, 4);
  }
  if (gato.humor === 'feliz') {
    sprite(ctx, ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], x + 9 * escala, y - 21 * escala, escala, { r: '#d75e58' });
  } else if (gato.humor === 'duvida') {
    sprite(ctx, ['.qqq.', 'q...q', '...q.', '..q..', '.....', '..q..'], x + 10 * escala, y - 21 * escala, escala, { q: '#fff2c2' });
  }
}
function desenharArvore(ctx, x, y, pequena = false, variacao = 0) {
  const escala = pequena ? 1 : 2;
  ctx.fillStyle = '#648b46'; ctx.fillRect(x - 8 * escala, y - 2, 17 * escala, 5);
  const paleta = variacao === 1 ? { ...cores, G: '#6c9342', l: '#91ad48', h: '#b5c35e' }
    : variacao === 2 ? { ...cores, G: '#789b48', l: '#a1b957', h: '#c8ce79' } : cores;
  sprite(ctx, arvore, x - 10 * escala, y - 23 * escala, escala, paleta);
}
function flor(ctx, x, y, cor) {
  ctx.fillStyle = '#507c40'; ctx.fillRect(x, y + 2, 1, 4); ctx.fillRect(x - 2, y + 4, 2, 1);
  ctx.fillStyle = cor; ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x, y - 2, 1, 5);
  ctx.fillStyle = '#fff0a4'; ctx.fillRect(x, y, 1, 1);
}
function lago(ctx) {
  sprite(ctx, [
    '.....gggggggg....', '...ggbbbbbbbbgg..', '..gbbwwbbbbbbbbg.',
    '.gbbbbbbbbbbbbbbg', 'gbbbbbbbbbwwbbbbg', 'gbbbwbbbbbbbbbbbg',
    '.gbbwwbbbbbbbbbg.', '..gbbbbbbbbbbbg..', '...ggbbbbbbbgg...', '.....ggggggg.....',
  ], 369, 48, 3, { g: '#6c9249', b: '#619eac', w: '#a1ced0' });
  ctx.fillStyle = '#80b4b9'; ctx.fillRect(389, 65, 17, 2); ctx.fillRect(394, 68, 9, 1);
  ctx.fillStyle = '#547e40'; ctx.fillRect(410, 78, 7, 3); flor(ctx, 414, 77, '#efbf78');
  ctx.fillStyle = '#426e45'; ctx.fillRect(375, 53, 2, 11); ctx.fillRect(379, 55, 2, 8);
}
function trilha(ctx, pontos, cor, largura) {
  ctx.strokeStyle = cor; ctx.lineWidth = largura; ctx.lineJoin = 'miter'; ctx.lineCap = 'square';
  ctx.beginPath();
  pontos.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}
export function desenharTrilha(ctx, pontos, percorrida = false) {
  if (!percorrida) {
    trilha(ctx, pontos, '#789549', 18);
    trilha(ctx, pontos, '#ba9458', 14);
    trilha(ctx, pontos, '#d8b77a', 10);
  } else {
    trilha(ctx, pontos, '#f3d68c', 10);
  }
  for (let i = 1; i < pontos.length; i++) {
    const [x0, y0] = pontos[i - 1], [x1, y1] = pontos[i];
    const distancia = Math.abs(x1 - x0) + Math.abs(y1 - y0);
    for (let d = 8; d < distancia; d += percorrida ? 12 : 11) {
      const t = d / distancia;
      const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
      ctx.fillStyle = percorrida ? '#9a7c4a' : '#c3a168';
      ctx.fillRect(x, y - 2, 2, percorrida ? 2 : 1);
      if (percorrida) ctx.fillRect(x + 3, y + 2, 2, 2);
    }
  }
}
export function desenharMapa(ctx, posicoes, caminhos) {
  const random = aleatorio(14);
  ctx.fillStyle = '#91b75f'; ctx.fillRect(0, 0, LARGURA, ALTURA);
  for (let i = 0; i < LARGURA * ALTURA / 120; i++) {
    const x = Math.floor(random() * LARGURA), y = Math.floor(random() * ALTURA);
    ctx.fillStyle = ['#8fb55d', '#93b961', '#90b65e'][Math.floor(random() * 3)];
    ctx.fillRect(x, y, 4 + Math.floor(random() * 19), 3 + Math.floor(random() * 13));
  }
  for (let i = 0; i < LARGURA * ALTURA / 160; i++) {
    const x = Math.floor(random() * LARGURA), y = Math.floor(random() * ALTURA);
    ctx.fillStyle = random() > .5 ? '#a5c571' : '#7ca650'; ctx.fillRect(x, y, 2, 1);
    if (i % 6 === 0) { ctx.fillRect(x - 1, y - 2, 1, 2); ctx.fillRect(x + 2, y - 3, 1, 3); }
  }
  ctx.save(); ctx.translate(LARGURA - 480, 0); lago(ctx); ctx.restore();
  for (const caminho of caminhos.values()) desenharTrilha(ctx, caminho.ramo);
  for (const no of posicoes.values()) desenharTrilha(ctx, no.anel);
  // A vegetação respeita as placas, as trilhas e o espaço do personagem.
  const reservas = [{ x: LARGURA - 130, y: 42, largura: 72, altura: 44 }];
  for (const no of posicoes.values()) reservas.push({ x: LARGURA - 66, y: no.y - 42, largura: 66, altura: 60 });
  for (const no of posicoes.values()) reservas.push({ x: no.x - no.raioX - 22, y: no.y - 94, largura: no.raioX * 2 + 44, altura: PES_GATO + 110 });
  for (const { pontos } of caminhos.values()) {
    for (let i = 1; i < pontos.length; i++) {
      const [x0, y0] = pontos[i - 1], [x1, y1] = pontos[i];
      reservas.push({ x: Math.min(x0, x1) - 21, y: Math.min(y0, y1) - 38, largura: Math.abs(x1 - x0) + 42, altura: Math.abs(y1 - y0) + 46 });
    }
  }
  const livre = (x, y, largura, altura) => !reservas.some(r => x < r.x + r.largura && x + largura > r.x && y < r.y + r.altura && y + altura > r.y);
  // Amostras livres em torno de núcleos de vegetação, sem linhas de plantio.
  const nucleos = Array.from({ length: 9 }, () => ({ x: random() * LARGURA, y: random() * ALTURA }));
  const vegetacao = [];
  const quantidade = Math.round(LARGURA * ALTURA / 7500);
  for (let tentativa = 0; tentativa < 5000 && vegetacao.length < quantidade; tentativa++) {
    const nucleo = nucleos[Math.floor(random() * nucleos.length)];
    const agrupada = random() < .65;
    const x = Math.round(agrupada ? nucleo.x + (random() + random() + random() - 1.5) * 150 : random() * LARGURA);
    const y = Math.round(agrupada ? nucleo.y + (random() + random() + random() - 1.5) * 110 : random() * ALTURA);
    const pequena = random() < .28, tamanho = pequena ? 1 : 2, raio = tamanho * 9;
    const largura = 21 * tamanho, altura = 23 * tamanho;
    if (x < largura / 2 + 3 || x + largura / 2 > LARGURA - 3 || y < altura + 3 || y > ALTURA - 8) continue;
    if (!livre(x - largura / 2, y - altura, largura, altura + 4)) continue;
    if (vegetacao.some(a => Math.hypot(x - a.x, (y - a.y) * .9) < (raio + a.raio) * .9)) continue;
    vegetacao.push({ x, y, pequena, raio, variacao: Math.floor(random() * 3) });
  }
  vegetacao.sort((a, b) => a.y - b.y).forEach(a => desenharArvore(ctx, a.x, a.y, a.pequena, a.variacao));
  for (let i = 0; i < 95; i++) {
    const x = 80 + Math.floor(random() * (LARGURA - 95)), y = 8 + Math.floor(random() * (ALTURA - 16));
    const dx = Math.floor(random() * 11) - 5, dy = Math.floor(random() * 9) - 4;
    if (livre(x - 8, y - 7, 17, 17)) {
      const cor = i % 2 ? '#fff1c0' : '#e9a06f';
      flor(ctx, x, y, cor);
      if (random() < .55) flor(ctx, x + dx, y + dy, cor);
    }
  }
  for (let i = 0; i < 20; i++) {
    const x = 80 + Math.floor(random() * (LARGURA - 95)), y = 8 + Math.floor(random() * (ALTURA - 16));
    if (!livre(x - 4, y - 6, 15, 12)) continue;
    ctx.fillStyle = '#638545'; ctx.fillRect(x - 3, y + 2, 13, 3);
    ctx.fillStyle = '#7d8e76'; ctx.fillRect(x - 2, y - 3, 10, 6);
    ctx.fillStyle = '#a7ad8c'; ctx.fillRect(x, y - 5, 6, 5);
    ctx.fillStyle = '#c4c7a2'; ctx.fillRect(x, y - 5, 4, 1);
  }
}
export function desenharPeixeSolto(ctx, x, y) {
  sprite(ctx, peixe, Math.round(x) - 8, Math.round(y) - 4, 1, { o: '#3f737d', c: '#8fc1c5', b: '#304d51' });
}
export function desenharCaixa(ctx, x, y, numero, destaque, abertura = 0, peixeDentro = false) {
  const borda = destaque === 'encontrado' ? '#54783d' : '#67482f';
  // Corpo, tábuas e etiqueta permanecem visíveis com a tampa aberta.
  ctx.fillStyle = '#66823f'; ctx.fillRect(x - 16, y + 2, 35, 4);
  ctx.fillStyle = borda; ctx.fillRect(x - 17, y - 25, 34, 28);
  ctx.fillStyle = '#c49251'; ctx.fillRect(x - 15, y - 23, 30, 24);
  ctx.fillStyle = '#a4723e'; ctx.fillRect(x - 15, y - 8, 30, 2); ctx.fillRect(x - 15, y - 18, 30, 1);
  ctx.fillStyle = '#e3b56f'; ctx.fillRect(x - 15, y - 23, 3, 24); ctx.fillRect(x + 12, y - 23, 3, 24);
  if (abertura > 0) {
    ctx.fillStyle = '#493a2b'; ctx.fillRect(x - 15, y - 25, 30, 8);
    ctx.fillStyle = '#886034'; ctx.fillRect(x - 13, y - 22, 26, 5);
  }
  const alturaTampa = Math.round(7 + abertura * 14);
  ctx.fillStyle = borda; ctx.fillRect(x - 18, y - 24 - alturaTampa, 36, alturaTampa);
  ctx.fillStyle = '#d5aa65'; ctx.fillRect(x - 16, y - 22 - alturaTampa, 32, alturaTampa - 3);
  ctx.fillStyle = '#efd08a'; ctx.fillRect(x - 16, y - 22 - alturaTampa, 32, 2);
  ctx.fillStyle = '#a6753c'; ctx.fillRect(x - 2, y - 22 - alturaTampa, 4, alturaTampa - 3);
  if (!abertura) {
    ctx.fillStyle = '#725439'; ctx.fillRect(x - 2, y - 25, 4, 5);
    ctx.fillStyle = '#e7cd7e'; ctx.fillRect(x - 1, y - 24, 2, 3);
  }
  if (peixeDentro && abertura > .65) desenharPeixeSolto(ctx, x, y - 22);
  ctx.fillStyle = destaque === 'comparando' ? '#ffe7a0' : '#fae4b6';
  ctx.fillRect(x - 15, y - 15, 30, 14);
  ctx.fillStyle = '#51432f';
  const texto = String(numero), inicio = Math.round(x - (texto.length * 7 - 1) / 2);
  [...texto].forEach((digito, indice) => numeros[digito].forEach((linha, i) => [...linha].forEach((pixel, j) => {
    if (pixel === '1') ctx.fillRect(inicio + indice * 7 + j * 2, y - 13 + i * 2, 2, 2);
  })));
  if (destaque) {
    ctx.fillStyle = destaque === 'encontrado' ? '#3c7751' : '#c1873f';
    for (const dx of [-20, 18]) { ctx.fillRect(x + dx, y - 33, 2, 4); ctx.fillRect(x + dx, y, 2, 4); }
  }
}

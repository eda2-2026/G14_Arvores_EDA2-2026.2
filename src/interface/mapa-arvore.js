// Geometria do bosque: cada pai fica centralizado sobre sua subárvore.
export const LARGURA = 1440;
export const ALTURA = 768;
export const PASSO_NIVEL = 192;
export const PRIMEIRO_NIVEL = 82;
export const PES_GATO = 48;
export const ESPACO_CAIXA = 40;
const ESPACO_ENTRE_NOS = 84;

function diagonal(x0, y0, x1, y1) {
  const pontos = [[x0, y0]];
  const passos = Math.max(1, Math.ceil(Math.abs(y1 - y0) / 4));
  for (let i = 1; i <= passos; i++) {
    const x = i === passos ? x1 : x0 + Math.sign(x1 - x0) * Math.round(Math.abs(x1 - x0) * i / passos);
    const y = i === passos ? y1 : y0 + Math.sign(y1 - y0) * Math.round(Math.abs(y1 - y0) * i / passos);
    const ultimo = pontos.at(-1);
    if (y !== ultimo[1]) pontos.push([ultimo[0], y]);
    if (x !== ultimo[0]) pontos.push([x, y]);
  }
  return pontos;
}

function contornarCaixa(no, lado) {
  const { x, y, raioX } = no;
  const meioY = y - 4;
  const vertices = [
    [x, meioY - 52], [x + lado * Math.round(raioX * .72), meioY - 37],
    [x + lado * raioX, meioY], [x + lado * Math.round(raioX * .72), meioY + 37],
    [x, meioY + 52],
  ];
  const pontos = [vertices[0]];
  for (let i = 1; i < vertices.length; i++) pontos.push(...diagonal(...vertices[i - 1], ...vertices[i]).slice(1));
  return pontos;
}

export function criarMapa(raiz) {
  const posicoes = new Map(), caminhos = new Map(), larguras = new Map();
  function medir(no) {
    const filhos = no.filhos.reduce((soma, filho) => soma + medir(filho), 0);
    const largura = Math.max(no.chaves.length * ESPACO_CAIXA + 16, filhos + Math.max(0, no.filhos.length - 1) * ESPACO_ENTRE_NOS);
    larguras.set(no.id, largura);
    return largura;
  }
  function posicionar(no, esquerda, nivel = 0) {
    const largura = larguras.get(no.id);
    posicoes.set(no.id, { no, nivel, x: esquerda + largura / 2, y: PRIMEIRO_NIVEL + nivel * PASSO_NIVEL, largura: no.chaves.length * ESPACO_CAIXA + 16 });
    const larguraFilhos = no.filhos.reduce((soma, filho) => soma + larguras.get(filho.id), 0) + Math.max(0, no.filhos.length - 1) * ESPACO_ENTRE_NOS;
    let inicio = esquerda + (largura - larguraFilhos) / 2;
    for (const filho of no.filhos) {
      posicionar(filho, inicio, nivel + 1);
      inicio += larguras.get(filho.id) + ESPACO_ENTRE_NOS;
    }
    if (no.filhos.length) {
      const primeiro = posicoes.get(no.filhos[0].id), ultimo = posicoes.get(no.filhos.at(-1).id);
      posicoes.get(no.id).x = Math.round((primeiro.x + ultimo.x) / 2);
    }
  }
  posicionar(raiz, (LARGURA - medir(raiz)) / 2);
  for (const no of posicoes.values()) {
    no.raioX = Math.max(52, no.largura / 2 + 24);
    no.anel = [...contornarCaixa(no, 1), ...contornarCaixa(no, -1).reverse().slice(1)];
  }
  for (const pai of posicoes.values()) {
    for (const filho of pai.no.filhos) {
      const destino = posicoes.get(filho.id);
      // Ligações diretas e simétricas entre o sul do pai e o norte do filho.
      // O pequeno anel da clareira permite chegar à caixa sem passar sobre ela.
      const ramo = diagonal(pai.x, pai.y + PES_GATO, destino.x, destino.y - 56);
      const arco = contornarCaixa(destino, destino.x < pai.x ? 1 : -1);
      caminhos.set(filho.id, {
        de: pai.no.id, para: filho.id, ramo,
        pontos: [...ramo, ...arco.slice(1)],
      });
    }
  }
  return { posicoes, caminhos };
}

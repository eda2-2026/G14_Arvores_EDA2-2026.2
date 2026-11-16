import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArvoreB } from '../src/arvore-b.js';
import { criarMapa, LARGURA, ALTURA, PES_GATO, ESPACO_CAIXA } from '../src/interface/mapa-arvore.js';

const arvore = ArvoreB.comChaves(Array.from({ length: 15 }, (_, i) => (i + 1) * 5), { maxChaves: 2 });
const { posicoes, caminhos } = criarMapa(arvore.estado().raiz);

test('o bosque tem quatro níveis, oito folhas e exatamente uma caixa por nó', () => {
  assert.equal(arvore.altura(), 4);
  assert.deepEqual(arvore.validar(), []);
  assert.equal([...posicoes.values()].filter(p => !p.no.filhos.length).length, 8);
  assert.equal(posicoes.size, 15);
  assert.ok([...posicoes.values()].every(p => p.no.chaves.length === 1));
  for (const ponto of posicoes.values()) {
    assert.ok(ponto.x - ponto.largura / 2 >= 0);
    assert.ok(ponto.x + ponto.largura / 2 <= LARGURA);
    assert.ok(ponto.y + PES_GATO < ALTURA);
    const vizinhos = [...posicoes.values()].filter(p => p.nivel === ponto.nivel && p.x > ponto.x);
    for (const vizinho of vizinhos) assert.ok(ponto.x + ponto.largura / 2 < vizinho.x - vizinho.largura / 2);
  }
});

test('cada caminho liga somente um pai ao filho correto e contorna as caixas fechadas', () => {
  assert.equal(caminhos.size, posicoes.size - 1);
  for (const [id, caminho] of caminhos) {
    const pai = posicoes.get(caminho.de), filho = posicoes.get(id);
    assert.ok(pai.no.filhos.some(no => no.id === id));
    assert.equal(filho.nivel, pai.nivel + 1);
    assert.deepEqual(caminho.pontos[0], [pai.x, pai.y + PES_GATO]);
    assert.deepEqual(caminho.pontos.at(-1), [filho.x, filho.y + PES_GATO]);
    for (let i = 1; i < caminho.pontos.length; i++) {
      const [x0, y0] = caminho.pontos[i - 1], [x1, y1] = caminho.pontos[i];
      assert.ok(x0 === x1 || y0 === y1, 'o gato caminha pelos degraus desenhados');
      assert.ok(Math.min(x0, x1) >= 0 && Math.max(x0, x1) <= LARGURA);
      assert.ok(Math.min(y0, y1) >= 0 && Math.max(y0, y1) < ALTURA);
      for (const no of posicoes.values()) {
        no.no.chaves.forEach((chave, indice) => {
          const centro = no.x + (indice - (no.no.chaves.length - 1) / 2) * ESPACO_CAIXA;
          const cruza = Math.min(x0, x1) - 9 < centro + 18
            && Math.max(x0, x1) + 9 > centro - 18
            && Math.min(y0, y1) - 9 < no.y + 3
            && Math.max(y0, y1) + 9 > no.y - 31;
          assert.equal(cruza, false, `trilha ${id} não deve atravessar a caixa ${chave}`);
        });
      }
    }
  }
});

test('pais centralizados e clareiras simétricas mantêm os ramos alinhados', () => {
  for (const no of posicoes.values()) {
    const pontos = new Set(no.anel.map(([x, y]) => `${x},${y}`));
    assert.deepEqual(no.anel[0], no.anel.at(-1));
    for (const [x, y] of no.anel) assert.ok(pontos.has(`${2 * no.x - x},${y}`));
    if (!no.no.filhos.length) continue;
    const filhos = no.no.filhos.map(filho => posicoes.get(filho.id));
    assert.ok(Math.abs(no.x - (filhos[0].x + filhos.at(-1).x) / 2) <= .5);
    for (const filho of filhos) {
      const ramo = caminhos.get(filho.no.id).ramo;
      assert.deepEqual(ramo.at(-1), [filho.x, filho.y - 56]);
      assert.ok(ramo.every(([x]) => x >= Math.min(no.x, filho.x) && x <= Math.max(no.x, filho.x)));
    }
  }
});

test('as buscas pelas oito folhas percorrem os quatro níveis pelas trilhas existentes', () => {
  for (const folha of [...posicoes.values()].filter(p => !p.no.filhos.length)) {
    const visitas = arvore.buscar(folha.no.chaves[0]).passos.filter(p => p.tipo === 'visitar');
    assert.equal(visitas.length, 4);
    visitas.slice(1).forEach((visita, indice) => assert.equal(caminhos.get(visita.no).de, visitas[indice].no));
  }
});

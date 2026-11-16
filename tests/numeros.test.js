import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArvoreB } from '../src/arvore-b.js';
import { criarBosque, prepararBusca } from '../src/interface/numeros.js';
import { criarMapa } from '../src/interface/mapa-arvore.js';

const criarExemplo = () => ArvoreB.comChaves(Array.from({ length: 15 }, (_, i) => (i + 1) * 5), { maxChaves: 2 });

test('um número existente mantém a árvore e o alvo informados', () => {
  const arvore = criarExemplo();
  const resultado = prepararBusca(arvore, 55);
  assert.equal(resultado.arvore, arvore);
  assert.equal(resultado.substituido, null);
});

test('um número ausente substitui o mais próximo e passa a existir na Árvore B', () => {
  const original = criarExemplo();
  const { arvore, substituido } = prepararBusca(original, 42);
  assert.equal(substituido, 40);
  assert.equal(arvore.buscar(42).sucesso, true);
  assert.equal(arvore.buscar(40).sucesso, false);
  assert.equal(arvore.chaves().length, 15);
  assert.deepEqual(arvore.validar(), []);
  assert.equal(original.buscar(40).sucesso, true);
  assert.equal(original.buscar(42).sucesso, false);
});

test('substituições preservam uma caixa por nó, quatro níveis e caminhos válidos', () => {
  let arvore = criarExemplo();
  for (const numero of [42, 1, 100, 56, 84, 21, 99, 70]) {
    arvore = prepararBusca(arvore, numero).arvore;
    assert.equal(arvore.buscar(numero).sucesso, true);
    assert.equal(arvore.chaves().length, 15);
    assert.equal(new Set(arvore.chaves()).size, 15);
    assert.equal(arvore.altura(), 4);
    assert.deepEqual(arvore.validar(), []);
    assert.deepEqual(arvore.chaves(), [...arvore.chaves()].sort((a, b) => a - b));
    const mapa = criarMapa(arvore.estado().raiz);
    assert.ok([...mapa.posicoes.values()].every(p => p.no.chaves.length === 1));
    const visitas = arvore.buscar(numero).passos.filter(p => p.tipo === 'visitar');
    visitas.slice(1).forEach((visita, i) => assert.equal(mapa.caminhos.get(visita.no).de, visitas[i].no));
  }
});

test('cada novo bosque tem 15 números únicos de 1 a 100 e não repete o anterior', () => {
  let anteriores = [];
  for (let i = 0; i < 5; i++) {
    const arvore = criarBosque(anteriores);
    const chaves = arvore.chaves();
    assert.equal(chaves.length, 15);
    assert.equal(new Set(chaves).size, 15);
    assert.ok(chaves.every(n => Number.isInteger(n) && n >= 1 && n <= 100 && !anteriores.includes(n)));
    assert.equal(arvore.altura(), 4);
    assert.deepEqual(arvore.validar(), []);
    assert.ok([...criarMapa(arvore.estado().raiz).posicoes.values()].every(p => p.no.chaves.length === 1));
    anteriores = chaves;
  }
});

test('a busca rejeita números fora de 1 a 100', () => {
  const arvore = criarExemplo();
  for (const numero of [-1, 0, 101, 999]) assert.throws(() => prepararBusca(arvore, numero), RangeError);
});

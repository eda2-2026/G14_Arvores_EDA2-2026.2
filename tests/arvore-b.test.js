import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ArvoreB } from '../src/arvore-b.js';

const TIPOS_DE_PASSO = new Set([
  'visitar', 'comparar', 'encontrou', 'naoEncontrou', 'duplicada', 'inserir',
  'transbordo', 'dividir', 'remover', 'substituir', 'subfluxo', 'emprestar',
  'fundir', 'reduzirAltura',
]);

/** Chaves de cada nó, nível por nível. Ex.: [[[3]], [[1, 2], [4, 5]]] */
function niveis(arvore) {
  const saida = [];
  let atual = [arvore.estado().raiz];
  while (atual.length > 0) {
    saida.push(atual.map((no) => no.chaves));
    atual = atual.flatMap((no) => no.filhos);
  }
  return saida;
}

function tipos(resultado) {
  return resultado.passos.map((p) => p.tipo);
}

/** Gerador de números aleatórios com semente, para os testes serem repetíveis. */
function aleatorio(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('criação', () => {
  test('árvore vazia tem só a raiz, sem chaves', () => {
    const arvore = new ArvoreB();
    assert.deepEqual(arvore.estado(), {
      maxChaves: 4, minChaves: 2, altura: 0, totalChaves: 0,
      raiz: { id: 'n1', chaves: [], filhos: [] },
    });
  });

  test('mínimo é metade do máximo, arredondando para baixo', () => {
    assert.equal(new ArvoreB({ maxChaves: 5 }).minChaves, 2);
    assert.equal(new ArvoreB({ maxChaves: 3 }).minChaves, 1);
  });

  test('recusa ordem inválida e chave que não é número', () => {
    assert.throws(() => new ArvoreB({ maxChaves: 1 }), RangeError);
    assert.throws(() => new ArvoreB().inserir('7'), TypeError);
    assert.throws(() => new ArvoreB().buscar(NaN), TypeError);
  });
});

describe('busca', () => {
  test('árvore vazia: visita a raiz e não encontra', () => {
    const r = new ArvoreB().buscar(10);
    assert.equal(r.sucesso, false);
    assert.deepEqual(tipos(r), ['visitar', 'naoEncontrou']);
  });

  test('desce pelo filho certo e encontra', () => {
    const arvore = ArvoreB.comChaves([1, 2, 3, 4, 5]); // raiz [3], folhas [1,2] e [4,5]
    const r = arvore.buscar(5);
    assert.equal(r.sucesso, true);
    assert.deepEqual(tipos(r), ['visitar', 'comparar', 'visitar', 'comparar', 'comparar', 'encontrou']);
    assert.equal(r.passos[1].resultado, 'maior');
    assert.deepEqual(
      { de: r.passos[2].de, indiceFilho: r.passos[2].indiceFilho },
      { de: arvore.raiz.id, indiceFilho: 1 },
    );
    assert.deepEqual(r.estatisticas, { nosVisitados: 2, comparacoes: 3 });
  });

  test('não altera a árvore', () => {
    const arvore = ArvoreB.comChaves([5, 1, 9, 3, 7, 2]);
    const antes = arvore.estado();
    arvore.buscar(4);
    arvore.buscar(9);
    assert.deepEqual(arvore.estado(), antes);
  });
});

describe('inserção', () => {
  test('até 4 chaves ficam todas na raiz, em ordem', () => {
    const arvore = ArvoreB.comChaves([30, 10, 40, 20]);
    assert.deepEqual(niveis(arvore), [[[10, 20, 30, 40]]]);
  });

  test('a 5ª chave divide a raiz e a do meio vira a nova raiz (exemplo do vídeo)', () => {
    const arvore = ArvoreB.comChaves([1, 2, 3, 4]);
    const r = arvore.inserir(5);
    assert.deepEqual(niveis(arvore), [[[3]], [[1, 2], [4, 5]]]);
    assert.deepEqual(tipos(r).slice(-3), ['inserir', 'transbordo', 'dividir']);
    const dividir = r.passos.at(-1);
    assert.equal(dividir.no, 'n1'); // o nó que dividiu continua sendo a metade da esquerda
    assert.equal(dividir.chavePromovida, 3);
    assert.equal(dividir.novaRaiz, true);
    assert.deepEqual(dividir.chavesEsquerda, [1, 2]);
    assert.deepEqual(dividir.chavesDireita, [4, 5]);
  });

  test('divisão em cascata: a raiz também enche e a árvore cresce um nível', () => {
    const arvore = new ArvoreB();
    for (let i = 1; i <= 16; i++) arvore.inserir(i);
    assert.equal(arvore.altura(), 2);
    assert.equal(arvore.raiz.chaves.length, 4); // raiz cheia
    const r = arvore.inserir(17); // a folha divide, a chave sobe e a raiz divide também
    const divisoes = r.passos.filter((p) => p.tipo === 'dividir');
    assert.equal(divisoes.length, 2);
    assert.deepEqual(divisoes.map((p) => p.novaRaiz), [false, true]);
    assert.equal(arvore.altura(), 3);
    assert.deepEqual(arvore.validar(), []);
  });

  test('chave repetida não entra', () => {
    const arvore = ArvoreB.comChaves([1, 2, 3]);
    const r = arvore.inserir(2);
    assert.equal(r.sucesso, false);
    assert.equal(r.passos.at(-1).tipo, 'duplicada');
    assert.deepEqual(arvore.chaves(), [1, 2, 3]);
  });
});

describe('remoção', () => {
  test('folha com chaves sobrando: só remove', () => {
    const arvore = ArvoreB.comChaves([1, 2, 3, 4, 5, 6]); // [3] / [1,2] [4,5,6]
    const r = arvore.remover(6);
    assert.deepEqual(niveis(arvore), [[[3]], [[1, 2], [4, 5]]]);
    assert.equal(r.passos.at(-1).tipo, 'remover');
  });

  test('chave inexistente: nada muda', () => {
    const arvore = ArvoreB.comChaves([1, 2, 3]);
    const r = arvore.remover(99);
    assert.equal(r.sucesso, false);
    assert.equal(r.passos.at(-1).tipo, 'naoEncontrou');
    assert.deepEqual(arvore.chaves(), [1, 2, 3]);
  });

  test('empréstimo do irmão da direita', () => {
    const arvore = ArvoreB.comChaves([1, 2, 3, 4, 5, 6]); // [3] / [1,2] [4,5,6]
    const r = arvore.remover(1);
    assert.deepEqual(niveis(arvore), [[[4]], [[2, 3], [5, 6]]]);
    const emprestar = r.passos.at(-1);
    assert.equal(emprestar.tipo, 'emprestar');
    assert.equal(emprestar.lado, 'direita');
    assert.equal(emprestar.chaveQueSobe, 4);
    assert.equal(emprestar.chaveQueDesce, 3);
    assert.equal(emprestar.filhoMovido, null);
  });

  test('empréstimo do irmão da esquerda', () => {
    const arvore = ArvoreB.comChaves([1, 2, 3, 4, 5, 0]); // [3] / [0,1,2] [4,5]
    const r = arvore.remover(5);
    assert.deepEqual(niveis(arvore), [[[2]], [[0, 1], [3, 4]]]);
    const emprestar = r.passos.at(-1);
    assert.equal(emprestar.lado, 'esquerda');
    assert.equal(emprestar.chaveQueSobe, 2);
    assert.equal(emprestar.chaveQueDesce, 3);
  });

  test('fusão: irmão no mínimo, junta tudo e a raiz vazia some', () => {
    const arvore = ArvoreB.comChaves([1, 2, 3, 4, 5]); // [3] / [1,2] [4,5]
    const r = arvore.remover(1);
    assert.deepEqual(niveis(arvore), [[[2, 3, 4, 5]]]);
    assert.deepEqual(tipos(r).slice(-4), ['remover', 'subfluxo', 'fundir', 'reduzirAltura']);
    const fundir = r.passos.at(-2);
    assert.equal(fundir.chaveQueDesce, 3);
    assert.equal(arvore.altura(), 1);
  });

  test('nó interno: usa a maior chave da subárvore esquerda como substituta', () => {
    const arvore = ArvoreB.comChaves([1, 2, 3, 4, 5, 6]); // [3] / [1,2] [4,5,6]
    const r = arvore.remover(3);
    const substituir = r.passos.find((p) => p.tipo === 'substituir');
    assert.equal(substituir.chaveRemovida, 3);
    assert.equal(substituir.chaveNova, 2);
    // a folha [1] ficou com falta e pegou emprestado da direita
    assert.deepEqual(niveis(arvore), [[[4]], [[1, 2], [5, 6]]]);
    assert.deepEqual(arvore.validar(), []);
  });

  test('fusão em cascata diminui a altura', () => {
    const arvore = new ArvoreB();
    for (let i = 1; i <= 21; i++) arvore.inserir(i);
    assert.equal(arvore.altura(), 3);
    for (let i = 21; i >= 4; i--) {
      arvore.remover(i);
      assert.deepEqual(arvore.validar(), [], `depois de remover ${i}`);
    }
    assert.equal(arvore.altura(), 1);
    assert.deepEqual(arvore.chaves(), [1, 2, 3]);
  });

  test('remover tudo deixa a árvore vazia', () => {
    const arvore = ArvoreB.comChaves([5, 3, 8, 1, 4, 7, 9, 2, 6]);
    for (const chave of [5, 3, 8, 1, 4, 7, 9, 2, 6]) arvore.remover(chave);
    assert.equal(arvore.altura(), 0);
    assert.deepEqual(arvore.estado().raiz.chaves, []);
  });
});

describe('contrato dos passos', () => {
  test('todo passo tem um tipo conhecido e a fotografia da árvore', () => {
    const arvore = new ArvoreB({ maxChaves: 3 });
    const resultados = [];
    for (const chave of [8, 3, 10, 1, 6, 14, 4, 7, 13, 2, 5, 9, 11, 12]) resultados.push(arvore.inserir(chave));
    for (const chave of [6, 1, 13, 8, 99, 3]) resultados.push(arvore.remover(chave));
    resultados.push(arvore.buscar(7));

    for (const r of resultados) {
      for (const passo of r.passos) {
        assert.ok(TIPOS_DE_PASSO.has(passo.tipo), `tipo desconhecido: ${passo.tipo}`);
        assert.ok(passo.arvore && passo.arvore.raiz, `passo ${passo.tipo} sem fotografia`);
      }
      assert.equal(r.estatisticas.nosVisitados, r.passos.filter((p) => p.tipo === 'visitar').length);
      assert.equal(r.estatisticas.comparacoes, r.passos.filter((p) => p.tipo === 'comparar').length);
      assert.deepEqual(r.arvore, r.passos.at(-1).arvore);
    }
  });

  test('a fotografia é uma cópia: mexer nela não estraga a árvore', () => {
    const arvore = ArvoreB.comChaves([1, 2, 3, 4, 5]);
    const foto = arvore.estado();
    foto.raiz.chaves.push(999);
    foto.raiz.filhos[0].chaves.length = 0;
    assert.deepEqual(arvore.validar(), []);
    assert.deepEqual(arvore.chaves(), [1, 2, 3, 4, 5]);
  });
});

describe('regras da Árvore B com operações aleatórias', () => {
  for (const maxChaves of [2, 3, 4, 5, 6, 7]) {
    test(`maxChaves = ${maxChaves}`, () => {
      const sorteio = aleatorio(maxChaves * 1000 + 7);
      const arvore = new ArvoreB({ maxChaves });
      const referencia = new Set();

      for (let passo = 0; passo < 3000; passo++) {
        const chave = Math.floor(sorteio() * 300);
        const inserir = sorteio() < 0.55;
        const r = inserir ? arvore.inserir(chave) : arvore.remover(chave);

        assert.equal(r.sucesso, inserir ? !referencia.has(chave) : referencia.has(chave));
        if (inserir) referencia.add(chave);
        else referencia.delete(chave);

        const problemas = arvore.validar();
        assert.deepEqual(problemas, [], `operação ${passo}: ${inserir ? 'inserir' : 'remover'} ${chave}`);
        assert.deepEqual(arvore.chaves(), [...referencia].sort((a, b) => a - b));
      }
    });
  }
});

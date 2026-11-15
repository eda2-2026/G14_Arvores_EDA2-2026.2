// Árvore B — "O Gato e o Atum"
//
// Cada nó é uma prateleira com latas de atum numeradas (as chaves).
// As operações não só alteram a árvore: elas também devolvem a lista de
// PASSOS que aconteceram, para a interface transformar em animação.
// O formato dos passos e do estado está descrito em CONTRATO.md.

/** Um nó sem filhos é uma folha. */
function ehFolha(no) {
  return no.filhos.length === 0;
}

/** Copia um nó (e seus filhos) para um objeto simples, que a interface pode usar à vontade. */
function copiarNo(no) {
  return { id: no.id, chaves: [...no.chaves], filhos: no.filhos.map(copiarNo) };
}

function validarChave(chave) {
  if (typeof chave !== 'number' || !Number.isFinite(chave)) {
    throw new TypeError(`A chave precisa ser um número finito (recebi ${String(chave)}).`);
  }
}

export class ArvoreB {
  /**
   * @param {{ maxChaves?: number }} [opcoes]
   *   maxChaves: quantas latas cabem em uma prateleira (padrão 4, como no vídeo).
   *   O mínimo é sempre metade do máximo, arredondando para baixo.
   */
  constructor({ maxChaves = 4 } = {}) {
    if (!Number.isInteger(maxChaves) || maxChaves < 2) {
      throw new RangeError('maxChaves precisa ser um inteiro maior ou igual a 2.');
    }
    this.maxChaves = maxChaves;
    this.minChaves = Math.floor(maxChaves / 2);
    this._proximoId = 1;
    // A raiz sempre existe. Árvore vazia = raiz sem chaves e sem filhos.
    this.raiz = this._novoNo();
  }

  /** Cria uma árvore já com várias chaves inseridas (útil para demonstrações). */
  static comChaves(chaves, opcoes) {
    const arvore = new ArvoreB(opcoes);
    for (const chave of chaves) arvore.inserir(chave);
    return arvore;
  }

  // ───────────────────────────── Operações públicas ─────────────────────────────

  /** Procura uma chave. Não altera a árvore. */
  buscar(chave) {
    validarChave(chave);
    const gravador = this._novoGravador();
    const achado = this._procurar(chave, gravador);

    if (achado.encontrou) {
      gravador.passo('encontrou', { no: achado.no.id, indice: achado.indice, chave });
    } else {
      gravador.passo('naoEncontrou', { no: achado.no.id, chave });
    }
    return gravador.resultado('buscar', chave, achado.encontrou);
  }

  /** Insere uma chave. Chaves repetidas não são inseridas (sucesso = false). */
  inserir(chave) {
    validarChave(chave);
    const gravador = this._novoGravador();
    const achado = this._procurar(chave, gravador);

    if (achado.encontrou) {
      gravador.passo('duplicada', { no: achado.no.id, indice: achado.indice, chave });
      return gravador.resultado('inserir', chave, false);
    }

    // A busca terminou numa folha, exatamente na posição onde a chave deveria estar.
    const folha = achado.no;
    folha.chaves.splice(achado.indice, 0, chave);
    gravador.passo('inserir', { no: folha.id, indice: achado.indice, chave });

    this._corrigirTransbordo(folha, achado.caminho, gravador);
    return gravador.resultado('inserir', chave, true);
  }

  /** Remove uma chave. Se ela não existir, nada muda (sucesso = false). */
  remover(chave) {
    validarChave(chave);
    const gravador = this._novoGravador();
    const achado = this._procurar(chave, gravador);

    if (!achado.encontrou) {
      gravador.passo('naoEncontrou', { no: achado.no.id, chave });
      return gravador.resultado('remover', chave, false);
    }
    gravador.passo('encontrou', { no: achado.no.id, indice: achado.indice, chave });

    const caminho = achado.caminho;
    let folhaQuePerdeuChave;

    if (ehFolha(achado.no)) {
      // Caso simples: a chave está numa folha, basta tirar.
      achado.no.chaves.splice(achado.indice, 1);
      gravador.passo('remover', { no: achado.no.id, indice: achado.indice, chave });
      folhaQuePerdeuChave = achado.no;
    } else {
      // A chave está num nó interno: ela separa duas subárvores e não pode só sumir.
      // Usamos como substituta a MAIOR chave da subárvore da esquerda (o predecessor):
      // desce uma vez para a esquerda e depois sempre pelo filho mais à direita.
      const noInterno = achado.no;
      let atual = noInterno.filhos[achado.indice];
      caminho.push({ no: noInterno, indiceFilho: achado.indice });
      gravador.passo('visitar', { no: atual.id, de: noInterno.id, indiceFilho: achado.indice });

      while (!ehFolha(atual)) {
        const ultimo = atual.chaves.length; // índice do filho mais à direita
        caminho.push({ no: atual, indiceFilho: ultimo });
        const proximo = atual.filhos[ultimo];
        gravador.passo('visitar', { no: proximo.id, de: atual.id, indiceFilho: ultimo });
        atual = proximo;
      }

      const substituta = atual.chaves.pop();
      noInterno.chaves[achado.indice] = substituta;
      gravador.passo('substituir', {
        no: noInterno.id,
        indice: achado.indice,
        chaveRemovida: chave,
        chaveNova: substituta,
        de: atual.id,
      });
      folhaQuePerdeuChave = atual;
    }

    this._corrigirSubfluxo(folhaQuePerdeuChave, caminho, gravador);
    return gravador.resultado('remover', chave, true);
  }

  /** Apaga todas as chaves. Os ids voltam a começar de n1. */
  limpar() {
    this._proximoId = 1;
    this.raiz = this._novoNo();
  }

  /** Fotografia da árvore inteira, no formato do CONTRATO.md. */
  estado() {
    return {
      maxChaves: this.maxChaves,
      minChaves: this.minChaves,
      altura: this.altura(),
      totalChaves: this.chaves().length,
      raiz: copiarNo(this.raiz),
    };
  }

  /** Número de níveis da árvore (árvore vazia = 0). */
  altura() {
    if (this.raiz.chaves.length === 0 && ehFolha(this.raiz)) return 0;
    let niveis = 1;
    let no = this.raiz;
    while (!ehFolha(no)) {
      no = no.filhos[0];
      niveis++;
    }
    return niveis;
  }

  /** Todas as chaves em ordem crescente (percurso em ordem). */
  chaves() {
    const saida = [];
    const percorrer = (no) => {
      for (let i = 0; i < no.chaves.length; i++) {
        if (!ehFolha(no)) percorrer(no.filhos[i]);
        saida.push(no.chaves[i]);
      }
      if (!ehFolha(no)) percorrer(no.filhos[no.chaves.length]);
    };
    percorrer(this.raiz);
    return saida;
  }

  /**
   * Confere as regras da Árvore B e devolve a lista de problemas encontrados.
   * Lista vazia = árvore válida. Usado nos testes e útil para depuração.
   */
  validar() {
    const problemas = [];
    const ids = new Set();
    let nivelDasFolhas = null;

    const visitar = (no, nivel, limiteInferior, limiteSuperior) => {
      if (ids.has(no.id)) problemas.push(`id repetido: ${no.id}`);
      ids.add(no.id);

      const n = no.chaves.length;
      if (n > this.maxChaves) problemas.push(`${no.id} tem ${n} chaves (máximo ${this.maxChaves})`);
      if (no !== this.raiz && n < this.minChaves) {
        problemas.push(`${no.id} tem ${n} chaves (mínimo ${this.minChaves})`);
      }

      for (let i = 0; i < n; i++) {
        const chave = no.chaves[i];
        if (i > 0 && no.chaves[i - 1] >= chave) problemas.push(`${no.id} tem chaves fora de ordem`);
        if (limiteInferior !== null && chave <= limiteInferior) {
          problemas.push(`${no.id}: chave ${chave} deveria ser maior que ${limiteInferior}`);
        }
        if (limiteSuperior !== null && chave >= limiteSuperior) {
          problemas.push(`${no.id}: chave ${chave} deveria ser menor que ${limiteSuperior}`);
        }
      }

      if (ehFolha(no)) {
        if (nivelDasFolhas === null) nivelDasFolhas = nivel;
        else if (nivel !== nivelDasFolhas) problemas.push(`folha ${no.id} está no nível ${nivel}, outras no ${nivelDasFolhas}`);
        return;
      }

      if (no.filhos.length !== n + 1) {
        problemas.push(`${no.id} tem ${n} chaves e ${no.filhos.length} filhos (deveria ter ${n + 1})`);
      }
      no.filhos.forEach((filho, i) => {
        const inferior = i === 0 ? limiteInferior : no.chaves[i - 1];
        const superior = i === n ? limiteSuperior : no.chaves[i];
        visitar(filho, nivel + 1, inferior, superior);
      });
    };

    visitar(this.raiz, 0, null, null);
    return problemas;
  }

  // ───────────────────────────── Partes internas ─────────────────────────────

  _novoNo(chaves = [], filhos = []) {
    return { id: `n${this._proximoId++}`, chaves, filhos };
  }

  /**
   * Guarda os passos de uma operação. Cada passo leva junto a fotografia da
   * árvore logo depois dele, para a interface sempre saber o que desenhar.
   */
  _novoGravador() {
    const passos = [];
    const estatisticas = { nosVisitados: 0, comparacoes: 0 };
    return {
      passo: (tipo, dados) => {
        if (tipo === 'visitar') estatisticas.nosVisitados++;
        if (tipo === 'comparar') estatisticas.comparacoes++;
        passos.push({ tipo, ...dados, arvore: this.estado() });
      },
      resultado: (operacao, chave, sucesso) => ({
        operacao,
        chave,
        sucesso,
        passos,
        estatisticas,
        arvore: this.estado(),
      }),
    };
  }

  /**
   * A busca do vídeo: começa na raiz, compara o alvo com as chaves do nó da
   * esquerda para a direita e desce pelo filho certo até achar ou chegar numa folha.
   *
   * Devolve:
   *   no, indice  → onde a chave está (encontrou) ou onde deveria entrar (não encontrou)
   *   caminho     → os ancestrais percorridos, como { no, indiceFilho }, do topo até o pai
   */
  _procurar(alvo, gravador) {
    const caminho = [];
    let no = this.raiz;
    gravador.passo('visitar', { no: no.id, de: null, indiceFilho: null });

    for (;;) {
      let i = 0;
      while (i < no.chaves.length) {
        const chave = no.chaves[i];
        const resultado = alvo < chave ? 'menor' : alvo > chave ? 'maior' : 'igual';
        gravador.passo('comparar', { no: no.id, indice: i, chave, alvo, resultado });
        if (resultado === 'igual') return { encontrou: true, no, indice: i, caminho };
        if (resultado === 'menor') break; // o alvo fica antes desta chave
        i++;
      }
      // Aqui o alvo é maior que as chaves 0..i-1 e menor que a chave i,
      // então ele só pode estar no filho i (o que fica entre essas duas chaves).
      if (ehFolha(no)) return { encontrou: false, no, indice: i, caminho };

      const filho = no.filhos[i];
      caminho.push({ no, indiceFilho: i });
      gravador.passo('visitar', { no: filho.id, de: no.id, indiceFilho: i });
      no = filho;
    }
  }

  /**
   * Divisão de nós (split). Enquanto o nó tiver uma chave a mais que o máximo:
   * a chave do meio sobe para o pai, as menores ficam no nó (esquerda) e as
   * maiores vão para um nó novo (direita). Se o pai encher, repete nele.
   * Se a raiz dividir, nasce uma raiz nova: é o único jeito de a árvore crescer.
   */
  _corrigirTransbordo(no, caminho, gravador) {
    while (no.chaves.length > this.maxChaves) {
      gravador.passo('transbordo', { no: no.id, quantidade: no.chaves.length, maximo: this.maxChaves });

      const meio = Math.floor(no.chaves.length / 2);
      const chaveDoMeio = no.chaves[meio];
      const direita = this._novoNo(
        no.chaves.slice(meio + 1),
        ehFolha(no) ? [] : no.filhos.slice(meio + 1),
      );
      no.chaves = no.chaves.slice(0, meio);
      if (!ehFolha(no)) no.filhos = no.filhos.slice(0, meio + 1);

      const entradaDoPai = caminho.pop();
      let pai;
      let novaRaiz = false;
      if (entradaDoPai) {
        pai = entradaDoPai.no;
        const posicao = entradaDoPai.indiceFilho;
        pai.chaves.splice(posicao, 0, chaveDoMeio);
        pai.filhos.splice(posicao + 1, 0, direita);
      } else {
        pai = this._novoNo([chaveDoMeio], [no, direita]);
        this.raiz = pai;
        novaRaiz = true;
      }

      gravador.passo('dividir', {
        no: no.id,
        novoNo: direita.id,
        chavePromovida: chaveDoMeio,
        pai: pai.id,
        novaRaiz,
        chavesEsquerda: [...no.chaves],
        chavesDireita: [...direita.chaves],
      });
      no = pai;
    }
  }

  /**
   * Correção de subfluxo (underflow). Enquanto o nó (que não é a raiz) tiver
   * menos chaves que o mínimo:
   *   1. se o irmão da esquerda tiver sobrando, pega emprestado dele;
   *   2. senão, se o irmão da direita tiver sobrando, pega emprestado dele;
   *   3. senão, funde o nó com um irmão e com a chave separadora do pai.
   * A fusão tira uma chave do pai, que pode ficar com falta, então repete nele.
   */
  _corrigirSubfluxo(no, caminho, gravador) {
    while (no !== this.raiz && no.chaves.length < this.minChaves) {
      gravador.passo('subfluxo', { no: no.id, quantidade: no.chaves.length, minimo: this.minChaves });

      const { no: pai, indiceFilho: i } = caminho.pop();
      const irmaoEsquerdo = i > 0 ? pai.filhos[i - 1] : null;
      const irmaoDireito = i < pai.filhos.length - 1 ? pai.filhos[i + 1] : null;

      // 1. Empréstimo do irmão da esquerda: a maior chave dele sobe para o pai,
      //    e a chave separadora do pai desce para o nó com falta.
      if (irmaoEsquerdo && irmaoEsquerdo.chaves.length > this.minChaves) {
        const chaveQueDesce = pai.chaves[i - 1];
        const chaveQueSobe = irmaoEsquerdo.chaves.pop();
        no.chaves.unshift(chaveQueDesce);
        pai.chaves[i - 1] = chaveQueSobe;
        let filhoMovido = null;
        if (!ehFolha(irmaoEsquerdo)) {
          const filho = irmaoEsquerdo.filhos.pop();
          no.filhos.unshift(filho);
          filhoMovido = filho.id;
        }
        gravador.passo('emprestar', {
          no: no.id, irmao: irmaoEsquerdo.id, lado: 'esquerda', pai: pai.id,
          chaveQueSobe, chaveQueDesce, filhoMovido,
        });
        return;
      }

      // 2. Empréstimo do irmão da direita: a menor chave dele sobe para o pai.
      if (irmaoDireito && irmaoDireito.chaves.length > this.minChaves) {
        const chaveQueDesce = pai.chaves[i];
        const chaveQueSobe = irmaoDireito.chaves.shift();
        no.chaves.push(chaveQueDesce);
        pai.chaves[i] = chaveQueSobe;
        let filhoMovido = null;
        if (!ehFolha(irmaoDireito)) {
          const filho = irmaoDireito.filhos.shift();
          no.filhos.push(filho);
          filhoMovido = filho.id;
        }
        gravador.passo('emprestar', {
          no: no.id, irmao: irmaoDireito.id, lado: 'direita', pai: pai.id,
          chaveQueSobe, chaveQueDesce, filhoMovido,
        });
        return;
      }

      // 3. Fusão: ninguém tem chave sobrando. O nó da esquerda do par absorve a
      //    chave separadora do pai e tudo do nó da direita; o da direita some.
      const [esquerda, direita, indiceSeparador] = irmaoEsquerdo
        ? [irmaoEsquerdo, no, i - 1]
        : [no, irmaoDireito, i];
      const chaveQueDesce = pai.chaves[indiceSeparador];
      esquerda.chaves.push(chaveQueDesce, ...direita.chaves);
      esquerda.filhos.push(...direita.filhos);
      pai.chaves.splice(indiceSeparador, 1);
      pai.filhos.splice(indiceSeparador + 1, 1);
      gravador.passo('fundir', { no: esquerda.id, removido: direita.id, pai: pai.id, chaveQueDesce });

      // Se a raiz ficou sem chaves, o único filho dela vira a nova raiz:
      // é o único jeito de a árvore diminuir de altura.
      if (pai === this.raiz && pai.chaves.length === 0) {
        this.raiz = esquerda;
        gravador.passo('reduzirAltura', { raizAntiga: pai.id, novaRaiz: esquerda.id });
        return;
      }
      no = pai;
    }
  }
}

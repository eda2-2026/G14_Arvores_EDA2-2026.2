# Contrato: algoritmo ↔ interface

Este documento combina como a **Árvore B** (`src/arvore-b.js`, parte do Lucas) conversa com a **interface** (parte do Arthur). Enquanto os dois lados seguirem este formato, cada um pode mexer na sua parte sem quebrar a do outro. Se precisar mudar algo aqui, combinem antes.

## A ideia em uma frase

Cada operação (`buscar`, `inserir`, `remover`) altera a árvore **e** devolve a lista de **passos** que aconteceram. A interface não precisa saber nada de Árvore B: ela só lê os passos, um por um, e anima o gato.

| Árvore B | Na tela |
|---|---|
| Nó | Prateleira |
| Chave | Lata de atum com número |
| Filho | Escadinha que desce da prateleira |
| `visitar` | O gato pula para uma prateleira |
| `comparar` | O gato cheira uma lata |

## Como usar

```js
import { ArvoreB } from './src/arvore-b.js';

const arvore = new ArvoreB({ maxChaves: 4 }); // 4 é o padrão, como no vídeo
const resultado = arvore.inserir(42);

for (const passo of resultado.passos) {
  // animar o passo...
}
```

O arquivo é um **módulo ES**, então no HTML use `<script type="module">`. O navegador **não carrega módulos abrindo o arquivo direto** (`file://`). Rode um servidor local na pasta do projeto:

```bash
python3 -m http.server 8000
```

Depois é só abrir `http://localhost:8000`. No GitHub Pages funciona sem fazer nada.

**Onde colocar a interface:** sugestão de `index.html` na raiz e o resto em `src/interface/`. Assim ninguém mexe no arquivo do outro.

## Métodos

| Método | O que faz | Devolve |
|---|---|---|
| `new ArvoreB({ maxChaves })` | Cria uma árvore vazia. `maxChaves` ≥ 2, padrão 4. O mínimo é `Math.floor(maxChaves / 2)` | — |
| `ArvoreB.comChaves([..], { maxChaves })` | Cria uma árvore já com essas chaves (bom para a tela inicial) | `ArvoreB` |
| `buscar(chave)` | Procura a chave. **Não altera** a árvore | Resultado |
| `inserir(chave)` | Insere. Chave repetida não entra (`sucesso: false`) | Resultado |
| `remover(chave)` | Remove. Chave que não existe: nada muda (`sucesso: false`) | Resultado |
| `estado()` | Fotografia da árvore agora | Estado |
| `limpar()` | Esvazia a árvore. Os ids recomeçam em `n1` | — |
| `chaves()` | Todas as chaves em ordem crescente | `number[]` |
| `altura()` | Número de níveis (vazia = 0) | `number` |
| `validar()` | Lista de regras quebradas (vazia = árvore ok). Para depuração | `string[]` |

As chaves são **números**: inteiros funcionam melhor nas latas. Se você passar algo que não é número, o método lança `TypeError`. Valide o campo de texto antes de chamar.

## Estado (a fotografia da árvore)

```js
{
  maxChaves: 4,
  minChaves: 2,
  altura: 2,
  totalChaves: 5,
  raiz: {
    id: "n3",
    chaves: [3],
    filhos: [
      { id: "n1", chaves: [1, 2], filhos: [] },
      { id: "n2", chaves: [4, 5], filhos: [] }
    ]
  }
}
```

- Um nó com `filhos: []` é uma **folha**. Um nó interno sempre tem `chaves.length + 1` filhos.
- `filhos[i]` fica **entre** `chaves[i-1]` e `chaves[i]`, então dá para desenhar a escadinha `i` entre essas duas latas.
- A raiz **sempre existe**. A árvore vazia é uma raiz com `chaves: []`.
- A fotografia é uma **cópia**: pode guardar e mexer à vontade, a árvore de verdade não muda.

### Os ids dos nós (importante para animar)

Cada prateleira tem um `id` fixo (`"n1"`, `"n2"`…). Assim você sabe que a prateleira `n2` de um passo é a mesma `n2` do passo seguinte, e pode animar o movimento em vez de redesenhar tudo.

- **Divisão (`dividir`)**: o nó que dividiu **mantém o id** e vira a metade da **esquerda**. A metade da direita é um nó novo (`novoNo`).
- **Nova raiz**: quando a raiz divide, a nova raiz é um nó novo.
- **Fusão (`fundir`)**: o nó da **esquerda sobrevive** com o mesmo id. O da direita (`removido`) some.
- **Redução de altura (`reduzirAltura`)**: a raiz antiga some e o filho dela vira a raiz.

## Resultado de uma operação

```js
{
  operacao: "buscar",          // "buscar" | "inserir" | "remover"
  chave: 5,
  sucesso: true,               // achou / inseriu / removeu?
  passos: [ ... ],             // ver abaixo
  estatisticas: {
    nosVisitados: 2,           // quantas prateleiras o gato pulou
    comparacoes: 3             // quantas latas o gato cheirou
  },
  arvore: { ... }              // estado final (igual ao do último passo)
}
```

## Passos

Todo passo tem `tipo` e `arvore`, que é a fotografia da árvore **logo depois** do passo. Para desenhar a tela no passo `k`, basta desenhar `passos[k].arvore`. Os outros campos dizem **o que** aconteceu, para você animar.

| `tipo` | Campos | O que aconteceu | Ideia de animação |
|---|---|---|---|
| `visitar` | `no`, `de`, `indiceFilho` | O gato chegou na prateleira `no`. Na raiz, `de` e `indiceFilho` são `null`. Nos outros, ele desceu de `de` pela escadinha `indiceFilho` | Gato pula / desce a escada |
| `comparar` | `no`, `indice`, `chave`, `alvo`, `resultado` | Comparou o `alvo` com a lata `chaves[indice]`. `resultado` diz como o **alvo** é em relação à lata: `"menor"`, `"igual"` ou `"maior"` | Gato cheira a lata |
| `encontrou` | `no`, `indice`, `chave` | Achou a chave | Gato feliz, come o atum 🐟 |
| `naoEncontrou` | `no`, `chave` | Chegou numa folha (`no`) e a chave não existe | Gato triste 😿 |
| `duplicada` | `no`, `indice`, `chave` | Tentou inserir uma chave que já existe | Gato confuso: "já tem essa!" |
| `inserir` | `no`, `indice`, `chave` | Lata nova colocada na folha `no`, na posição `indice` | Lata aparece na prateleira |
| `transbordo` | `no`, `quantidade`, `maximo` | A prateleira ficou com uma lata a mais que o máximo | Prateleira treme / range |
| `dividir` | `no`, `novoNo`, `chavePromovida`, `pai`, `novaRaiz`, `chavesEsquerda`, `chavesDireita` | A prateleira rachou: `no` ficou com `chavesEsquerda`, `novoNo` com `chavesDireita`, e `chavePromovida` subiu para `pai`. Se `novaRaiz` for `true`, `pai` é uma raiz nova | Prateleira racha em duas, lata do meio sobe |
| `remover` | `no`, `indice`, `chave` | Lata tirada da folha `no` | Gato come a lata |
| `substituir` | `no`, `indice`, `chaveRemovida`, `chaveNova`, `de` | A chave estava num nó interno: foi trocada pela maior lata da subárvore esquerda, que saiu da folha `de` | Lata `chaveNova` sobe da folha e ocupa o lugar |
| `subfluxo` | `no`, `quantidade`, `minimo` | A prateleira ficou com menos latas que o mínimo | Prateleira vazia demais, alerta |
| `emprestar` | `no`, `irmao`, `lado`, `pai`, `chaveQueSobe`, `chaveQueDesce`, `filhoMovido` | O `irmao` (à `"esquerda"` ou `"direita"`) emprestou: `chaveQueSobe` foi do irmão para o pai e `chaveQueDesce` foi do pai para `no`. Se não forem folhas, a escadinha `filhoMovido` mudou de dono (senão `null`) | Rotação: uma lata sobe, outra desce |
| `fundir` | `no`, `removido`, `pai`, `chaveQueDesce` | `no` absorveu `chaveQueDesce` (que veio do pai) e todas as latas de `removido`, que sumiu | Duas prateleiras viram uma |
| `reduzirAltura` | `raizAntiga`, `novaRaiz` | A raiz ficou sem latas e sumiu. O filho dela virou a raiz | Prateleira do topo desaparece |

### Fotografias "no meio do caminho"

Algumas fotografias mostram a árvore **temporariamente fora das regras**. É de propósito, porque é o momento dramático da animação:

- Depois de `inserir`, ou de um `dividir` que empurrou uma lata para o pai, um nó pode aparecer com **`maxChaves + 1`** latas. O próximo passo é `transbordo` e depois `dividir`.
- Depois de `remover`, `substituir` ou `fundir`, um nó pode aparecer com **menos que o mínimo**. O próximo passo é `subfluxo` e depois `emprestar` ou `fundir`.
- Entre `fundir` e `reduzirAltura`, a raiz aparece **sem chaves e com um filho só**.

### Ordem das sequências

- **Busca:** `visitar` → `comparar` (uma ou mais vezes) → `visitar` → … → `encontrou` | `naoEncontrou`. O gato cheira as latas **da esquerda para a direita** e para na primeira que é maior ou igual ao alvo.
- **Inserção:** passos da busca → `duplicada` (fim) **ou** `inserir` → (`transbordo` → `dividir`) repetido enquanto o pai também encher.
- **Remoção:** passos da busca → `naoEncontrou` (fim) **ou** `encontrou` → então:
  - se a chave está numa folha: `remover`;
  - se está num nó interno: `visitar` (descendo até a folha com a maior chave da esquerda) → `substituir`.

  Depois, enquanto houver falta: `subfluxo` → `emprestar` (fim) **ou** `fundir` → (`reduzirAltura` se a raiz esvaziou).
- No empréstimo, o algoritmo tenta **primeiro o irmão da esquerda**, depois o da direita. Se nenhum tiver lata sobrando, faz a fusão.

## Exemplos reais

Saídas de verdade do algoritmo. Aqui o campo `arvore` foi omitido de cada passo para caber.

**Buscar 5** na árvore `[3] / [1,2] [4,5]`:

```js
[
  { tipo: "visitar",  no: "n3", de: null, indiceFilho: null },
  { tipo: "comparar", no: "n3", indice: 0, chave: 3, alvo: 5, resultado: "maior" },
  { tipo: "visitar",  no: "n2", de: "n3", indiceFilho: 1 },
  { tipo: "comparar", no: "n2", indice: 0, chave: 4, alvo: 5, resultado: "maior" },
  { tipo: "comparar", no: "n2", indice: 1, chave: 5, alvo: 5, resultado: "igual" },
  { tipo: "encontrou", no: "n2", indice: 1, chave: 5 }
]
// estatisticas: { nosVisitados: 2, comparacoes: 3 }
```

**Inserir 5** na árvore `[1,2,3,4]`. Este é o exemplo do vídeo: a 5ª lata racha a prateleira.

```js
[
  // ...visitar e comparar...
  { tipo: "inserir",    no: "n1", indice: 4, chave: 5 },
  { tipo: "transbordo", no: "n1", quantidade: 5, maximo: 4 },
  { tipo: "dividir",    no: "n1", novoNo: "n2", chavePromovida: 3, pai: "n3", novaRaiz: true,
                        chavesEsquerda: [1, 2], chavesDireita: [4, 5] }
]
```

**Remover 1** de `[3] / [1,2] [4,5]`. O irmão está no mínimo, então os nós se fundem e a árvore diminui:

```js
[
  // ...visitar, comparar, encontrou...
  { tipo: "remover",       no: "n1", indice: 0, chave: 1 },
  { tipo: "subfluxo",      no: "n1", quantidade: 1, minimo: 2 },
  { tipo: "fundir",        no: "n1", removido: "n2", pai: "n3", chaveQueDesce: 3 },
  { tipo: "reduzirAltura", raizAntiga: "n3", novaRaiz: "n1" }
]
// árvore final: [2, 3, 4, 5]
```

**Remover 3** (nó interno) de `[3] / [1,2] [4,5,6]`:

```js
[
  { tipo: "visitar",    no: "n3", de: null, indiceFilho: null },
  // comparar...
  { tipo: "encontrou",  no: "n3", indice: 0, chave: 3 },
  { tipo: "visitar",    no: "n1", de: "n3", indiceFilho: 0 },
  { tipo: "substituir", no: "n3", indice: 0, chaveRemovida: 3, chaveNova: 2, de: "n1" },
  { tipo: "subfluxo",   no: "n1", quantidade: 1, minimo: 2 },
  { tipo: "emprestar",  no: "n1", irmao: "n2", lado: "direita", pai: "n3",
                        chaveQueSobe: 4, chaveQueDesce: 2, filhoMovido: null }
]
// árvore final: [4] / [1,2] [5,6]
```

## Testes do algoritmo

```bash
npm test
```

Os testes confirmam as regras do vídeo depois de milhares de operações aleatórias, com máximos de 2 a 7 chaves: folhas no mesmo nível, mínimo e máximo de chaves e chaves em ordem. Também confirmam que todo passo segue este contrato.

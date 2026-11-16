import { ArvoreB } from '../arvore-b.js';

export function criarBosque(anteriores = []) {
  const usados = new Set(anteriores);
  const candidatos = Array.from({ length: 100 }, (_, i) => i + 1).filter(n => !usados.has(n));
  if (candidatos.length < 15) throw new RangeError('Não há números livres suficientes para renovar o bosque.');
  for (let i = 0; i < 15; i++) {
    const j = i + Math.floor(Math.random() * (candidatos.length - i));
    [candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
  }
  // Quinze inserções em ordem geram quatro níveis completos, com uma chave por nó.
  return ArvoreB.comChaves(candidatos.slice(0, 15).sort((a, b) => a - b), { maxChaves: 2 });
}

// O alvo informado permanece o mesmo. Quando falta, entra no lugar do
// número mais próximo, e as inserções reconstroem uma Árvore B válida.
export function prepararBusca(arvore, numero) {
  if (!Number.isSafeInteger(numero)) throw new TypeError('Informe um número inteiro.');
  if (numero < 1 || numero > 100) throw new RangeError('Informe um número de 1 a 100.');
  const chaves = arvore.chaves();
  if (chaves.includes(numero)) return { arvore, substituido: null };
  const substituido = chaves.length ? chaves.reduce((proximo, chave) => (
    Math.abs(chave - numero) < Math.abs(proximo - numero) ? chave : proximo
  )) : null;
  const novas = chaves.filter(chave => chave !== substituido).concat(numero).sort((a, b) => a - b);
  return {
    arvore: ArvoreB.comChaves(novas, { maxChaves: arvore.maxChaves }),
    substituido,
  };
}

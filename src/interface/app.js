import { LARGURA, ALTURA, desenharMapa, desenharTrilha, desenharCaixa, desenharPeixeSolto, desenharGato } from './pixel-art.js';
import { criarMapa, PES_GATO, ESPACO_CAIXA, PRIMEIRO_NIVEL, PASSO_NIVEL } from './mapa-arvore.js';
import { criarBosque, prepararBusca } from './numeros.js';

let arvore = criarBosque();
let raiz = arvore.estado().raiz;
const $ = (id) => document.getElementById(id);
const tela = $('arvore');
const ctx = tela.getContext('2d');
const fundo = document.createElement('canvas');
fundo.width = LARGURA; fundo.height = ALTURA;
let posicoes = new Map(), caminhos = new Map();
const botoes = new Map();
const visitados = new Set();
const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
const gato = { x: 0, y: 0, direcao: 'baixo', andando: false, quadro: 0, humor: '' };
let destaque = null;
let controle = null;
let trilhaAtiva = null;
let caixaAberta = null;
let peixeVoando = null;
let zoom = 2;
function pontoCaixa(id, indice = 0) {
  const { x, y, no } = posicoes.get(id);
  return { x: x + (indice - (no.chaves.length - 1) / 2) * ESPACO_CAIXA, y };
}
function acompanharGato() {
  const area = document.querySelector('.rolagem-arvore');
  const escala = tela.getBoundingClientRect().width / LARGURA;
  area.scrollLeft = gato.x * escala - area.clientWidth / 2;
  area.scrollTop = gato.y * escala - area.clientHeight / 2;
}
function desenhar() {
  ctx.clearRect(0, 0, LARGURA, ALTURA);
  ctx.drawImage(fundo, 0, 0);
  for (const [id, caminho] of caminhos) {
    if (visitados.has(id) || trilhaAtiva === id) desenharTrilha(ctx, caminho.pontos, true);
  }
  for (const [id, ponto] of posicoes) {
    ponto.no.chaves.forEach((chave, indice) => {
      const caixa = pontoCaixa(id, indice);
      const aberta = caixaAberta?.no === id && caixaAberta.indice === indice;
      desenharCaixa(ctx, caixa.x, caixa.y, chave, destaque?.no === id && destaque.indice === indice ? destaque.tipo : '', aberta ? caixaAberta.abertura : 0, aberta && caixaAberta.peixeDentro);
    });
  }
  desenharGato(ctx, gato);
  if (peixeVoando) desenharPeixeSolto(ctx, peixeVoando.x, peixeVoando.y);
  // Coordenadas acessíveis também permitem inspecionar a animação sem ler pixels.
  tela.dataset.gatoX = Math.round(gato.x);
  tela.dataset.gatoY = Math.round(gato.y);
  tela.dataset.peixeComGato = String(Boolean(gato.temPeixe));
}
function mensagem(titulo, texto) {
  $('status-titulo').textContent = titulo;
  $('status-texto').textContent = texto;
}
function definirBusca(ativa) {
  $('procurar').disabled = ativa;
  $('numero').disabled = ativa;
  $('mundo').setAttribute('aria-busy', String(ativa));
  for (const botao of botoes.values()) botao.disabled = ativa;
}

// Esperas e quadros são cancelados juntos ao clicar em Recomeçar.
function esperar(ms, sinal) {
  sinal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const cancelar = () => { clearTimeout(timer); reject(sinal.reason); };
    const timer = setTimeout(() => { sinal.removeEventListener('abort', cancelar); resolve(); }, ms);
    sinal.addEventListener('abort', cancelar, { once: true });
  });
}
function animar(duracao, atualizar, sinal) {
  sinal.throwIfAborted();
  if (movimentoReduzido.matches) {
    atualizar(1); desenhar();
    return esperar(100, sinal);
  }
  return new Promise((resolve, reject) => {
    let quadro;
    const inicio = performance.now();
    const cancelar = () => { cancelAnimationFrame(quadro); reject(sinal.reason); };
    sinal.addEventListener('abort', cancelar, { once: true });
    function proximo(agora) {
      const t = Math.min(1, (agora - inicio) / duracao);
      atualizar(t); desenhar();
      if (t < 1) quadro = requestAnimationFrame(proximo);
      else { sinal.removeEventListener('abort', cancelar); resolve(); }
    }
    quadro = requestAnimationFrame(proximo);
  });
}
function mover(destino, sinal) {
  sinal.throwIfAborted();
  const origem = { x: gato.x, y: gato.y };
  const dx = destino[0] - origem.x, dy = destino[1] - origem.y;
  const distancia = Math.abs(dx) + Math.abs(dy);
  if (!distancia) return Promise.resolve();
  gato.direcao = dx ? dx > 0 ? 'direita' : 'esquerda' : dy > 0 ? 'baixo' : 'cima';
  if (movimentoReduzido.matches) {
    gato.x = destino[0]; gato.y = destino[1]; desenhar(); acompanharGato();
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    let quadro;
    const inicio = performance.now(), duracao = distancia * 6;
    gato.andando = true;
    const cancelar = () => { cancelAnimationFrame(quadro); gato.andando = false; reject(sinal.reason); };
    sinal.addEventListener('abort', cancelar, { once: true });
    function animar(agora) {
      const t = Math.min(1, (agora - inicio) / duracao);
      gato.x = origem.x + dx * t; gato.y = origem.y + dy * t;
      gato.quadro = Math.floor(agora / 100);
      desenhar(); acompanharGato();
      if (t < 1) quadro = requestAnimationFrame(animar);
      else { gato.andando = false; sinal.removeEventListener('abort', cancelar); desenhar(); resolve(); }
    }
    quadro = requestAnimationFrame(animar);
  });
}
async function percorrer(pontos, sinal) {
  for (const ponto of pontos) await mover(ponto, sinal);
}

async function pegarPeixe(passo, sinal) {
  const ponto = pontoCaixa(passo.no, passo.indice);
  const botao = botoes.get(passo.chave);
  destacar(passo.no, passo.indice, 'encontrado');
  mensagem(`Encontrei a caixa ${passo.chave}!`, 'O gato vai abrir a tampa para pegar o peixe.');
  await mover([ponto.x, ponto.y + 40], sinal);
  gato.direcao = 'cima'; gato.acao = 'abrindo';
  caixaAberta = { no: passo.no, indice: passo.indice, abertura: 0, peixeDentro: true };
  $('mundo').dataset.fase = 'abrindo'; botao.dataset.estado = 'abrindo';
  await animar(700, t => { caixaAberta.abertura = t; }, sinal);
  botao.dataset.estado = 'aberta'; gato.acao = '';
  await esperar(movimentoReduzido.matches ? 100 : 350, sinal);

  $('mundo').dataset.fase = 'pegando';
  mensagem('Um peixe dentro da caixa!', 'O gato está pegando o peixe.');
  caixaAberta.peixeDentro = false;
  gato.direcao = 'baixo';
  const origem = { x: ponto.x, y: ponto.y - 22 };
  const destino = { x: gato.x, y: gato.y - 19 };
  peixeVoando = { ...origem };
  await animar(700, t => {
    peixeVoando.x = origem.x + (destino.x - origem.x) * t;
    peixeVoando.y = origem.y + (destino.y - origem.y) * t - Math.sin(t * Math.PI) * 9;
  }, sinal);
  peixeVoando = null; gato.temPeixe = true; gato.humor = 'feliz';
  await mover([ponto.x, ponto.y + PES_GATO], sinal);
  botao.dataset.estado = 'vazia';
  botao.setAttribute('aria-label', `Caixa ${passo.chave} aberta, o gato pegou o peixe`);
  $('mundo').dataset.fase = 'concluido';
  document.querySelector('.jogo').dataset.resultado = 'encontrou';
  mensagem(`Peguei o peixe da caixa ${passo.chave}!`, `Nível ${posicoes.get(passo.no).nivel} · ${visitados.size} ${visitados.size === 1 ? 'nó visitado' : 'nós visitados'}.`);
}

async function buscar(evento) {
  evento.preventDefault();
  if (controle || !$('busca').reportValidity()) return;
  const numero = $('numero').valueAsNumber;
  if (!Number.isSafeInteger(numero)) return;
  reiniciar();
  const preparacao = prepararBusca(arvore, numero);
  if (preparacao.arvore !== arvore) {
    arvore = preparacao.arvore;
    montarMapa();
    reiniciar();
  }
  $('numero').value = numero;
  $('mundo').dataset.solicitado = numero;
  $('mundo').dataset.alvo = numero;
  $('mundo').dataset.substituido = preparacao.substituido ?? '';
  if (preparacao.substituido !== null) {
    $('aviso-alvo').textContent = `Substituí o número ${preparacao.substituido} por ${numero} e reorganizei a árvore.`;
    $('aviso-alvo').hidden = false;
  }
  const atual = new AbortController(); controle = atual;
  const sinal = atual.signal;
  definirBusca(true);
  $('mundo').dataset.fase = 'procurando';
  $('alvo').textContent = `ALVO: ${numero}`;
  const resultado = arvore.buscar(numero);
  try {
    for (const passo of resultado.passos) {
      sinal.throwIfAborted();
      destaque = null;
      if (passo.tipo === 'visitar') {
        const destino = posicoes.get(passo.no);
        const tipo = passo.de === null ? 'raiz' : destino.no.filhos.length ? 'nó interno' : 'folha';
        mensagem(`Nível ${destino.nivel} · ${tipo}`, passo.de ? 'O gato está seguindo o caminho escolhido.' : `Vamos procurar o peixe ${numero}!`);
        if (passo.de) {
          trilhaAtiva = passo.no;
          await percorrer(caminhos.get(passo.no).pontos, sinal);
        }
        const caixa = pontoCaixa(passo.no);
        await mover([caixa.x, caixa.y + PES_GATO], sinal);
        visitados.add(passo.no);
        $('mundo').dataset.nivel = destino.nivel;
        $('mundo').dataset.visitados = visitados.size;
      } else if (passo.tipo === 'comparar') {
        const caixa = pontoCaixa(passo.no, passo.indice);
        await mover([caixa.x, caixa.y + PES_GATO], sinal);
        destacar(passo.no, passo.indice, 'comparando');
        const simbolo = { menor: '<', maior: '>', igual: '=' }[passo.resultado];
        const explicacao = { menor: 'É menor. Vamos pelo caminho à esquerda desta caixa.', maior: 'É maior. Vamos continuar para a direita.', igual: 'É a caixa certa!' }[passo.resultado];
        mensagem(`${numero} ${simbolo} ${passo.chave}`, `Nível ${posicoes.get(passo.no).nivel}. ${explicacao}`);
      } else if (passo.tipo === 'encontrou') {
        await pegarPeixe(passo, sinal);
      } else if (passo.tipo === 'naoEncontrou') {
        gato.humor = 'duvida'; gato.direcao = 'baixo';
        document.querySelector('.jogo').dataset.resultado = 'ausente';
        $('mundo').dataset.fase = 'ausente';
        mensagem(`A caixa ${numero} não está no bosque.`, 'O gato chegou ao fim da trilha. Tente outro número.');
      }
      desenhar();
      if (passo.tipo !== 'encontrou' && passo.tipo !== 'naoEncontrou') await esperar(movimentoReduzido.matches ? 70 : 650, sinal);
    }
  } catch (erro) {
    if (erro.name !== 'AbortError') {
      mensagem('Não consegui terminar a busca.', 'Clique em Recomeçar e tente novamente.');
      console.error(erro);
    }
  } finally {
    if (controle === atual) { controle = null; definirBusca(false); }
  }
}
function destacar(no, indice, tipo) {
  destaque = { no, indice, tipo };
  for (const botao of botoes.values()) botao.classList.remove('comparando', 'encontrado');
  const chave = posicoes.get(no).no.chaves[indice];
  botoes.get(chave).classList.add(tipo);
}
function reiniciar() {
  controle?.abort(); controle = null;
  visitados.clear(); destaque = null; trilhaAtiva = null; caixaAberta = null; peixeVoando = null;
  for (const [chave, botao] of botoes) {
    botao.classList.remove('comparando', 'encontrado');
    botao.dataset.estado = 'fechada';
    botao.setAttribute('aria-label', `Procurar caixa ${chave}, nível ${botao.dataset.nivel}`);
  }
  const inicio = pontoCaixa(raiz.id);
  Object.assign(gato, { x: inicio.x, y: inicio.y + PES_GATO, direcao: 'baixo', andando: false, quadro: 0, humor: '', temPeixe: false, acao: '' });
  $('mundo').dataset.fase = 'pronto';
  $('mundo').dataset.nivel = '0';
  $('mundo').dataset.visitados = '0';
  $('mundo').dataset.solicitado = '';
  $('mundo').dataset.alvo = '';
  $('mundo').dataset.substituido = '';
  $('aviso-alvo').hidden = true;
  $('aviso-alvo').textContent = '';
  document.querySelector('.jogo').dataset.resultado = '';
  $('alvo').textContent = 'ALVO: -';
  definirBusca(false);
  mensagem('Qual caixa vamos procurar?', '');
  desenhar(); acompanharGato();
}

function embaralharBosque() {
  reiniciar();
  arvore = criarBosque(arvore.chaves());
  montarMapa();
  reiniciar();
  escolherCaixaInicial();
}
function escolherCaixaInicial() {
  const folhas = [...posicoes.values()].filter(no => !no.no.filhos.length);
  $('numero').value = folhas[Math.floor(Math.random() * folhas.length)].no.chaves[0];
}
function montarMapa() {
  raiz = arvore.estado().raiz;
  ({ posicoes, caminhos } = criarMapa(raiz));
  botoes.clear();
  $('caixas').replaceChildren();
  document.querySelectorAll('.rotulo-nivel').forEach(rotulo => rotulo.remove());
  for (let nivel = 0; nivel < arvore.altura(); nivel++) {
    const rotulo = document.createElement('span');
    rotulo.className = 'rotulo-nivel';
    rotulo.style.top = `${(PRIMEIRO_NIVEL + nivel * PASSO_NIVEL - 36) / ALTURA * 100}%`;
    rotulo.textContent = `NÍVEL ${nivel}`;
    const tipo = document.createElement('small');
    tipo.textContent = nivel === 0 ? 'RAIZ' : nivel === arvore.altura() - 1 ? 'FOLHAS' : 'INTERNO';
    rotulo.append(tipo);
    $('mundo').append(rotulo);
  }
  for (const [id, ponto] of posicoes) {
    ponto.no.chaves.forEach((chave, indice) => {
      const caixa = pontoCaixa(id, indice), botao = document.createElement('button');
      botao.type = 'button'; botao.className = 'caixa'; botao.dataset.chave = chave;
      botao.dataset.nivel = ponto.nivel;
      botao.dataset.no = id;
      botao.setAttribute('aria-label', `Procurar caixa ${chave}, nível ${ponto.nivel}`);
      Object.assign(botao.style, { left: `${(caixa.x - 20) / LARGURA * 100}%`, top: `${(caixa.y - 33) / ALTURA * 100}%`, width: `${40 / LARGURA * 100}%`, height: `${37 / ALTURA * 100}%` });
      botao.addEventListener('click', () => { if (!controle) { $('numero').value = chave; $('busca').requestSubmit(); } });
      $('caixas').append(botao); botoes.set(chave, botao);
    });
  }
  desenharMapa(fundo.getContext('2d'), posicoes, caminhos);
}

montarMapa();
function atualizarTelaCheia() {
  const ativa = document.fullscreenElement === $('experiencia') || $('experiencia').classList.contains('tela-cheia');
  $('tela-cheia').setAttribute('aria-pressed', String(ativa));
  $('texto-tela-cheia').textContent = ativa ? 'Sair da tela cheia' : 'Tela cheia';
  document.body.classList.toggle('tela-cheia-aberta', ativa);
  requestAnimationFrame(acompanharGato);
}
function alterarZoom(novoZoom) {
  zoom = Math.min(3, Math.max(.5, Math.round(novoZoom * 4) / 4));
  const largura = `${LARGURA * zoom}px`;
  $('mundo').style.width = largura;
  $('mundo').style.minWidth = largura;
  $('mundo').style.setProperty('--zoom', zoom);
  $('valor-zoom').textContent = `${zoom * 100}%`;
  $('zoom-menos').disabled = zoom === .5;
  $('zoom-mais').disabled = zoom === 3;
  requestAnimationFrame(acompanharGato);
}
async function alternarTelaCheia() {
  const area = $('experiencia');
  if (document.fullscreenElement === area) await document.exitFullscreen();
  else if (area.classList.contains('tela-cheia')) area.classList.remove('tela-cheia');
  else {
    try {
      if (document.fullscreenEnabled && area.requestFullscreen) await area.requestFullscreen();
      else area.classList.add('tela-cheia');
    } catch {
      area.classList.add('tela-cheia');
    }
  }
  atualizarTelaCheia();
}
$('tela-cheia').addEventListener('click', alternarTelaCheia);
$('zoom-menos').addEventListener('click', () => alterarZoom(zoom - .25));
$('zoom-mais').addEventListener('click', () => alterarZoom(zoom + .25));
document.addEventListener('fullscreenchange', atualizarTelaCheia);
document.addEventListener('keydown', evento => {
  if (evento.key === 'Escape' && $('experiencia').classList.contains('tela-cheia')) {
    $('experiencia').classList.remove('tela-cheia');
    atualizarTelaCheia();
  }
});
desenharGato($('retrato').getContext('2d'), { x: 15, y: 26, direcao: 'baixo', quadro: 0, escala: 1 });
$('busca').addEventListener('submit', buscar);
$('reiniciar').addEventListener('click', embaralharBosque);
window.addEventListener('resize', acompanharGato);
reiniciar();
escolherCaixaInicial();
alterarZoom(2);

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const raiz = new URL('../', import.meta.url);
const arquivos = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/src/interface/estilo.css', ['src/interface/estilo.css', 'text/css; charset=utf-8']],
  ['/src/interface/app.js', ['src/interface/app.js', 'text/javascript; charset=utf-8']],
  ['/src/interface/pixel-art.js', ['src/interface/pixel-art.js', 'text/javascript; charset=utf-8']],
  ['/src/interface/mapa-arvore.js', ['src/interface/mapa-arvore.js', 'text/javascript; charset=utf-8']],
  ['/src/interface/numeros.js', ['src/interface/numeros.js', 'text/javascript; charset=utf-8']],
  ['/src/interface/assets/PressStart2P-Regular.ttf', ['src/interface/assets/PressStart2P-Regular.ttf', 'font/ttf']],
  ['/src/arvore-b.js', ['src/arvore-b.js', 'text/javascript; charset=utf-8']],
]);
const porta = Number(process.env.PORT || 8000);
const servidor = createServer(async (req, res) => {
  const caminho = new URL(req.url, 'http://localhost').pathname;
  const arquivo = arquivos.get(caminho);
  if (!arquivo) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Arquivo não encontrado.');
    return;
  }
  try {
    const conteudo = await readFile(new URL(arquivo[0], raiz));
    res.writeHead(200, { 'Content-Type': arquivo[1], 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : conteudo);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Não foi possível abrir o arquivo.');
  }
});
servidor.on('error', (erro) => {
  console.error(erro.code === 'EADDRINUSE' ? `A porta ${porta} está ocupada. Escolha outra com a variável PORT.` : erro.message);
  process.exitCode = 1;
});
servidor.listen(porta, '127.0.0.1', () => console.log(`O Gato e o Atum: http://localhost:${porta}\nPressione Ctrl+C para encerrar.`));

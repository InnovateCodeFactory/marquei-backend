// Teste de fumaça rodado DENTRO do build da imagem (ver Dockerfile), depois do
// prune. Falha o build se o entrypoint sumiu ou se o engine do Prisma nao carrega.
const fs = require('node:fs');

const main = process.argv[2];
if (!main || !fs.existsSync(main)) {
  console.error(`entrypoint nao encontrado: ${main}`);
  process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient({
  datasourceUrl: 'postgresql://u:p@127.0.0.1:1/smoke',
});

client
  .$connect()
  .then(() => process.exit(1))
  .catch((error) => {
    // Erro de conexao = o engine nativo carregou e tentou conectar (esperado).
    if (/Can't reach database server/.test(String(error && error.message))) {
      console.log('smoke ok: entrypoint presente e Prisma engine carregado');
      process.exit(0);
    }
    console.error(error);
    process.exit(1);
  });

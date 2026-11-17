import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const candidatosPython = [
  path.resolve('backend', '.venv312', 'Scripts', 'python.exe'),
  path.resolve('backend', '.venv', 'Scripts', 'python.exe'),
  path.resolve('backend', '.venv', 'bin', 'python'),
  path.resolve('backend', '.venv312', 'bin', 'python'),
  'python',
  'python3',
];

let pythonExec = candidatosPython.find((caminho) => {
  if (caminho === 'python' || caminho === 'python3') return true;
  return fs.existsSync(caminho);
}) || 'python';

const envLocal = path.resolve('backend', '.env.local');
const envFile = fs.existsSync(envLocal) ? 'backend/.env.local' : 'backend/.env';

console.log(`🚀 Iniciando API com: ${pythonExec}`);
console.log(`📄 Carregando variáveis de: ${envFile}\n`);

const processo = spawn(
  pythonExec,
  ['-m', 'uvicorn', 'backend.app.main:app', '--host', '0.0.0.0', '--port', '8000', '--env-file', envFile],
  { stdio: 'inherit' }
);

processo.on('error', (erro) => {
  console.error('❌ Falha ao iniciar a API Python:', erro.message);
  console.log('Certifique-se de ter criado o ambiente virtual em backend/ e instalado as dependências:');
  console.log('cd backend && pip install -r requirements.txt');
  process.exit(1);
});

processo.on('exit', (codigo) => {
  process.exit(codigo ?? 0);
});

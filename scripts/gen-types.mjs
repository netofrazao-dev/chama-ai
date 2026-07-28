#!/usr/bin/env node
// ------------------------------------------------------------
// Gera os tipos do banco com segurança.
//
// Por que existe este script: o jeito comum é
//   supabase gen types typescript --project-id X > src/lib/database.types.ts
// mas o `>` ESVAZIA o arquivo ANTES de o comando rodar. Se o comando
// falhar (CLI não instalada, projeto errado, sem login), você fica com
// um arquivo de 0 byte e o build quebra com "is not a module".
//
// Aqui a saída vai para um arquivo temporário e só substitui o
// original se der tudo certo e o conteúdo fizer sentido.
// Funciona igual no Windows, macOS e Linux.
// ------------------------------------------------------------
import { execFileSync } from 'node:child_process'
import { writeFileSync, renameSync, existsSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const destino = resolve(raiz, 'src/lib/database.types.ts')
const temporario = destino + '.tmp'

const ref = process.env.SUPABASE_PROJECT_ID || process.argv[2]

if (!ref) {
  console.error(
    '\n  Falta o REF do projeto.\n\n' +
      '  O REF está na URL do painel:\n' +
      '    https://supabase.com/dashboard/project/SEU_REF\n\n' +
      '  Use assim:\n' +
      '    npm run types:gen -- SEU_REF\n\n' +
      '  Antes, garanta que a CLI está instalada e logada:\n' +
      '    npm install -g supabase\n' +
      '    supabase login\n',
  )
  process.exit(1)
}

try {
  console.log(`Gerando tipos do projeto ${ref}...`)
  const saida = execFileSync(
    'supabase',
    ['gen', 'types', 'typescript', '--project-id', ref],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, shell: process.platform === 'win32' },
  )

  // sanidade: precisa parecer mesmo com os tipos gerados
  if (!saida || saida.trim().length < 100 || !saida.includes('Database')) {
    throw new Error('A saída não parece conter os tipos esperados.')
  }

  writeFileSync(temporario, saida, 'utf8')
  renameSync(temporario, destino)
  console.log('Pronto! src/lib/database.types.ts atualizado.')
} catch (erro) {
  if (existsSync(temporario)) unlinkSync(temporario)
  console.error(
    '\n  Não deu pra gerar os tipos. O arquivo atual foi PRESERVADO ' +
      '(nada foi apagado).\n\n  Detalhe: ' +
      (erro?.message ?? erro) +
      '\n\n  Dicas:\n' +
      '    • a CLI está instalada?  npm install -g supabase\n' +
      '    • você fez login?        supabase login\n' +
      '    • o REF está certo?      veja a URL do painel\n',
  )
  process.exit(1)
}

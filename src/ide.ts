import {
  snippetCompletion as snip,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete'
import type { Lang } from './types'

// Snippets expansibles façon IDE : on tape le préfixe, Tab pour insérer,
// Tab pour sauter de champ en champ.
const SNIPPETS: Record<Lang, Completion[]> = {
  ts: [
    snip('console.log(${value})', { label: 'log', detail: 'console.log', type: 'function' }),
    snip('function ${name}(${params}) {\n\t${}\n}', { label: 'fn', detail: 'function', type: 'keyword' }),
    snip('async function ${name}(${params}) {\n\t${}\n}', { label: 'afn', detail: 'async function', type: 'keyword' }),
    snip('const ${name} = (${params}) => ${body}', { label: 'arrow', detail: 'arrow function', type: 'keyword' }),
    snip('for (const ${item} of ${items}) {\n\t${}\n}', { label: 'forof', detail: 'for…of', type: 'keyword' }),
    snip('if (${cond}) {\n\t${}\n}', { label: 'if', detail: 'condition', type: 'keyword' }),
    snip('try {\n\t${}\n} catch (err) {\n\t${}\n}', { label: 'try', detail: 'try/catch', type: 'keyword' }),
    snip("import { ${names} } from '${module}'", { label: 'imp', detail: 'import', type: 'keyword' }),
    snip('interface ${Name} {\n\t${}\n}', { label: 'int', detail: 'interface', type: 'type' }),
  ],
  py: [
    snip('def ${name}(${params}):\n\t${pass}', { label: 'def', detail: 'fonction', type: 'keyword' }),
    snip('class ${Name}:\n\t${pass}', { label: 'class', detail: 'classe', type: 'type' }),
    snip('for ${item} in ${items}:\n\t${pass}', { label: 'for', detail: 'boucle', type: 'keyword' }),
    snip('if ${cond}:\n\t${pass}', { label: 'if', detail: 'condition', type: 'keyword' }),
    snip('if __name__ == "__main__":\n\t${main()}', { label: 'ifmain', detail: 'point d’entrée', type: 'keyword' }),
    snip('try:\n\t${}\nexcept ${Exception} as e:\n\t${pass}', { label: 'try', detail: 'try/except', type: 'keyword' }),
    snip('with ${expr} as ${name}:\n\t${pass}', { label: 'with', detail: 'context manager', type: 'keyword' }),
    snip('print(${value})', { label: 'print', detail: 'print', type: 'function' }),
  ],
  rs: [
    snip('fn ${name}(${params}) -> ${Ret} {\n\t${}\n}', { label: 'fn', detail: 'fonction', type: 'keyword' }),
    snip('for ${item} in ${items} {\n\t${}\n}', { label: 'for', detail: 'boucle', type: 'keyword' }),
    snip('match ${expr} {\n\t${pattern} => ${},\n}', { label: 'match', detail: 'match', type: 'keyword' }),
    snip('if let ${Some(v)} = ${expr} {\n\t${}\n}', { label: 'iflet', detail: 'if let', type: 'keyword' }),
    snip('impl ${Type} {\n\t${}\n}', { label: 'impl', detail: 'impl', type: 'type' }),
    snip('#[derive(${Debug})]\nstruct ${Name} {\n\t${}\n}', { label: 'struct', detail: 'struct', type: 'type' }),
    snip('println!("${}")', { label: 'println', detail: 'println!', type: 'function' }),
    snip('let ${name} = ${value};', { label: 'let', detail: 'binding', type: 'keyword' }),
  ],
  go: [
    snip('func ${name}(${params}) ${ret} {\n\t${}\n}', { label: 'func', detail: 'fonction', type: 'keyword' }),
    snip('for ${i} := 0; ${i} < ${n}; ${i}++ {\n\t${}\n}', { label: 'for', detail: 'boucle', type: 'keyword' }),
    snip('for ${_, v} := range ${items} {\n\t${}\n}', { label: 'forr', detail: 'for…range', type: 'keyword' }),
    snip('if err != nil {\n\treturn ${err}\n}', { label: 'iferr', detail: 'if err != nil', type: 'keyword' }),
    snip('type ${Name} struct {\n\t${}\n}', { label: 'struct', detail: 'struct', type: 'type' }),
    snip('switch ${expr} {\ncase ${val}:\n\t${}\n}', { label: 'switch', detail: 'switch', type: 'keyword' }),
    snip('fmt.Println(${value})', { label: 'println', detail: 'fmt.Println', type: 'function' }),
  ],
}

const WORD_RE = /[A-Za-z_$][A-Za-z0-9_$]*/g

// Source de complétion : snippets du langage + identifiants présents dans
// l'exercice (la cible et le code de départ), comme un IDE qui connaît le fichier.
export function buildCompletionSource(lang: Lang, target: string, start: string) {
  const words = Array.from(
    new Set((target + ' ' + start).match(WORD_RE) ?? []),
  ).filter((w) => w.length > 2)
  const wordOptions: Completion[] = words.map((w) => ({
    label: w,
    type: 'text',
  }))
  const options = [...SNIPPETS[lang], ...wordOptions]

  return (ctx: CompletionContext): CompletionResult | null => {
    const word = ctx.matchBefore(/[A-Za-z_$][A-Za-z0-9_$]*/)
    if (!word || (word.from === word.to && !ctx.explicit)) return null
    return {
      from: word.from,
      options,
      validFor: /^[A-Za-z0-9_$]*$/,
    }
  }
}

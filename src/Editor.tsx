import { useEffect, useRef } from 'react'
import { EditorState, Facet, Prec, RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import {
  defaultKeymap,
  history,
  historyKeymap,
  insertNewline,
} from '@codemirror/commands'
import {
  acceptCompletion,
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionStatus,
  nextSnippetField,
} from '@codemirror/autocomplete'
import { bracketMatching, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { buildCompletionSource } from './ide'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'
import { go } from '@codemirror/lang-go'
import { vim, getCM } from '@replit/codemirror-vim'
import { emberTheme, emberHighlight } from './theme'
import type { Challenge, Config, Lang } from './types'
import { INDENT } from './types'

const targetFacet = Facet.define<string, string>({
  combine: (values) => values[0] ?? '',
})

// En mode IDE, les caractères auto-insérés (fermetures de brackets) vivent
// après le curseur : on ne juge que ce qui est avant.
const ideFacet = Facet.define<boolean, boolean>({
  combine: (values) => values[0] ?? false,
})

const mismatchMark = Decoration.mark({ class: 'cm-mismatch' })

function computeMismatches(view: EditorView): DecorationSet {
  const target = view.state.facet(targetFacet)
  const doc = view.state.doc.toString()
  const limit = view.state.facet(ideFacet)
    ? Math.min(doc.length, view.state.selection.main.head)
    : doc.length
  const builder = new RangeSetBuilder<Decoration>()
  let i = 0
  while (i < limit) {
    if (i >= target.length || doc[i] !== target[i]) {
      let j = i + 1
      while (j < limit && (j >= target.length || doc[j] !== target[j])) j++
      builder.add(i, j, mismatchMark)
      i = j
    } else {
      i++
    }
  }
  return builder.finish()
}

const mismatchPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = computeMismatches(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet)
        this.decorations = computeMismatches(update.view)
    }
  },
  { decorations: (v) => v.decorations },
)

function langExtension(lang: Lang) {
  switch (lang) {
    case 'ts':
      return javascript({ typescript: true })
    case 'py':
      return python()
    case 'rs':
      return rust()
    case 'go':
      return go()
  }
}

interface Callbacks {
  onDoc: (doc: string, inserted: number, cursor: number) => void
  onActivity: () => void
  onVimMode: (mode: string) => void
}

interface EditorProps extends Callbacks {
  challenge: Challenge
  config: Config
  runKey: number
}

export default function Editor({
  challenge,
  config,
  runKey,
  onDoc,
  onActivity,
  onVimMode,
}: EditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const cbRef = useRef<Callbacks>({ onDoc, onActivity, onVimMode })
  cbRef.current = { onDoc, onActivity, onVimMode }

  useEffect(() => {
    const view = new EditorView({ parent: hostRef.current! })
    viewRef.current = view
    return () => view.destroy()
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const indent = ' '.repeat(INDENT[config.lang])
    const target = challenge.target
    const isRewrite = config.game === 'rewrite'

    // En vim, nos raccourcis Tab/Enter ne doivent agir qu'en mode insert.
    const canType = (v: EditorView): boolean => {
      if (config.input !== 'vim') return true
      const vimState = getCM(v)?.state?.vim
      return !!vimState?.insertMode
    }

    // Enter intelligent (mode réécriture) : si tout est juste jusqu'au curseur,
    // recopie l'indentation de la ligne suivante de la cible.
    const smartEnter = (v: EditorView): boolean => {
      if (!canType(v)) return false
      // Popup de complétion ouvert : laisser Enter au clavier de complétion.
      if (config.ide && completionStatus(v.state) === 'active') return false
      if (!config.autoIndent) return insertNewline(v)
      const pos = v.state.selection.main.head
      const doc = v.state.doc.toString()
      if (
        pos !== doc.length ||
        target.slice(0, pos) !== doc ||
        target[pos] !== '\n'
      ) {
        return insertNewline(v)
      }
      let i = pos + 1
      let pad = ''
      while (i < target.length && (target[i] === ' ' || target[i] === '\t')) {
        pad += target[i]
        i++
      }
      v.dispatch({
        changes: { from: pos, insert: '\n' + pad },
        selection: { anchor: pos + 1 + pad.length },
        userEvent: 'input.type',
        scrollIntoView: true,
      })
      return true
    }

    const insertIndent = (v: EditorView): boolean => {
      if (!canType(v)) return false
      v.dispatch(v.state.replaceSelection(indent), {
        userEvent: 'input.type',
        scrollIntoView: true,
      })
      return true
    }

    // Tab : accepter la complétion, sinon sauter au champ de snippet
    // suivant, sinon indenter.
    const smartTab = (v: EditorView): boolean => {
      if (config.ide && acceptCompletion(v)) return true
      if (config.ide && nextSnippetField(v)) return true
      return insertIndent(v)
    }

    const extensions = [
      config.input === 'vim' ? vim() : [],
      history(),
      drawSelection(),
      indentUnit.of(indent),
      emberTheme,
      syntaxHighlighting(emberHighlight),
      langExtension(config.lang),
      isRewrite
        ? [
            mismatchPlugin,
            targetFacet.of(target),
            ideFacet.of(config.ide),
            Prec.high(keymap.of([{ key: 'Enter', run: smartEnter }])),
          ]
        : [lineNumbers(), highlightActiveLine(), highlightActiveLineGutter()],
      config.ide
        ? [
            closeBrackets(),
            bracketMatching(),
            autocompletion({
              override: [buildCompletionSource(config.lang, target, challenge.start)],
              activateOnTyping: true,
              maxRenderedOptions: 8,
            }),
            keymap.of(closeBracketsKeymap),
          ]
        : [],
      Prec.high(keymap.of([{ key: 'Tab', run: smartTab }])),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (!update.docChanged) return
        let inserted = 0
        update.changes.iterChanges((_a, _b, _c, _d, text) => {
          inserted += text.length
        })
        cbRef.current.onDoc(
          update.state.doc.toString(),
          inserted,
          update.state.selection.main.head,
        )
      }),
      EditorView.domEventHandlers({
        keydown: (event) => {
          if (event.metaKey || event.ctrlKey) return false
          cbRef.current.onActivity()
          return false
        },
      }),
    ]

    view.setState(
      EditorState.create({ doc: challenge.start, extensions }),
    )

    if (config.input === 'vim') {
      cbRef.current.onVimMode('normal')
      const cm = getCM(view)
      cm?.on('vim-mode-change', (e: { mode: string; subMode?: string }) => {
        cbRef.current.onVimMode(e.subMode ? `${e.mode} ${e.subMode}` : e.mode)
      })
    } else {
      cbRef.current.onVimMode('')
    }

    view.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey, challenge.id, challenge.start, challenge.target, config.game, config.input, config.lang, config.autoIndent, config.ide])

  return (
    <div
      className="editor-host"
      ref={hostRef}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          viewRef.current?.focus()
          e.preventDefault()
        }
      }}
    />
  )
}

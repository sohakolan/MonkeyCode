import { EditorView } from '@codemirror/view'
import { HighlightStyle } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

export const emberTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
      color: 'var(--fg)',
      fontSize: '15px',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: "'JetBrains Mono', monospace",
      fontVariantLigatures: 'none',
      caretColor: 'var(--accent)',
      padding: '4px 0 24px',
      lineHeight: '1.75',
    },
    '.cm-line': { padding: '0 4px 0 2px' },
    '&.cm-focused': { outline: 'none' },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--accent)',
      borderLeftWidth: '2px',
    },
    '.cm-fat-cursor': {
      background: 'var(--accent) !important',
      color: 'var(--bg) !important',
    },
    '&:not(.cm-focused) .cm-fat-cursor': {
      background: 'none !important',
      outline: '1px solid var(--accent-dim) !important',
      color: 'transparent !important',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection':
      {
        backgroundColor: 'rgba(var(--accent-rgb), 0.16) !important',
      },
    '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.025)' },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: 'var(--ink-faint)',
      border: 'none',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      paddingRight: '10px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--accent)',
    },
    '.cm-mismatch': {
      color: 'var(--error)',
      background: 'rgba(255, 85, 98, 0.13)',
      borderRadius: '2px',
      textDecoration: 'underline',
      textDecorationColor: 'var(--error)',
      textUnderlineOffset: '4px',
    },
    '.cm-tooltip': {
      backgroundColor: '#161a23',
      border: '1px solid var(--panel-edge)',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 14px 40px -12px rgba(0, 0, 0, 0.8)',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul': {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '13px',
        maxHeight: '14em',
      },
      '& > ul > li': {
        padding: '4px 10px',
        color: 'var(--ink)',
      },
      '& > ul > li[aria-selected]': {
        backgroundColor: 'rgba(var(--accent-rgb), 0.12)',
        color: 'var(--fg)',
      },
    },
    '.cm-completionLabel': { color: 'inherit' },
    '.cm-completionMatchedText': {
      textDecoration: 'none',
      color: 'var(--accent)',
      fontWeight: '600',
    },
    '.cm-completionDetail': {
      color: 'var(--ink-faint)',
      fontStyle: 'normal',
      fontSize: '11px',
      marginLeft: '12px',
    },
    '.cm-completionIcon': {
      width: '1.1em',
      opacity: '0.6',
    },
    '.cm-snippetField': {
      backgroundColor: 'rgba(var(--accent-rgb), 0.14)',
      borderRadius: '3px',
      outline: '1px dashed var(--accent-dim)',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'rgba(var(--accent-rgb), 0.18) !important',
      outline: '1px solid var(--accent-dim)',
      borderRadius: '2px',
    },
    '.cm-nonmatchingBracket': {
      color: 'var(--error) !important',
    },
    '.cm-vim-panel, .cm-panels': {
      backgroundColor: 'var(--panel)',
      color: 'var(--fg)',
      fontFamily: "'JetBrains Mono', monospace",
      padding: '2px 8px',
    },
    '.cm-panels-bottom': { border: 'none' },
    '.cm-vim-panel input': {
      color: 'var(--fg)',
      fontFamily: "'JetBrains Mono', monospace",
    },
  },
  { dark: true },
)

export const emberHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword], color: '#e6855e' },
  { tag: [t.definitionKeyword, t.operatorKeyword], color: '#e6855e' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#ffd479' },
  { tag: [t.typeName, t.className, t.namespace], color: '#7fc8b6' },
  { tag: [t.string, t.special(t.string), t.regexp], color: '#a8c887' },
  { tag: [t.number, t.bool, t.null], color: '#d2a6ff' },
  { tag: [t.comment, t.docComment], color: 'var(--ink-faint)', fontStyle: 'italic' },
  { tag: [t.propertyName, t.attributeName], color: '#9bb8e0' },
  { tag: [t.operator, t.punctuation, t.bracket], color: '#9aa3b2' },
  { tag: [t.variableName, t.name], color: '#d6dbe5' },
  { tag: [t.self, t.atom], color: '#d2a6ff' },
  { tag: t.invalid, color: 'var(--error)' },
])

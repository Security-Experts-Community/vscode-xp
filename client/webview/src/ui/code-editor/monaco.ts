import { type Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';

export const initMonaco = (monaco: Monaco) => {
  // Disable JSON validation (since we're using JSON lines format instead)
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: false
  });

  // Add XP test files highlighting
  const XPTestCodeLanguage = 'xp-test-code';
  monaco.languages.register({ id: XPTestCodeLanguage });
  monaco.languages.setLanguageConfiguration(XPTestCodeLanguage, {
    comments: {
      lineComment: '#'
    },
    brackets: [
      ['{', '}'],
      ['[', ']']
    ],
    autoClosingPairs: [
      { open: '{', close: '}', notIn: ['string', 'comment'] },
      { open: '[', close: ']', notIn: ['string', 'comment'] },
      { open: '"', close: '"', notIn: ['string', 'comment'] }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' }
    ]
  });
  monaco.languages.setMonarchTokensProvider(XPTestCodeLanguage, {
    tokenizer: {
      root: [
        [/#.*$/, 'comment'],
        [/-?\d+(\.\d+)?/, 'number'],
        [/".*?"/, 'string'],
        [/\b(true|false|null)\b/, 'constant'],
        [/\b(not|any|expect|table_list|default)\b/, 'keyword']
      ]
    }
  });

  // Custom JSON lines with comments
  const JSONLinesLanguage = 'json-lines';
  monaco.languages.register({ id: JSONLinesLanguage });
  monaco.languages.setLanguageConfiguration(JSONLinesLanguage, {
    comments: {
      lineComment: '#'
    },
    brackets: [
      ['{', '}'],
      ['[', ']']
    ],
    autoClosingPairs: [
      { open: '{', close: '}', notIn: ['string', 'comment'] },
      { open: '[', close: ']', notIn: ['string', 'comment'] },
      { open: '"', close: '"', notIn: ['string', 'comment'] }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' }
    ]
  });

  monaco.languages.setMonarchTokensProvider(JSONLinesLanguage, {
    brackets: [
      { open: '{', close: '}', token: 'delimiter.curly' },
      { open: '[', close: ']', token: 'delimiter.bracket' }
    ],
    keywords: ['true', 'false', 'null'],
    tokenizer: {
      root: [
        [/[a-z_$][\w$]*/, { cases: { '@keywords': 'keyword', '@default': 'default' } }],
        [/[{}\[\]]/, '@brackets'],
        [/#.*$/, 'comment'],
        [/\/\/.*$/, 'comment'],
        [/-?\d+(\.\d+)?/, 'number'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string']
      ],
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop']
      ]
    }
  });
};

export const getMonacoThemeByVSCodeThemeKind = (themeKind: string) => {
  return themeKind == 'vscode-dark' ? 'vs-dark' : 'light';
};

function getCSSVariable(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export const createMonacoThemeFromCSSVariables = (
  themeKind: string
): editor.IStandaloneThemeData => {
  return {
    base: ['vscode-dark', 'vscode-high-contrast'].includes(themeKind) ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': getCSSVariable('--vscode-editor-background'),
      'editor.foreground': getCSSVariable('--vscode-editor-foreground'),
      'editorLineNumber.foreground': getCSSVariable('--vscode-editorLineNumber-foreground'),
      'editorLineNumber.activeForeground': getCSSVariable(
        '--vscode-editorLineNumber-activeForeground'
      ),
      'editorLineNumber.dimmedForeground': getCSSVariable(
        '--vscode-editorLineNumber-dimmedForeground'
      ),
      'editorCursor.background': getCSSVariable('--vscode-editorCursor-background'),
      'editorCursor.foreground': getCSSVariable('--vscode-editorCursor-foreground'),
      'editorMultiCursor.primary.foreground': getCSSVariable(
        '--vscode-editorMultiCursor-primary-foreground'
      ),
      'editorMultiCursor.primary.background': getCSSVariable(
        '--vscode-editorMultiCursor-primary-background'
      ),
      'editorMultiCursor.secondary.foreground': getCSSVariable(
        '--vscode-editorMultiCursor-secondary-foreground'
      ),
      'editorMultiCursor.secondary.background': getCSSVariable(
        '--vscode-editorMultiCursor-secondary-background'
      ),
      'editor.placeholder.foreground': getCSSVariable('--vscode-editor-placeholder-foreground'),
      'editor.compositionBorder': getCSSVariable('--vscode-editor-compositionBorder')
    }
  };
};

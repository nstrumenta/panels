// couldn't get loader to work, just compile with nearleyc https://nearley.js.org/docs/getting-started

function id(x) {
  return x[0];
}
var grammar = {
  Lexer: undefined,
  ParserRules: [
    { name: 'main$ebnf$1', symbols: ['messagePath'], postprocess: id },
    {
      name: 'main$ebnf$1',
      symbols: [],
      postprocess: function (d) {
        return null;
      },
    },
    { name: 'main$ebnf$2', symbols: ['modifier'], postprocess: id },
    {
      name: 'main$ebnf$2',
      symbols: [],
      postprocess: function (d) {
        return null;
      },
    },
    {
      name: 'main',
      symbols: ['topicName', 'main$ebnf$1', 'main$ebnf$2'],
      postprocess: (d) => ({
        topicName: d[0].value,
        topicNameRepr: d[0].repr,
        messagePath: d[1] || [],
        modifier: d[2],
      }),
    },
    { name: 'id$ebnf$1', symbols: [/[a-zA-Z0-9_-]/] },
    {
      name: 'id$ebnf$1',
      symbols: ['id$ebnf$1', /[a-zA-Z0-9_-]/],
      postprocess: function arrpush(d) {
        return d[0].concat([d[1]]);
      },
    },
    { name: 'id', symbols: ['id$ebnf$1'], postprocess: (d) => d[0].join('') },
    { name: 'integer$ebnf$1', symbols: [{ literal: '-' }], postprocess: id },
    {
      name: 'integer$ebnf$1',
      symbols: [],
      postprocess: function (d) {
        return null;
      },
    },
    { name: 'integer$ebnf$2', symbols: [/[0-9]/] },
    {
      name: 'integer$ebnf$2',
      symbols: ['integer$ebnf$2', /[0-9]/],
      postprocess: function arrpush(d) {
        return d[0].concat([d[1]]);
      },
    },
    {
      name: 'integer',
      symbols: ['integer$ebnf$1', 'integer$ebnf$2'],
      postprocess: (d) => ({
        value: BigInt((d[0] ?? '') + d[1].join('')),
        repr: (d[0] ?? '') + d[1].join(''),
      }),
    },
    { name: 'string$ebnf$1', symbols: [] },
    {
      name: 'string$ebnf$1',
      symbols: ['string$ebnf$1', /[^']/],
      postprocess: function arrpush(d) {
        return d[0].concat([d[1]]);
      },
    },
    {
      name: 'string',
      symbols: [{ literal: "'" }, 'string$ebnf$1', { literal: "'" }],
      postprocess: (d) => ({ value: d[1].join(''), repr: `'${d[1].join('')}'` }),
    },
    { name: 'string$ebnf$2', symbols: [] },
    {
      name: 'string$ebnf$2',
      symbols: ['string$ebnf$2', /[^"]/],
      postprocess: function arrpush(d) {
        return d[0].concat([d[1]]);
      },
    },
    {
      name: 'string',
      symbols: [{ literal: '"' }, 'string$ebnf$2', { literal: '"' }],
      postprocess: (d) => ({ value: d[1].join(''), repr: `"${d[1].join('')}"` }),
    },
    { name: 'variable$ebnf$1', symbols: ['id'], postprocess: id },
    {
      name: 'variable$ebnf$1',
      symbols: [],
      postprocess: function (d) {
        return null;
      },
    },
    {
      name: 'variable',
      symbols: [{ literal: '$' }, 'variable$ebnf$1'],
      postprocess: (d, loc) => ({
        value: { variableName: d[1] || '', startLoc: loc },
        repr: `$${d[1] || ''}`,
      }),
    },
    { name: 'value', symbols: ['integer'], postprocess: (d) => d[0] },
    { name: 'value', symbols: ['string'], postprocess: (d) => d[0] },
    {
      name: 'value$string$1',
      symbols: [{ literal: 't' }, { literal: 'r' }, { literal: 'u' }, { literal: 'e' }],
      postprocess: function joiner(d) {
        return d.join('');
      },
    },
    {
      name: 'value',
      symbols: ['value$string$1'],
      postprocess: (d) => ({ value: true, repr: 'true' }),
    },
    {
      name: 'value$string$2',
      symbols: [
        { literal: 'f' },
        { literal: 'a' },
        { literal: 'l' },
        { literal: 's' },
        { literal: 'e' },
      ],
      postprocess: function joiner(d) {
        return d.join('');
      },
    },
    {
      name: 'value',
      symbols: ['value$string$2'],
      postprocess: (d) => ({ value: false, repr: 'false' }),
    },
    { name: 'value', symbols: ['variable'], postprocess: (d) => d[0] },
    { name: 'topicName$ebnf$1', symbols: ['slashID'] },
    {
      name: 'topicName$ebnf$1',
      symbols: ['topicName$ebnf$1', 'slashID'],
      postprocess: function arrpush(d) {
        return d[0].concat([d[1]]);
      },
    },
    {
      name: 'topicName',
      symbols: ['topicName$ebnf$1'],
      postprocess: (d) => ({ value: d[0].join(''), repr: d[0].join('') }),
    },
    { name: 'topicName$ebnf$2', symbols: [] },
    {
      name: 'topicName$ebnf$2',
      symbols: ['topicName$ebnf$2', 'slashID'],
      postprocess: function arrpush(d) {
        return d[0].concat([d[1]]);
      },
    },
    {
      name: 'topicName',
      symbols: ['id', 'topicName$ebnf$2'],
      postprocess: (d) => ({ value: d[0] + d[1].join(''), repr: d[0] + d[1].join('') }),
    },
    { name: 'topicName', symbols: ['quotedString'], postprocess: id },
    { name: 'slashID$ebnf$1', symbols: ['id'], postprocess: id },
    {
      name: 'slashID$ebnf$1',
      symbols: [],
      postprocess: function (d) {
        return null;
      },
    },
    {
      name: 'slashID',
      symbols: [{ literal: '/' }, 'slashID$ebnf$1'],
      postprocess: (d) => d.join(''),
    },
    { name: 'quotedString$ebnf$1', symbols: [] },
    { name: 'quotedString$ebnf$1$subexpression$1', symbols: [/[^"\\]/] },
    {
      name: 'quotedString$ebnf$1$subexpression$1$string$1',
      symbols: [{ literal: '\\' }, { literal: '\\' }],
      postprocess: function joiner(d) {
        return d.join('');
      },
    },
    {
      name: 'quotedString$ebnf$1$subexpression$1',
      symbols: ['quotedString$ebnf$1$subexpression$1$string$1'],
      postprocess: (d) => '\\',
    },
    {
      name: 'quotedString$ebnf$1$subexpression$1$string$2',
      symbols: [{ literal: '\\' }, { literal: '"' }],
      postprocess: function joiner(d) {
        return d.join('');
      },
    },
    {
      name: 'quotedString$ebnf$1$subexpression$1',
      symbols: ['quotedString$ebnf$1$subexpression$1$string$2'],
      postprocess: (d) => `"`,
    },
    {
      name: 'quotedString$ebnf$1',
      symbols: ['quotedString$ebnf$1', 'quotedString$ebnf$1$subexpression$1'],
      postprocess: function arrpush(d) {
        return d[0].concat([d[1]]);
      },
    },
    {
      name: 'quotedString',
      symbols: [{ literal: '"' }, 'quotedString$ebnf$1', { literal: '"' }],
      postprocess: (d) => ({
        value: d[1].join(''),
        repr: `"${d[1].join('').replace(/[\\"]/g, (char) => `\\${char}`)}"`,
      }),
    },
    { name: 'messagePath$ebnf$1', symbols: [] },
    {
      name: 'messagePath$ebnf$1',
      symbols: ['messagePath$ebnf$1', 'messagePathElement'],
      postprocess: function arrpush(d) {
        return d[0].concat([d[1]]);
      },
    },
    { name: 'messagePath$ebnf$2', symbols: [{ literal: '.' }], postprocess: id },
    {
      name: 'messagePath$ebnf$2',
      symbols: [],
      postprocess: function (d) {
        return null;
      },
    },
    {
      name: 'messagePath',
      symbols: ['messagePath$ebnf$1', 'messagePath$ebnf$2'],
      postprocess: (d) =>
        d[0]
          .reduce((acc, arr) => acc.concat(arr), [])
          .concat(d[1] ? [{ type: 'name', name: '', repr: '' }] : []),
    },
    { name: 'messagePathElement$ebnf$1', symbols: ['slice'], postprocess: id },
    {
      name: 'messagePathElement$ebnf$1',
      symbols: [],
      postprocess: function (d) {
        return null;
      },
    },
    { name: 'messagePathElement$ebnf$2', symbols: ['filter'], postprocess: id },
    {
      name: 'messagePathElement$ebnf$2',
      symbols: [],
      postprocess: function (d) {
        return null;
      },
    },
    {
      name: 'messagePathElement',
      symbols: [{ literal: '.' }, 'name', 'messagePathElement$ebnf$1', 'messagePathElement$ebnf$2'],
      postprocess: (d) => [d[1], d[2], d[3]].filter((x) => x !== null),
    },
    { name: 'messagePathElement', symbols: ['filter'], postprocess: id },
    {
      name: 'name',
      symbols: ['id'],
      postprocess: (d) => ({ type: 'name', name: d[0], repr: d[0] }),
    },
    {
      name: 'name',
      symbols: ['quotedString'],
      postprocess: (d) => ({ type: 'name', name: d[0].value, repr: d[0].repr }),
    },
    { name: 'sliceVal', symbols: ['integer'], postprocess: (d) => Number(d[0].value) },
    { name: 'sliceVal', symbols: ['variable'], postprocess: (d) => d[0].value },
    {
      name: 'slice',
      symbols: [{ literal: '[' }, 'sliceVal', { literal: ']' }],
      postprocess: (d) => ({ type: 'slice', start: d[1], end: d[1] }),
    },
    { name: 'slice$ebnf$1', symbols: ['sliceVal'], postprocess: id },
    {
      name: 'slice$ebnf$1',
      symbols: [],
      postprocess: function (d) {
        return null;
      },
    },
    { name: 'slice$ebnf$2', symbols: ['sliceVal'], postprocess: id },
    {
      name: 'slice$ebnf$2',
      symbols: [],
      postprocess: function (d) {
        return null;
      },
    },
    {
      name: 'slice',
      symbols: [
        { literal: '[' },
        'slice$ebnf$1',
        { literal: ':' },
        'slice$ebnf$2',
        { literal: ']' },
      ],
      postprocess: (d) => ({
        type: 'slice',
        start: d[1] === null ? 0 : d[1],
        end: d[3] === null ? Infinity : d[3],
      }),
    },
    { name: 'simplePath$ebnf$1', symbols: [] },
    { name: 'simplePath$ebnf$1$subexpression$1', symbols: [{ literal: '.' }, 'id'] },
    {
      name: 'simplePath$ebnf$1',
      symbols: ['simplePath$ebnf$1', 'simplePath$ebnf$1$subexpression$1'],
      postprocess: function arrpush(d) {
        return d[0].concat([d[1]]);
      },
    },
    {
      name: 'simplePath',
      symbols: ['id', 'simplePath$ebnf$1'],
      postprocess: (d) => [d[0]].concat(d[1].map((d) => d[1])),
    },
    { name: 'filter$ebnf$1', symbols: ['simplePath'], postprocess: id },
    {
      name: 'filter$ebnf$1',
      symbols: [],
      postprocess: function (d) {
        return null;
      },
    },
    {
      name: 'filter',
      symbols: [{ literal: '{' }, 'filter$ebnf$1', { literal: '}' }],
      postprocess: (d, loc) => ({
        type: 'filter',
        path: d[1] || [],
        value: undefined,
        nameLoc: loc + 1,
        valueLoc: loc + 1,
        repr: (d[1] || []).join('.'),
      }),
    },
    { name: 'filter$ebnf$2', symbols: ['simplePath'], postprocess: id },
    {
      name: 'filter$ebnf$2',
      symbols: [],
      postprocess: function (d) {
        return null;
      },
    },
    {
      name: 'filter$string$1',
      symbols: [{ literal: '=' }, { literal: '=' }],
      postprocess: function joiner(d) {
        return d.join('');
      },
    },
    {
      name: 'filter',
      symbols: [{ literal: '{' }, 'filter$ebnf$2', 'filter$string$1', 'value', { literal: '}' }],
      postprocess: (d, loc) => ({
        type: 'filter',
        path: d[1] || [],
        value: d[3].value,
        nameLoc: loc + 1,
        valueLoc: loc + 1 + (d[1] || []).join('.').length + d[2].length,
        repr: `${(d[1] || []).join('.')}==${d[3].repr}`,
      }),
    },
    {
      name: 'modifier$string$1',
      symbols: [{ literal: '.' }, { literal: '@' }],
      postprocess: function joiner(d) {
        return d.join('');
      },
    },
    { name: 'modifier$ebnf$1', symbols: ['id'], postprocess: id },
    {
      name: 'modifier$ebnf$1',
      symbols: [],
      postprocess: function (d) {
        return null;
      },
    },
    {
      name: 'modifier',
      symbols: ['modifier$string$1', 'modifier$ebnf$1'],
      postprocess: (d) => d[1] || '',
    },
  ],
  ParserStart: 'main',
};
export default grammar;

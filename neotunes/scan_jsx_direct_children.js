const ts = require('typescript');
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('{src/**/*.tsx,*.tsx}');

function parentTagName(sourceFile, parent) {
  if (!parent) return null;
  if (ts.isJsxElement(parent)) return parent.openingElement.tagName.getText(sourceFile);
  if (ts.isJsxSelfClosingElement(parent)) return parent.tagName.getText(sourceFile);
  if (ts.isJsxFragment(parent)) return 'Fragment';
  return null;
}

function isTextLike(tag) {
  return tag === 'Text' || tag?.endsWith('.Text');
}

let count = 0;

for (const file of files) {
  const sourceCode = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, sourceCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function visit(node) {
    if (ts.isJsxExpression(node) && node.expression) {
      const container = node.parent;
      const tag = parentTagName(sf, container);

      // Only direct children of JSX elements/fragments (not props)
      if (tag && !isTextLike(tag)) {
        const expr = node.expression;
        const k = ts.SyntaxKind[expr.kind];
        const text = expr.getText(sf).replace(/\s+/g, ' ').slice(0, 180);
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        count += 1;
        console.log(`${file}:${line + 1} parent=${tag} kind=${k} expr=${text}`);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
}

console.log(`TOTAL_DIRECT_CHILD_EXPRESSIONS=${count}`);

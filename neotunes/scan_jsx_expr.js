const ts = require('typescript');
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('{src/**/*.tsx,*.tsx}');

function parentTagName(sourceFile, parent) {
  if (!parent) return 'UNKNOWN';
  if (ts.isJsxElement(parent)) return parent.openingElement.tagName.getText(sourceFile);
  if (ts.isJsxSelfClosingElement(parent)) return parent.tagName.getText(sourceFile);
  if (ts.isJsxFragment(parent)) return 'Fragment';
  return 'UNKNOWN';
}

function isTextLike(tag) {
  return tag === 'Text' || tag.endsWith('.Text');
}

let count = 0;

for (const file of files) {
  const sourceCode = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, sourceCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function visit(node) {
    if (ts.isJsxExpression(node) && node.expression) {
      const tag = parentTagName(sf, node.parent);
      if (!isTextLike(tag)) {
        const expr = node.expression;
        const k = ts.SyntaxKind[expr.kind];
        const text = expr.getText(sf).replace(/\s+/g, ' ').slice(0, 140);

        // ignore direct JSX children expressions because those are valid element children
        if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr) || ts.isJsxFragment(expr)) {
          return ts.forEachChild(node, visit);
        }

        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        count += 1;
        console.log(`${file}:${line + 1} parent=${tag} kind=${k} expr=${text}`);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
}

console.log(`TOTAL_NON_TEXT_JSX_EXPRESSIONS=${count}`);

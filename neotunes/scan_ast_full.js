const ts = require('typescript');
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('{src/**/*.tsx,*.tsx}');

let count = 0;

files.forEach((file) => {
  const sourceCode = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, sourceCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function getParentTagName(parent) {
    if (!parent) return 'UNKNOWN';
    if (parent.kind === ts.SyntaxKind.JsxElement) return parent.openingElement.tagName.getText(sourceFile);
    if (parent.kind === ts.SyntaxKind.JsxSelfClosingElement) return parent.tagName.getText(sourceFile);
    if (parent.kind === ts.SyntaxKind.JsxFragment) return 'Fragment';
    return 'UNKNOWN';
  }

  function isTextLikeTag(tagName) {
    return tagName === 'Text' || tagName.endsWith('.Text');
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      const text = node.getText(sourceFile).replace(/\s+/g, ' ').trim();
      if (text.length > 0) {
        const tagName = getParentTagName(node.parent);
        if (!isTextLikeTag(tagName)) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          count += 1;
          console.log(`JSX_TEXT ${file}:${line + 1} parent=${tagName} text="${text}"`);
        }
      }
    }

    if (ts.isJsxExpression(node) && node.expression) {
      const parent = node.parent;
      const parentTag = getParentTagName(parent);
      if (!isTextLikeTag(parentTag)) {
        if (ts.isStringLiteral(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression)) {
          const value = node.expression.text;
          if (value.trim().length > 0) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
            count += 1;
            console.log(`JSX_STRING_EXPR ${file}:${line + 1} parent=${parentTag} text="${value}"`);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
});

console.log(`TOTAL_MATCHES=${count}`);

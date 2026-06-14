const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const glob = require('glob');

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const matches = [];

  function visit(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = ts.isJsxElement(node) 
        ? node.openingElement.tagName.getText(sourceFile) 
        : node.tagName.getText(sourceFile);
      
      if (tagName !== 'Text' && ts.isJsxElement(node)) {
        node.children.forEach(child => {
          if (ts.isJsxText(child)) {
            const text = child.getText(sourceFile).trim();
            if (text.length > 0) {
              const { line } = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile));
              matches.push(\\:\ \ \\);
            }
          }
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return matches;
}

const files = glob.sync('{App.tsx,src/**/*.tsx}');
let totalCount = 0;
files.forEach(file => {
  const fileMatches = scanFile(file);
  fileMatches.forEach(m => console.log(m));
  totalCount += fileMatches.length;
});

if (totalCount === 0) {
  console.log('NONE');
}
console.log('Final match count:', totalCount);

const ts = require('typescript');
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('{src/**/*.tsx,*.tsx}');

let count = 0;

files.forEach(file => {
    const sourceCode = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, sourceCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    function visit(node) {
        if (node.kind === ts.SyntaxKind.JsxText) {
            const raw = node.getText(sourceFile);
            const text = raw.replace(/\s+/g, ' ').trim();
            if (text.length > 0) {
                let jsxParent = node.parent;
                let tagName = 'UNKNOWN';

                if (jsxParent) {
                    if (jsxParent.kind === ts.SyntaxKind.JsxElement) {
                        tagName = jsxParent.openingElement.tagName.getText(sourceFile);
                    } else if (jsxParent.kind === ts.SyntaxKind.JsxFragment) {
                        tagName = 'Fragment';
                    } else if (jsxParent.kind === ts.SyntaxKind.JsxSelfClosingElement) {
                        tagName = jsxParent.tagName.getText(sourceFile);
                    }
                }

                if (tagName !== 'Text') {
                    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                    count += 1;
                    console.log(`File: ${file}, Line: ${line + 1}, Parent: ${tagName}, Text: "${text}"`);
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
});

console.log(`TOTAL_MATCHES=${count}`);

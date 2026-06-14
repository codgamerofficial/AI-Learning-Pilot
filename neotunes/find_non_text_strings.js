const ts = require('typescript');
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');

files.forEach(file => {
    const sourceCode = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, sourceCode, ts.ScriptTarget.Latest, true);

    function visit(node) {
        if (node.kind === ts.SyntaxKind.JsxText) {
            const text = node.text.trim();
            if (text.length > 0) {
                let parent = node.parent;
                let tagName = 'UNKNOWN';
                if (parent.kind === ts.SyntaxKind.JsxElement) {
                   tagName = parent.openingElement.tagName.getText(sourceFile);
                } else if (parent.kind === ts.SyntaxKind.JsxSelfClosingElement) {
                   tagName = parent.tagName.getText(sourceFile);
                }
                if (tagName !== 'Text') {
                    console.log(`File: ${file}, Parent: ${tagName}, Text: "${text}"`);
                }
            }
        } else if (node.kind === ts.SyntaxKind.JsxExpression) {
            if (node.expression && node.expression.kind === ts.SyntaxKind.StringLiteral) {
                let parent = node.parent;
                let tagName = 'UNKNOWN';
                if (parent.kind === ts.SyntaxKind.JsxElement) {
                   tagName = parent.openingElement.tagName.getText(sourceFile);
                } else if (parent.kind === ts.SyntaxKind.JsxSelfClosingElement) {
                   tagName = parent.tagName.getText(sourceFile);
                }
                if (tagName !== 'Text') {
                    console.log(`File: ${file}, Parent: ${tagName}, Expr: "${node.expression.text}"`);
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
});

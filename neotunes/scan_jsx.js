const ts = require('typescript');
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('**/*.tsx', { ignore: 'node_modules/**' });

files.forEach(file => {
    const sourceCode = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, sourceCode, ts.ScriptTarget.Latest, true);

    function visit(node) {
        if (node.kind === ts.SyntaxKind.JsxText || (node.kind === ts.SyntaxKind.JsxExpression && node.expression && (ts.isStringLiteral(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression)))) {
            const parent = node.parent;
            if (parent && (parent.kind === ts.SyntaxKind.JsxElement || parent.kind === ts.SyntaxKind.JsxFragment)) {
                let tagName = 'Fragment';
                if (parent.kind === ts.SyntaxKind.JsxElement) {
                    tagName = parent.openingElement.tagName.getText(sourceFile);
                }
                
                if (tagName !== 'Text') {
                    const text = node.kind === ts.SyntaxKind.JsxText ? node.getText(sourceFile).trim() : (node.expression.text || node.expression.getText(sourceFile));
                    if (text.length > 0) {
                        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                        console.log(`${file}:${line + 1} [${tagName}] "${text}"`);
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
});

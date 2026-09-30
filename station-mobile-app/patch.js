const fs = require('fs');
let content = fs.readFileSync('src/components/ScannerModal.tsx', 'utf8');
content = content.replace("  container: {", "const styles = StyleSheet.create({\n  container: {");
fs.writeFileSync('src/components/ScannerModal.tsx', content);

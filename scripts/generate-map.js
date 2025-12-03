import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPONENTS_DIR = path.join(__dirname, '../src/components');
const OUTPUT_FILE = path.join(__dirname, '../src/data/componentMap.js');

// Helper to get all .jsx files recursively
function getComponentFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            getComponentFiles(filePath, fileList);
        } else if (file.endsWith('.jsx')) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

function generateMap() {
    console.log('🔍 Scanning components...');
    const files = getComponentFiles(COMPONENTS_DIR);

    // Basic graph structure
    let graphDefinition = 'graph TD;\n';
    graphDefinition += '  App[App] --> SiteContext;\n';
    graphDefinition += '  App --> UIContext;\n';
    graphDefinition += '  App --> FilterContext;\n';

    // Add nodes for each component file
    files.forEach(file => {
        const name = path.basename(file, '.jsx');
        graphDefinition += `  App --> ${name};\n`;
        graphDefinition += `  click ${name} call handleNodeClick("${name}") "Click to Navigate";\n`;
    });

    const content = `export const componentMapData = \`
${graphDefinition}
\`;`;

    // Ensure directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, content);
    console.log(`✅ Component map generated at ${OUTPUT_FILE}`);
}

generateMap();

import fs from 'fs';
import path from 'path';

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const includesDir = path.join(srcDir, 'includes');

// Create dist directory
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy static assets to dist
const staticDirs = ['css', 'js', 'images', 'isc'];
staticDirs.forEach(dir => {
  const srcPath = path.join(srcDir, dir);
  const distPath = path.join(distDir, dir);
  if (fs.existsSync(srcPath)) {
    copyDir(srcPath, distPath);
  }
});

// Read include files
let headerHTML = fs.readFileSync(path.join(includesDir, 'header.html'), 'utf8');
let footerHTML = fs.readFileSync(path.join(includesDir, 'footer.html'), 'utf8');

// Indent header by 4 spaces (for <div id="Header_wrapper"> inside <div id="Wrapper">)
headerHTML = headerHTML.split('\n').map(line => '    ' + line).join('\n');
// Indent footer by 6 spaces (for </div> closing tag before </body>)
footerHTML = footerHTML.split('\n').map(line => '      ' + line).join('\n');

// Menu items for each page
const menuItems = {
  'index.html': 0,
  'la_community.html': 1,
  'eventi.html': 2,
  'beneficenza.html': 3,
  'contattaci.html': 4,
};

const labels = ['Home', 'La community', 'Eventi', 'Beneficenza', 'Contattaci'];
const urls = ['index.html', 'la_community.html', 'eventi.html', 'beneficenza.html', 'contattaci.html'];

function buildMenu(activeIndex) {
  let menuHTML = '';
  for (let i = 0; i < labels.length; i++) {
    const isCurrent = i === activeIndex ? 'current-menu-item' : '';
    menuHTML += `                      <li class="${isCurrent}">
                        <a href="${urls[i]}"><span>${labels[i]}</span></a>
                      </li>\n`;
  }
  menuHTML += `                      <li>
                        <a href="https://fungos.italianspeedruncommunity.com/events"><span>Proponi una run</span></a>
                      </li>\n`;
  return menuHTML;
}

// Get all HTML files (excluding includes dir and 404)
const htmlFiles = fs.readdirSync(srcDir)
  .filter(f => f.endsWith('.html') && f !== '404.html');

htmlFiles.forEach(file => {
  let content = fs.readFileSync(path.join(srcDir, file), 'utf8');
  const activeIndex = menuItems[file] ?? 0;
  
  const menuHTML = buildMenu(activeIndex);
  let headerWithMenu = headerHTML.replace(/<!-- MENU_ITEMS -->/, menuHTML);

  content = content.replace(/<!-- HEADER_INCLUDE -->/g, headerWithMenu);
  content = content.replace(/<!-- FOOTER_INCLUDE -->/g, footerHTML);

  fs.writeFileSync(path.join(distDir, file), content);
  console.log(`Processed: ${file}`);
});

console.log('Done!');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
import {readFileSync,writeFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/whale-emblem.svg',import.meta.url),'utf8');
// Preserve the recognisable silhouette at 16–32 px; fine engraving belongs in the full emblem.
const small=source.replace(/<g class="(?:chart|engraving|detail)"[\s\S]*?<\/g>/g,'').replace(/^ +$/gm,'').replace(/<desc>.*?<\/desc>/,'<desc>A rising humpback whale with curved flukes and a long pectoral fin.</desc>');
writeFileSync(new URL('../assets/favicon.svg',import.meta.url),small);

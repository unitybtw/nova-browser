const fs = require('fs');
const path = require('path');

const mockupsDir = path.join(__dirname, 'website', 'src', 'components', 'mockups');

const files = [
  { name: 'AiMockup.tsx', img: '/assets/preview.png', pos: 'top right' },
  { name: 'ShieldMockup.tsx', img: '/assets/newtab.png', pos: 'center' },
  { name: 'TabsMockup.tsx', img: '/assets/preview.png', pos: 'left center' },
  { name: 'SplitMockup.tsx', img: '/assets/preview.png', pos: 'center' },
  { name: 'LinkPreviewMockup.tsx', img: '/assets/newtab.png', pos: 'bottom center' }
];

files.forEach(f => {
  const content = `export const ${f.name.replace('.tsx', '')} = () => {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden relative">
      <img 
        src="${f.img}" 
        alt="${f.name.replace('.tsx', '')}" 
        className="w-full h-full object-cover object-${f.pos.replace(' ', '-')}"
      />
    </div>
  );
};`;
  fs.writeFileSync(path.join(mockupsDir, f.name), content);
});

console.log('Mockups updated.');

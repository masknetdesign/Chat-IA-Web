const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputFile = path.join(__dirname, 'icon.svg');
const outputDir = path.join(__dirname, 'icons');

// Garantir que o diretório de saída existe
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Gerar ícones para cada tamanho
sizes.forEach(size => {
    const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);
    
    sharp(inputFile)
        .resize(size, size)
        .png()
        .toFile(outputFile)
        .then(() => {
            console.log(`Ícone ${size}x${size} gerado com sucesso!`);
        })
        .catch(err => {
            console.error(`Erro ao gerar ícone ${size}x${size}:`, err);
        });
}); 
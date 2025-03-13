const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Tamanhos dos ícones necessários
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Criar diretório de ícones se não existir
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
}

// Função para gerar ícone em um tamanho específico
async function generateIcon(size) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    await sharp('icon.svg')
        .resize(size, size)
        .png()
        .toFile(outputPath);
    
    console.log(`Ícone ${size}x${size} gerado com sucesso!`);
}

// Gerar todos os ícones
async function generateAllIcons() {
    try {
        for (const size of sizes) {
            await generateIcon(size);
        }
        console.log('Todos os ícones foram gerados com sucesso!');
    } catch (error) {
        console.error('Erro ao gerar ícones:', error);
    }
}

// Executar geração de ícones
generateAllIcons(); 
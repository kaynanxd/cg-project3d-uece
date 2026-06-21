// engine/texture.js

class TextureManager {
    static async loadTexture(gl, url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = "anonymous"; // Evita problemas de CORS

            image.onload = () => {
                const texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, texture);

                // Configura repetição e filtros (Mipmaps para evitar serrilhado)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

                // Envia a imagem para a GPU
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.generateMipmap(gl.TEXTURE_2D);

                console.log(`Textura carregada: ${url}`);
                resolve(texture);
            };

            image.onerror = () => {
                console.error(`Erro ao carregar textura: ${url}`);
                reject(new Error(`Falha ao carregar: ${url}`));
            };

            image.src = url;
        });
    }
}
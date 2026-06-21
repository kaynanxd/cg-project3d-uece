// engine/obj_loader.js

class OBJLoader {
    static async load(gl, url) {
        const response = await fetch(url);
        const text = await response.text();

        const objPositions = [[0, 0, 0]]; 
        const objTexcoords = [[0, 0]];
        const objNormals = [[0, 0, 0]];

        const webglVertexData = [];
        const webglTexcoordData = [];
        const webglNormalData = [];
        const webglColorData = []; // Buffer para as cores do MTL

        let materials = {};
        let activeMaterial = [1.0, 1.0, 1.0, 1.0]; // Padrão: Branco

        const lines = text.split('\n');

        for (let line of lines) {
            line = line.trim();
            if (line === '' || line.startsWith('#')) continue;

            const parts = line.split(/\s+/);
            const keyword = parts[0];

            if (keyword === 'mtllib') {
                // Tenta carregar o arquivo MTL na mesma pasta do OBJ
                try {
                    const mtlName = parts[1];
                    const mtlUrl = url.substring(0, url.lastIndexOf('/') + 1) + mtlName;
                    const mtlRes = await fetch(mtlUrl);
                    const mtlText = await mtlRes.text();
                    
                    let curMat = null;
                    for (let mLine of mtlText.split('\n')) {
                        mLine = mLine.trim();
                        if (mLine.startsWith('newmtl ')) {
                            curMat = mLine.split(/\s+/)[1];
                            materials[curMat] = [1.0, 1.0, 1.0, 1.0];
                        } else if (mLine.startsWith('Kd ') && curMat) {
                            const cParts = mLine.split(/\s+/);
                            materials[curMat] = [parseFloat(cParts[1]), parseFloat(cParts[2]), parseFloat(cParts[3]), 1.0];
                        }
                    }
                } catch(e) {
                    console.warn(`MTL não carregado para ${url}`);
                }
            } else if (keyword === 'usemtl') {
                if (materials[parts[1]]) {
                    activeMaterial = materials[parts[1]];
                }
            } else if (keyword === 'v') {
                objPositions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
            } else if (keyword === 'vt') {
                objTexcoords.push([parseFloat(parts[1]), parseFloat(parts[2])]);
            } else if (keyword === 'vn') {
                objNormals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
            } else if (keyword === 'f') {
                // TRIANGLE FAN: Resolve N-gons dinamicamente sem deixar buracos
                for (let i = 2; i < parts.length - 1; i++) {
                    const p1 = parts[1].split('/');
                    const p2 = parts[i].split('/');
                    const p3 = parts[i+1].split('/');

                    const processVertex = (faceIndexes) => {
                        const pIdx = parseInt(faceIndexes[0]);
                        webglVertexData.push(...objPositions[pIdx]);

                        if (faceIndexes[1]) {
                            const tIdx = parseInt(faceIndexes[1]);
                            webglTexcoordData.push(...objTexcoords[tIdx]);
                        } else {
                            webglTexcoordData.push(0, 0);
                        }

                        if (faceIndexes[2]) {
                            const nIdx = parseInt(faceIndexes[2]);
                            webglNormalData.push(...objNormals[nIdx]);
                        } else {
                            webglNormalData.push(0, 0, 1);
                        }
                        
                        // Associa a cor do material ativo a este vértice
                        webglColorData.push(...activeMaterial);
                    };

                    processVertex(p1);
                    processVertex(p2);
                    processVertex(p3);
                }
            }
        }

        console.log(`OBJ carregado: ${url} (${webglVertexData.length / 3} vértices)`);
        return new Mesh(gl, webglVertexData, webglTexcoordData, webglNormalData, webglColorData);
    }
}
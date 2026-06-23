
class Mesh {

    constructor(gl, vertexData, texCoordData, normalData, colorData = null) {
        this.gl = gl;
        this.vertexCount = vertexData.length / 3;

        this.positionBuffer = this.createBuffer(new Float32Array(vertexData));
        this.texCoordBuffer = this.createBuffer(new Float32Array(texCoordData));
        this.normalBuffer = this.createBuffer(new Float32Array(normalData));
        
        if (colorData && colorData.length > 0) {
            this.colorBuffer = this.createBuffer(new Float32Array(colorData));
            this.hasVertexColors = true;
        } else {
            this.hasVertexColors = false;
        }

        this.modelMatrix = Matrix4.identity();
        this.texture = null;
    }

    createBuffer(data) {
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
        return buffer;
    }

    setTexture(texture) {
        this.texture = texture;
    }

    translate(tx, ty, tz) {
        let tMat = Matrix4.translation(tx, ty, tz);
        this.modelMatrix = Matrix4.multiply(tMat, this.modelMatrix);
    }

    draw(programInfo) {
        const gl = this.gl;

        gl.uniformMatrix4fv(programInfo.uniforms.u_model, false, this.modelMatrix);

        if (this.texture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.uniform1i(programInfo.uniforms.u_texture, 0); 
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(programInfo.attribs.a_position);
        gl.vertexAttribPointer(programInfo.attribs.a_position, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(programInfo.attribs.a_texcoord);
        gl.vertexAttribPointer(programInfo.attribs.a_texcoord, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.enableVertexAttribArray(programInfo.attribs.a_normal);
        gl.vertexAttribPointer(programInfo.attribs.a_normal, 3, gl.FLOAT, false, 0, 0);

        // Mapeia o buffer de cores
        if (this.hasVertexColors && programInfo.attribs.a_color !== undefined && programInfo.attribs.a_color !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
            gl.enableVertexAttribArray(programInfo.attribs.a_color);
            gl.vertexAttribPointer(programInfo.attribs.a_color, 4, gl.FLOAT, false, 0, 0);
            if(programInfo.uniforms.u_useVertexColors !== undefined) {
                gl.uniform1i(programInfo.uniforms.u_useVertexColors, 1);
            }
        } else {
            if(programInfo.uniforms.u_useVertexColors !== undefined) {
                gl.uniform1i(programInfo.uniforms.u_useVertexColors, 0);
            }
        }

        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
    }
}
// engine/shaders.js

const Shaders = {
    vertexSource: `
        attribute vec4 a_position;
        attribute vec2 a_texcoord;
        attribute vec3 a_normal;
        attribute vec4 a_color; // Nova Cor

        uniform mat4 u_model;
        uniform mat4 u_view;
        uniform mat4 u_projection;

        varying vec2 v_texcoord;
        varying vec3 v_normal;
        varying vec3 v_position; 
        varying vec4 v_color; // Passa a cor para o fragment

        void main() {
            vec4 worldPosition = u_model * a_position;
            v_position = worldPosition.xyz;
            v_normal = mat3(u_model) * a_normal; 
            gl_Position = u_projection * u_view * worldPosition;
            v_texcoord = a_texcoord;
            v_color = a_color;
        }
    `,
fragmentSource: `
    precision mediump float;

    varying vec2 v_texcoord;
    varying vec3 v_normal;
    varying vec3 v_position;
    varying vec4 v_color;

    uniform sampler2D u_texture;
    uniform int u_useTexture;
    uniform int u_useVertexColors;
    uniform vec4 u_color;

    uniform vec3 u_lightPosition;
    uniform vec3 u_viewPosition;

    uniform float u_flash; // 0.0 (normal) a 1.0 (piscando totalmente)

    void main() {
        vec3 normal = normalize(v_normal);
        vec3 lightDir = normalize(u_lightPosition - v_position);
        
        // 1. Iluminação Ambiente
        float ambientStrength = 0.3;
        vec3 ambient = ambientStrength * vec3(1.0, 1.0, 1.0);
        
        // 2. Iluminação Difusa (Lambert)
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = diff * vec3(1.0, 1.0, 1.0);
        
        // 3. Iluminação Especular (Brilho Metálico)
        float specularStrength = 0.8;
        vec3 viewDir = normalize(u_viewPosition - v_position);
        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
        vec3 specular = specularStrength * spec * vec3(1.0, 1.0, 1.0);
        
        // Seleção de cor base
        vec4 baseColor = (u_useTexture == 1) ? texture2D(u_texture, v_texcoord) : (u_useVertexColors == 1 ? v_color : u_color);
        
        // Aplicar o efeito de piscar (mistura com uma cor avermelhada/branca brilhante)
        vec4 flashColor = vec4(1.0, 0.3, 0.3, 1.0); // Vermelho de dano
        baseColor = mix(baseColor, flashColor, u_flash);
        
        // Resultado final com iluminação
        vec3 lighting = ambient + diffuse + specular;
        gl_FragColor = vec4(lighting * baseColor.rgb, baseColor.a);
    }
`,

    compileShader: function(gl, type, source) {
        let shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Erro no Shader:", gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    },

    createProgram: function(gl) {
        let vtxShader = this.compileShader(gl, gl.VERTEX_SHADER, this.vertexSource);
        let fragShader = this.compileShader(gl, gl.FRAGMENT_SHADER, this.fragmentSource);

        let prog = gl.createProgram();
        gl.attachShader(prog, vtxShader);
        gl.attachShader(prog, fragShader);
        gl.linkProgram(prog);
        return prog;
    }
};
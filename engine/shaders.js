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
    uniform vec3 u_lightColor; 

    uniform float u_flash; 

    void main() {
        vec3 normal = normalize(v_normal);
        
        // NOVO: Calcula a distância exata entre o objeto (parede/inimigo) e a luz (jogador)
        float distance = length(u_lightPosition - v_position);
        vec3 lightDir = normalize(u_lightPosition - v_position);
        
        // NOVO: Fator de Atenuação. A luz perde força quadraticamente com a distância.
        // Se a tela ficar muito escura, diminua esses valores (ex: 0.02 e 0.002).
        float attenuation = 1.0 / (1.0 + 0.05 * distance + 0.005 * distance * distance);
        
        // 1. Iluminação Ambiente (Luz base do mapa para não ficar 100% preto)
        float ambientStrength = 0.15; // Diminuído um pouco para o escuro ficar mais denso
        vec3 ambient = ambientStrength * vec3(1.0, 1.0, 1.0);
        
        // 2. Iluminação Difusa - MODIFICADO: Agora multiplica pela atenuação!
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = diff * u_lightColor * attenuation; 
        
        // 3. Iluminação Especular - MODIFICADO: Agora multiplica pela atenuação!
        float specularStrength = 0.8;
        vec3 viewDir = normalize(u_viewPosition - v_position);
        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
        vec3 specular = specularStrength * spec * u_lightColor * attenuation; 
        
        // Seleção de cor base
        vec4 baseColor = (u_useTexture == 1) ? texture2D(u_texture, v_texcoord) : (u_useVertexColors == 1 ? v_color : u_color);
        
        // Aplicar o efeito de piscar de dano do inimigo
        vec4 flashColor = vec4(1.0, 0.3, 0.3, 1.0); 
        baseColor = mix(baseColor, flashColor, u_flash);
        
        // Resultado final (O ambiente NÃO recebe atenuação, apenas a lanterna/tiro)
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
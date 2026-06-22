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

    // --- LUZ DO JOGADOR (SPOTLIGHT) ---
    uniform vec3 u_lightPosition;
    uniform vec3 u_viewPosition;
    uniform vec3 u_lightColor; 
    uniform vec3 u_lightDirection; // NOVO: Para onde a lanterna aponta
    uniform float u_lightCutOff; // NOVO: Borda interna do cone (luz forte)
    uniform float u_lightOuterCutOff; // NOVO: Borda externa do cone (esmaecimento)

    // --- LUZES DOS PROJÉTEIS ---
    uniform int u_numProjLights; 
    uniform vec3 u_projLightPositions[5]; 
    uniform vec3 u_projLightColors[5]; 

    uniform float u_flash; 
    uniform int u_emissive; 

    void main() {
        vec3 normal = normalize(v_normal);
        vec3 viewDir = normalize(u_viewPosition - v_position);
        
        // 1. Iluminação Ambiente (Diminuímos para quase zero para ficar um breu total fora do cone)
        float ambientStrength = 0.02; 
        vec3 ambient = ambientStrength * vec3(1.0, 1.0, 1.0);
        
        vec3 totalDiffuse = vec3(0.0);
        vec3 totalSpecular = vec3(0.0);

        // ==========================================
        // CÁLCULO 1: LUZ DO JOGADOR (LANTERNA / SPOTLIGHT)
        // ==========================================
        vec3 lightDirPlayer = normalize(u_lightPosition - v_position);
        
        // Calcula o ângulo entre a direção do pixel e o centro do foco da lanterna
        float theta = dot(lightDirPlayer, normalize(-u_lightDirection));
        
        // Suaviza as bordas da luz (Efeito de penumbra)
        float epsilon = u_lightCutOff - u_lightOuterCutOff;
        float intensity = clamp((theta - u_lightOuterCutOff) / epsilon, 0.0, 1.0);
        
        // Atenuação normal pela distância
        float distPlayer = length(u_lightPosition - v_position);
        float attPlayer = 1.0 / (1.0 + 0.05 * distPlayer + 0.005 * distPlayer * distPlayer);
        
        // Aplica a intensidade do foco no diffuse e specular
        float diffPlayer = max(dot(normal, lightDirPlayer), 0.0);
        totalDiffuse += diffPlayer * u_lightColor * attPlayer * intensity; 
        
        vec3 reflectDirPlayer = reflect(-lightDirPlayer, normal);
        float specPlayer = pow(max(dot(viewDir, reflectDirPlayer), 0.0), 32.0);
        totalSpecular += 0.8 * specPlayer * u_lightColor * attPlayer * intensity; 

        // ==========================================
        // CÁLCULO 2: LUZES DOS PROJÉTEIS (Continua igual, irradiando pra todo lado)
        // ==========================================
        for(int i = 0; i < 5; i++) {
            if (i >= u_numProjLights) break; 
            float distProj = length(u_projLightPositions[i] - v_position);
            float attProj = 1.0 / (1.0 + 0.05 * distProj + 0.005 * distProj * distProj);
            vec3 lightDirProj = normalize(u_projLightPositions[i] - v_position);
            
            float diffProj = max(dot(normal, lightDirProj), 0.0);
            totalDiffuse += diffProj * u_projLightColors[i] * attProj;
            
            vec3 reflectDirProj = reflect(-lightDirProj, normal);
            float specProj = pow(max(dot(viewDir, reflectDirProj), 0.0), 32.0);
            totalSpecular += 0.8 * specProj * u_projLightColors[i] * attProj;
        }
        
        vec4 baseColor = (u_useTexture == 1) ? texture2D(u_texture, v_texcoord) : (u_useVertexColors == 1 ? v_color : u_color);
        vec4 flashColor = vec4(1.0, 0.3, 0.3, 1.0); 
        baseColor = mix(baseColor, flashColor, u_flash);
        
        if (u_emissive == 1) {
            gl_FragColor = baseColor;
            return; 
        }

        vec3 lighting = ambient + totalDiffuse + totalSpecular;
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
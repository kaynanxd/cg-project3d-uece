// game/game_main.js

const GameState = { MENU: 0, PLAYING: 1, GAME_OVER: 2, VICTORY: 3 , PAUSED: 4};
let currentState = GameState.MENU;

const DifficultyConfig = {
    EASY:   { hordeCount: 3, baseEnemies: 3,  enemySpeed: 0.04, enemyHp: 70,  bossHp: 300 },
    NORMAL: { hordeCount: 5, baseEnemies: 6,  enemySpeed: 0.06, enemyHp: 100, bossHp: 600 },
    HARD:   { hordeCount: 7, baseEnemies: 10, enemySpeed: 0.08, enemyHp: 150, bossHp: 1000 }
};

let currentDifficulty;
let player, hordeManager;
let enemies = [];
let projectiles = [];

let gl, program, programInfo, camera, input;

// Meshes
let enemyMesh, bossMesh, projectileMesh, floorMesh, wallMesh, weaponMesh;
// Texturas do Cenário (Mantenha arquivos reais chao.jpg e parede.jpg na pasta assets/)
let texFloor, texWall;

// Mapa simples para as paredes (1 = Parede, 0 = Vazio)
const levelMap = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];
const TILE_SIZE = 8.0;

async function initGame() {

    try {
    await AudioManager.load("music", "assets/audio/musica_fundo.mp3");
    await AudioManager.load("footstep", "assets/audio/passos.mp3");
    console.log("Passos carregado");
    await AudioManager.load("gunshot", "assets/audio/tiro.mp3");
    await AudioManager.load("player_hit", "assets/audio/player_dano.mp3");
    await AudioManager.load("enemy_hit", "assets/audio/inimigo_dano.mp3");
    await AudioManager.load("enemy_growl", "assets/audio/grunhido.mp3");
    await AudioManager.load("enemy_death","assets/audio/enemy_death.mp3");
    } catch (e) {
        console.warn("Erro ao carregar sons", e);
    }
    const canvas = document.getElementById("glcanvas1");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.02, 0.02, 0.02, 1.0); // Fundo quase preto (estilo masmorra)
    gl.enable(gl.DEPTH_TEST);

    program = Shaders.createProgram(gl);
    gl.useProgram(program);

    programInfo = {
        attribs: {
            a_position: gl.getAttribLocation(program, "a_position"),
            a_texcoord: gl.getAttribLocation(program, "a_texcoord"),
            a_normal: gl.getAttribLocation(program, "a_normal"),
            a_color: gl.getAttribLocation(program, "a_color") // NOVO
        },
        uniforms: {
            u_model: gl.getUniformLocation(program, "u_model"),
            u_view: gl.getUniformLocation(program, "u_view"),
            u_projection: gl.getUniformLocation(program, "u_projection"),
            u_useTexture: gl.getUniformLocation(program, "u_useTexture"),
            u_texture: gl.getUniformLocation(program, "u_texture"), 
            u_useVertexColors: gl.getUniformLocation(program, "u_useVertexColors"), // NOVO
            u_color: gl.getUniformLocation(program, "u_color"),
            u_lightPosition: gl.getUniformLocation(program, "u_lightPosition"),
            u_viewPosition: gl.getUniformLocation(program, "u_viewPosition"),
            u_flash: gl.getUniformLocation(program, "u_flash") // NOVO
        }
    };
    input = new InputHandler("glcanvas1");
    // Jogador nasce em uma posição inicial válida dentro do mapa
    camera = new FPSCamera(2 * TILE_SIZE, 1.5, 2 * TILE_SIZE); 

    // --- CARREGAMENTO DE TEXTURAS (CENÁRIO) ---
    try {
        texFloor = await TextureManager.loadTexture(gl, "assets/chao.jpg");
        texWall = await TextureManager.loadTexture(gl, "assets/parede.jpg");
    } catch (e) {
        console.warn("Texturas do cenário não encontradas. Ficarão com cores sólidas.");
    }

    // --- CARREGAMENTO DE MODELOS OBJ ---
    try {
        enemyMesh = await OBJLoader.load(gl, "assets/inimigo.obj");
        bossMesh = await OBJLoader.load(gl, "assets/boss.obj");
        projectileMesh = await OBJLoader.load(gl, "assets/esfera.obj"); 
        weaponMesh = await OBJLoader.load(gl, "assets/arma.obj");
        wallMesh = await OBJLoader.load(gl, "assets/cubo.obj"); 
    } catch (e) {
        console.error("Erro crítico ao carregar os arquivos .obj em assets/!", e);
    }

    // Aplica as texturas apenas nas malhas do cenário
    if(wallMesh && texWall) wallMesh.setTexture(texWall);

    // Cria o chão manualmente (Mapeamento de UV repetido para não esticar)
    const floorVerts = [
        -100.0, 0.0, -100.0,  100.0, 0.0, -100.0,  100.0, 0.0,  100.0,
        -100.0, 0.0, -100.0,  100.0, 0.0,  100.0, -100.0, 0.0,  100.0
    ];
    const floorTex = [0,0,  20,0,  20,20,  0,0,  20,20,  0,20];
    const floorNorms = [0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0];
    floorMesh = new Mesh(gl, floorVerts, floorTex, floorNorms);
    if(texFloor) floorMesh.setTexture(texFloor);

    // Escuta o clique do mouse para atirar
    canvas.addEventListener('mousedown', (e) => {
        // Só atira se o estado for estritamente PLAYING
        if (currentState === GameState.PLAYING && document.pointerLockElement === canvas && e.button === 0) {
            let proj = player.shoot(camera.position.x, camera.position.y, camera.position.z, camera.yaw, camera.pitch);
            if (proj) projectiles.push(proj);
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === "Escape") {
            if (currentState === GameState.PLAYING) {
                pauseGame();
            } else if (currentState === GameState.PAUSED) {
                resumeGame();
            }
        }
    });

    // Mostra o Menu HTML
    document.getElementById("menu-screen").style.display = "flex";
    requestAnimationFrame(gameLoop);
}

function pauseGame() {
    currentState = GameState.PAUSED;
    document.exitPointerLock();
    document.getElementById("pause-screen").style.display = "flex"; // Precisa existir este elemento HTML
}

function resumeGame() {
    currentState = GameState.PLAYING;
    document.getElementById("glcanvas1").requestPointerLock();
    document.getElementById("pause-screen").style.display = "none";
}

async function startGame(diffStr) {

    if (AudioManager.audioCtx.state === "suspended") {
        await AudioManager.audioCtx.resume();
    }

    AudioManager.playMusic("music", 0.05);

    currentDifficulty = DifficultyConfig[diffStr];
    player = new Player();
    hordeManager = new HordeManager(currentDifficulty);
    enemies = hordeManager.spawnHorde();
    projectiles = [];

    document.getElementById("menu-screen").style.display = "none";
    document.getElementById("crosshair").style.display = "block";
    document.getElementById("hud").style.display = "block";
    document.getElementById("hud-wave").style.display = "block";
    document.getElementById("glcanvas1").requestPointerLock();

    currentState = GameState.PLAYING;
}

function gameLoop() {
    if (currentState === GameState.PLAYING) {
        updatePlaying();
        renderPlaying();
    }
    requestAnimationFrame(gameLoop);
}

function updatePlaying() {

    let isMovingInput = input.isPressed('w') || input.isPressed('s') || input.isPressed('a') || input.isPressed('d');

    // 2. Atualiza o player enviando o estado das teclas, processando a stamina e definindo a velocidade
    player.update(input, isMovingInput);

    // 3. Atualiza a câmera injetando a velocidade resultante do player
    camera.update(input, player.currentSpeed);

    

    if (typeof Enemy !== 'undefined' && Enemy.globalGrowlCooldown > 0) {
        Enemy.globalGrowlCooldown--;
    }

    if (player.hp <= 0) {
        currentState = GameState.GAME_OVER;
        document.exitPointerLock();
        document.getElementById("game-over-screen").style.display = "flex";
        document.getElementById("crosshair").style.display = "none";
        return;
    }

    projectiles.forEach(p => p.update());
    projectiles = projectiles.filter(p => p.active);

    let livingEnemies = 0;
    for (let e of enemies) {
        if (!e.active) continue;
        livingEnemies++;
        e.update(camera.position.x, camera.position.z, player);

        for (let p of projectiles) {
            if (!p.active) continue;
            let dx = p.x - e.x;
            let dz = p.z - e.z;
            let dist = Math.sqrt(dx*dx + dz*dz);
            
            if (dist < e.radius) {
                e.takeDamage(p.damage);
                p.active = false; 
            }
        }
    }

    if (livingEnemies === 0) {
        let status = hordeManager.checkProgress(0);
        if (status === "NEXT_HORDE") {
            enemies = hordeManager.spawnHorde();
        } else if (status === "VICTORY") {
            currentState = GameState.VICTORY;
            document.exitPointerLock();
            document.getElementById("victory-screen").style.display = "flex";
            document.getElementById("crosshair").style.display = "none";
        }
    }
}

function renderPlaying() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = gl.canvas.width / gl.canvas.height;
    const projMatrix = Matrix4.perspective(60 * Math.PI / 180, aspect, 0.1, 200.0);
    const viewMatrix = camera.getViewMatrix();

    gl.uniformMatrix4fv(programInfo.uniforms.u_projection, false, projMatrix);
    gl.uniformMatrix4fv(programInfo.uniforms.u_view, false, viewMatrix);

    // Sistema de iluminação: Lanterna na cara do jogador
    gl.uniform3f(programInfo.uniforms.u_lightPosition, camera.position.x, camera.position.y + 0.5, camera.position.z);
    gl.uniform3f(programInfo.uniforms.u_viewPosition, camera.position.x, camera.position.y, camera.position.z);

    // 1. DESENHA O CHÃO (Usa textura se disponível, senão usa cinza escuro estático)
    if (texFloor) {
        gl.uniform1i(programInfo.uniforms.u_useTexture, 1);
    } else {
        gl.uniform1i(programInfo.uniforms.u_useTexture, 0);
        gl.uniform4f(programInfo.uniforms.u_color, 0.2, 0.2, 0.2, 1.0);
    }
    floorMesh.modelMatrix = Matrix4.identity();
    floorMesh.draw(programInfo);

    // 2. DESENHA AS PAREDES
    if(wallMesh) {
        if (texWall) {
            gl.uniform1i(programInfo.uniforms.u_useTexture, 1);
        } else {
            gl.uniform1i(programInfo.uniforms.u_useTexture, 0);
            gl.uniform4f(programInfo.uniforms.u_color, 0.4, 0.4, 0.4, 1.0); // Paredes cinzas caso falte textura
        }
        
        for (let z = 0; z < levelMap.length; z++) {
            for (let x = 0; x < levelMap[z].length; x++) {
                if (levelMap[z][x] === 1) {
                    wallMesh.modelMatrix = Matrix4.identity();
                    wallMesh.modelMatrix[0] = TILE_SIZE/2; 
                    wallMesh.modelMatrix[5] = 2.0; // Altura da parede
                    wallMesh.modelMatrix[10] = TILE_SIZE/2;
                    wallMesh.translate(x * TILE_SIZE, 2.0, z * TILE_SIZE);
                    wallMesh.draw(programInfo);
                }
            }
        }
    }

    // 3. DESENHA INIMIGOS (Sem textura -> Cor sólida interpretada com iluminação de Phong)
    gl.uniform1i(programInfo.uniforms.u_useTexture, 0); 
    gl.uniform4f(programInfo.uniforms.u_color, 1.0, 1.0, 1.0, 1.0); 

    for (let e of enemies) {
        if (!e.active) continue;
        let mesh = e.isBoss ? bossMesh : enemyMesh;
        if(mesh) {
            let m = Matrix4.identity();
            
            if (e.isBoss) {
                m[0] = 3.0; m[5] = 3.0; m[10] = 3.0;
            }
            
            let ajusteModelo = Math.PI / 30; 
            let rotY = Matrix4.rotationY(e.yaw + ajusteModelo);
            m = Matrix4.multiply(rotY, m);
            
            let tMat = Matrix4.translation(e.x, e.y, e.z);
            m = Matrix4.multiply(tMat, m);
            
            mesh.modelMatrix = m;

            // NOVO: Se o inimigo tiver frames de flash ativos, manda 1.0 pro shader, se não 0.0
            let flashValue = e.flashFrames > 0 ? 1.0 : 0.0;
            gl.uniform1f(programInfo.uniforms.u_flash, flashValue);
            
            mesh.draw(programInfo);
        }
    }

    // NOVO: Reseta o u_flash para 0.0 para que não afete os projéteis e a arma desenhados depois
    gl.uniform1f(programInfo.uniforms.u_flash, 0.0);
    // 4. DESENHA PROJÉTEIS (Esferas)
    for (let p of projectiles) {
        if (!p.active) continue;
        if(projectileMesh) {
            gl.uniform1i(programInfo.uniforms.u_useTexture, 0); 
            gl.uniform4f(programInfo.uniforms.u_color, 1.0, 0.5, 0.0, 1.0); // Laranja plasma
            projectileMesh.modelMatrix = Matrix4.identity();
            projectileMesh.modelMatrix[0] = 0.15; projectileMesh.modelMatrix[5] = 0.15; projectileMesh.modelMatrix[10] = 0.15;
            projectileMesh.translate(p.x, p.y, p.z);
            projectileMesh.draw(programInfo);
        }
    }

    // 5. DESENHA A ARMA HUD (Sem textura -> Aplicado cinza metálico com Phong)
    if (weaponMesh) {
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(programInfo.uniforms.u_view, false, Matrix4.identity());
        
        gl.uniform1i(programInfo.uniforms.u_useTexture, 0); 
        gl.uniform4f(programInfo.uniforms.u_color, 1.0, 1.0, 1.0, 1.0); 
        
        let recoilOffsetZ = (player.shootCooldown / 15.0) * 0.25; 
        let recoilOffsetY = (player.shootCooldown / 15.0) * 0.04; 

        let m = Matrix4.identity();
        
        // 1º Escala: Se a arma estiver muito grande/pequena, mude o 1.0 aqui
        m[0] = 0.2; m[5] =  0.2; m[10] =  0.2;
        
        // 2º Rotação Manual: É AQUI QUE VOCÊ ARRUMA A ARMA!
        // Math.PI = 180 graus | Math.PI / 2 = 90 graus
        // Teste mudar o sinal (ex: -Math.PI / 2) para girar pro lado certo
        let rotArmaY = Matrix4.rotationY(1.5); // Vira a arma pra frente
        let rotArmaX = Matrix4.rotationX(0);          // Levanta/abaixa o cano
        
        m = Matrix4.multiply(rotArmaY, m);
        m = Matrix4.multiply(rotArmaX, m);

        // 3º Translação: Gruda no canto da tela com o recoil aplicado
        let tMat = Matrix4.translation(0.45, -0.55 + recoilOffsetY, -1.2 + recoilOffsetZ);
        m = Matrix4.multiply(tMat, m);

        weaponMesh.modelMatrix = m;
        weaponMesh.draw(programInfo);
    }
}

window.onload = initGame;
// game/game_main.js

const GameState = { MENU: 0, PLAYING: 1, GAME_OVER: 2, VICTORY: 3 , PAUSED: 4, UPGRADING: 5};
let currentState = GameState.MENU;

const DifficultyConfig = {
    EASY:   { hordeCount: 3, baseEnemies: 3,  enemySpeed: 0.06, enemyHp: 70,  bossHp: 600 ,bossSpeed: 0.08},
    NORMAL: { hordeCount: 5, baseEnemies: 6,  enemySpeed: 0.08, enemyHp: 100, bossHp: 1000 ,bossSpeed: 0.10},
    HARD:   { hordeCount: 7, baseEnemies: 10, enemySpeed: 0.10, enemyHp: 150, bossHp: 1500 , bossSpeed: 0.10}
};

let currentDifficulty;
let player, hordeManager;
let enemies = [];
let projectiles = [];
let bobbingTimer = 0;
let weaponMeshes = {}; // Dicionário para guardar as 3 armas
let isMouseDown = false;
let mouseJustPressed = false;
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
const PLAYER_RADIUS = 0.4;

function isWallBlocking(x, z, radius) {
    const half = TILE_SIZE / 2;
    const gx = Math.floor(x / TILE_SIZE);
    const gz = Math.floor(z / TILE_SIZE);

    for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
            const tx = gx + dx;
            const tz = gz + dz;
            if (tz < 0 || tz >= levelMap.length || tx < 0 || tx >= levelMap[0].length) continue;
            if (levelMap[tz][tx] === 0) continue;

            const cx = tx * TILE_SIZE;
            const cz = tz * TILE_SIZE;
            const minX = cx - half;
            const maxX = cx + half;
            const minZ = cz - half;
            const maxZ = cz + half;

            if (radius > 0) {
                const closestX = Math.max(minX, Math.min(x, maxX));
                const closestZ = Math.max(minZ, Math.min(z, maxZ));
                const dx2 = x - closestX;
                const dz2 = z - closestZ;
                if (dx2 * dx2 + dz2 * dz2 < radius * radius) return true;
            } else {
                if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) return true;
            }
        }
    }
    return false;
}

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
            u_lightColor: gl.getUniformLocation(program, "u_lightColor"),
            u_flash: gl.getUniformLocation(program, "u_flash") ,// NOVO
            u_lightDirection: gl.getUniformLocation(program, "u_lightDirection"),
            u_lightCutOff: gl.getUniformLocation(program, "u_lightCutOff"),
            u_lightOuterCutOff: gl.getUniformLocation(program, "u_lightOuterCutOff"),
            u_numProjLights: gl.getUniformLocation(program, "u_numProjLights"),
            u_projLightPositions: gl.getUniformLocation(program, "u_projLightPositions"),
            u_projLightColors: gl.getUniformLocation(program, "u_projLightColors"),
            u_emissive: gl.getUniformLocation(program, "u_emissive"),
            u_flash: gl.getUniformLocation(program, "u_flash")
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
        
        // NOVO: Carregando todas as armas
        weaponMeshes['pistola'] = await OBJLoader.load(gl, "assets/armapistola.obj");
        weaponMeshes['akm'] = await OBJLoader.load(gl, "assets/arma.obj");
        weaponMeshes['escopeta'] = await OBJLoader.load(gl, "assets/armaescopeta.obj");
        
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
// Escuta o clique do mouse para atirar
    canvas.addEventListener('mousedown', (e) => {
        if (currentState === GameState.PLAYING && document.pointerLockElement === canvas && e.button === 0) {
            isMouseDown = true;
            mouseJustPressed = true;
        }
    });
  
    // Escuta a tecla Q do teclado para atirar
    document.addEventListener('keydown', (e) => {
        if (currentState === GameState.PLAYING && document.pointerLockElement === canvas && (e.key === 'q' || e.key === 'Q')) {
            let proj = player.shoot(camera.position.x, camera.position.y, camera.position.z, camera.yaw, camera.pitch);
            if (proj) projectiles.push(proj);
        }
    });
    // Clique nos cards de upgrade
    document.getElementById('upgrade-choices').addEventListener('click', (e) => {
        let card = e.target.closest('.upgrade-card');
        if (!card) return;
        let typeId = card.dataset.id;
        let type = POWERUP_TYPES.find(t => t.id === typeId);
        if (!type) return;
        selectUpgrade(type);
    });

    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) isMouseDown = false;
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === "Escape") {
            if (currentState === GameState.PLAYING) pauseGame();
            else if (currentState === GameState.PAUSED) resumeGame();
        }
        // NOVO: Troca de armas
        if (currentState === GameState.PLAYING && player) {
            if (e.key === '1') player.switchWeapon(0); // Pistola
            if (e.key === '2') player.switchWeapon(1); // AKM
            if (e.key === '3') player.switchWeapon(2); // Escopeta
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
    enemies = hordeManager.spawnHorde(camera.position.x, camera.position.z);
    projectiles = [];

    document.getElementById("menu-screen").style.display = "none";
    document.getElementById("crosshair").style.display = "block";
    document.getElementById("hud").style.display = "block";
    document.getElementById("hud-wave").style.display = "block";
    document.getElementById("glcanvas1").requestPointerLock();

    currentState = GameState.PLAYING;
}

function showUpgradeSelection() {
    currentState = GameState.UPGRADING;
    document.exitPointerLock();

    let shuffled = [...POWERUP_TYPES].sort(() => Math.random() - 0.5);
    let choices = shuffled.slice(0, 3);

    let container = document.getElementById('upgrade-choices');
    container.innerHTML = '';
    for (let type of choices) {
        let card = document.createElement('div');
        card.className = 'upgrade-card';
        card.dataset.id = type.id;
        card.innerHTML = '<div class="upgrade-name">' + type.name + '</div><div class="upgrade-desc">' + type.desc + '</div>';
        container.appendChild(card);
    }

    document.getElementById('upgrade-screen').style.display = 'flex';
}

function selectUpgrade(type) {
    type.apply(player);
    updateHUD(player);

    document.getElementById('upgrade-screen').style.display = 'none';

    enemies = hordeManager.spawnHorde(camera.position.x, camera.position.z);

    currentState = GameState.PLAYING;
    document.getElementById('glcanvas1').requestPointerLock();
}

function gameLoop() {
    if (currentState === GameState.PLAYING) {
        updatePlaying();
        renderPlaying();
    } else if (currentState === GameState.UPGRADING) {
        renderPlaying();
    }
    requestAnimationFrame(gameLoop);
}

function updatePlaying() {
    let currentWeapon = player.weapons[player.currentWeaponIndex];
    let shouldShoot = false;

    if (currentWeapon.isAuto) {
        shouldShoot = isMouseDown; // Atira enquanto segura
    } else {
        shouldShoot = mouseJustPressed; // Atira só no clique inicial
    }

    if (shouldShoot) {
        let projs = player.shoot(camera.position.x, camera.position.y, camera.position.z, camera.yaw, camera.pitch);
        if (projs && projs.length > 0) {
            projectiles.push(...projs); // Adiciona todos os tiros no array principal
        }
    }
    mouseJustPressed = false; // Reseta o "click único" para o próximo frame

    let isMovingInput = input.isPressed('w') || input.isPressed('s') || input.isPressed('a') || input.isPressed('d');

    // 2. Atualiza o player enviando o estado das teclas, processando a stamina e definindo a velocidade
    player.update(input, isMovingInput);

    // 3. Atualiza a câmera injetando a velocidade resultante do player
    const oldCamX = camera.position.x;
    const oldCamZ = camera.position.z;
    camera.update(input, player.currentSpeed);
    // Colisão com paredes (eixos separados para deslizar)
    const newCamX = camera.position.x;
    const newCamZ = camera.position.z;
    camera.position.x = oldCamX;
    if (!isWallBlocking(newCamX, oldCamZ, PLAYER_RADIUS)) {
        camera.position.x = newCamX;
    }
    camera.position.z = oldCamZ;
    if (!isWallBlocking(camera.position.x, newCamZ, PLAYER_RADIUS)) {
        camera.position.z = newCamZ;
    }

    if (isMovingInput) {
        // Se estiver correndo (velocidade maior), o balanço é mais rápido
        let bobSpeed = player.currentSpeed > 0.1 ? 0.25 : 0.15;
        bobbingTimer += bobSpeed;
    } else {
        // Se parar de andar, a arma volta suavemente para a posição inicial (0)
        bobbingTimer %= Math.PI * 2;
        if (bobbingTimer > 0) {
            bobbingTimer -= 0.1;
            if (bobbingTimer < 0) bobbingTimer = 0;
        }
    }

    

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

    projectiles.forEach(p => {
        p.update();
        if (p.active && isWallBlocking(p.x, p.z, 0)) {
            p.active = false;
        }
    });
    projectiles = projectiles.filter(p => p.active);

    let livingEnemies = 0;
    for (let e of enemies) {
        if (!e.active) continue;
        livingEnemies++;
        const oldEX = e.x;
        const oldEZ = e.z;
        e.update(camera.position.x, camera.position.z, player);
        if (isWallBlocking(e.x, e.z, e.radius)) {
            e.x = oldEX;
            e.z = oldEZ;
        }

        for (let p of projectiles) {
            if (!p.active) continue;
            let dx = p.x - e.x;
            let dz = p.z - e.z;
            let dist = Math.sqrt(dx*dx + dz*dz);
            
            if (dist < e.radius) {
                e.takeDamage(p.damage);
                if (p.piercingLeft > 0) {
                    p.piercingLeft--;
                } else {
                    p.active = false;
                }
            }
        }
    }

    if (livingEnemies === 0) {
        let status = hordeManager.checkProgress(0);
        if (status === "NEXT_HORDE") {
            showUpgradeSelection();
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

    gl.useProgram(program); // Garante que o programa está ativo antes de mandar as uniforms

    gl.uniformMatrix4fv(programInfo.uniforms.u_projection, false, projMatrix);
    gl.uniformMatrix4fv(programInfo.uniforms.u_view, false, viewMatrix);

    // Sistema de iluminação: Lanterna na cara do jogador
    gl.uniform3f(programInfo.uniforms.u_lightPosition, camera.position.x, camera.position.y + 0.5, camera.position.z);
    gl.uniform3f(programInfo.uniforms.u_viewPosition, camera.position.x, camera.position.y, camera.position.z);
    // ==========================================================
    // NOVO: MATEMÁTICA DO FOCO DA LANTERNA
    // ==========================================================
    // 1. Calcula o vetor de direção baseado para onde o jogador olha
    let sinYawCam = Math.sin(camera.yaw);
    let cosYawCam = Math.cos(camera.yaw);
    let sinPitchCam = Math.sin(camera.pitch);
    let cosPitchCam = Math.cos(camera.pitch);

    let camDirX = -sinYawCam * cosPitchCam;
    let camDirY = sinPitchCam;
    let camDirZ = -cosYawCam * cosPitchCam;

    // Envia a direção exata da câmera para a lanterna
    gl.uniform3f(programInfo.uniforms.u_lightDirection, camDirX, camDirY, camDirZ);
    

    // 2. Define o tamanho do "cone" de luz. 
    // Math.cos é usado porque o Shader calcula luz via Produto Escalar (dot product)
    // 12.5 graus é o círculo forte no meio, 17.5 graus é onde a luz morre (suave)
    gl.uniform1f(programInfo.uniforms.u_lightCutOff, Math.cos(25 * Math.PI / 180));
    gl.uniform1f(programInfo.uniforms.u_lightOuterCutOff, Math.cos(35 * Math.PI / 180));
    // ==========================================================

    let activeProjs = projectiles.filter(p => p.active);
    let numProjLights = Math.min(activeProjs.length, 5);
    gl.uniform1i(programInfo.uniforms.u_numProjLights, numProjLights);

    if (numProjLights > 0) {
        // Arrays achatados em 1D porque o WebGL lê dados assim
        let projPositions = new Float32Array(numProjLights * 3);
        let projColors = new Float32Array(numProjLights * 3);
        
        for (let i = 0; i < numProjLights; i++) {
            let p = activeProjs[i];
            // Posição do projétil
            projPositions[i*3] = p.x;
            projPositions[i*3 + 1] = p.y;
            projPositions[i*3 + 2] = p.z;
            
            // Cor do projétil (Laranja neon/Plasma estourado)
            projColors[i*3] = 1;     // Reduzido de 5.0
            projColors[i*3 + 1] = 0.5; // Reduzido de 2.5
            projColors[i*3 + 2] = 0.0;
        }
        
        gl.uniform3fv(programInfo.uniforms.u_projLightPositions, projPositions);
        gl.uniform3fv(programInfo.uniforms.u_projLightColors, projColors);
    }

    // ==========================================================
    // FUNÇÃO AUXILIAR PARA GARANTIR A COR DA LUZ A CADA DESENHO
    // ==========================================================
    function aplicarLuzDinamica() {
        if (player && player.muzzleFlashFrames > 0) {
            // Amarelo super forte estourado
            gl.uniform3f(programInfo.uniforms.u_lightColor, 3, 2, 0.2);
        } else {
            // Luz branca normal (lanterna)
            gl.uniform3f(programInfo.uniforms.u_lightColor, 2.0, 2.0, 2.0);
        }
    }

    // 1. DESENHA O CHÃO
    if (texFloor) {
        gl.uniform1i(programInfo.uniforms.u_useTexture, 1);
    } else {
        gl.uniform1i(programInfo.uniforms.u_useTexture, 0);
        gl.uniform4f(programInfo.uniforms.u_color, 0.2, 0.2, 0.2, 1.0);
    }
    aplicarLuzDinamica(); // Garante a luz antes de desenhar o chão
    floorMesh.modelMatrix = Matrix4.identity();
    floorMesh.draw(programInfo);

    // 2. DESENHA AS PAREDES
    if(wallMesh) {
        if (texWall) {
            gl.uniform1i(programInfo.uniforms.u_useTexture, 1);
        } else {
            gl.uniform1i(programInfo.uniforms.u_useTexture, 0);
            gl.uniform4f(programInfo.uniforms.u_color, 0.4, 0.4, 0.4, 1.0);
        }
        
        for (let z = 0; z < levelMap.length; z++) {
            for (let x = 0; x < levelMap[z].length; x++) {
                if (levelMap[z][x] === 1) {
                    wallMesh.modelMatrix = Matrix4.identity();
                    wallMesh.modelMatrix[0] = TILE_SIZE/2; 
                    wallMesh.modelMatrix[5] = 2.0; 
                    wallMesh.modelMatrix[10] = TILE_SIZE/2;
                    wallMesh.translate(x * TILE_SIZE, 2.0, z * TILE_SIZE);
                    aplicarLuzDinamica(); // Garante a luz antes de desenhar cada bloco de parede
                    wallMesh.draw(programInfo);
                }
            }
        }
    }

    // 3. DESENHA INIMIGOS
    gl.uniform1i(programInfo.uniforms.u_useTexture, 0); 
    gl.uniform4f(programInfo.uniforms.u_color, 1.0, 1.0, 1.0, 1.0); 

    for (let e of enemies) {
        if (!e.active) continue;
        let mesh = e.isBoss ? bossMesh : enemyMesh;
        if(mesh) {
            let m = Matrix4.identity();
            if (e.isBoss) { m[0] = 3.0; m[5] = 3.0; m[10] = 3.0; }
            let ajusteModelo = Math.PI / 30; 
            let rotY = Matrix4.rotationY(e.yaw + ajusteModelo);
            m = Matrix4.multiply(rotY, m);
            let tMat = Matrix4.translation(e.x, e.y, e.z);
            m = Matrix4.multiply(tMat, m);
            mesh.modelMatrix = m;

            let flashValue = e.flashFrames > 0 ? 1.0 : 0.0;
            gl.uniform1f(programInfo.uniforms.u_flash, flashValue);
            
            aplicarLuzDinamica(); // Garante a luz antes do inimigo
            mesh.draw(programInfo);
        }
    }

    gl.uniform1f(programInfo.uniforms.u_flash, 0.0);

    // 4. DESENHA PROJÉTEIS
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Soma a cor do tiro com a cor do fundo
    gl.depthMask(false); // Permite que os tiros se sobreponham sem cortar a imagem uns dos outros

    for (let p of projectiles) {
        if (!p.active) continue;
        if(projectileMesh) {
            gl.uniform1i(programInfo.uniforms.u_useTexture, 0); 
            
            gl.uniform1i(programInfo.uniforms.u_emissive, 1);
            // Com o Blend ativo, usamos uma cor um pouco mais suave (Laranja claro)
            // porque ela vai se somar com tudo atrás dela gerando o brilho extremo
            gl.uniform4f(programInfo.uniforms.u_color, 1.0, 0.6, 0.1, 1.0); 
            
            projectileMesh.modelMatrix = Matrix4.identity();
            projectileMesh.modelMatrix[0] = 0.08; 
            projectileMesh.modelMatrix[5] = 0.08; 
            projectileMesh.modelMatrix[10] = 0.08;
            projectileMesh.translate(p.x, p.y, p.z);
            aplicarLuzDinamica(); 
            projectileMesh.draw(programInfo);
            
            gl.uniform1i(programInfo.uniforms.u_emissive, 0);
        }
    }

    // NOVO: Desliga tudo imediatamente para não deixar as paredes e a arma transparentes!
    gl.disable(gl.BLEND);
    gl.depthMask(true);

// 5. DESENHA A ARMA HUD
    let currentWeaponObj = player.weapons[player.currentWeaponIndex];
    let activeWeaponMesh = weaponMeshes[currentWeaponObj.id];

    if (activeWeaponMesh) {
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(programInfo.uniforms.u_view, false, Matrix4.identity());
        
        gl.uniform3f(programInfo.uniforms.u_lightPosition, 0.0, 1.0, 2.0);
        gl.uniform3f(programInfo.uniforms.u_viewPosition, 0.0, 0.0, 2.0);
        gl.uniform3f(programInfo.uniforms.u_lightDirection, 0.0, 0.0, -1.0);
        
        gl.uniform1f(programInfo.uniforms.u_lightCutOff, Math.cos(45.0 * Math.PI / 180));
        gl.uniform1f(programInfo.uniforms.u_lightOuterCutOff, Math.cos(60.0 * Math.PI / 180));
        gl.uniform1i(programInfo.uniforms.u_numProjLights, 0); 
        gl.uniform1i(programInfo.uniforms.u_useTexture, 0); 
        gl.uniform4f(programInfo.uniforms.u_color, 1.0, 1.0, 1.0, 1.0); 
        
        // Calcula o recuo visual baseando-se no cooldown máximo da arma atual
        let recoilOffsetZ = (player.shootCooldown / currentWeaponObj.cooldown) * 0.25; 
        let recoilOffsetY = (player.shootCooldown / currentWeaponObj.cooldown) * 0.04;

        let bobX = 0;
        let bobY = 0;
        if (bobbingTimer > 0) {
            bobX = Math.sin(bobbingTimer) * 0.03;
            bobY = Math.cos(bobbingTimer * 2) * 0.015;
        }

        let m = Matrix4.identity();
        m[0] = 0.2; m[5] =  0.2; m[10] =  0.2;
        let rotArmaY = Matrix4.rotationY(1.5); 
        let rotArmaX = Matrix4.rotationX(0);          
        m = Matrix4.multiply(rotArmaY, m);
        m = Matrix4.multiply(rotArmaX, m);

        let tMat = Matrix4.translation(0.45 + bobX, -0.55 + recoilOffsetY + bobY, -1.2 + recoilOffsetZ);
        m = Matrix4.multiply(tMat, m);

        activeWeaponMesh.modelMatrix = m;
        aplicarLuzDinamica(); 
        activeWeaponMesh.draw(programInfo);
    }
}

window.onload = initGame;
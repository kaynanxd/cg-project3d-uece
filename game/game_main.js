const GameState = { MENU: 0, PLAYING: 1, GAME_OVER: 2, VICTORY: 3, PAUSED: 4, UPGRADING: 5 };
let currentState = GameState.MENU;

const DifficultyConfig = {
    EASY:   { hordeCount: 4, gunUpgradeWave: [2, 4], baseEnemies: 4,  enemySpeed: 0.08, enemyHp: 60,  bossHp: 1200,  bossSpeed: 0.10 },
    NORMAL: { hordeCount: 5, gunUpgradeWave: [2, 4], baseEnemies: 5,  enemySpeed: 0.10, enemyHp: 80,  bossHp: 2000, bossSpeed: 0.12 },
    HARD:   { hordeCount: 8, gunUpgradeWave: [2,4,6], baseEnemies: 6, enemySpeed: 0.11, enemyHp: 100, bossHp: 2800, bossSpeed: 0.14 },
};

let currentDifficulty;
let player, hordeManager;
let enemies = [];
let projectiles = [];
let bobbingTimer = 0;
let weaponMeshes = {};
let isMouseDown = false;
let mouseJustPressed = false;
let gameStarting = false;
let gl, program, programInfo, camera, input;
let lastFrameTime = 0;

let isSurvivalMode = false;
let currentScore = 0;

const FPS_LIMIT = 60;
const FRAME_DURATION = 1000 / FPS_LIMIT;
const TILE_SIZE = 4.0;
const PLAYER_RADIUS = 0.4;

let enemyMesh, enemy2Mesh, bossMesh, projectileMesh, floorMesh, wallMesh;
let lapide1Mesh, lapide2Mesh, estatuaMesh;
let texFloor, texWall;

// Mapa do nível: 0=vazio, 1=parede, 2=lápide1, 3=lápide2, 4=estátua
const levelMap = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,4,0,0,0,0,0,0,0,0,0,0,4,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,3,0,0,0,0,0,0,0,0,0,0,3,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

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
            const minX = cx - half, maxX = cx + half;
            const minZ = cz - half, maxZ = cz + half;

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
        await AudioManager.load("music",      "assets/audio/musica_fundo.mp3");
        await AudioManager.load("footstep",   "assets/audio/passos.mp3");

        await AudioManager.load("sound_pistola",  "assets/audio/pistola.mp3");
        await AudioManager.load("sound_akm",      "assets/audio/akm.mp3");
        await AudioManager.load("sound_escopeta", "assets/audio/escopeta.mp3");
        await AudioManager.load("sound_sniper", "assets/audio/sniper.mp3");

        await AudioManager.load("player_hit", "assets/audio/player_dano.mp3");
        await AudioManager.load("enemy_hit",  "assets/audio/inimigo_dano.mp3");
        await AudioManager.load("enemy_growl","assets/audio/grunhido.mp3");
        await AudioManager.load("enemy_death","assets/audio/enemy_death.mp3");
        await AudioManager.load("powerup",    "assets/audio/powerup.mp3");
        await AudioManager.load("vitoria",    "assets/audio/vitoria.mp3");
        await AudioManager.load("derrota",    "assets/audio/derrota.mp3");
    } catch (e) {
        console.warn("Erro ao carregar sons:", e);
    }

    const canvas = document.getElementById("glcanvas1");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.02, 0.02, 0.02, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = Shaders.createProgram(gl);
    gl.useProgram(program);

    programInfo = {
        attribs: {
            a_position: gl.getAttribLocation(program, "a_position"),
            a_texcoord: gl.getAttribLocation(program, "a_texcoord"),
            a_normal:   gl.getAttribLocation(program, "a_normal"),
            a_color:    gl.getAttribLocation(program, "a_color")
        },
        uniforms: {
            u_model:            gl.getUniformLocation(program, "u_model"),
            u_view:             gl.getUniformLocation(program, "u_view"),
            u_projection:       gl.getUniformLocation(program, "u_projection"),
            u_useTexture:       gl.getUniformLocation(program, "u_useTexture"),
            u_texture:          gl.getUniformLocation(program, "u_texture"),
            u_useVertexColors:  gl.getUniformLocation(program, "u_useVertexColors"),
            u_color:            gl.getUniformLocation(program, "u_color"),
            u_lightPosition:    gl.getUniformLocation(program, "u_lightPosition"),
            u_viewPosition:     gl.getUniformLocation(program, "u_viewPosition"),
            u_lightColor:       gl.getUniformLocation(program, "u_lightColor"),
            u_lightDirection:   gl.getUniformLocation(program, "u_lightDirection"),
            u_lightCutOff:      gl.getUniformLocation(program, "u_lightCutOff"),
            u_lightOuterCutOff: gl.getUniformLocation(program, "u_lightOuterCutOff"),
            u_numProjLights:    gl.getUniformLocation(program, "u_numProjLights"),
            u_projLightPositions:gl.getUniformLocation(program, "u_projLightPositions"),
            u_projLightColors:  gl.getUniformLocation(program, "u_projLightColors"),
            u_emissive:         gl.getUniformLocation(program, "u_emissive"),
            u_flash:            gl.getUniformLocation(program, "u_flash")
        }
    };

    input  = new InputHandler("glcanvas1");
    camera = new FPSCamera(7 * TILE_SIZE, 1.5, 7 * TILE_SIZE);

    try {
        texFloor = await TextureManager.loadTexture(gl, "assets/chao.jpg");
        texWall  = await TextureManager.loadTexture(gl, "assets/parede_nova.jpg");
    } catch (e) {
        console.warn("Texturas do cenário não encontradas. Usando cores sólidas.");
    }

    try {
        enemyMesh      = await OBJLoader.load(gl, "assets/inimigo.obj");
        enemy2Mesh     = await OBJLoader.load(gl, "assets/inimigo2.obj");
        bossMesh       = await OBJLoader.load(gl, "assets/boss.obj");
        projectileMesh = await OBJLoader.load(gl, "assets/esfera.obj");
        weaponMeshes['pistola']  = await OBJLoader.load(gl, "assets/armapistola.obj");
        weaponMeshes['akm']      = await OBJLoader.load(gl, "assets/arma.obj");
        weaponMeshes['escopeta'] = await OBJLoader.load(gl, "assets/armaescopeta.obj");
        weaponMeshes['sniper'] = await OBJLoader.load(gl, "assets/armasniper.obj");
        wallMesh    = await OBJLoader.load(gl, "assets/cubo.obj");
        lapide1Mesh = await OBJLoader.load(gl, "assets/gravestone.obj");
        lapide2Mesh = await OBJLoader.load(gl, "assets/gravestone2.obj");
        estatuaMesh = await OBJLoader.load(gl, "assets/AngelStatue.obj");
    } catch (e) {
        console.error("Erro ao carregar modelos OBJ:", e);
    }

    if (wallMesh && texWall) wallMesh.setTexture(texWall);

    const floorVerts = [
        -100.0, 0.0, -100.0,  100.0, 0.0, -100.0,  100.0, 0.0,  100.0,
        -100.0, 0.0, -100.0,  100.0, 0.0,  100.0, -100.0, 0.0,  100.0
    ];
    const floorTex   = [0,0, 20,0, 20,20, 0,0, 20,20, 0,20];
    const floorNorms  = [0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0];
    floorMesh = new Mesh(gl, floorVerts, floorTex, floorNorms);
    if (texFloor) floorMesh.setTexture(texFloor);

    canvas.addEventListener('mousedown', (e) => {
        if (currentState === GameState.PLAYING && document.pointerLockElement === canvas && e.button === 0) {
            isMouseDown = true;
            mouseJustPressed = true;
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) isMouseDown = false;
    });


    document.addEventListener('keydown', (e) => {
        const canvas = document.getElementById("glcanvas1");
        if (currentState === GameState.PLAYING && document.pointerLockElement === canvas && (e.key === 'q' || e.key === 'Q')) {
            let projs = player.shoot(camera.position.x, camera.position.y, camera.position.z, camera.yaw, camera.pitch);
            if (projs && projs.length > 0) {
                projectiles.push(...projs); 
            }
        }
    });

    document.getElementById('upgrade-choices').addEventListener('click', (e) => {
        let card = e.target.closest('.upgrade-card');
        if (!card) return;
        let type = POWERUP_TYPES.find(t => t.id === card.dataset.id);
        if (type) selectUpgrade(type);
    });

    document.getElementById('weapon-choices').addEventListener('click', (e) => {
        let card = e.target.closest('.upgrade-card');
        if (!card) return;
        selectWeapon(card.dataset.id);
    });

    window.addEventListener('keydown', (e) => {

        if (isCutsceneRunning && e.key === ' ') {
        e.preventDefault();
        endCutscene();
        return;
        }
        if (e.key === "Escape") {
            if (currentState === GameState.PLAYING) pauseGame();
            else if (currentState === GameState.PAUSED) resumeGame();
        }
        if (currentState === GameState.PLAYING && player) {
            if (e.key === '1') player.switchWeapon(0);
            if (e.key === '2') player.switchWeapon(1);
            if (e.key === '3') player.switchWeapon(2);
            if (e.key === '4') player.switchWeapon(3);
        }
    });

    document.getElementById("menu-screen").style.display = "flex";
    document.querySelectorAll("#menu-screen .btn").forEach(b => b.disabled = false);

    requestAnimationFrame(gameLoop);
}

function pauseGame() {
    currentState = GameState.PAUSED;
    document.exitPointerLock();
    document.getElementById("pause-screen").style.display = "flex";
}

function resumeGame() {
    currentState = GameState.PLAYING;
    document.getElementById("glcanvas1").requestPointerLock();
    document.getElementById("pause-screen").style.display = "none";
}

let isCutsceneRunning = false;
let savedDifficulty = "NORMAL"; 

function showDifficultyMenu() {
    document.getElementById('main-menu-view').style.display = 'none';
    document.getElementById('credits-view').style.display = 'none';
    document.getElementById('difficulty-view').style.display = 'flex';
}

function showCredits() {
    document.getElementById('main-menu-view').style.display = 'none';
    document.getElementById('difficulty-view').style.display = 'none';
    document.getElementById('credits-view').style.display = 'flex';
}

function showMainMenu() {
    document.getElementById('difficulty-view').style.display = 'none';
    document.getElementById('credits-view').style.display = 'none';
    document.getElementById('main-menu-view').style.display = 'flex';
}

async function startGame(diffStr, event) {
    if (event) event.stopPropagation();
    if (gameStarting) return;
    
    savedDifficulty = diffStr; 
    startCutscene();
}

function startCutscene() {
    isCutsceneRunning = true;
    document.getElementById("menu-screen").style.display = "none";
    
    const container = document.getElementById("cutscene-container");
    const video = document.getElementById("intro-video");
    
    container.style.display = "flex";
    
    video.play().catch(e => {
        console.warn("Autoplay bloqueado ou erro no vídeo, pulando direto para o jogo:", e);
        endCutscene();
    });

    video.onended = () => {
        endCutscene();
    };
}

function endCutscene() {
    if (!isCutsceneRunning) return;
    isCutsceneRunning = false;
    
    const container = document.getElementById("cutscene-container");
    const video = document.getElementById("intro-video");
    
    video.pause();
    container.style.display = "none";
    
    if (input) {
        if (typeof input.reset === 'function') {
            input.reset();
        } else if (input.keys) {
            input.keys = {}; 
        }

        input.mouseDeltaX = 0;
        input.mouseDeltaY = 0;
    }
    
    runActualGame(savedDifficulty);
}

async function runActualGame(diffStr) {
    gameStarting = true;

    document.getElementById("crosshair").style.display = "block";
    document.getElementById("hud").style.display = "block";
    document.getElementById("hud-wave").style.display = "block";

    try {
        if (AudioManager.audioCtx.state === "suspended") await AudioManager.audioCtx.resume();
        AudioManager.playMusic("music", 0.05);
    } catch (e) {
        console.warn("Erro de áudio:", e);
    }

    currentScore = 0;
    document.getElementById('hud-score').innerText = "0";

    if (diffStr === 'SURVIVAL') {
        isSurvivalMode = true;
        currentDifficulty = { hordeCount: Infinity, gunUpgradeWave: [2, 4, 6], baseEnemies: 4, enemySpeed: 0.11, enemyHp: 80 };
    } else {
        isSurvivalMode = false;
        currentDifficulty = DifficultyConfig[diffStr];
    }
    player       = new Player();
    hordeManager = new HordeManager(currentDifficulty);
    projectiles  = [];

    if (currentDifficulty.gunUpgradeWave === 1) {
        showWeaponSelection();
    } else {
        enemies = hordeManager.spawnHorde(camera.position.x, camera.position.z);
        currentState = GameState.PLAYING;
    }

    gameStarting = false;
}

function showUpgradeSelection() {
    currentState = GameState.UPGRADING;
    document.exitPointerLock();
    AudioManager.play("powerup");

    isMouseDown = false;
    mouseJustPressed = false;

    let choices = [...POWERUP_TYPES].sort(() => Math.random() - 0.5).slice(0, 3);
    let container = document.getElementById('upgrade-choices');
    container.innerHTML = '';
    
    container.style.pointerEvents = "none";
    setTimeout(() => { container.style.pointerEvents = "auto"; }, 200);

    for (let type of choices) {
        let card = document.createElement('div');
        card.className = 'upgrade-card';
        card.dataset.id = type.id;
        card.innerHTML = `<div class="upgrade-name">${type.name}</div><div class="upgrade-desc">${type.desc}</div>`;
        container.appendChild(card);
    }

    document.getElementById('upgrade-screen').style.display = 'flex';
}



function selectUpgrade(type) {
    type.apply(player);
    updateHUD(player);
    document.getElementById('upgrade-screen').style.display = 'none';

    isMouseDown = false;
    mouseJustPressed = false;
    
    enemies = hordeManager.spawnHorde(camera.position.x, camera.position.z);
    currentState = GameState.PLAYING;
    document.getElementById('glcanvas1').requestPointerLock();
}

const WEAPON_CHOICES = [
    { id: 'pistola',  name: 'Pistola',  desc: 'Dano: 50 | Cadência: Média' },
    { id: 'akm',      name: 'AKM',      desc: 'Dano: 20 | Cadência: Alta | Automático' },
    { id: 'escopeta', name: 'Escopeta', desc: 'Dano: 15x8 | Cadência: Baixa | Dispersão' },
    { id: 'sniper', name: 'Sniper', desc: 'Dano: 100 | Cadência: Muito Baixa | Penetração' }
];

function showWeaponSelection() {
    currentState = GameState.UPGRADING;
    document.exitPointerLock();
    AudioManager.play("powerup", 0.5);

    isMouseDown = false;
    mouseJustPressed = false;

    let container = document.getElementById('weapon-choices');
    container.innerHTML = '';
    
    container.style.pointerEvents = "none";
    setTimeout(() => { container.style.pointerEvents = "auto"; }, 200);

    const avaliableChoices = WEAPON_CHOICES.filter(choice => 
        !player.weapons.some(w => w.id === choice.id)
    );

    if (avaliableChoices.length === 0) {
        showUpgradeSelection();
        return;
    }

    for (let w of avaliableChoices) {
        let card = document.createElement('div');
        card.className = 'upgrade-card';
        card.dataset.id = w.id;
        card.innerHTML = `<div class="upgrade-name">${w.name}</div><div class="upgrade-desc">${w.desc}</div>`;
        container.appendChild(card);
    }

    document.getElementById('weapon-screen').style.display = 'flex';
}

function selectWeapon(weaponId) {
    player.addWeaponToInventory(weaponId);
    updateHUD(player);
    document.getElementById('weapon-screen').style.display = 'none';
    
    isMouseDown = false;
    mouseJustPressed = false;
    
    enemies = hordeManager.spawnHorde(camera.position.x, camera.position.z);
    currentState = GameState.PLAYING;
    document.getElementById('glcanvas1').requestPointerLock();
}

function gameLoop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;

    const elapsed = timestamp - lastFrameTime;
    if (elapsed >= FRAME_DURATION) {
        lastFrameTime = timestamp - (elapsed % FRAME_DURATION);

        if (currentState === GameState.PLAYING) {
            updatePlaying();
            renderPlaying();
        } else if (currentState === GameState.UPGRADING) {
            renderPlaying();
        }
    }

    requestAnimationFrame(gameLoop);
}

function updatePlaying() {
    const currentWeapon = player.weapons[player.currentWeaponIndex];

    const shouldShoot = currentWeapon.isAuto ? isMouseDown : mouseJustPressed;
    if (shouldShoot) {
        let projs = player.shoot(camera.position.x, camera.position.y, camera.position.z, camera.yaw, camera.pitch);
        if (projs && projs.length > 0) projectiles.push(...projs);
    }
    mouseJustPressed = false;

    const isMovingInput = input.isPressed('w') || input.isPressed('s') || input.isPressed('a') || input.isPressed('d');
    player.update(input, isMovingInput, camera.position);

    // Movimento da câmera com colisão por eixo separado (permite deslizar nas paredes)
    const oldCamX = camera.position.x;
    const oldCamZ = camera.position.z;
    camera.update(input, player.currentSpeed);
    const newCamX = camera.position.x;
    const newCamZ = camera.position.z;

    camera.position.x = oldCamX;
    if (!isWallBlocking(newCamX, oldCamZ, PLAYER_RADIUS)) camera.position.x = newCamX;

    camera.position.z = oldCamZ;
    if (!isWallBlocking(camera.position.x, newCamZ, PLAYER_RADIUS)) camera.position.z = newCamZ;

    if (isMovingInput && player.isGrounded) {
        bobbingTimer += player.currentSpeed > 0.1 ? 0.25 : 0.15;
    } else {
        bobbingTimer %= Math.PI * 2;
        if (bobbingTimer > 0) {
            bobbingTimer -= 0.1;
            if (bobbingTimer < 0) bobbingTimer = 0;
        }
    }

    if (typeof Enemy !== 'undefined' && Enemy.globalGrowlCooldown > 0) Enemy.globalGrowlCooldown--;

    if (player.hp <= 0) {
        currentState = GameState.GAME_OVER;
        document.exitPointerLock();
        if (AudioManager.musicSource) { AudioManager.musicSource.stop(); AudioManager.musicSource = null; }
        AudioManager.play("derrota");
        document.getElementById("final-score").innerText = currentScore;
        document.getElementById("game-over-screen").style.display = "flex";
        document.getElementById("crosshair").style.display = "none";
        return;
    }

    projectiles.forEach(p => {
        p.update();
        
        const distDoCentro = Math.sqrt(p.x * p.x + p.z * p.z);
        if (distDoCentro > 200.0) {
            p.active = false;
        }
    });
    projectiles = projectiles.filter(p => p.active);

    let livingEnemies = 0;
    for (let e of enemies) {
        if (!e.active) continue;
        livingEnemies++;

        const oldEX = e.x, oldEZ = e.z;
        e.update(camera.position.x, camera.position.z, player);
        const newEX = e.x, newEZ = e.z;

        e.x = newEX; e.z = oldEZ;
        if (isWallBlocking(e.x, e.z, e.radius)) e.x = oldEX;
        e.z = newEZ;
        if (isWallBlocking(e.x, e.z, e.radius)) e.z = oldEZ;

        for (let p of projectiles) {
            if (!p.active) continue;
            const dx = p.x - e.x, dz = p.z - e.z;
            if (Math.sqrt(dx*dx + dz*dz) < e.radius) {
                e.takeDamage(p.damage);
                if (p.piercingLeft > 0) p.piercingLeft--;
                else p.active = false;
            }
        }
    }

    for (let i = 0; i < enemies.length; i++) {
        const e1 = enemies[i];
        if (!e1.active || e1.isDying) continue;
        for (let j = i + 1; j < enemies.length; j++) {
            const e2 = enemies[j];
            if (!e2.active || e2.isDying) continue;

            const dx = e2.x - e1.x, dz = e2.z - e1.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            const minDist = e1.radius + e2.radius;
            if (dist >= minDist) continue;

            const overlap = minDist - dist;
            let dirX, dirZ;
            if (dist < 0.001) {
                const angle = Math.random() * Math.PI * 2;
                dirX = Math.cos(angle); dirZ = Math.sin(angle);
            } else {
                dirX = dx / dist; dirZ = dz / dist;
            }

            const w1 = e2.radius / minDist;
            const w2 = e1.radius / minDist;

            e1.x -= dirX * overlap * w1; e1.z -= dirZ * overlap * w1;
            e2.x += dirX * overlap * w2; e2.z += dirZ * overlap * w2;

            if (isWallBlocking(e1.x, e1.z, e1.radius)) { e1.x += dirX * overlap * w1; e1.z += dirZ * overlap * w1; }
            if (isWallBlocking(e2.x, e2.z, e2.radius)) { e2.x -= dirX * overlap * w2; e2.z -= dirZ * overlap * w2; }
        }
    }

    if (livingEnemies === 0) {
        const status = hordeManager.checkProgress(0);
    if (status === "NEXT_HORDE") {
        if (currentDifficulty.gunUpgradeWave.includes(hordeManager.currentHorde)) {
            showWeaponSelection();
        } else {
            showUpgradeSelection();
        }
        } else if (status === "VICTORY") {
            currentState = GameState.VICTORY;
            document.exitPointerLock();
            if (AudioManager.musicSource) { AudioManager.musicSource.stop(); AudioManager.musicSource = null; }
            AudioManager.play("vitoria");
            document.getElementById("victory-score").innerText = currentScore;
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

    gl.useProgram(program);
    gl.uniformMatrix4fv(programInfo.uniforms.u_projection, false, projMatrix);
    gl.uniformMatrix4fv(programInfo.uniforms.u_view, false, viewMatrix);

    // Lanterna: posição e direção seguem a câmera
    gl.uniform3f(programInfo.uniforms.u_lightPosition, camera.position.x, camera.position.y + 0.5, camera.position.z);
    gl.uniform3f(programInfo.uniforms.u_viewPosition,  camera.position.x, camera.position.y, camera.position.z);

    const sinYaw = Math.sin(camera.yaw), cosYaw = Math.cos(camera.yaw);
    const sinPitch = Math.sin(camera.pitch), cosPitch = Math.cos(camera.pitch);
    gl.uniform3f(programInfo.uniforms.u_lightDirection, -sinYaw * cosPitch, sinPitch, -cosYaw * cosPitch);

    // Cone de luz da lanterna 
    gl.uniform1f(programInfo.uniforms.u_lightCutOff,      Math.cos(25 * Math.PI / 180));
    gl.uniform1f(programInfo.uniforms.u_lightOuterCutOff, Math.cos(35 * Math.PI / 180));

    // Luzes dinâmicas dos projéteis
    const activeProjs = projectiles.filter(p => p.active);
    const numProjLights = Math.min(activeProjs.length, 5);
    gl.uniform1i(programInfo.uniforms.u_numProjLights, numProjLights);

    if (numProjLights > 0) {
        const projPositions = new Float32Array(numProjLights * 3);
        const projColors    = new Float32Array(numProjLights * 3);
        for (let i = 0; i < numProjLights; i++) {
            const p = activeProjs[i];
            projPositions[i*3] = p.x; projPositions[i*3+1] = p.y; projPositions[i*3+2] = p.z;
            projColors[i*3] = 1.0;    projColors[i*3+1] = 0.5;    projColors[i*3+2] = 0.0;
        }
        gl.uniform3fv(programInfo.uniforms.u_projLightPositions, projPositions);
        gl.uniform3fv(programInfo.uniforms.u_projLightColors,    projColors);
    }

    // Cor da luz: amarela durante flash, branca no resto
    function aplicarLuzDinamica() {
        if (player && player.muzzleFlashFrames > 0) gl.uniform3f(programInfo.uniforms.u_lightColor, 3.0, 2.0, 0.2);
        else                                         gl.uniform3f(programInfo.uniforms.u_lightColor, 2.0, 2.0, 2.0);
    }

    // 1. Chão
    gl.uniform1i(programInfo.uniforms.u_useTexture, texFloor ? 1 : 0);
    if (!texFloor) gl.uniform4f(programInfo.uniforms.u_color, 0.2, 0.2, 0.2, 1.0);
    aplicarLuzDinamica();
    floorMesh.modelMatrix = Matrix4.identity();
    floorMesh.draw(programInfo);

    // 2. Paredes e props do cenário
    for (let z = 0; z < levelMap.length; z++) {
        for (let x = 0; x < levelMap[z].length; x++) {
            const tileId = levelMap[z][x];
            if (tileId === 0) continue;

            let currentMesh = null;
            let currentScaleY = 1.0;
            let posY = 0.0;

            if (tileId === 1 && wallMesh) {
                currentMesh = wallMesh;
                currentScaleY = 2.0;
                posY = 2.0;
                gl.uniform1i(programInfo.uniforms.u_useTexture, texWall ? 1 : 0);
                if (!texWall) gl.uniform4f(programInfo.uniforms.u_color, 0.4, 0.4, 0.4, 1.0);
            } else if (tileId === 2 && lapide1Mesh) {
                currentMesh = lapide1Mesh;
                gl.uniform1i(programInfo.uniforms.u_useTexture, 0);
                gl.uniform4f(programInfo.uniforms.u_color, 0.5, 0.5, 0.55, 1.0);
            } else if (tileId === 3 && lapide2Mesh) {
                currentMesh = lapide2Mesh;
                gl.uniform1i(programInfo.uniforms.u_useTexture, 0);
                gl.uniform4f(programInfo.uniforms.u_color, 0.35, 0.35, 0.35, 1.0);
            } else if (tileId === 4 && estatuaMesh) {
                currentMesh = estatuaMesh;
                gl.uniform1i(programInfo.uniforms.u_useTexture, 0);
                gl.uniform4f(programInfo.uniforms.u_color, 0.4, 0.5, 0.4, 1.0);
            }

            if (currentMesh) {
                currentMesh.modelMatrix = Matrix4.identity();
                if (tileId === 1) {
                    currentMesh.modelMatrix[0]  = TILE_SIZE / 2;
                    currentMesh.modelMatrix[10] = TILE_SIZE / 2;
                } else {
                    const propScale = 2.0;
                    currentMesh.modelMatrix[0]  = propScale;
                    currentMesh.modelMatrix[10] = propScale;
                    currentScaleY = propScale;
                }
                currentMesh.modelMatrix[5] = currentScaleY;
                currentMesh.translate(x * TILE_SIZE, posY, z * TILE_SIZE);
                aplicarLuzDinamica();
                currentMesh.draw(programInfo);
            }
        }
    }

    // 3. Inimigos
    gl.uniform1i(programInfo.uniforms.u_useTexture, 0);
    gl.uniform4f(programInfo.uniforms.u_color, 1.0, 1.0, 1.0, 1.0);

    for (let e of enemies) {
        if (!e.active) continue;
        let mesh = null;
        if (e.isBoss) {
            mesh = bossMesh;
        } else {
            mesh = (e.meshType === 1) ? enemyMesh : enemy2Mesh;
        }
        if (!mesh) continue;

        let m = Matrix4.identity();
        if (e.isBoss) { m[0] = 3.0; m[5] = 3.0; m[10] = 3.0; }
        m = Matrix4.multiply(Matrix4.rotationY(e.yaw + Math.PI / 30), m);
        m = Matrix4.multiply(Matrix4.translation(e.x, e.y, e.z), m);
        mesh.modelMatrix = m;

        gl.uniform1f(programInfo.uniforms.u_flash, e.flashFrames > 0 ? 1.0 : 0.0);
        aplicarLuzDinamica();
        mesh.draw(programInfo);
    }

    gl.uniform1f(programInfo.uniforms.u_flash, 0.0);

    // 4. Projéteis
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);

    for (let p of projectiles) {
        if (!p.active || !projectileMesh) continue;
        gl.uniform1i(programInfo.uniforms.u_useTexture, 0);
        gl.uniform1i(programInfo.uniforms.u_emissive, 1);
        gl.uniform4f(programInfo.uniforms.u_color, 1.0, 0.6, 0.1, 1.0);
        projectileMesh.modelMatrix = Matrix4.identity();
        projectileMesh.modelMatrix[0]  = 0.08;
        projectileMesh.modelMatrix[5]  = 0.08;
        projectileMesh.modelMatrix[10] = 0.08;
        projectileMesh.translate(p.x, p.y, p.z);
        aplicarLuzDinamica();
        projectileMesh.draw(programInfo);
        gl.uniform1i(programInfo.uniforms.u_emissive, 0);
    }

    gl.disable(gl.BLEND);
    gl.depthMask(true);

    // 5. Arma no HUD 
    const currentWeaponObj = player.weapons[player.currentWeaponIndex];
    const activeWeaponMesh = weaponMeshes[currentWeaponObj.id];

    if (activeWeaponMesh) {
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(programInfo.uniforms.u_view, false, Matrix4.identity());
        gl.uniform3f(programInfo.uniforms.u_lightPosition, 0.0, 1.0, 2.0);
        gl.uniform3f(programInfo.uniforms.u_viewPosition,  0.0, 0.0, 2.0);
        gl.uniform3f(programInfo.uniforms.u_lightDirection, 0.0, 0.0, -1.0);
        gl.uniform1f(programInfo.uniforms.u_lightCutOff,      Math.cos(45.0 * Math.PI / 180));
        gl.uniform1f(programInfo.uniforms.u_lightOuterCutOff, Math.cos(60.0 * Math.PI / 180));
        gl.uniform1i(programInfo.uniforms.u_numProjLights, 0);
        gl.uniform1i(programInfo.uniforms.u_useTexture, 0);
        gl.uniform4f(programInfo.uniforms.u_color, 1.0, 1.0, 1.0, 1.0);

        const weaponRecoilZ = currentWeaponObj.recoilZ ?? 0.25;
        const weaponRecoilY = currentWeaponObj.recoilY ?? 0.04;
        const recoilOffsetZ = (player.shootCooldown / currentWeaponObj.cooldown) * weaponRecoilZ;
        const recoilOffsetY = (player.shootCooldown / currentWeaponObj.cooldown) * weaponRecoilY;

        const bobX = bobbingTimer > 0 ? Math.sin(bobbingTimer) * 0.03 : 0;
        const bobY = bobbingTimer > 0 ? Math.cos(bobbingTimer * 2) * 0.015 : 0;

        let m = Matrix4.identity();
        m[0] = 0.2; m[5] = 0.2; m[10] = 0.2;
        m = Matrix4.multiply(Matrix4.rotationY(1.5), m);
        m = Matrix4.multiply(Matrix4.rotationX(0), m);
        m = Matrix4.multiply(Matrix4.translation(0.45 + bobX, -0.55 + recoilOffsetY + bobY, -1.2 + recoilOffsetZ), m);

        activeWeaponMesh.modelMatrix = m;
        aplicarLuzDinamica();
        activeWeaponMesh.draw(programInfo);
    }
}

window.onload = initGame;
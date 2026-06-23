// game/player.js
const WEAPON_DEFS = [
    { id: 'pistola',  cooldown: 40, damage: 50, pellets: 1, spread: 0.0,  isAuto: false },
    { id: 'akm',      cooldown: 8,  damage: 20, pellets: 1, spread: 0.04, isAuto: true  },
    { id: 'escopeta', cooldown: 60, damage: 15, pellets: 8, spread: 0.15, isAuto: false }
];

// game/player.js
class Player {
    constructor() {
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.shootCooldown = 0;
        this.damageAudioCooldown = 0;

        this.maxStamina = 100;
        this.stamina = this.maxStamina;
        this.staminaCooldown = 0; 
        this.isExhausted = false; 
        this.muzzleFlashFrames = 0;
        
        this.walkSpeed = 0.08;
        this.runSpeed = 0.15; 
        this.currentSpeed = this.walkSpeed;

        // ==========================================
        // NOVO: ATRIBUTOS DE FÍSICA DO PULO
        // ==========================================
        this.velocityV = 0.0;        // Velocidade vertical (Eixo Y)
        this.isGrounded = true;     // Flag para saber se está pisando no chão
        this.jumpCost = 20.0;        // Custo de stamina para pular
        this.jumpForce = 0.22;       // Impulso inicial do pulo
        this.gravity = 0.012;        // Força da gravidade aplicada por frame
        this.defaultHeight = 1.5;    // Altura dos olhos do player no chão

        this.weapons = [Object.assign({}, WEAPON_DEFS[0])];
        this.currentWeaponIndex = 0;

        this.damageMultiplier = 0;
        this.extraLives = 0;
        this.piercingLevel = 0;

        updateHUD(this);
    }

    setPermanentWeapon(index) {
        this.weapons = [Object.assign({}, WEAPON_DEFS[index])];
        this.currentWeaponIndex = 0;
        this.shootCooldown = 20;
    }

    switchWeapon(index) {
        if (index >= 0 && index < this.weapons.length && this.currentWeaponIndex !== index) {
            this.currentWeaponIndex = index;
            this.shootCooldown = 20;
        }
    }

    takeDamage(amount) {
        if (this.damageAudioCooldown <= 0) {
            AudioManager.play("player_hit", 1);
            this.damageAudioCooldown = 60;
        }
        this.hp -= amount;

        if (this.hp <= 0 && this.extraLives > 0) {
            this.extraLives--;
            this.hp = this.maxHp;
        }

        if (this.hp < 0) this.hp = 0;
        updateHUD(this);
        
        document.getElementById('ui-layer').style.backgroundColor = "rgba(255, 0, 0, 0.3)";
        setTimeout(() => document.getElementById('ui-layer').style.backgroundColor = "transparent", 100);
    }

    canShoot() {
        return this.shootCooldown <= 0;
    }

    shoot(cameraX, cameraY, cameraZ, yaw, pitch) {
        if (!this.canShoot()) return []; 

        let weapon = this.weapons[this.currentWeaponIndex];
        this.shootCooldown = weapon.cooldown; 
        this.muzzleFlashFrames = 4;
        AudioManager.play("gunshot", 0.4);

        let cosPitch = Math.cos(pitch);
        let sinPitch = Math.sin(pitch);
        let sinYaw = Math.sin(yaw);
        let cosYaw = Math.cos(yaw);

        let camDirX = -sinYaw * cosPitch;
        let camDirY = sinPitch; 
        let camDirZ = -cosYaw * cosPitch;

        let rightX = cosYaw;
        let rightZ = -sinYaw;

        let offsetRight = 1.0;   
        let offsetDown = -0.2;   
        let offsetForward = 0; 
        
        let spawnX = cameraX + (rightX * offsetRight) + (camDirX * offsetForward);
        let spawnY = cameraY + offsetDown + (camDirY * offsetForward); 
        let spawnZ = cameraZ + (rightZ * offsetRight) + (camDirZ * offsetForward);

        let targetDist = 50.0;
        let targetX = cameraX + (camDirX * targetDist);
        let targetY = cameraY + (camDirY * targetDist);
        let targetZ = cameraZ + (camDirZ * targetDist);

        let trajX = targetX - spawnX;
        let trajY = targetY - spawnY;
        let trajZ = targetZ - spawnZ;
        let length = Math.sqrt(trajX*trajX + trajY*trajY + trajZ*trajZ);

        let spawnedProjectiles = [];

        for (let i = 0; i < weapon.pellets; i++) {
            let spreadX = (Math.random() - 0.5) * weapon.spread;
            let spreadY = (Math.random() - 0.5) * weapon.spread;
            let spreadZ = (Math.random() - 0.5) * weapon.spread;

            let finalDirX = (trajX / length) + spreadX;
            let finalDirY = (trajY / length) + spreadY;
            let finalDirZ = (trajZ / length) + spreadZ;

            let finalLength = Math.sqrt(finalDirX*finalDirX + finalDirY*finalDirY + finalDirZ*finalDirZ);

            let effectiveDamage = Math.floor(weapon.damage * (1 + this.damageMultiplier * 0.1));
            spawnedProjectiles.push(new Projectile(
                spawnX, spawnY, spawnZ, 
                finalDirX / finalLength, finalDirY / finalLength, finalDirZ / finalLength, 
                1.5, effectiveDamage, this.piercingLevel
            ));
        }
        
        return spawnedProjectiles;
    }

    // ATUALIZADO: Processa pulo, gravidade e gastos de fôlego
// ATUALIZADO: Suporte a pulo longo com inércia de corrida
    update(inputHandler, isMoving, cameraPosition) {
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.damageAudioCooldown > 0) this.damageAudioCooldown--;
        if (this.muzzleFlashFrames > 0) this.muzzleFlashFrames--;

        // 1. DETERMINAÇÃO DA VELOCIDADE NO CHÃO (Antes de computar o pulo)
        if (this.isGrounded) {
            if (inputHandler.isPressed('shift') && isMoving && !this.isExhausted) {
                this.currentSpeed = this.runSpeed;
                this.stamina -= 0.6; 

                if (this.stamina <= 0) {
                    this.stamina = 0;
                    this.isExhausted = true;
                    this.staminaCooldown = 90; 
                }
            } else {
                this.currentSpeed = this.walkSpeed;

                if (this.staminaCooldown > 0) {
                    this.staminaCooldown--;
                } else {
                    if (this.stamina < this.maxStamina) {
                        this.stamina += 0.4; 
                        if (this.stamina >= 20) this.isExhausted = false; 
                        if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
                    }
                }
            }
        }

        // 2. INPUT DE PULO (Verifica barra de espaço)
        // Removida a trava de exaustão para permitir saltos normais se houver stamina
        if (inputHandler.isPressed(' ') && this.isGrounded && this.stamina >= this.jumpCost) {
            this.stamina -= this.jumpCost;
            
            // DICA: Se estiver correndo, damos um impulso extra para frente no ar!
            if (this.currentSpeed === this.runSpeed) {
                this.velocityV = this.jumpForce * 1.1; // Pula ligeiramente mais alto se correr
            } else {
                this.velocityV = this.jumpForce;
            }
            
            this.isGrounded = false;
            this.staminaCooldown = 40; 
        }

        // 3. APLICAÇÃO DA FÍSICA VERTICAL (Gravidade)
        if (!this.isGrounded) {
            cameraPosition.y += this.velocityV; 
            this.velocityV -= this.gravity;     

            if (cameraPosition.y <= this.defaultHeight) {
                cameraPosition.y = this.defaultHeight;
                this.velocityV = 0.0;
                this.isGrounded = true;
            }
        }

        updateHUD(this);
    }
}

function updateHUD(player) {
    document.getElementById('hud-hp').innerText = Math.floor(player.hp);
    document.getElementById('hud-maxhp').innerText = player.maxHp;
    document.getElementById('hud-stamina').innerText = Math.floor(player.stamina);
    document.getElementById('hud-maxstamina').innerText = player.maxStamina;
    let weapon = player.weapons[player.currentWeaponIndex];
    document.getElementById('hud-damage').innerText = Math.floor(weapon.damage * (1 + player.damageMultiplier * 0.1));
    document.getElementById('hud-lives').innerText = player.extraLives;
    document.getElementById('hud-piercing').innerText = player.piercingLevel;
}
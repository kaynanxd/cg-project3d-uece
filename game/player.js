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
        // NOVO: SISTEMA DE ARMAS
        // ==========================================
        this.weapons = [
            { id: 'pistola',  cooldown: 40, damage: 50, pellets: 1, spread: 0.0,  isAuto: false }, // 1: Pistola
            { id: 'akm',      cooldown: 8,  damage: 20, pellets: 1, spread: 0.04, isAuto: true  }, // 2: Metralhadora
            { id: 'escopeta', cooldown: 60, damage: 15, pellets: 8, spread: 0.15, isAuto: false }  // 3: Escopeta
        ];
        this.currentWeaponIndex = 0; // Começa com a pistola

        // Power-up attributes
        this.damage = 50;
        this.extraLives = 0;
        this.piercingLevel = 0;

        updateHUD(this);
    }

    // Função para trocar de arma
    switchWeapon(index) {
        if (index >= 0 && index < this.weapons.length && this.currentWeaponIndex !== index) {
            this.currentWeaponIndex = index;
            this.shootCooldown = 20; // Animação/delayzinho ao trocar de arma
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
        if (!this.canShoot()) return []; // Agora retorna um array vazio

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

        // Loop para gerar as balas (1 para pistola/AKM, várias para escopeta)
        for (let i = 0; i < weapon.pellets; i++) {
            // Aplica o "Spread" (espalhamento) randômico
            let spreadX = (Math.random() - 0.5) * weapon.spread;
            let spreadY = (Math.random() - 0.5) * weapon.spread;
            let spreadZ = (Math.random() - 0.5) * weapon.spread;

            let finalDirX = (trajX / length) + spreadX;
            let finalDirY = (trajY / length) + spreadY;
            let finalDirZ = (trajZ / length) + spreadZ;

            // Normaliza o vetor novamente para a velocidade ser constante
            let finalLength = Math.sqrt(finalDirX*finalDirX + finalDirY*finalDirY + finalDirZ*finalDirZ);
            
            spawnedProjectiles.push(new Projectile(
                spawnX, spawnY, spawnZ, 
                finalDirX / finalLength, finalDirY / finalLength, finalDirZ / finalLength, 
                1.5, weapon.damage // Passando o dano configurado
            ));
        }
        
        return spawnedProjectiles;
    }

    update(inputHandler, isMoving) {
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.damageAudioCooldown > 0) this.damageAudioCooldown--;
        if (this.muzzleFlashFrames > 0) this.muzzleFlashFrames--;

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

        updateHUD(this);
    }
    
}

function updateHUD(player) {
    document.getElementById('hud-hp').innerText = Math.floor(player.hp);
    document.getElementById('hud-maxhp').innerText = player.maxHp;
    document.getElementById('hud-stamina').innerText = Math.floor(player.stamina);
    document.getElementById('hud-maxstamina').innerText = player.maxStamina;
    document.getElementById('hud-damage').innerText = player.damage;
    document.getElementById('hud-lives').innerText = player.extraLives;
    document.getElementById('hud-piercing').innerText = player.piercingLevel;
}
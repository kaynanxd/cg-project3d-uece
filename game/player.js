class Player {
    constructor() {
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.shootCooldown = 0;
        this.damageAudioCooldown = 0;

        // NOVO: Atributos de Stamina
        this.maxStamina = 100;
        this.stamina = this.maxStamina;
        this.staminaCooldown = 0; // Cooldown quando zera
        this.isExhausted = false; // Bloqueia corrida enquanto recupera do zero
        this.muzzleFlashFrames = 0;
        // Configurações de velocidade de movimentação
        this.walkSpeed = 0.08;
        this.runSpeed = 0.15; // Velocidade ao correr
        this.currentSpeed = this.walkSpeed;

        updateHUD(this.hp, this.stamina);
    }

    takeDamage(amount) {
        if (this.damageAudioCooldown <= 0) {
            AudioManager.play("player_hit", 1);
            this.damageAudioCooldown = 60;
        }
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        updateHUD(this.hp, this.stamina);
        
        document.getElementById('ui-layer').style.backgroundColor = "rgba(255, 0, 0, 0.3)";
        setTimeout(() => document.getElementById('ui-layer').style.backgroundColor = "transparent", 100);
    }

    canShoot() {
        return this.shootCooldown <= 0;
    }

    shoot(cameraX, cameraY, cameraZ, yaw, pitch) {
        if (!this.canShoot()) return null;
        this.shootCooldown = 15; 
        this.muzzleFlashFrames = 4
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
        
        return new Projectile(spawnX, spawnY, spawnZ, trajX / length, trajY / length, trajZ / length, 1.5);
    }

    // NOVO: Gerencia a mecânica de corrida e regeneração por frame
    update(inputHandler, isMoving) {
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.damageAudioCooldown > 0) this.damageAudioCooldown--;
        if (this.muzzleFlashFrames > 0) this.muzzleFlashFrames--;

        // Verifica se quer correr (Shift), está se movendo e não está exausto
        if (inputHandler.isPressed('shift') && isMoving && !this.isExhausted) {
            this.currentSpeed = this.runSpeed;
            this.stamina -= 0.6; // Gasta stamina por frame de corrida (~36 por segundo)

            if (this.stamina <= 0) {
                this.stamina = 0;
                this.isExhausted = true;
                this.staminaCooldown = 90; // 1.5 segundos de cooldown absoluto
            }
        } else {
            // Estado de caminhada ou parado
            this.currentSpeed = this.walkSpeed;

            if (this.staminaCooldown > 0) {
                this.staminaCooldown--;
            } else {
                // Se o cooldown acabou, regenera a stamina
                if (this.stamina < this.maxStamina) {
                    this.stamina += 0.4; // Taxa de regeneração por frame
                    if (this.stamina >= 20) this.isExhausted = false; // Recuperou o fôlego mínimo
                    if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
                }
            }
        }

        updateHUD(this.hp, this.stamina);
    }
}

// Atualizado para receber e exibir a stamina arredondada
function updateHUD(hp, stamina) {
    document.getElementById('hud-hp').innerText = hp;
    document.getElementById('hud-stamina').innerText = Math.floor(stamina);
}
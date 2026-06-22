// game/player.js
class Player {
    constructor() {
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.shootCooldown = 0;
        updateHUD(this.hp);
        this.damageAudioCooldown = 0;
    }

    takeDamage(amount) {
        if (this.damageAudioCooldown <= 0) {
            AudioManager.play("player_hit", 1);
            this.damageAudioCooldown = 60; // Bloqueia o som por 45 frames (~0.7 segundos)
        }
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        updateHUD(this.hp);
        
        // Efeito visual de dano (pisca a tela de vermelho via CSS)
        document.getElementById('ui-layer').style.backgroundColor = "rgba(255, 0, 0, 0.3)";
        setTimeout(() => document.getElementById('ui-layer').style.backgroundColor = "transparent", 100);
    }

    canShoot() {
        return this.shootCooldown <= 0;
    }

// game/player.js - Substitua a função shoot por esta:

    shoot(cameraX, cameraY, cameraZ, yaw, pitch) { // <-- pitch adicionado aqui
        if (!this.canShoot()) return null;
        this.shootCooldown = 15; 
        AudioManager.play("gunshot", 0.4);

        // 1. Calcula o vetor Frente REAL da câmera (Incluindo olhar pra cima/baixo)
        let cosPitch = Math.cos(pitch);
        let sinPitch = Math.sin(pitch);
        let sinYaw = Math.sin(yaw);
        let cosYaw = Math.cos(yaw);

        let camDirX = -sinYaw * cosPitch;
        let camDirY = sinPitch; 
        let camDirZ = -cosYaw * cosPitch;

        // 2. Calcula o vetor Direita (para o deslocamento horizontal da arma)
        let rightX = cosYaw;
        let rightZ = -sinYaw;

        // ==========================================================
        // AJUSTE FINO DA BOCA DA ARMA 
        // ==========================================================
        let offsetRight = 1.0;   
        let offsetDown = -0.2;   
        let offsetForward = 0; 
        
        // 3. Calcula o Spawn (onde o tiro nasce). 
        // Adicionamos camDirY * offsetForward para o tiro acompanhar quando você olha pra cima
        let spawnX = cameraX + (rightX * offsetRight) + (camDirX * offsetForward);
        let spawnY = cameraY + offsetDown + (camDirY * offsetForward); 
        let spawnZ = cameraZ + (rightZ * offsetRight) + (camDirZ * offsetForward);

        // 4. Cria um "Ponto Alvo" imaginário no centro da tela, 50 unidades para frente
        let targetDist = 50.0;
        let targetX = cameraX + (camDirX * targetDist);
        let targetY = cameraY + (camDirY * targetDist);
        let targetZ = cameraZ + (camDirZ * targetDist);

        // 5. Calcula o vetor de Trajetória (do Spawn até o Alvo)
        let trajX = targetX - spawnX;
        let trajY = targetY - spawnY;
        let trajZ = targetZ - spawnZ;

        // 6. Normaliza o vetor da Trajetória (para a velocidade do tiro ser constante)
        let length = Math.sqrt(trajX*trajX + trajY*trajY + trajZ*trajZ);
        let projDirX = trajX / length;
        let projDirY = trajY / length;
        let projDirZ = trajZ / length;

        // Retorna o projétil usando a nova direção que cruza o centro da tela
        return new Projectile(spawnX, spawnY, spawnZ, projDirX, projDirY, projDirZ, 0.5);
    }

    update() {
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.damageAudioCooldown > 0) this.damageAudioCooldown--;
    }
}

function updateHUD(hp) {
    document.getElementById('hud-hp').innerText = hp;
}
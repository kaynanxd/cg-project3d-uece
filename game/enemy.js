class Enemy {
    static globalGrowlCooldown = 0;

    constructor(x, z, hp, speed, isBoss = false) {
        this.x = x;
        this.y = 0; 
        this.z = z;
        this.hp = hp;
        this.speed = speed;
        this.active = true;
        this.isBoss = isBoss;
        this.radius = isBoss ? 3 : 1.5; 
        this.damage = isBoss ? 20 : 10;
        this.attackCooldown = 0;
        this.flashFrames = 0; 
        this.isDying = false; 
        
        this.yaw = 0; 

        // NOVO: Offset aleatório e timer para que cada inimigo oscile em um ritmo único
        this.wobbleTimer = Math.random() * 100;
        this.wobbleSpeed = 0.05 + Math.random() * 0.03; // Velocidade da oscilação
    }

    update(playerX, playerZ, playerObj) {
        if (!this.active) return;

        if (this.isDying) {
            if (this.flashFrames > 0) {
                this.flashFrames--;
            } else {
                this.active = false; 
            }
            return; 
        }

        let dx = playerX - this.x;
        let dz = playerZ - this.z;
        let distance = Math.sqrt(dx * dx + dz * dz);

        this.yaw = Math.atan2(dx, dz);

        // Sistema de Grunhido Estrito
        if (distance < 30) {
            if (Enemy.globalGrowlCooldown <= 0) {
                AudioManager.play("enemy_growl", 0.3);
                Enemy.globalGrowlCooldown = 240; 
            }
        }

        // NOVO: Atualiza o timer de oscilação do inimigo
        this.wobbleTimer += this.wobbleSpeed;

        if (distance > 1.0) {
            // Direção base em linha reta até o jogador
            let dirX = dx / distance;
            let dirZ = dz / distance;

            // NOVO: Calcula o vetor perpendicular (direita/esquerda do inimigo)
            // Se a direção para frente é (dirX, dirZ), o lado perpendicular é (-dirZ, dirX)
            let sideX = -dirZ;
            let sideZ = dirX;

            // NOVO: Intensidade do desvio lateral (amplitude)
            // Inimigos normais balançam um pouco mais rápido, Boss desvia menos por ser pesado
            let sideAmplitude = this.isBoss ? 0.02 : 0.04;
            let lateralWobble = Math.sin(this.wobbleTimer) * sideAmplitude;

            // Aplica o movimento: Linha reta + desvio senoidal para os lados
            this.x += (dirX * this.speed) + (sideX * lateralWobble);
            this.z += (dirZ * this.speed) + (sideZ * lateralWobble);

            // NOVO: Flutuação suave para cima e para baixo (Eixo Y)
            let hoverAmplitude = this.isBoss ? 0.15 : 0.25;
            this.y = Math.cos(this.wobbleTimer * 1.5) * hoverAmplitude;

        } else {
            // Se estiver colado no jogador, para de flutuar bizarramente e ataca
            this.y = 0; 
            if (this.attackCooldown <= 0) {
                playerObj.takeDamage(this.damage);
                this.attackCooldown = 60; 
            }
        }

        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.flashFrames > 0) this.flashFrames--;
    }

    takeDamage(amount) {
        if (!this.active || this.isDying) return;

        AudioManager.play("enemy_hit", 0.4);
        this.hp -= amount;
        this.flashFrames = 10; 

        if (this.hp <= 0) {
            this.isDying = true; 
            this.flashFrames = 15; 
            AudioManager.play("enemy_death", 0.6);
        }
    }
}
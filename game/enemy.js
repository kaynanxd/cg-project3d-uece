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
        this.isDying = false; // NOVO: Flag para saber se está na animação de morte
        
        this.yaw = 0; 
    }

    update(playerX, playerZ, playerObj) {
        if (!this.active) return;

        // NOVO: Gerencia o tempo de morte antes de desativar real
        if (this.isDying) {
            if (this.flashFrames > 0) {
                this.flashFrames--;
            } else {
                this.active = false; // Agora sim, sumir do jogo!
            }
            return; // Impede o inimigo de andar ou atacar enquanto morre
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

        if (distance > 1.0) {
            let dirX = dx / distance;
            let dirZ = dz / distance;
            this.x += dirX * this.speed;
            this.z += dirZ * this.speed;
        } else {
            if (this.attackCooldown <= 0) {
                playerObj.takeDamage(this.damage);
                this.attackCooldown = 60; 
            }
        }

        if (this.attackCooldown > 0) this.attackCooldown--;
        
        // Decrementa os frames do efeito de flash de dano normal
        if (this.flashFrames > 0) this.flashFrames--;
    }

    takeDamage(amount) {
        // Se já estiver inativo ou morrendo, ignora o dano
        if (!this.active || this.isDying) return;

        AudioManager.play("enemy_hit", 0.4);
        this.hp -= amount;
        this.flashFrames = 10; 

        if (this.hp <= 0) {
            this.isDying = true; // Em vez de falsear o active direto, avisa que está morrendo
            this.flashFrames = 15; // Dá uns frames a mais para piscar na morte
            AudioManager.play("enemy_death", 0.6);
        }
    }
}
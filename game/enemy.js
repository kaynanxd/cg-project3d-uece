// game/enemy.js
class Enemy {
    // Variável estática real que dita o tempo do jogo inteiro
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
        
        this.yaw = 0; 
    }

    update(playerX, playerZ, playerObj) {
        if (!this.active) return;

        let dx = playerX - this.x;
        let dz = playerZ - this.z;
        let distance = Math.sqrt(dx * dx + dz * dz);

        this.yaw = Math.atan2(dx, dz);

        // Sistema de Grunhido Estrito
        if (distance < 30) {
            // Se o cooldown global for 0, SIGNIFICA QUE NINGUÉM TOCOU SOM RECENTEMENTE
            if (Enemy.globalGrowlCooldown <= 0) {
                AudioManager.play("enemy_growl", 0.3);
                
                // Bloqueia QUALQUER som de grunhido nos próximos X segundos.
                // 60 frames = 1 segundo. Mude para 300 se quiser 5 segundos de silêncio absoluto.
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
        // REMOVIDO DAQUI: O decremento do globalGrowlCooldown e do individual!
    }

    takeDamage(amount) {
        if (!this.active) return;

        AudioManager.play("enemy_hit", 0.4);
        this.hp -= amount;

        if (this.hp <= 0) {
            this.active = false;
            AudioManager.play("enemy_death", 0.6);
        }
    }
}
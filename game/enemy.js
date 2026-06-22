// game/enemy.js
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
        this.flashFrames = 0; // NOVO: Controla a duração do piscar de dano
        
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
        
        // NOVO: Decrementa os frames do efeito de flash de dano
        if (this.flashFrames > 0) this.flashFrames--;
    }

    takeDamage(amount) {
        if (!this.active) return;

        AudioManager.play("enemy_hit", 0.4);
        this.hp -= amount;
        this.flashFrames = 10; // NOVO: Pisca por 10 frames (~0.16 segundos)

        if (this.hp <= 0) {
            this.active = false;
            AudioManager.play("enemy_death", 0.6);
        }
    }
}
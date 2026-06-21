// game/enemy.js
class Enemy {
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
        
        this.yaw = 0; // NOVO: Guarda a rotação do inimigo
    }

    update(playerX, playerZ, playerObj) {
        if (!this.active) return;

        let dx = playerX - this.x;
        let dz = playerZ - this.z;
        let distance = Math.sqrt(dx * dx + dz * dz);

        // NOVO: Calcula para onde o inimigo deve olhar
        this.yaw = Math.atan2(dx, dz);

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
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) this.active = false;
    }
}
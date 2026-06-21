// game/projectile.js
class Projectile {
    constructor(x, y, z, dirX, dirY, dirZ, speed) { // <-- dirY adicionado aqui
        this.x = x;
        this.y = y;
        this.z = z;
        this.dirX = dirX;
        this.dirY = dirY; // <-- Nova variável
        this.dirZ = dirZ;
        this.speed = speed;
        this.active = true;
        this.damage = 50;
        this.lifeTime = 100; 
    }

    update() {
        if (!this.active) return;
        this.x += this.dirX * this.speed;
        this.y += this.dirY * this.speed; // <-- Agora ele voa no eixo Y
        this.z += this.dirZ * this.speed;
        
        this.lifeTime--;
        if (this.lifeTime <= 0) this.active = false;
    }
}
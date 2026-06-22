// game/projectile.js
class Projectile {
    constructor(x, y, z, dirX, dirY, dirZ, speed, damage = 50, piercingLevel = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.dirX = dirX;
        this.dirY = dirY;
        this.dirZ = dirZ;
        this.speed = speed;
        this.active = true;
        this.damage = damage;
        this.piercingLeft = piercingLevel;
        this.lifeTime = 100;
    }

    update() {
        if (!this.active) return;
        this.x += this.dirX * this.speed;
        this.y += this.dirY * this.speed; 
        this.z += this.dirZ * this.speed;
        
        this.lifeTime--;
        if (this.lifeTime <= 0) this.active = false;
    }
}
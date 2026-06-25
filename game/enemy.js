class Enemy {
    static globalGrowlCooldown = 0;

    constructor(x, z, hp, speed, isBoss = false, meshType = 1) {
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
        this.meshType = meshType;
        this.scoreValue = isBoss ? 500 : 100;
        this.wobbleTimer = Math.random() * 100;
        this.wobbleSpeed = 0.05 + Math.random() * 0.03;
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

        if (distance < 30) {
            if (Enemy.globalGrowlCooldown <= 0) {
                AudioManager.play("enemy_growl", 0.3);
                Enemy.globalGrowlCooldown = 240; 
            }
        }

        this.wobbleTimer += this.wobbleSpeed;

    let attackRange = this.radius + 0.5;

        if (distance > attackRange) {
            let dirX = dx / distance;
            let dirZ = dz / distance;


            let lookAheadDist = this.radius + 1.2; 
            let checkX = this.x + dirX * lookAheadDist;
            let checkZ = this.z + dirZ * lookAheadDist;

            if (isWallBlocking(checkX, checkZ, this.radius)) {
                let sideX = -dirZ;
                let sideZ = dirX;

                let leftFree = !isWallBlocking(this.x + sideX * 1.5, this.z + sideZ * 1.5, this.radius);
                
                let avoidanceForce = 0.8;
                if (!leftFree) {
                    avoidanceForce = -0.8;
                }

                dirX += sideX * avoidanceForce;
                dirZ += sideZ * avoidanceForce;

                let newLen = Math.sqrt(dirX * dirX + dirZ * dirZ);
                if (newLen > 0) {
                    dirX /= newLen;
                    dirZ /= newLen;
                }
            }

            let sideX = -dirZ;
            let sideZ = dirX;
            let sideAmplitude = this.isBoss ? 0.02 : 0.04;
            let lateralWobble = Math.sin(this.wobbleTimer) * sideAmplitude;

            this.x += (dirX * this.speed) + (sideX * lateralWobble);
            this.z += (dirZ * this.speed) + (sideZ * lateralWobble);

            let hoverAmplitude = this.isBoss ? 0.15 : 0.25;
            this.y = Math.cos(this.wobbleTimer * 1.5) * hoverAmplitude;

        } else {
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
            if (typeof currentScore !== 'undefined') {
                currentScore += this.scoreValue;
                const scoreElement = document.getElementById('hud-score');
                if (scoreElement) scoreElement.innerText = currentScore;
            }
        }


    }
}
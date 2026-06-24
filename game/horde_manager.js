class HordeManager {
    constructor(config) {
        this.config = config;
        this.currentHorde = 1;
        this.enemiesToSpawn = config.baseEnemies;
        this.isBossWave = false;
        
        document.getElementById('wave-total').innerText = config.hordeCount;
    }

    _clampInsideArena(x, z, radius) {
        if (typeof TILE_SIZE === 'undefined' || typeof levelMap === 'undefined') return {x, z};
        const half = TILE_SIZE / 2;
        const margin = 1.0;
        const minX = 1 * TILE_SIZE - half + margin + radius;
        const maxX = (levelMap[0].length - 2) * TILE_SIZE + half - margin - radius;
        const minZ = 1 * TILE_SIZE - half + margin + radius;
        const maxZ = (levelMap.length - 2) * TILE_SIZE + half - margin - radius;
        return {
            x: Math.max(minX, Math.min(maxX, x)),
            z: Math.max(minZ, Math.min(maxZ, z))
        };
    }

    spawnHorde(playerX = 0, playerZ = 0) {
        let spawnList = [];
        document.getElementById('wave-count').innerText = this.currentHorde;

        if (this.currentHorde > this.config.hordeCount) {
            this.isBossWave = true;
            document.getElementById('hud-wave').innerHTML = "Horda: <span style='color:red'>BOSS!</span>";
            
            let bossSpeed = this.config.bossSpeed || (this.config.enemySpeed * 1.5);
            let bossPos = this._clampInsideArena(playerX, playerZ - 20, 3.0);
            spawnList.push(new Enemy(bossPos.x, bossPos.z, this.config.bossHp, bossSpeed, true));
            return spawnList;
        }

        for (let i = 0; i < this.enemiesToSpawn; i++) {
            let angle = Math.random() * Math.PI * 2;
            let distance = 30 + Math.random() * 15;
            let x = playerX + Math.cos(angle) * distance;
            let z = playerZ + Math.sin(angle) * distance;
            let clamped = this._clampInsideArena(x, z, 1.5);
            
            let assignedMeshType = (i % 2 === 0) ? 1 : 2;

            spawnList.push(new Enemy(clamped.x, clamped.z, this.config.enemyHp, this.config.enemySpeed, false, assignedMeshType));
        }

        this.enemiesToSpawn += 5; 
        return spawnList;
    }

    checkProgress(livingEnemiesCount) {
        if (livingEnemiesCount === 0) {
            if (this.isBossWave) {
                return "VICTORY";
            } else {
                this.currentHorde++;
                return "NEXT_HORDE";
            }
        }
        return "PLAYING";
    }
}
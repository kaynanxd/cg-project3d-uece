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
        
        if (this.config.hordeCount === Infinity) {
            document.getElementById('hud-wave').innerHTML = "Horda Infinitas: <span style='color:#ffcc00'>" + this.currentHorde + "</span>";
        } else {
            document.getElementById('wave-count').innerText = this.currentHorde;
        }

        // Lógica para o modo normal
        if (this.currentHorde > this.config.hordeCount) {
            this.isBossWave = true;
            document.getElementById('hud-wave').innerHTML = "Horda: <span style='color:red'>BOSS!</span>";
            
            let bossSpeed = this.config.bossSpeed || (this.config.enemySpeed * 1.2);
            let bossPos = this._clampInsideArena(playerX, playerZ - 20, 3.0);
            spawnList.push(new Enemy(bossPos.x, bossPos.z, this.config.bossHp, bossSpeed, true));
            return spawnList;
        }

        //CÁLCULO DE ESCALONAMENTO DO MODO SOBREVIVÊNCIA 
        // A cada onda que passa, adicionamos +10% de HP
        let scalingMultiplier = 1 + (this.currentHorde - 1) * 0.10;
        let currentHp = this.config.enemyHp * scalingMultiplier;
        let currentSpeed = this.config.enemySpeed; 

        // Se for uma horda múltipla de 5 no modo sobrevivência, vira uma RODADA DE BOSS isolada!
        let isSurvivalBossWave = (this.config.hordeCount === Infinity && this.currentHorde % 5 === 0);

        if (isSurvivalBossWave) {
            document.getElementById('hud-wave').innerHTML = "Horda " + this.currentHorde + ": <span style='color:red; font-weight:bold;'>BOSS!</span>";
            
            let bossPos = this._clampInsideArena(playerX, playerZ - 15, 3.0);
            // Spawna APENAS o boss nesta horda (com a vida escalada com base nos 10%)
            spawnList.push(new Enemy(bossPos.x, bossPos.z, 1500 * scalingMultiplier, currentSpeed * 1.1, true));
            
        } else {
            // Se NÃO for horda de boss, spawna a horda de inimigos normais dividida em 50/50
            for (let i = 0; i < this.enemiesToSpawn; i++) {
                let angle = Math.random() * Math.PI * 2;
                let distance = 30 + Math.random() * 15;
                let x = playerX + Math.cos(angle) * distance;
                let z = playerZ + Math.sin(angle) * distance;
                let clamped = this._clampInsideArena(x, z, 1.5);
                
                let assignedMeshType = (i % 2 === 0) ? 1 : 2;

                spawnList.push(new Enemy(clamped.x, clamped.z, currentHp, currentSpeed, false, assignedMeshType));
            }
            
            if (typeof isSurvivalMode !== 'undefined' && isSurvivalMode) {
                this.enemiesToSpawn += 2; 
            } else {
                this.enemiesToSpawn += 4; 
            }
        
        }

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
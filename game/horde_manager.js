// game/horde_manager.js
class HordeManager {
    constructor(config) {
        this.config = config;
        this.currentHorde = 1;
        this.enemiesToSpawn = config.baseEnemies;
        this.isBossWave = false;
        
        document.getElementById('wave-total').innerText = config.hordeCount;
    }

    spawnHorde() {
        let spawnList = [];
        document.getElementById('wave-count').innerText = this.currentHorde;

        if (this.currentHorde > this.config.hordeCount) {
            this.isBossWave = true;
            document.getElementById('hud-wave').innerHTML = "Horda: <span style='color:red'>BOSS!</span>";
            // Spawna o Boss um pouco longe do centro
            spawnList.push(new Enemy(0, -15, this.config.bossHp, this.config.enemySpeed * 0.8, true));
            return spawnList;
        }

        // Spawna inimigos normais em posições aleatórias num raio
        for (let i = 0; i < this.enemiesToSpawn; i++) {
            let angle = Math.random() * Math.PI * 2;
            let distance = 10 + Math.random() * 10;
            let x = Math.cos(angle) * distance;
            let z = Math.sin(angle) * distance;
            spawnList.push(new Enemy(x, z, this.config.enemyHp, this.config.enemySpeed, false));
        }

        this.enemiesToSpawn += 5; // Aumenta dificuldade da próxima horda
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
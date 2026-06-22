// game/horde_manager.js

class HordeManager {
    constructor(config) {
        this.config = config;
        this.currentHorde = 1;
        this.enemiesToSpawn = config.baseEnemies;
        this.isBossWave = false;
        
        document.getElementById('wave-total').innerText = config.hordeCount;
    }

    // MODIFICADO: Agora recebe a posição do jogador para criar o círculo ao redor dele
    spawnHorde(playerX = 0, playerZ = 0) {
        let spawnList = [];
        document.getElementById('wave-count').innerText = this.currentHorde;

        if (this.currentHorde > this.config.hordeCount) {
            this.isBossWave = true;
            document.getElementById('hud-wave').innerHTML = "Horda: <span style='color:red'>BOSS!</span>";
            
            // O Boss pode continuar nascendo em um ponto fixo distante ou relativo ao jogador
            let bossSpeed = this.config.bossSpeed || (this.config.enemySpeed * 1.5);
            spawnList.push(new Enemy(playerX, playerZ - 20, this.config.bossHp, bossSpeed, true));
            return spawnList;
        }

        // Spawna inimigos normais em um raio ao redor do JOGADOR
        for (let i = 0; i < this.enemiesToSpawn; i++) {
            // Escolhe um ângulo aleatório (0 a 360 graus)
            let angle = Math.random() * Math.PI * 2;
            
            // Aumentamos o raio: nascem entre 20 e 35 unidades de distância do jogador
            // Isso evita que o jogador veja eles surgindo do nada (pop-in) na tela
            let distance = 30 + Math.random() * 15;
            
            // Calcula a posição relativa ao redor do jogador
            let x = playerX + Math.cos(angle) * distance;
            let z = playerZ + Math.sin(angle) * distance;
            
            spawnList.push(new Enemy(x, z, this.config.enemyHp, this.config.enemySpeed, false));
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
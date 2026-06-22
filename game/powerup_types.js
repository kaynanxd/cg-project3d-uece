const POWERUP_TYPES = [
    {
        id: 'maxHp',
        name: '+25 Max HP',
        desc: 'Aumenta a vida máxima em 25',
        color: '#ff3333',
        apply: (player) => {
            player.maxHp += 25;
            player.hp = Math.min(player.hp + 25, player.maxHp);
        }
    },
    {
        id: 'maxStamina',
        name: '+25 Max Stamina',
        desc: 'Aumenta a stamina máxima em 25',
        color: '#33ff33',
        apply: (player) => {
            player.maxStamina += 25;
            player.stamina = Math.min(player.stamina + 25, player.maxStamina);
        }
    },
    {
        id: 'damage',
        name: '+DMG UP',
        desc: 'Adiciona +10% do dano base da arma',
        color: '#ff8800',
        apply: (player) => {
            player.damageMultiplier += 1;
        }
    },
    {
        id: 'extraLife',
        name: '+1 Extra Life',
        desc: 'Ganha uma vida extra ao morrer',
        color: '#3388ff',
        apply: (player) => {
            player.extraLives += 1;
        }
    },
    {
        id: 'piercing',
        name: 'Piercing Shot',
        desc: 'Balas atravessam inimigos',
        color: '#ff33ff',
        apply: (player) => {
            player.piercingLevel += 1;
        }
    }
];

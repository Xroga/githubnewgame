on
{
  "html": "<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XROGA Platformer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #111; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
        canvas { display: block; background: #1a1a2e; border: 2px solid #e94560; box-shadow: 0 0 30px rgba(233, 69, 96, 0.3); }
    </style>
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const GRAVITY = 0.6;
        const JUMP_FORCE = -12;
        const PLAYER_SPEED = 5;
        const BULLET_SPEED = 10;
        const ENEMY_SPEED_BASE = 1.5;

        const keys = {};

        const STATE = { START: 'START', PLAYING: 'PLAYING', LEVEL_COMPLETE: 'LEVEL_COMPLETE', GAME_OVER: 'GAME_OVER', WIN: 'WIN' };
        let gameState = STATE.START;
        let currentLevel = 0;
        let score = 0;
        let lives = 3;
        let levelTransitionTimer = 0;
        let particles = [];
        let screenShake = { x: 0, y: 0, intensity: 0 };

        const levels = [
            {
                platforms: [
                    { x: 0, y: canvas.height - 40, w: canvas.width, h: 40 },
                    { x: 200, y: canvas.height - 140, w: 200, h: 20 },
                    { x: 500, y: canvas.height - 240, w: 200, h: 20 }
                ],
                enemies: [
                    { x: 300, y: canvas.height - 80, w: 30, h: 30, patrolMin: 250, patrolMax: 450, speed: 1.0 }
                ],
                playerStart: { x: 100, y: canvas.height - 80 }
            },
            {
                platforms: [
                    { x: 0, y: canvas.height - 40, w: canvas.width, h: 40 },
                    { x: 150, y: canvas.height - 150, w: 150, h: 20 },
                    { x: 400, y: canvas.height - 200, w: 150, h: 20 },
                    { x: 650, y: canvas.height - 130, w: 150, h: 20 }
                ],
                enemies: [
                    { x: 250, y: canvas.height - 80, w: 30, h: 30, patrolMin: 200, patrolMax: 400, speed: 1.3 },
                    { x: 500, y: canvas.height - 80, w: 30, h: 30, patrolMin: 450, patrolMax: 650, speed: 1.3 }
                ],
                playerStart: { x: 80, y: canvas.height - 80 }
            },
            {
                platforms: [
                    { x: 0, y: canvas.height - 40, w: canvas.width, h: 40 },
                    { x: 100, y: canvas.height - 180, w: 120, h: 20 },
                    { x: 350, y: canvas.height - 250, w: 120, h: 20 },
                    { x: 600, y: canvas.height - 180, w: 120, h: 20 },
                    { x: 800, y: canvas.height - 120, w: 120, h: 20 }
                ],
                enemies: [
                    { x: 200, y: canvas.height - 80, w: 30, h: 30, patrolMin: 150, patrolMax: 350, speed: 1.6 },
                    { x: 450, y: canvas.height - 80, w: 30, h: 30, patrolMin: 400, patrolMax: 600, speed: 1.6 },
                    { x: 700, y: canvas.height - 80, w: 30, h: 30, patrolMin: 650, patrolMax: 850, speed: 1.6 }
                ],
                playerStart: { x: 60, y: canvas.height - 80 }
            },
            {
                platforms: [
                    { x: 0, y: canvas.height - 40, w: canvas.width, h: 40 },
                    { x: 80, y: canvas.height - 200, w: 100, h: 20 },
                    { x: 280, y: canvas.height - 280, w: 100, h: 20 },
                    { x: 480, y: canvas.height - 200, w: 100, h: 20 },
                    { x: 680, y: canvas.height - 280, w: 100, h: 20 },
                    { x: 880, y: canvas.height - 150, w: 100, h: 20 }
                ],
                enemies: [
                    { x: 150, y: canvas.height - 80, w: 30, h: 30, patrolMin: 100, patrolMax: 300, speed: 1.8 },
                    { x: 380, y: canvas.height - 80, w: 30, h: 30, patrolMin: 330, patrolMax: 530, speed: 1.8 },
                    { x: 580, y: canvas.height - 80, w: 30, h: 30, patrolMin: 530, patrolMax: 730, speed: 1.8 },
                    { x: 800, y: canvas.height - 80, w: 30, h: 30, patrolMin: 750, patrolMax: 950, speed: 1.8 }
                ],
                playerStart: { x: 50, y: canvas.height - 80 }
            },
            {
                platforms: [
                    { x: 0, y: canvas.height - 40, w: canvas.width, h: 40 },
                    { x: 200, y: canvas.height - 160, w: 200, h: 20 },
                    { x: 500, y: canvas.height - 220, w: 200, h: 20 },
                    { x: 800, y: canvas.height - 160, w: 200, h: 20 }
                ],
                enemies: [
                    { x: 400, y: canvas.height - 100, w: 60, h: 60, patrolMin: 200, patrolMax: 700, speed: 2.0, isBoss: true, hp: 10 }
                ],
                playerStart: { x: 100, y: canvas.height - 80 }
            }
        ];

        let player = {
            x: 100, y: canvas.height - 80, w: 30, h: 40, vx: 0, vy: 0, onGround: false, facing: 1, bullets: [], invincible: 0, spacePressed: false
        };

        let enemies = [];

        function createExplosion(x, y, color, count) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 4 + 1;
                particles.push({
                    x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    life: 30 + Math.random() * 20, maxLife: 50, size: Math.random() * 4 + 2, color: color
                });
            }
        }

        function triggerShake(intensity) {
            screenShake.intensity = intensity;
        }

        function initLevel(levelIndex) {
            const level = levels[levelIndex];
            if (!level) return;
            player.x = level.playerStart.x;
            player.y = level.playerStart.y;
            player.vx = 0;
            player.vy = 0;
            player.onGround = false;
            player.bullets = [];
            player.invincible = 0;
            enemies = level.enemies.map(e => ({
                x: e.x, y: e.y, w: e.w, h: e.h, vx: e.speed, patrolMin: e.patrolMin, patrolMax: e.patrolMax,
                speed: e.speed, isBoss: e.isBoss || false, hp: e.hp || 1, alive: true
            }));
        }

        function rectCollide(a, b) {
            return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        }

        function update(dt) {
            for (let p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1;
                p.life--;
            }
            particles = particles.filter(p => p.life > 0);

            if (screenShake.intensity > 0) {
                screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
                screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
                screenShake.intensity *= 0.9;
                if (screenShake.intensity < 0.5) {
                    screenShake.intensity = 0;
                    screenShake.x = 0;
                    screenShake.y = 0;
                }
            }

            if (gameState === STATE.START) {
                if (keys['Enter']) {
                    gameState = STATE.PLAYING;
                    currentLevel = 0;
                    score = 0;
                    lives = 3;
                    initLevel(0);
                }
                return;
            }

            if (gameState === STATE.LEVEL_COMPLETE) {
                levelTransitionTimer--;
                if (levelTransitionTimer <= 0) {
                    currentLevel++;
                    if (currentLevel >= levels.length) {
                        gameState = STATE.WIN;
                    } else {
                        initLevel(currentLevel);
                        gameState = STATE.PLAYING;
                    }
                }
                return;
            }

            if (gameState === STATE.GAME_OVER || gameState === STATE.WIN) {
                if (keys['Enter']) {
                    gameState = STATE.START;
                }
                return;
            }

            const level = levels[currentLevel];
            if (!level) return;

            if (player.invincible > 0) player.invincible--;

            if (keys['ArrowLeft'] || keys['KeyA']) {
                player.vx = -PLAYER_SPEED;
                player.facing = -1;
            } else if (keys['ArrowRight'] || keys['KeyD']) {
                player.vx = PLAYER_SPEED;
                player.facing = 1;
            } else {
                player.vx = 0;
            }

            if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && player.onGround) {
                player.vy = JUMP_FORCE;
                player.onGround = false;
            }

            player.vy += GRAVITY;
            player.x += player.vx * (dt / 16.67);
            player.y += player.vy * (dt / 16.67);

            player.onGround = false;
            for (let plat of level.platforms) {
                if (rectCollide(player, plat)) {
                    const overlapX = Math.min(player.x + player.w, plat.x + plat.w) - Math.max(player.x, plat.x);
                    const overlapY = Math.min(player.y + player.h, plat.y + plat.h) - Math.max(player.y, plat.y);
                    if (overlapX < overlapY) {
                        if (player.vx > 0) player.x = plat.x - player.w;
                        else if (player.vx < 0) player.x = plat.x + plat.w;
                        player.vx = 0;
                    } else {
                        if (player.vy > 0) {
                            player.y = plat.y - player.h;
                            player.vy = 0;
                            player.onGround = true;
                        } else if (player.vy < 0) {
                            player.y = plat.y + plat.h;
                            player.vy = 0;
                        }
                    }
                }
            }

            if (player.x < 0) player.x = 0;
            if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
            if (player.y + player.h > canvas.height) {
                player.y = canvas.height - player.h;
                player.vy = 0;
                player.onGround = true;
            }

            if (keys['Space'] && player.onGround) {
                if (!player.spacePressed) {
                    player.bullets.push({
                        x: player.x + player.w / 2, y: player.y + player.h / 2,
                        vx: BULLET_SPEED * player.facing, vy: 0, w: 8, h: 4, alive: true, ttl: 60
                    });
                    player.spacePressed = true;
                }
            } else {
                player.spacePressed = false;
            }

            for (let bullet of player.bullets) {
                if (!bullet.alive) continue;
                bullet.x += bullet.vx * (dt / 16.67);
                bullet.y += bullet.vy * (dt / 16.67);
                bullet.ttl--;
                if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height || bullet.ttl <= 0) {
                    bullet.alive = false;
                }
            }
            player.bullets = player.bullets.filter(b => b.alive);

            for (let enemy of enemies) {
                if (!enemy.alive) continue;
                enemy.x += enemy.vx * (dt / 16.67);
                if (enemy.x <= enemy.patrolMin || enemy.x + enemy.w >= enemy.patrolMax) {
                    enemy.vx *= -1;
                }
            }

            for (let bullet of player.bullets) {
                if (!bullet.alive) continue;
                for (let enemy of enemies) {
                    if (!enemy.alive) continue;
                    if (rectCollide(bullet, enemy)) {
                        bullet.alive = false;
                        enemy.hp--;
                        if (enemy.hp <= 0) {
                            enemy.alive = false;
                            score += enemy.isBoss ? 1000 : 100;
                            createExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.isBoss ? '#ff4444' : '#ffaa00', enemy.isBoss ? 30 : 15);
                            triggerShake(enemy.isBoss ? 15 : 5);
                        } else {
                            createExplosion(bullet.x, bullet.y, '#ffff00', 5);
                            triggerShake(3);
                        }
                        break;
                    }
                }
            }

            for (let enemy of enemies) {
                if (!enemy.alive) continue;
                if (rectCollide(player, enemy) && player.invincible <= 0) {
                    lives--;
                    player.invincible = 60;
                    triggerShake(10);
                    createExplosion(player.x + player.w / 2, player.y + player.h / 2, '#ff0000', 10);
                    if (lives <= 0) {
                        gameState = STATE.GAME_OVER;
                    } else {
                        initLevel(currentLevel);
                    }
                    break;
                }
            }

            const aliveEnemies = enemies.filter(e => e.alive);
            if (aliveEnemies.length === 0) {
                gameState = STATE.LEVEL_COMPLETE;
                levelTransitionTimer = 60;
            }
        }

        function draw() {
            ctx.save();
            ctx.translate(screenShake.x, screenShake.y);

            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (gameState === STATE.START) {
                ctx.fillStyle = '#e94560';
                ctx.font = '48px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('XROGA PLATFORMER', canvas.width / 2, canvas.height / 2 - 60);
                ctx.fillStyle = '#fff';
                ctx.font = '24px monospace';
                ctx.fillText('Press ENTER to Start', canvas.width / 2, canvas.height / 2 + 20);
                ctx.fillStyle = '#aaa';
                ctx.font = '16px monospace';
                ctx.fillText('Arrow Keys / WASD to move, Space to jump & shoot', canvas.width / 2, canvas.height / 2 + 70);
                ctx.restore();
                return;
            }

            if (gameState === STATE.GAME_OVER) {
                ctx.fillStyle = '#e94560';
                ctx.font = '48px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
                ctx.fillStyle = '#fff';
                ctx.font = '24px monospace';
                ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
                ctx.fillText('Press ENTER to Restart', canvas.width / 2, canvas.height / 2 + 70);
                ctx.restore();
                return;
            }

            if (gameState === STATE.WIN) {
                ctx.fillStyle = '#ffd700';
                ctx.font = '48px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2 - 40);
                ctx.fillStyle = '#fff';
                ctx.font = '24px monospace';
                ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
                ctx.fillText('Press ENTER to Play Again', canvas.width / 2, canvas.height / 2 + 70);
                ctx.restore();
                return;
            }

            if (gameState === STATE.LEVEL_COMPLETE) {
                ctx.fillStyle = '#0f0';
                ctx.font = '36px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('Level ' + (currentLevel + 1) + ' Complete!', canvas.width / 2, canvas.height / 2);
                ctx.restore();
                return;
            }

            const level = levels[currentLevel];

            for (let plat of level.platforms) {
                ctx.fillStyle = '#4a4a6a';
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = '#6a6a8a';
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
            }

            for (let enemy of enemies) {
                if (!enemy.alive) continue;
                ctx.fillStyle = enemy.isBoss ? '#ff4444' : '#ff6600';
                ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
                ctx.strokeStyle = '#fff';
                ctx.strokeRect(enemy.x, enemy.y, enemy.w, enemy.h);
                if (enemy.isBoss) {
                    ctx.fillStyle = '#fff';
                    ctx.font = '12px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('HP: ' + enemy.hp, enemy.x + enemy.w / 2, enemy.y - 5);
                }
            }

            ctx.fillStyle = player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0 ? '#ff6666' : '#00ff88';
            ctx.fillRect(player.x, player.y, player.w, player.h);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(player.x, player.y, player.w, player.h);

            for (let bullet of player.bullets) {
                if (!bullet.alive) continue;
                ctx.fillStyle = '#ffff00';
                ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
            }

            for (let p of particles) {
                const alpha = p.life / p.maxLife;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }
            ctx.globalAlpha = 1;

            ctx.fillStyle = '#fff';
            ctx.font = '18px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('Score: ' + score, 10, 30);
            ctx.fillText('Lives: ' + lives, 10, 55);
            ctx.fillText('Level: ' + (currentLevel + 1), 10, 80);

            ctx.restore();
        }

        function gameLoop(timestamp) {
            const dt = timestamp - (lastTimestamp || timestamp);
            lastTimestamp = timestamp;
            update(dt);
            draw();
            requestAnimationFrame(gameLoop);
        }

        let lastTimestamp = 0;

        document.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            if (e.code === 'Space') e.preventDefault();
        });
        document.addEventListener('keyup', (e) => {
            keys[e.code] = false;
        });

        initLevel(0);
        requestAnimationFrame(gameLoop);
    </script>
</body>
</html>",
  "css": "",
  "js": ""
}
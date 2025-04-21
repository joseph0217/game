// 캔버스 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 캔버스 크기 설정
canvas.width = 800;
canvas.height = 600;

// 플레이어 설정
const player = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 30,
    height: 30,
    speed: 5,
    shooting: false,
    direction: { x: 0, y: -1 }, // 기본적으로 위쪽을 바라봄
    ammo: 6, // 현재 탄약
    maxAmmo: 6, // 최대 탄약
    lastShotTime: Date.now(), // 마지막 발사 시간
    reloading: false, // 재장전 중인지 여부
    reloadDots: 0 // 재장전 애니메이션 점 개수
};

// 탄막 배열
let bullets = [];
let enemyBullets = [];

// 적 설정
const enemy = {
    x: canvas.width / 2,
    y: 50,
    width: 40,
    height: 40,
    health: 60,
    pattern: 0,
    patternTimer: 0,
    reviving: false,
    fireColumn: [],
    fireAngle: 0
};

// 키 입력 처리
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key.toLowerCase() === 'r' && player.ammo < player.maxAmmo && !player.reloading) {
        player.reloading = true;
        player.reloadDots = 0;
        const reloadInterval = setInterval(() => {
            player.reloadDots++;
            if (player.reloadDots >= 3) {
                player.ammo = player.maxAmmo;
                player.reloading = false;
                player.reloadDots = 0;
                clearInterval(reloadInterval);
            }
        }, 200);
    }
});
document.addEventListener('keyup', (e) => keys[e.key] = false);

// 플레이어 이동
function movePlayer() {
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
        player.direction = { x: -1, y: 0 };
    }
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
        player.x += player.speed;
        player.direction = { x: 1, y: 0 };
    }
    if (keys['ArrowUp'] && player.y > 0) {
        player.y -= player.speed;
        player.direction = { x: 0, y: -1 };
    }
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) {
        player.y += player.speed;
        player.direction = { x: 0, y: 1 };
    }
    if (keys['z']) player.shooting = true;
    else player.shooting = false;
}

// 플레이어 탄환 생성
function createPlayerBullet() {
    const currentTime = Date.now();
    if (player.shooting && !player.reloading && player.ammo > 0 && 
        currentTime - player.lastShotTime >= 250) { // 0.25초 딜레이
        bullets.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            radius: 5,
            speed: 7,
            dx: player.direction.x * 7,
            dy: player.direction.y * 7,
            color: '#00ffff'
        });
        player.ammo--;
        player.lastShotTime = currentTime;
        player.shooting = false;
    }
}

// 적 탄막 패턴
function createEnemyBullets() {
    enemy.patternTimer++;
    
    if (!enemy.reviving) {
        if (enemy.patternTimer % 30 === 0) {
            // 원형 탄막 패턴
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 / 12) * i;
                enemyBullets.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height / 2,
                    radius: 4,
                    speed: 3,
                    dx: Math.cos(angle) * 3,
                    dy: Math.sin(angle) * 3,
                    color: '#ff0000'
                });
            }
        }
    } else {
        // 불기둥 패턴
        enemy.fireAngle += 0.1;
        const radius = 50;
        for (let i = 0; i < 8; i++) {
            const angle = enemy.fireAngle + (Math.PI * 2 / 8) * i;
            enemyBullets.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                radius: 6,
                speed: 1,
                dx: Math.cos(angle) * 3,
                dy: Math.sin(angle) * 3,
                color: '#ffa500'
            });
        }
    }
}

// 탄환 업데이트
function updateBullets() {
    // 플레이어 탄환
    bullets = bullets.filter(bullet => {
        if (bullet.dx !== undefined && bullet.dy !== undefined) {
            bullet.x += bullet.dx;
            bullet.y += bullet.dy;
            return bullet.x > 0 && bullet.x < canvas.width && 
                   bullet.y > 0 && bullet.y < canvas.height;
        } else {
            bullet.y -= bullet.speed;
            return bullet.y > 0;
        }
    });

    // 적 탄환
    enemyBullets = enemyBullets.filter(bullet => {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;
        return bullet.x > 0 && bullet.x < canvas.width && 
               bullet.y > 0 && bullet.y < canvas.height;
    });
}

// 충돌 감지
function checkCollisions() {
    // 플레이어 탄환과 적 충돌
    bullets.forEach((bullet, index) => {
        if (bullet.x > enemy.x && bullet.x < enemy.x + enemy.width &&
            bullet.y > enemy.y && bullet.y < enemy.y + enemy.height) {
            bullets.splice(index, 1);
            enemy.health -= 10;
            
            // 적의 체력이 0 이하가 되면 부활 패턴 시작
            if (enemy.health <= 0) {
                enemy.reviving = true;
                enemy.fireAngle = 0;
                // 화면 중앙으로 부드럽게 이동
                const moveToCenter = () => {
                    const targetX = canvas.width / 2 - enemy.width / 2;
                    const targetY = canvas.height / 2 - enemy.height / 2;
                    const dx = (targetX - enemy.x) * 0.1;
                    const dy = (targetY - enemy.y) * 0.1;
                    
                    enemy.x += dx;
                    enemy.y += dy;
                    
                    if (Math.abs(targetX - enemy.x) > 1 || Math.abs(targetY - enemy.y) > 1) {
                        requestAnimationFrame(moveToCenter);
                    } else {
                        enemy.x = targetX;
                        enemy.y = targetY;
                        setTimeout(() => {
                            enemy.reviving = false;
                            enemy.health = 500;
                            // 원래 위치로 이동
                            enemy.x = canvas.width / 2;
                            enemy.y = 50;
                        }, 2500);
                    }
                };
                moveToCenter();
            }
        }
    });

    // 적 탄환과 플레이어 충돌
    enemyBullets.forEach((bullet, index) => {
        const dx = (player.x + player.width / 2) - bullet.x;
        const dy = (player.y + player.height / 2) - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.width / 2 + bullet.radius) {
            // 게임 오버 로직 추가 예정
            console.log('Hit!');
        }
    });
}

// 그리기 함수
function draw() {
    // 화면 클리어
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 플레이어 그리기
    ctx.fillStyle = '#fff';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // 적 그리기
    ctx.fillStyle = '#f00';
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

    // 플레이어 탄환 그리기
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fillStyle = bullet.color;
        ctx.fill();
        ctx.closePath();
    });

    // 적 탄환 그리기
    enemyBullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fillStyle = bullet.color;
        ctx.fill();
        ctx.closePath();
    });

    // 적 체력 표시
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText(`Enemy HP: ${enemy.health}`, 10, 30);
    ctx.fillText(`Ammo: ${player.ammo}/${player.maxAmmo}${player.reloading ? ' (Reloading' + '.'.repeat(player.reloadDots) + ')' : ''}`, 10, 60);
}

// 게임 루프
function gameLoop() {
    movePlayer();
    createPlayerBullet();
    createEnemyBullets();
    updateBullets();
    checkCollisions();
    draw();
    requestAnimationFrame(gameLoop);
}

// 게임 시작
gameLoop();
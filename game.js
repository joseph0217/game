// 게임 상태 변수
let gameState = 'start'; // 'start', 'colorSelect', 'playing', 'gameOver'
let gameOver = false;
let startTime = Date.now();
let endTime = null;
let canUseInvincibility = true; // 무적 쿨타임 체크
let thirdPhase = false; // 3페이지 돌입 여부
let playerColor = '#ffffff'; // 플레이어 기본 색상
let restartTimer = null; // 재시작 타이머

// 이미지 로딩
const dungeonImage = new Image();
const endImage = new Image();
let dungeonImageLoaded = false;
let endImageLoaded = false;

dungeonImage.onload = function() {
    dungeonImageLoaded = true;
};
endImage.onload = function() {
    endImageLoaded = true;
};

dungeonImage.src = '던전.png';
endImage.src = '끝.png';

// 색상 선택 옵션
const colorOptions = [
    { name: '하늘색', value: '#00ffff' },
    { name: '빨간색', value: '#ff0000' },
    { name: '파란색', value: '#0000ff' },
    { name: '초록색', value: '#00ff00' },
    { name: '보라색', value: '#800080' }
];
let selectedColorIndex = 0;

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
    reloadDots: 0, // 재장전 애니메이션 점 개수
    invincible: false, // 무적 상태
    invincibleTimer: 0, // 무적 시간
    spaceInvincible: false, // 스페이스바 무적 상태
    spaceInvincibleTimer: 0, // 스페이스바 무적 시간
    flashToggle: false, // 깜빡임 효과
    health: 5, // 플레이어 체력
    maxHealth: 5, // 최대 체력
    lastHitTime: 0, // 마지막으로 피해를 입은 시간
    shotCount: 0, // 발사한 탄환 수 카운트
    healCount: 3 // 남은 회복 횟수
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
    // 시작 화면에서 Enter 키를 누르면 색상 선택 화면으로
    if (gameState === 'start' && e.key === 'Enter') {
        gameState = 'colorSelect';
        return;
    }

    // B키로 체력 회복
    if (gameState === 'playing' && e.key.toLowerCase() === 'b' && player.healCount > 0 && player.health < player.maxHealth) {
        player.health = Math.min(player.health + 3, player.maxHealth);
        player.healCount--;
    }

    // 색상 선택 화면에서의 키 입력 처리
    if (gameState === 'colorSelect') {
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            selectedColorIndex = (selectedColorIndex - 1 + colorOptions.length) % colorOptions.length;
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            selectedColorIndex = (selectedColorIndex + 1) % colorOptions.length;
        } else if (e.key === 'Enter') {
            playerColor = colorOptions[selectedColorIndex].value;
            gameState = 'playing';
            startTime = Date.now(); // 게임 시작 시간 초기화
        }
        return;
    }

    // 게임 오버 상태에서 Enter 키를 누르면 게임 재시작
    if (gameState === 'gameOver' && e.key === 'Enter') {
        gameState = 'playing';
        gameOver = false;
        player.health = player.maxHealth;
        player.healCount = 3;
        player.shotCount = 0;
        enemy.health = 60;
        enemy.reviving = false;
        bullets = [];
        enemyBullets = [];
        player.x = canvas.width / 2;
        player.y = canvas.height - 50;
        startTime = Date.now();
        return;
    }
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

    // 스페이스바로 무적 모드 활성화 (2페이지부터 + 쿨타임 체크)
    if (gameState === 'playing' && e.code === 'Space' && !player.spaceInvincible && canUseInvincibility && enemy.health > 60) {
        player.spaceInvincible = true;
        player.spaceInvincibleTimer = 90; // 1.5초 무적
        canUseInvincibility = false;

        // 쿨다운 타이머 시작
        setTimeout(() => {
            canUseInvincibility = true;
        }, 4500); // 무적 1.5초 + 쿨타임 3초 = 4.5초 후 다시 사용 가능
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
        player.shotCount++;
        const isSpecialBullet = player.shotCount % 6 === 0;
        const bulletDamage = enemy.health > 60 ? 20 : 10; // 2페이지에서 데미지 증가
        
        bullets.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            radius: isSpecialBullet ? 7 : 5,
            speed: 7,
            dx: player.direction.x * 7,
            dy: player.direction.y * 7,
            color: isSpecialBullet ? '#800080' : '#00ffff',
            damage: isSpecialBullet ? bulletDamage * 1.5 : bulletDamage
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
            enemy.health -= bullet.damage;
            
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
            if (!player.invincible && !player.spaceInvincible) {
                player.health--;
                player.invincible = true;
                player.invincibleTimer = 90;
                player.lastHitTime = Date.now();
                enemyBullets.splice(index, 1);

                if (player.health <= 0) {
                    gameOver = true;
                    gameState = 'gameOver';
                    endTime = Date.now();
                    restartTimer = null;
                }
            }
        }
    });
}

// 그리기 함수


function draw() {
    // 화면 클리어
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 게임 플레이 중일 때 던전 배경 표시
    if (gameState === 'playing' && dungeonImageLoaded) {
        ctx.drawImage(dungeonImage, 0, 0, canvas.width, canvas.height);
    }

    // 시작 화면
    if (gameState === 'start') {
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Start', canvas.width/2, canvas.height/2);
        ctx.font = '24px Arial';
        ctx.fillText('Press Enter to Start', canvas.width/2, canvas.height/2 + 50);
        return;
    }

    // 색상 선택 화면
    if (gameState === 'colorSelect') {
        ctx.fillStyle = '#fff';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Select Your Color', canvas.width/2, 150);

        colorOptions.forEach((color, index) => {
            ctx.fillStyle = index === selectedColorIndex ? '#fff' : '#666';
            ctx.font = '24px Arial';
            ctx.fillText(color.name, canvas.width/2, 250 + index * 40);
        });
        return;
    }

    // 게임 오버 화면
    if (gameState === 'gameOver' && endImageLoaded) {
        ctx.drawImage(endImage, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Re Start...?', canvas.width/2, canvas.height/2);
        ctx.font = '24px Arial';
        ctx.fillText('Press Enter to Restart', canvas.width/2, canvas.height/2 + 50);
        return;
    }

    // 플레이어 그리기 (무적 상태일 때 깜빡임 효과)
    if (player.invincible) {
        player.flashToggle = !player.flashToggle;
        ctx.fillStyle = player.flashToggle ? '#ffff00' : playerColor;
    } else {
        ctx.fillStyle = playerColor;
    }
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
    ctx.textAlign = 'left';
    ctx.fillText(`Enemy HP: ${enemy.health}`, 10, 30);
    ctx.fillText(`Ammo: ${player.ammo}/${player.maxAmmo}${player.reloading ? ' (Reloading' + '.'.repeat(player.reloadDots) + ')' : ''}`, 10, 60);

    // 무적 상태 표시
    if (player.invincible) {
        ctx.fillStyle = '#00ffff';
        ctx.textAlign = 'right';
        ctx.fillText('Invincibility Active', canvas.width - 20, 30);
    }

    // 플레이어 체력(하트) 그리기
    const heartSize = 20;
    const heartSpacing = 25;
    const heartY = 90;

    // 회복 아이템 하트 그리기
    const healHeartY = canvas.height - 40;
    for (let i = 0; i < player.healCount; i++) {
        const healHeartX = 10 + i * heartSpacing;
        
        ctx.beginPath();
        ctx.moveTo(healHeartX + heartSize/2, healHeartY + heartSize/4);
        
        ctx.bezierCurveTo(
            healHeartX + heartSize/2, healHeartY,
            healHeartX, healHeartY,
            healHeartX, healHeartY + heartSize/4
        );
        
        ctx.bezierCurveTo(
            healHeartX, healHeartY + heartSize/2,
            healHeartX + heartSize/2, healHeartY + heartSize,
            healHeartX + heartSize/2, healHeartY + heartSize
        );
        
        ctx.bezierCurveTo(
            healHeartX + heartSize/2, healHeartY + heartSize,
            healHeartX + heartSize, healHeartY + heartSize/2,
            healHeartX + heartSize, healHeartY + heartSize/4
        );
        
        ctx.bezierCurveTo(
            healHeartX + heartSize, healHeartY,
            healHeartX + heartSize/2, healHeartY,
            healHeartX + heartSize/2, healHeartY + heartSize/4
        );
        
        ctx.fillStyle = '#ff69b4';
        ctx.fill();
        ctx.closePath();
    }

    // B키 안내 텍스트
    if (player.healCount > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Press B to Heal', 10, canvas.height - 10);
    }
    
    for (let i = 0; i < player.maxHealth; i++) {
        const heartX = 10 + i * heartSpacing;
        const isFull = i < player.health;
        
        // 하트 그리기
        ctx.beginPath();
        ctx.moveTo(heartX + heartSize/2, heartY + heartSize/4);
        
        // 왼쪽 곡선
        ctx.bezierCurveTo(
            heartX + heartSize/2, heartY,
            heartX, heartY,
            heartX, heartY + heartSize/4
        );
        
        ctx.bezierCurveTo(
            heartX, heartY + heartSize/2,
            heartX + heartSize/2, heartY + heartSize,
            heartX + heartSize/2, heartY + heartSize
        );
        
        // 오른쪽 곡선
        ctx.bezierCurveTo(
            heartX + heartSize/2, heartY + heartSize,
            heartX + heartSize, heartY + heartSize/2,
            heartX + heartSize, heartY + heartSize/4
        );
        
        ctx.bezierCurveTo(
            heartX + heartSize, heartY,
            heartX + heartSize/2, heartY,
            heartX + heartSize/2, heartY + heartSize/4
        );
        
        ctx.fillStyle = isFull ? playerColor : '#4d0000';
        ctx.fill();
        ctx.closePath();
    }
}

// 게임 루프
function gameLoop() {
    if (gameState === 'playing') {
        movePlayer();
        createPlayerBullet();
        createEnemyBullets();
        updateBullets();
        checkCollisions();

        // 무적 타이머 업데이트
        if (player.invincible) {
            player.invincibleTimer--;
            if (player.invincibleTimer <= 0) {
                player.invincible = false;
            }
        }
        if (player.spaceInvincible) {
            player.spaceInvincibleTimer--;
            if (player.spaceInvincibleTimer <= 0) {
                player.spaceInvincible = false;
            }
        }
    }

    draw();
    requestAnimationFrame(gameLoop);
}

// 게임 시작
gameLoop();
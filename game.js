// 캔버스 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 캔버스 크기 설정
canvas.width = 800;
canvas.height = 600;

// 게임 상태 변수
let gameState = 'start'; // 'start', 'platformSelect', 'colorSelect', 'playing', 'gameOver'
let platform = ''; // 'mobile' 또는 'pc'
let gameOver = false;
let startTime = Date.now();
let endTime = null;
let canUseInvincibility = true; // 무적 쿨타임 체크
let thirdPhase = false; // 3페이지 돌입 여부
let playerColor = '#ffffff'; // 플레이어 기본 색상
let restartTimer = null; // 재시작 타이머

// 시작 화면 이미지 로딩
const startImage1 = new Image();
const startImage2 = new Image();
startImage1.src = '시작1.png';
startImage2.src = '시작2.png';
let startImage1Loaded = false;
let startImage2Loaded = false;

startImage1.onload = function() {
    startImage1Loaded = true;
};
startImage2.onload = function() {
    startImage2Loaded = true;
};

// 조이스틱 요소
const moveJoystickElem = document.getElementById('moveJoystick');
const shootJoystickElem = document.getElementById('shootJoystick');
const moveKnob = moveJoystickElem.querySelector('.joystick-knob');
const shootKnob = shootJoystickElem.querySelector('.joystick-knob');

// 초기에 모든 조이스틱 숨기기
moveJoystickElem.style.display = 'none';
shootJoystickElem.style.display = 'none';

// 조이스틱 상태
let shootJoystick = { active: false, startX: 0, startY: 0, moveX: 0, moveY: 0 };
let moveJoystick = { active: false, startX: 0, startY: 0, moveX: 0, moveY: 0 };

// 조이스틱 위치
const moveJoystickPos = { x: 100, y: canvas.height - 100 };
const shootJoystickPos = { x: canvas.width - 100, y: canvas.height - 100 };

// 조이스틱 설정
const joystickRadius = 40;
const knobRadius = 16;

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

// 키 입력 및 터치 이벤트 처리
const keys = {};

// 이벤트 리스너 설정
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // 시작 화면에서 플랫폼 선택
    if (gameState === 'start') {
        if (e.key === 'ArrowLeft') {
            platform = 'mobile';
            gameState = 'platformSelect';
        } else if (e.key === 'ArrowRight') {
            platform = 'pc';
            gameState = 'platformSelect';
        }
        return;
    }

    // 플랫폼 선택 화면에서 Enter 키를 누르면 색상 선택 화면으로
    if (gameState === 'platformSelect' && e.key === 'Enter') {
        gameState = 'colorSelect';
        return;
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
            startTime = Date.now();
        }
        return;
    }

    // 게임 플레이 중 키 입력 처리
    if (gameState === 'playing') {
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

        if (e.key.toLowerCase() === 'b' && player.healCount > 0 && player.health < player.maxHealth) {
            player.health = Math.min(player.health + 3, player.maxHealth);
            player.healCount--;
        }

        if (e.code === 'Space' && !player.spaceInvincible && canUseInvincibility && enemy.health > 60) {
            player.spaceInvincible = true;
            player.spaceInvincibleTimer = 90;
            canUseInvincibility = false;
            setTimeout(() => {
                canUseInvincibility = true;
            }, 4500);
        }
    }

    // 게임 오버 화면에서 Enter 키를 누르면 재시작
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
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 터치 이벤트 리스너
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (gameState === 'start') {
        gameState = 'colorSelect';
    } else if (gameState === 'colorSelect') {
        const colorY = y - 250;
        if (colorY >= 0) {
            const selectedIndex = Math.floor(colorY / 40);
            if (selectedIndex >= 0 && selectedIndex < colorOptions.length) {
                selectedColorIndex = selectedIndex;
                playerColor = colorOptions[selectedColorIndex].value;
                gameState = 'playing';
                startTime = Date.now();
            }
        }
    } else if (gameState === 'gameOver') {
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
    }
});

function drawStartScreen() {
    if (startImage1Loaded && startImage2Loaded) {
        ctx.drawImage(startImage1, 0, 0, canvas.width, canvas.height);
        if (Date.now() % 1000 < 500) {
            ctx.drawImage(startImage2, 0, 0, canvas.width, canvas.height);
        }
    }
}

function drawColorSelect() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '30px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('색상을 선택하세요', canvas.width / 2, 200);

    colorOptions.forEach((color, index) => {
        ctx.fillStyle = index === selectedColorIndex ? '#ffffff' : '#666666';
        ctx.fillText(color.name, canvas.width / 2, 250 + index * 40);
    });
}

function drawGame() {
    if (dungeonImageLoaded) {
        ctx.drawImage(dungeonImage, 0, 0, canvas.width, canvas.height);
    }

    // 플레이어 그리기
    if (player.invincible || player.spaceInvincible) {
        player.flashToggle = !player.flashToggle;
        if (player.flashToggle) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = playerColor;
        }
    } else {
        ctx.fillStyle = playerColor;
    }
    ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);

    // 적 그리기
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);

    // 탄막 그리기
    ctx.fillStyle = '#ffff00';
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = '#ff0000';
    enemyBullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // UI 그리기
    ctx.font = '20px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`체력: ${player.health}`, 10, 30);
    ctx.fillText(`탄약: ${player.ammo}`, 10, 60);
    ctx.fillText(`회복: ${player.healCount}`, 10, 90);

    // 재장전 표시
    if (player.reloading) {
        ctx.textAlign = 'center';
        ctx.fillText('재장전' + '.'.repeat(player.reloadDots), canvas.width / 2, canvas.height - 50);
    }

    // 무적 쿨타임 표시
    if (!canUseInvincibility) {
        ctx.fillStyle = '#666666';
        ctx.fillText('무적 쿨타임', canvas.width - 100, 30);
    }
}

function drawGameOver() {
    if (endImageLoaded) {
        ctx.drawImage(endImage, 0, 0, canvas.width, canvas.height);
    }

    ctx.font = '30px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('게임 오버', canvas.width / 2, canvas.height / 2 - 50);

    const elapsedTime = endTime - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    ctx.fillText(`생존 시간: ${minutes}분 ${seconds}초`, canvas.width / 2, canvas.height / 2);
    ctx.fillText(`발사한 탄환: ${player.shotCount}발`, canvas.width / 2, canvas.height / 2 + 50);
}

// 조이스틱 이벤트 핸들러
function handleMoveJoystickStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = moveJoystickElem.getBoundingClientRect();
    moveJoystick.active = true;
    moveJoystick.startX = touch.clientX - rect.left;
    moveJoystick.startY = touch.clientY - rect.top;
}

function handleShootJoystickStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = shootJoystickElem.getBoundingClientRect();
    shootJoystick.active = true;
    shootJoystick.startX = touch.clientX - rect.left;
    shootJoystick.startY = touch.clientY - rect.top;
    player.shooting = true;
}

function handleMoveJoystickMove(e) {
    e.preventDefault();
    if (!moveJoystick.active) return;
    
    const touch = e.touches[0];
    const rect = moveJoystickElem.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    moveJoystick.moveX = (touch.clientX - rect.left - centerX) / joystickRadius;
    moveJoystick.moveY = (touch.clientY - rect.top - centerY) / joystickRadius;
    
    const dist = Math.sqrt(moveJoystick.moveX ** 2 + moveJoystick.moveY ** 2);
    if (dist > 1) {
        moveJoystick.moveX /= dist;
        moveJoystick.moveY /= dist;
    }
    
    moveKnob.style.transform = `translate(${moveJoystick.moveX * joystickRadius}px, ${moveJoystick.moveY * joystickRadius}px)`;
}

function handleShootJoystickMove(e) {
    e.preventDefault();
    if (!shootJoystick.active) return;
    
    const touch = e.touches[0];
    const rect = shootJoystickElem.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    shootJoystick.moveX = (touch.clientX - rect.left - centerX) / joystickRadius;
    shootJoystick.moveY = (touch.clientY - rect.top - centerY) / joystickRadius;
    
    const dist = Math.sqrt(shootJoystick.moveX ** 2 + shootJoystick.moveY ** 2);
    if (dist > 1) {
        shootJoystick.moveX /= dist;
        shootJoystick.moveY /= dist;
    }
    
    shootKnob.style.transform = `translate(${shootJoystick.moveX * joystickRadius}px, ${shootJoystick.moveY * joystickRadius}px)`;
    
    player.direction = {
        x: shootJoystick.moveX,
        y: shootJoystick.moveY
    };
}

function handleJoystickEnd(e) {
    e.preventDefault();
    if (moveJoystick.active) {
        moveJoystick.active = false;
        moveJoystick.moveX = 0;
        moveJoystick.moveY = 0;
        moveKnob.style.transform = 'translate(0, 0)';
    }
    if (shootJoystick.active) {
        shootJoystick.active = false;
        shootJoystick.moveX = 0;
        shootJoystick.moveY = 0;
        shootKnob.style.transform = 'translate(0, 0)';
        player.shooting = false;
    }
}

// 조이스틱 이벤트 리스너 등록
moveJoystickElem.addEventListener('touchstart', handleMoveJoystickStart);
moveJoystickElem.addEventListener('touchmove', handleMoveJoystickMove);
moveJoystickElem.addEventListener('touchend', handleJoystickEnd);

// 터치 이벤트 처리
shootJoystickElem.addEventListener('touchstart', handleShootJoystickStart);
shootJoystickElem.addEventListener('touchmove', handleShootJoystickMove);
shootJoystickElem.addEventListener('touchend', handleJoystickEnd);

moveJoystickElem.addEventListener('touchstart', handleMoveJoystickStart);
moveJoystickElem.addEventListener('touchmove', handleMoveJoystickMove);
moveJoystickElem.addEventListener('touchend', handleJoystickEnd);

// 캔버스 터치 이벤트 처리
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // 시작 화면에서 터치하면 플랫폼 선택 화면으로
    if (gameState === 'start') {
        platform = 'mobile';
        gameState = 'platformSelect';
        return;
    }

    // 플랫폼 선택 화면에서 터치하면 색상 선택 화면으로
    if (gameState === 'platformSelect') {
        gameState = 'colorSelect';
        return;
    }

    // 색상 선택 화면에서 색상을 터치하면 게임 시작
    if (gameState === 'colorSelect') {
        const colorY = y - 250;
        if (colorY >= 0) {
            const selectedIndex = Math.floor(colorY / 40);
            if (selectedIndex >= 0 && selectedIndex < colorOptions.length) {
                selectedColorIndex = selectedIndex;
                playerColor = colorOptions[selectedColorIndex].value;
                gameState = 'playing';
                startTime = Date.now();

                // 모바일 모드에서 조이스틱 표시
                if (platform === 'mobile') {
                    moveJoystickElem.style.display = 'block';
                    shootJoystickElem.style.display = 'block';
                }
            }
        }
        return;
    }

    // 게임 오버 화면에서 터치하면 재시작
    if (gameState === 'gameOver') {
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

        // 모바일 모드에서 조이스틱 표시
        if (platform === 'mobile') {
            moveJoystickElem.style.display = 'block';
            shootJoystickElem.style.display = 'block';
        }
    }
});

// 게임 루프
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'start') {
        drawStartScreen();
    } else if (gameState === 'colorSelect') {
        drawColorSelect();
    } else if (gameState === 'playing') {
        updateGame();
        drawGame();
    } else if (gameState === 'gameOver') {
        drawGameOver();
    }

    requestAnimationFrame(gameLoop);
}

// 게임 시작
gameLoop();


function updateEnemyPattern() {
    enemy.patternTimer++;

    if (enemy.health <= 0) {
        gameState = 'gameOver';
        gameOver = true;
        endTime = Date.now();
        return;
    }

    // 패턴 변경
    if (enemy.patternTimer >= 180) { // 3초마다 패턴 변경
        enemy.pattern = (enemy.pattern + 1) % 3;
        enemy.patternTimer = 0;
    }

    // 패턴별 동작
    switch(enemy.pattern) {
        case 0: // 원형 탄막
            if (enemy.patternTimer % 15 === 0) { // 0.25초마다 발사
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i / 8) + (enemy.patternTimer * 0.1);
                    createEnemyBullet(angle);
                }
            }
            break;

        case 1: // 나선형 탄막
            if (enemy.patternTimer % 5 === 0) { // 더 빠른 발사
                enemy.fireAngle += 0.3;
                createEnemyBullet(enemy.fireAngle);
            }
            break;

        case 2: // 조준 탄막
            if (enemy.patternTimer % 30 === 0) { // 0.5초마다 발사
                const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                for (let i = -1; i <= 1; i++) {
                    createEnemyBullet(angle + i * 0.2);
                }
            }
            break;
    }
}

function createEnemyBullet(angle) {
    enemyBullets.push({
        x: enemy.x,
        y: enemy.y,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        speed: 5
    });
}

// updateGame 함수 수정
function updateGame() {
    // 플레이어 이동
    if (platform === 'pc') {
        if (keys['ArrowLeft'] || keys['a']) player.x = Math.max(player.width/2, player.x - player.speed);
        if (keys['ArrowRight'] || keys['d']) player.x = Math.min(canvas.width - player.width/2, player.x + player.speed);
        if (keys['ArrowUp'] || keys['w']) player.y = Math.max(player.height/2, player.y - player.speed);
        if (keys['ArrowDown'] || keys['s']) player.y = Math.min(canvas.height - player.height/2, player.y + player.speed);
    } else if (platform === 'mobile' && moveJoystick.active) {
        player.x = Math.max(player.width/2, Math.min(canvas.width - player.width/2, 
            player.x + moveJoystick.moveX * player.speed));
        player.y = Math.max(player.height/2, Math.min(canvas.height - player.height/2, 
            player.y + moveJoystick.moveY * player.speed));
    }

    // 탄막 생성
    if (platform === 'pc' && keys[' '] && !player.reloading && player.ammo > 0) {
        createBullet();
    } else if (platform === 'mobile' && shootJoystick.active && !player.reloading && player.ammo > 0) {
        createBullet();
    }

    // 적 패턴 업데이트
    updateEnemyPattern();

    // 탄막 업데이트
    bullets = bullets.filter(bullet => {
        bullet.x += bullet.dx * bullet.speed;
        bullet.y += bullet.dy * bullet.speed;
        return bullet.x >= 0 && bullet.x <= canvas.width && 
               bullet.y >= 0 && bullet.y <= canvas.height;
    });

    enemyBullets = enemyBullets.filter(bullet => {
        bullet.x += bullet.dx * bullet.speed;
        bullet.y += bullet.dy * bullet.speed;
        return bullet.x >= 0 && bullet.x <= canvas.width && 
               bullet.y >= 0 && bullet.y <= canvas.height;
    });

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

    // 충돌 체크
    checkCollisions();

    // 게임 오버 체크
    if (player.health <= 0) {
        gameState = 'gameOver';
        gameOver = true;
        endTime = Date.now();
    }
}

function createBullet() {
    if (Date.now() - player.lastShotTime > 250) { // 발사 속도 제한
        const angle = Math.atan2(player.direction.y, player.direction.x);
        bullets.push({
            x: player.x,
            y: player.y,
            dx: Math.cos(angle),
            dy: Math.sin(angle),
            speed: 10
        });
        player.ammo--;
        player.shotCount++;
        player.lastShotTime = Date.now();
    }
}

function checkCollisions() {
    // 플레이어와 적 탄막의 충돌
    if (!player.invincible && !player.spaceInvincible) {
        enemyBullets.forEach((bullet, index) => {
            if (distance(bullet.x, bullet.y, player.x, player.y) < 20) {
                player.health--;
                player.invincible = true;
                player.invincibleTimer = 60;
                enemyBullets.splice(index, 1);
            }
        });
    }

    // 플레이어 탄막과 적의 충돌
    bullets.forEach((bullet, index) => {
        if (distance(bullet.x, bullet.y, enemy.x, enemy.y) < 25) {
            enemy.health--;
            bullets.splice(index, 1);
        }
    });
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
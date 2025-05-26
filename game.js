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
const shootJoystickElem = document.getElementById('moveJoystick');
const moveJoystickElem = document.getElementById('actionJoystick');
const shootKnob = shootJoystickElem.querySelector('.joystick-knob');
const moveKnob = moveJoystickElem.querySelector('.joystick-knob');
const healJoystickElem = document.getElementById('healJoystick');
const reloadJoystickElem = document.getElementById('reloadJoystick');
const healKnob = healJoystickElem.querySelector('.joystick-knob');
const reloadKnob = reloadJoystickElem.querySelector('.joystick-knob');

// 조이스틱 상태
let shootJoystick = { active: false, startX: 0, startY: 0, moveX: 0, moveY: 0 };
let moveJoystick = { active: false, startX: 0, startY: 0, moveX: 0, moveY: 0 };
let healJoystick = { active: false, startX: 0, startY: 0, moveX: 0, moveY: 0 };
let reloadJoystick = { active: false, startX: 0, startY: 0, moveX: 0, moveY: 0 };

// 조이스틱 위치
const moveJoystickPos = { x: 100, y: canvas.height - 100 };
const shootJoystickPos = { x: canvas.width - 100, y: canvas.height - 100 };
const healJoystickPos = { x: 100, y: canvas.height - 200 };
const reloadJoystickPos = { x: canvas.width - 100, y: canvas.height - 200 };

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

// 키 입력 및 터치 이벤트 처리
const keys = {};

// 터치 이벤트 처리
shootJoystickElem.addEventListener('touchstart', handleShootJoystickStart);
shootJoystickElem.addEventListener('touchmove', handleShootJoystickMove);
shootJoystickElem.addEventListener('touchend', handleJoystickEnd);

moveJoystickElem.addEventListener('touchstart', handleMoveJoystickStart);
moveJoystickElem.addEventListener('touchmove', handleMoveJoystickMove);
moveJoystickElem.addEventListener('touchend', handleJoystickEnd);

healJoystickElem.addEventListener('touchstart', handleHealJoystickStart);
healJoystickElem.addEventListener('touchmove', handleHealJoystickMove);
healJoystickElem.addEventListener('touchend', handleJoystickEnd);

reloadJoystickElem.addEventListener('touchstart', handleReloadJoystickStart);
reloadJoystickElem.addEventListener('touchmove', handleReloadJoystickMove);
reloadJoystickElem.addEventListener('touchend', handleJoystickEnd);

// 캔버스 터치 이벤트 처리
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // 시작 화면에서 터치하면 색상 선택 화면으로
    if (gameState === 'start') {
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
    }
});

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
    if (healJoystick.active) {
        healJoystick.active = false;
        healJoystick.moveX = 0;
        healJoystick.moveY = 0;
        healKnob.style.transform = 'translate(0, 0)';
    }
    if (reloadJoystick.active) {
        reloadJoystick.active = false;
        reloadJoystick.moveX = 0;
        reloadJoystick.moveY = 0;
        reloadKnob.style.transform = 'translate(0, 0)';
    }
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

document.addEventListener('keydown', (e) => {
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
    // 터치 조이스틱으로 이동
    if (moveJoystick.active) {
        const normalizedX = moveJoystick.moveX / joystickRadius;
        const normalizedY = moveJoystick.moveY / joystickRadius;
        
        if (player.x + normalizedX * player.speed * 5 > 0 && 
            player.x + normalizedX * player.speed * 5 < canvas.width - player.width) {
            player.x += normalizedX * player.speed * 5;
            if (normalizedX !== 0) player.direction = { x: Math.sign(normalizedX), y: 0 };
        }
        if (player.y + normalizedY * player.speed * 5 > 0 && 
            player.y + normalizedY * player.speed * 5 < canvas.height - player.height) {
            player.y += normalizedY * player.speed * 5;
            if (normalizedY !== 0) player.direction = { x: 0, y: Math.sign(normalizedY) };
        }
    }
    // 키보드 입력으로 이동
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
    if (keys['z'] || shootJoystick.active) player.shooting = true;
    else player.shooting = false;
}

// 플레이어 탄환 생성
function createPlayerBullet() {
    const currentTime = Date.now();
    if (player.shooting && !player.reloading && player.ammo > 0 && 
        currentTime - player.lastShotTime >= 250) { // 0.25초 딜레이
        player.shotCount++;
        const isSpecialBullet = player.shotCount % 6 === 0;
        const bulletDamage = enemy.health > 60 ? 20 : 10;
        
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
    }
}

// 적 탄막 패턴
function createEnemyBullets() {
    enemy.patternTimer++;
    
    if (!enemy.reviving) {
        if (enemy.patternTimer % 60 === 0) {
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
    // 조이스틱 그리기 함수
    function drawJoystick(baseX, baseY, active, moveX, moveY) {
        ctx.beginPath();
        ctx.arc(baseX, baseY, joystickRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (active) {
            ctx.beginPath();
            ctx.arc(baseX + moveX, baseY + moveY, joystickRadius / 2, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff80';
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(baseX, baseY, joystickRadius / 2, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff40';
            ctx.fill();
        }
    }

    // 화면 클리어
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 게임 플레이 중일 때 던전 배경 표시
    if (gameState === 'playing' && dungeonImageLoaded) {
        ctx.drawImage(dungeonImage, 0, 0, canvas.width, canvas.height);
    }

    // 시작 화면
    if (gameState === 'start') {
        if (startImage1Loaded) {
            ctx.drawImage(startImage1, 0, 0, canvas.width, canvas.height);
        }
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('플랫폼을 선택하세요', canvas.width/2, canvas.height/2 - 50);
        ctx.font = '36px Arial';
        ctx.fillStyle = '#00ffff';
        ctx.fillText('모바일', canvas.width/2 - 100, canvas.height/2 + 50);
        ctx.fillText('PC', canvas.width/2 + 100, canvas.height/2 + 50);
        return;
    }

    // 플랫폼 선택 화면
    if (gameState === 'platformSelect') {
        if (startImage2Loaded) {
            ctx.drawImage(startImage2, 0, 0, canvas.width, canvas.height);
        }
        ctx.fillStyle = '#fff';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        if (platform === 'mobile') {
            ctx.fillText('모바일 조작:', canvas.width/2, canvas.height/2 - 50);
            ctx.fillText('왼쪽 아래: 이동 조이스틱', canvas.width/2, canvas.height/2);
            ctx.fillText('오른쪽 아래: 공격 조이스틱', canvas.width/2, canvas.height/2 + 30);
            ctx.fillText('왼쪽 위: 포션 조이스틱', canvas.width/2, canvas.height/2 + 60);
            ctx.fillText('오른쪽 위: 재장전 조이스틱', canvas.width/2, canvas.height/2 + 90);
        } else {
            ctx.fillText('PC 조작: 방향키로 이동, Z키로 공격', canvas.width/2, canvas.height/2);
        }
        ctx.font = '24px Arial';
        ctx.fillText('Press Enter to Continue', canvas.width/2, canvas.height/2 + 50);
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
    ctx.fillStyle = '#00ffff';
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

    // 조이스틱 그리기 (모바일인 경우에만)
    if (gameState === 'playing' && platform === 'mobile') {
        drawJoystick(moveJoystickPos.x, moveJoystickPos.y, moveJoystick.active, moveJoystick.moveX, moveJoystick.moveY);
        drawJoystick(shootJoystickPos.x, shootJoystickPos.y, shootJoystick.active, shootJoystick.moveX, shootJoystick.moveY);
        
        // 회복 조이스틱
        ctx.beginPath();
        ctx.arc(healJoystickPos.x, healJoystickPos.y, joystickRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff69b4';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(healJoystickPos.x, healJoystickPos.y, joystickRadius / 2, 0, Math.PI * 2);
        ctx.fillStyle = healJoystick.active ? '#ff69b480' : '#ff69b440';
        ctx.fill();

        // 회복 아이콘
        ctx.fillStyle = '#ff69b4';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('❤', healJoystickPos.x, healJoystickPos.y + 8);
    }

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
function handleHealJoystickStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = healJoystickElem.getBoundingClientRect();
    healJoystick.active = true;
    healJoystick.startX = touch.clientX - rect.left;
    healJoystick.startY = touch.clientY - rect.top;
    
    if (player.healCount > 0 && player.health < player.maxHealth) {
        player.health = Math.min(player.health + 3, player.maxHealth);
        player.healCount--;
    }
}

function handleHealJoystickMove(e) {
    e.preventDefault();
    if (!healJoystick.active) return;
    
    const touch = e.touches[0];
    const rect = healJoystickElem.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    healJoystick.moveX = (touch.clientX - rect.left - centerX) / joystickRadius;
    healJoystick.moveY = (touch.clientY - rect.top - centerY) / joystickRadius;
    
    const dist = Math.sqrt(healJoystick.moveX ** 2 + healJoystick.moveY ** 2);
    if (dist > 1) {
        healJoystick.moveX /= dist;
        healJoystick.moveY /= dist;
    }
    
    healKnob.style.transform = `translate(${healJoystick.moveX * joystickRadius}px, ${healJoystick.moveY * joystickRadius}px)`;
}

function handleReloadJoystickStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = reloadJoystickElem.getBoundingClientRect();
    reloadJoystick.active = true;
    reloadJoystick.startX = touch.clientX - rect.left;
    reloadJoystick.startY = touch.clientY - rect.top;
    
    if (player.ammo < player.maxAmmo && !player.reloading) {
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
}

function handleReloadJoystickMove(e) {
    e.preventDefault();
    if (!reloadJoystick.active) return;
    
    const touch = e.touches[0];
    const rect = reloadJoystickElem.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    reloadJoystick.moveX = (touch.clientX - rect.left - centerX) / joystickRadius;
    reloadJoystick.moveY = (touch.clientY - rect.top - centerY) / joystickRadius;
    
    const dist = Math.sqrt(reloadJoystick.moveX ** 2 + reloadJoystick.moveY ** 2);
    if (dist > 1) {
        reloadJoystick.moveX /= dist;
        reloadJoystick.moveY /= dist;
    }
    
    reloadKnob.style.transform = `translate(${reloadJoystick.moveX * joystickRadius}px, ${reloadJoystick.moveY * joystickRadius}px)`;
}

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
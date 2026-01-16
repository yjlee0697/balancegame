// DOM 요소
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timeDisplay = document.getElementById('timeDisplay');
const stageDisplay = document.getElementById('stageDisplay');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayDesc = document.getElementById('overlayDesc');
const startBtn = document.getElementById('startBtn');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');

// 게임 상태 상수
const STATE_MENU = 'MENU';
const STATE_PLAYING = 'PLAYING';
const STATE_GAMEOVER = 'GAMEOVER';
const STATE_CLEAR = 'CLEAR'; 

// 게임 상태 변수
let gameState = STATE_MENU;
let lastTime = 0;
let animationId;

// 스테이지 관리 변수
let currentStage = 1;
let timeLeft = 10.00;
let currentGravity = 0.3; // 초기 중력

// 물리 상수
const BASE_GRAVITY = 0.3;     // 시작 중력
const GRAVITY_INCREMENT = 0.015; // 스테이지당 중력 증가량
const PUSH_FORCE = 2.5;       // 키보드 플레이어 힘
const TOUCH_PUSH_FORCE = 2.7; // 터치 플레이어 힘 (키보드 대비 8% 상향)
const FRICTION = 0.93;        // 마찰
const MAX_ANGLE = 85;         // 게임오버 각도
const STAGE_DURATION = 10;    // 스테이지 제한 시간 (초)

let stick = {
    angle: 0,
    velocity: 0,
    length: 200,
    width: 14,
    color: '#FBBF24'
};

const input = { left: false, right: false };

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stick.length = Math.min(window.innerHeight * 0.4, 300);
}
window.addEventListener('resize', resize);
resize();

// 버튼 핸들러
function handleBtnClick() {
    startBtn.blur(); 

    if (gameState === STATE_MENU || gameState === STATE_GAMEOVER) {
        startGame(true); 
    } else if (gameState === STATE_CLEAR) {
        startGame(false);
    }
}

// 게임 시작
function startGame(isReset) {
    if (isReset) {
        currentStage = 1;
        currentGravity = BASE_GRAVITY;
    } else {
        currentStage++;
        currentGravity += GRAVITY_INCREMENT;
    }

    gameState = STATE_PLAYING;
    timeLeft = STAGE_DURATION;
    
    stageDisplay.innerText = `STAGE ${currentStage}`;
    timeDisplay.innerText = timeLeft.toFixed(2);
    timeDisplay.classList.remove('text-red-500');
    timeDisplay.classList.add('text-yellow-400');
    
    stick.angle = (Math.random() * 4 - 2); 
    stick.velocity = 0;
    
    overlay.classList.add('opacity-0', 'pointer-events-none');
    document.body.classList.remove('shake-screen');
    
    lastTime = performance.now();
    if (animationId) cancelAnimationFrame(animationId);
    gameLoop(lastTime);
}

function gameOver() {
    gameState = STATE_GAMEOVER;
    overlayTitle.innerText = "게임 오버!";
    overlayDesc.innerHTML = `STAGE ${currentStage}에서 실패했습니다.<br>다시 1단계부터 도전해보세요.`;
    startBtn.innerText = "다시 시작";
    
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    document.body.classList.add('shake-screen');
    if (navigator.vibrate) navigator.vibrate(200);
}

function stageClear() {
    gameState = STATE_CLEAR;
    overlayTitle.innerText = `STAGE ${currentStage} 클리어!`;
    overlayDesc.innerHTML = `축하합니다! 균형 감각이 좋으시네요.<br>다음 단계로 넘어갈까요?<br><span class="text-xs text-gray-400">(중력이 조금 더 강해집니다)</span>`;
    startBtn.innerText = "다음 스테이지 시작";

    overlay.classList.remove('opacity-0', 'pointer-events-none');
}

function update(dt) {
    if (gameState !== STATE_PLAYING) return;

    timeLeft -= dt / 1000;
    if (timeLeft <= 0) {
        timeLeft = 0;
        stageClear();
        return;
    }

    timeDisplay.innerText = timeLeft.toFixed(2);
    if (timeLeft <= 3.0) {
        timeDisplay.classList.remove('text-yellow-400');
        timeDisplay.classList.add('text-red-500');
    } else {
        timeDisplay.classList.add('text-yellow-400');
        timeDisplay.classList.remove('text-red-500');
    }

    const radian = stick.angle * Math.PI / 180;
    const gravityForce = Math.sin(radian) * currentGravity;
    
    stick.velocity += gravityForce;
    stick.velocity *= FRICTION;
    stick.angle += stick.velocity;

    if (Math.abs(stick.angle) >= MAX_ANGLE) {
        gameOver();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.8; 

    const dangerLevel = Math.min(Math.abs(stick.angle) / MAX_ANGLE, 1);
    if (dangerLevel > 0.5) {
        ctx.save();
        ctx.globalAlpha = (dangerLevel - 0.5) * 0.4;
        ctx.fillStyle = '#EF4444'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#94A3B8'; 
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(stick.angle * Math.PI / 180); 

    ctx.fillStyle = stick.color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    ctx.beginPath();
    ctx.roundRect(-stick.width / 2, -stick.length, stick.width, stick.length, 6);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, -stick.length + 10, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (input.left || input.right) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        const arrowSize = 30;
        const offset = 60;
        
        if (input.left) {
            ctx.beginPath();
            ctx.moveTo(centerX - offset, centerY - 10);
            ctx.lineTo(centerX - offset - arrowSize, centerY);
            ctx.lineTo(centerX - offset, centerY + 10);
            ctx.fill();
        }
        if (input.right) {
            ctx.beginPath();
            ctx.moveTo(centerX + offset, centerY - 10);
            ctx.lineTo(centerX + offset + arrowSize, centerY);
            ctx.lineTo(centerX + offset, centerY + 10);
            ctx.fill();
        }
    }
}

function gameLoop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    update(dt);
    draw();

    if (gameState === STATE_PLAYING) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// 키보드 이벤트 리스너
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        return; 
    }

    if (gameState !== STATE_PLAYING) {
        if (e.code === 'Enter') handleBtnClick();
        return;
    }

    if (e.repeat) return;

    if (e.code === 'ArrowLeft') {
        stick.velocity -= PUSH_FORCE;
        input.left = true;
    }
    if (e.code === 'ArrowRight') {
        stick.velocity += PUSH_FORCE;
        input.right = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') input.left = false;
    if (e.code === 'ArrowRight') input.right = false;
});

// 통합 입력 처리 (마우스 + 터치)
function handleInputStart(direction) {
    if (gameState !== STATE_PLAYING) return;
    
    if (direction === 'left' && input.left) return;
    if (direction === 'right' && input.right) return;

    if (direction === 'left') {
        stick.velocity -= TOUCH_PUSH_FORCE; // 터치 힘 적용
        input.left = true;
    }
    if (direction === 'right') {
        stick.velocity += TOUCH_PUSH_FORCE; // 터치 힘 적용
        input.right = true;
    }
    
    const btn = direction === 'left' ? btnLeft : btnRight;
    btn.classList.add('bg-white/30');
}

function handleInputEnd(direction) {
    if (direction === 'left') input.left = false;
    if (direction === 'right') input.right = false;
    
    const btn = direction === 'left' ? btnLeft : btnRight;
    btn.classList.remove('bg-white/30');
}

// 버튼 이벤트 바인딩 헬퍼
function bindBtnEvents(btn, direction) {
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handleInputStart(direction);
        btn.setPointerCapture(e.pointerId);
    });

    btn.addEventListener('pointerup', (e) => {
        e.preventDefault();
        handleInputEnd(direction);
        btn.releasePointerCapture(e.pointerId);
    });
    
    btn.addEventListener('pointerleave', (e) => {
        e.preventDefault();
        handleInputEnd(direction);
    });
}

bindBtnEvents(btnLeft, 'left');
bindBtnEvents(btnRight, 'right');

startBtn.addEventListener('click', handleBtnClick);

// 초기 실행
resize();
draw();
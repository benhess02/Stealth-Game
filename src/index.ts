const cvs = document.querySelector<HTMLCanvasElement>("#cvs");
const ctx = cvs.getContext("2d");

const KEY_SIZE = 100;
const KEY_PADDING = 10;

const GAME_WIDTH = 1500;
const GAME_HEIGHT = 500;

let time: number = -0.1;
let dt: number = 0;

interface Key {
    x: number;
    y: number;
    char: string;
    playerPossible: boolean;
}

const KEYS: Key[] = [];

const PLAYER_WALK_SPEED = 0.1;
const PLAYER_RUN_SPEED = 0.5;

const PLAYER_STEP_TIME = KEY_SIZE * 1.25 / PLAYER_WALK_SPEED;

let primaryKey: Key = null;
let nextKey: Key = null;

let gameStarted = false;

let aiStepTime = 0;

function addKeyRow(xKeys: number, yKeys: number, keys: string) {
    let leftX = (xKeys - keys.length / 2) * KEY_SIZE;
    let topY = yKeys * KEY_SIZE;
    for(let i = 0; i < keys.length; i++) {
        KEYS.push({
            x: leftX + KEY_SIZE * i,
            y: topY,
            char: keys.charAt(i),
            playerPossible: false
        });
    }
}

function getKey(char: string): Key {
    let _char = char.toLowerCase();
    for(let i = 0; i < KEYS.length; i++) {
        if(KEYS[i].char == _char) {
            return KEYS[i];
        }
    }
    return null;
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
    let dx = x1 - x2;
    let dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

function isPosAdjacent(x1: number, y1: number, x2: number, y2: number): boolean {
    return Math.abs(x1 - x2) < KEY_SIZE * 1.25 && Math.abs(y1 - y2) < KEY_SIZE * 1.25;
}

function isAdjacent(a: Key, b: Key): boolean {
    if(!a || !b) {
        return false;
    }
    return isPosAdjacent(a.x, a.y, b.x, b.y);
}

addKeyRow(-0.25, -1.5, "1234567890-=");
addKeyRow(0.25, -0.5, "qwertyuiop[]");
addKeyRow(0, 0.5, "asdfghjkl;'");
addKeyRow(0, 1.5, "zxcvbnm,./");

let goalKey = getKey("]");

let startKey = getKey("a");
let playerX = startKey.x;
let playerY = startKey.y;
let isRunning: boolean = false;
let playerKey: Key = null;

let enemyStartKey = getKey("'");
let enemyX = enemyStartKey.x;
let enemyY = enemyStartKey.y;
let targetX: number;
let targetY: number;

function reset() {
    gameStarted = false;

    primaryKey = null;
    nextKey = null;

    playerX = startKey.x;
    playerY = startKey.y;
    isRunning = false;

    enemyX = enemyStartKey.x;
    enemyY = enemyStartKey.y;

    for(let i = 0; i < KEYS.length; i++) {
        KEYS[i].playerPossible = false;
    }
    startKey.playerPossible = true;
}

function draw() {
    cvs.width = cvs.clientWidth;
    cvs.height = cvs.clientHeight;
    ctx.resetTransform();
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    ctx.translate(cvs.width / 2, cvs.height / 2);
    {
        let gameScale = Math.min(cvs.width / GAME_WIDTH, cvs.height / GAME_HEIGHT);
        ctx.scale(gameScale, gameScale);
    }

    ctx.fillStyle = "gold";
    ctx.fillRect(
        goalKey.x - (KEY_SIZE - KEY_PADDING) / 2,
        goalKey.y - (KEY_SIZE - KEY_PADDING) / 2,
        KEY_SIZE - KEY_PADDING, KEY_SIZE - KEY_PADDING
    );

    ctx.lineWidth = 5;
    for(let i = 0; i < KEYS.length; i++) {
        // if(KEYS[i].playerPossible) {
        //     ctx.fillStyle = "green";
        //     ctx.fillRect(
        //         KEYS[i].x - (KEY_SIZE - KEY_PADDING) / 2,
        //         KEYS[i].y - (KEY_SIZE - KEY_PADDING) / 2,
        //         KEY_SIZE - KEY_PADDING, KEY_SIZE - KEY_PADDING
        //     );
        // }

        if(KEYS[i] == primaryKey) {
            ctx.strokeStyle = "blue";
        } else if(KEYS[i] == nextKey) {
            if(isPosAdjacent(playerX, playerY, KEYS[i].x, KEYS[i].y)) {
                ctx.strokeStyle = "green";
            } else {
                ctx.strokeStyle = "red";
            }
        } else if(isPosAdjacent(playerX, playerY, KEYS[i].x, KEYS[i].y)) {
            ctx.strokeStyle = "white";
        } else {
            ctx.strokeStyle = "grey";
        }
        ctx.strokeRect(
            KEYS[i].x - (KEY_SIZE - KEY_PADDING) / 2,
            KEYS[i].y - (KEY_SIZE - KEY_PADDING) / 2,
            KEY_SIZE - KEY_PADDING, KEY_SIZE - KEY_PADDING
        );
    }

    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(playerX, playerY, KEY_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(enemyX, enemyY, KEY_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.textBaseline = "middle";
    ctx.font = "24px sans-serif";
    ctx.fillStyle = "white";
    for(let i = 0; i < KEYS.length; i++) {
        let text = KEYS[i].char.toUpperCase();
        let textWidth = ctx.measureText(text).width;
        ctx.fillText(text, KEYS[i].x - textWidth / 2, KEYS[i].y);
    }
}

function updateAISearchForPlayer() {
    // Extend predicted player positions
    aiStepTime += dt;
    if(aiStepTime >= PLAYER_STEP_TIME) {
        aiStepTime = 0;
        let nextPossibleKeys: Key[] = [];
        for(let i = 0; i < KEYS.length; i++) {
            if(KEYS[i].playerPossible) {
                for(let j = 0; j < KEYS.length; j++) {
                    if(!KEYS[j].playerPossible && isAdjacent(KEYS[i], KEYS[j])) {
                        if(!nextPossibleKeys.includes(KEYS[j])) {
                            nextPossibleKeys.push(KEYS[j]);
                        }
                    }
                }
            }
        }
        nextPossibleKeys.forEach((k) => k.playerPossible = true);
    }

    // Remove predictions that the enemy can see
    for(let i = 0; i < KEYS.length; i++) {
        if(KEYS[i].playerPossible && isPosAdjacent(KEYS[i].x, KEYS[i].y, enemyX, enemyY)) {
            KEYS[i].playerPossible = false;
        }
    }

    // Target best predicted position
    targetX = Number.NEGATIVE_INFINITY;
    for(let i = 0; i < KEYS.length; i++) {
        if(KEYS[i].playerPossible && KEYS[i].x > targetX) {
            targetX = KEYS[i].x;
            targetY = KEYS[i].y;
        }
    }
    if(targetX == Number.NEGATIVE_INFINITY) {
        targetX = playerKey.x;
        targetY = playerKey.y;
        playerKey.playerPossible = true;
    }
}

function update(newTime: number) {
    requestAnimationFrame((t) => update(t));
    dt = newTime - time;
    time = newTime;

    draw();

    if(!gameStarted) {
        return;
    }

    // Find the player key
    playerKey = null;
    let minDist = Number.POSITIVE_INFINITY;
    for(let i = 0; i < KEYS.length; i++) {
        let dist = distance(KEYS[i].x, KEYS[i].y, playerX, playerY);
        if(dist < minDist) {
            minDist = dist;
            playerKey = KEYS[i];
        }
    }

    /* Move directly towards the player if the player is running 
       or visible to the enemy, otherwise search */
    if(isRunning || isPosAdjacent(enemyX, enemyY, playerKey.x, playerKey.y)) {
        targetX = playerX;
        targetY = playerY;
        for(let i = 0; i < KEYS.length; i++) {
            KEYS[i].playerPossible = false;
        }
        playerKey.playerPossible = true;
    } else {
        updateAISearchForPlayer();
    }

    if(primaryKey != null) {
        let dx = primaryKey.x - playerX;
        let dy = primaryKey.y - playerY;
        let dist = distance(playerX, playerY, primaryKey.x, primaryKey.y);
        let speed = PLAYER_WALK_SPEED;
        if(isRunning) {
            speed = PLAYER_RUN_SPEED;
        }
        if(dist > speed * dt) {
            dx /= dist;
            dy /= dist;
            playerX += dx * speed * dt;
            playerY += dy * speed * dt;
        } else {
            playerX = primaryKey.x;
            playerY = primaryKey.y;
        }
    }

    {
        if(distance(enemyX, enemyY, playerX, playerY) < (KEY_SIZE / 3) * 2) {
            reset();
            console.log("You died")
            return;
        }

        let speed = PLAYER_WALK_SPEED;
        let dx = targetX - enemyX;
        let dy = targetY - enemyY;
        let dist = distance(enemyX, enemyY, targetX, targetY);
        if(dist > speed * dt) {
            dx /= dist;
            dy /= dist;
            enemyX += dx * speed * dt;
            enemyY += dy * speed * dt;
        }
    }

    if(distance(playerX, playerY, goalKey.x, goalKey.y) < KEY_SIZE / 2) {
        reset();
        console.log("You won!")
        return;
    }
}

document.addEventListener("keydown", (ev) => {
    let key = getKey(ev.key);
    if(key !== null) {
        if(primaryKey == null && isPosAdjacent(playerX, playerY, key.x, key.y)) {
            gameStarted = true;
            primaryKey = key;
        } else if(nextKey == null && key != primaryKey) {
            if(distance(playerX, playerY, key.x, key.y) < 5 * KEY_SIZE) {
                nextKey = key;
            }
        }
    }
});

document.addEventListener("keyup", (ev) => {
    let key = getKey(ev.key);
    if(key !== null) {
        if(key == primaryKey) {
            primaryKey = nextKey;
            nextKey = null;
            console.log(primaryKey);
            if(primaryKey == null) {
                reset();
                console.log("Removed your fingers!");
            } else {
                isRunning = !isPosAdjacent(playerX, playerY, primaryKey.x, primaryKey.y);
            }
        }
        if(key == nextKey) {
            nextKey = null;
        }
    }
});

reset();
update(0);
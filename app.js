var Vector = /** @class */ (function () {
    function Vector(x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        this.x = x;
        this.y = y;
    }
    Vector.prototype.add = function (v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    };
    Vector.prototype.sub = function (v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    };
    Vector.prototype.scale = function (s) {
        this.x *= s;
        this.y *= s;
        return this;
    };
    Vector.prototype.length = function () {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    };
    Vector.prototype.lengthSq = function () {
        return Math.pow(this.x, 2) + Math.pow(this.y, 2);
    };
    Vector.prototype.normalize = function () {
        var magnitude = this.length();
        if (magnitude > 0)
            this.scale(1 / magnitude);
        return this;
    };
    Vector.prototype.copy = function () {
        return new Vector(this.x, this.y);
    };
    Vector.sub = function (v1, v2) {
        return new Vector(v1.x - v2.x, v1.y - v2.y);
    };
    Vector.dot = function (v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    };
    return Vector;
}());
var Body = /** @class */ (function () {
    function Body(position, velocity, mass, restitution, color, shape, width, height) {
        if (velocity === void 0) { velocity = new Vector(); }
        if (mass === void 0) { mass = 1; }
        if (restitution === void 0) { restitution = 0.7; }
        if (color === void 0) { color = "red"; }
        if (shape === void 0) { shape = "circle"; }
        if (width === void 0) { width = 40; }
        if (height === void 0) { height = 40; }
        this.position = position;
        this.velocity = velocity;
        this.mass = mass;
        this.restitution = restitution;
        this.color = color;
        this.shape = shape;
        this.width = width;
        this.height = height;
        this.position = position;
        this.velocity = velocity;
        this.mass = mass;
        this.force = new Vector();
        this.restitution = restitution;
        this.shape = shape;
        this.radius = 10;
        this.width = width;
        this.height = height;
        this.color = color;
        this.isStatic = false;
    }
    Body.prototype.applyForce = function (force) {
        this.force.add(force);
    };
    Body.prototype.update = function (dt) {
        if (this.isStatic)
            return;
        var acceleration = this.force.copy().scale(1 / this.mass);
        this.velocity.add(acceleration.scale(dt));
        this.position.add(this.velocity.copy().scale(dt));
        this.force = new Vector();
    };
    Body.prototype.draw = function (ctx) {
        ctx.fillStyle = this.color;
        if (this.shape === "circle") {
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        else if (this.shape === "square") {
            ctx.fillRect(this.position.x - this.width / 2, this.position.y - this.height / 2, this.width, this.height);
        }
    };
    return Body;
}());
var PhysicsWorld = /** @class */ (function () {
    function PhysicsWorld(canvas, gravity) {
        if (gravity === void 0) { gravity = new Vector(0, 0); }
        this.canvas = canvas;
        this.gravity = gravity;
        this.bodies = [];
    }
    PhysicsWorld.prototype.addBody = function (body) {
        this.bodies.push(body);
    };
    PhysicsWorld.prototype.clearBricks = function () {
        this.bodies = this.bodies.filter(function (body) { return body.type !== "brick"; });
    };
    PhysicsWorld.prototype.update = function (dt) {
        for (var _i = 0, _a = this.bodies; _i < _a.length; _i++) {
            var body = _a[_i];
            body.applyForce(this.gravity.copy().scale(body.mass));
            body.update(dt);
        }
        this.checkCollisions();
        this.checkWallCollisions();
    };
    PhysicsWorld.prototype.checkWallCollisions = function () {
        for (var _i = 0, _a = this.bodies; _i < _a.length; _i++) {
            var body = _a[_i];
            if (body.isStatic)
                continue;
            // Top Wall
            if (body.position.y - body.radius <= 0) {
                body.position.y = body.radius;
                body.velocity.y *= -body.restitution;
            }
            // Left Wall
            if (body.position.x - body.radius <= 0) {
                body.position.x = body.radius;
                body.velocity.x *= -body.restitution;
            }
            // Right Wall
            if (body.position.x + body.radius >= this.canvas.width) {
                body.position.x = this.canvas.width - body.radius;
                body.velocity.x *= -body.restitution;
            }
        }
    };
    PhysicsWorld.prototype.checkCollisions = function () {
        var _a;
        var bricks = this.bodies.filter(function (body) { return body.type === "brick"; });
        var ball = this.bodies.find(function (body) { return body.type === "ball"; });
        var paddle = this.bodies.find(function (body) { return body.type === "paddle"; });
        if (!ball || !paddle)
            return;
        var paddleRect = {
            x: paddle.position.x - paddle.width / 2,
            y: paddle.position.y - paddle.height / 2,
            width: paddle.width,
            height: paddle.height,
        };
        var ballCircle = {
            x: ball.position.x,
            y: ball.position.y,
            radius: ball.radius,
        };
        var collision = this.checkCircleRectCollision(ballCircle, paddleRect);
        if (collision.hit) {
            var normal = collision.normal;
            var relativeVelocity = Vector.sub(ball.velocity, paddle.velocity);
            var velocityAlongNormal = Vector.dot(relativeVelocity, normal);
            if (velocityAlongNormal < 0) {
                ball.velocity.sub(normal.scale(2 * velocityAlongNormal * ball.restitution));
            }
        }
        for (var i = bricks.length - 1; i >= 0; i--) {
            var brick = bricks[i];
            var brickRect = {
                x: brick.position.x - brick.width / 2,
                y: brick.position.y - brick.height / 2,
                width: brick.width,
                height: brick.height,
            };
            var collision_1 = this.checkCircleRectCollision(ballCircle, brickRect);
            if (collision_1.hit) {
                var normal = (_a = collision_1.normal) !== null && _a !== void 0 ? _a : new Vector();
                var relativeVelocity = ball.velocity;
                var velocityAlongNormal = Vector.dot(relativeVelocity, normal);
                if (velocityAlongNormal < 0) {
                    ball.velocity.sub(normal.scale(2 * velocityAlongNormal * ball.restitution));
                }
                score += 10;
                document.getElementById("scoreDisplay").textContent = "Score: ".concat(score);
                this.bodies.splice(this.bodies.indexOf(brick), 1);
                break;
            }
        }
    };
    PhysicsWorld.prototype.checkCircleRectCollision = function (circle, rect) {
        var closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        var closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
        var dx = circle.x - closestX;
        var dy = circle.y - closestY;
        var distanceSq = Math.pow(dx, 2) + Math.pow(dy, 2);
        var hit = distanceSq <= circle.radius * circle.radius;
        if (hit) {
            var normal = new Vector(circle.x - closestX, circle.y - closestY).normalize();
            return { hit: true, normal: normal };
        }
        return { hit: false };
    };
    return PhysicsWorld;
}());
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var gameMessageElement = document.getElementById("gameMessage");
var gameRunning = false;
var gameOver = false;
var launchRequested = false;
var score = 0;
var currentLevel = 1;
var maxLevels = 3;
var isLevelTransitioning = false;
function resizeCanvas() {
    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.9;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
var world = new PhysicsWorld(canvas);
var ball = new Body(new Vector(canvas.width / 2, canvas.height - 50), new Vector(0, 0), 1, 1, "red", "circle");
ball.type = "ball";
world.addBody(ball);
var paddle = new Body(new Vector(canvas.width / 2, canvas.height - 20), new Vector(0, 0), Infinity, 1, "black", "square", 100, 20);
paddle.isStatic = true;
paddle.type = "paddle";
world.addBody(paddle);
function createBricks(level) {
    var brickWidth = 80;
    var brickHeight = 20;
    var brickPadding = 10;
    var brickOffsetTop = 30;
    var brickOffsetLeft = 30;
    var colors = [
        "#f44336",
        "#e91e63",
        "#9c27b0",
        "#673ab7",
        "#3f51b5",
        "#2196f3",
        "#03a9f4",
    ];
    var layout;
    switch (level) {
        case 1:
            layout = [
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 1, 1, 1],
            ];
            break;
        default:
            layout = [
                [1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1],
            ];
    }
    var numCols = layout[0].length;
    var numRows = layout.length;
    var horizontalOffset = (canvas.width - (numCols * brickWidth + (numCols - 1) * brickPadding)) / 2;
    for (var r = 0; r < numRows; r++) {
        for (var c = 0; c < numCols; c++) {
            var brickX = c * (brickWidth + brickPadding) + horizontalOffset + brickWidth / 2;
            var brickY = r * (brickHeight + brickPadding) + brickPadding + brickHeight / 2;
            var brick = new Body(new Vector(brickX, brickY), new Vector(0, 0), Infinity, 1, colors[r % colors.length], "square", brickWidth, brickHeight);
            brick.type = "brick";
            brick.isStatic = true;
            world.addBody(brick);
        }
    }
}
function startLevel() {
    world.clearBricks();
    createBricks(currentLevel);
    ball.position = new Vector(canvas.width / 2, canvas.height - 50);
    ball.velocity = new Vector(0, 0);
    paddle.position = new Vector(canvas.width / 2, canvas.height - 20);
    gameRunning = false;
    launchRequested = false;
    isLevelTransitioning = false;
    document.getElementById("levelDisplay").textContent = "Level: ".concat(currentLevel);
    gameMessageElement.style.display = "none";
}
function resetGame() {
    score = 0;
    currentLevel = 1;
    document.getElementById("scoreDisplay").textContent = "Score: ".concat(score);
    world.bodies = [];
    world.addBody(ball);
    world.addBody(paddle);
    startLevel();
    gameOver = false;
}
startLevel();
canvas.addEventListener("mousedown", function () {
    if (!gameRunning && !gameOver) {
        launchRequested = true;
    }
    else if (gameOver) {
        resetGame();
    }
});
canvas.addEventListener("mousemove", function (e) {
    if (!gameRunning)
        return;
    var rect = canvas.getBoundingClientRect();
    var mouseX = e.clientX - rect.left;
    paddle.position.x = Math.max(paddle.width / 2, Math.min(mouseX, canvas.width - paddle.width / 2));
});
function checkWinLoss() {
    if (isLevelTransitioning)
        return;
    var bricksRemaining = world.bodies.filter(function (b) { return b.type === "brick"; }).length;
    if (bricksRemaining === 0) {
        if (currentLevel < maxLevels) {
            isLevelTransitioning = true;
            currentLevel++;
            gameMessageElement.textContent = "Level ".concat(currentLevel - 1, " Complete!");
            gameMessageElement.style.display = "block";
            setTimeout(startLevel, 1500);
        }
        else {
            gameOver = true;
            gameMessageElement.textContent = "You win";
            gameMessageElement.style.display = "block";
        }
    }
    if (ball.position.y > canvas.height) {
        gameOver = true;
        gameMessageElement.textContent = "Game Over";
        gameMessageElement.style.display = "block";
    }
}
function gameLoop() {
    ctx === null || ctx === void 0 ? void 0 : ctx.clearRect(0, 0, canvas.width, canvas.height);
    var dt = 16 / 1000;
    if (launchRequested) {
        ball.velocity.y = -250;
        ball.velocity.x = 100;
        gameRunning = true;
        launchRequested = false;
    }
    if (gameRunning) {
        world.update(dt);
        checkWinLoss();
    }
    else if (!gameOver) {
        ball.position.x = paddle.position.x;
    }
    for (var _i = 0, _a = world.bodies; _i < _a.length; _i++) {
        var body = _a[_i];
        body.draw(ctx);
    }
    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

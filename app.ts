class Vector {
  constructor(public x: number = 0, public y: number = 0) {}

  add(v: Vector) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v: Vector) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  scale(s: number) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  length() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }

  lengthSq() {
    return Math.pow(this.x, 2) + Math.pow(this.y, 2);
  }

  normalize() {
    const magnitude = this.length();
    if (magnitude > 0) this.scale(1 / magnitude);
    return this;
  }

  copy() {
    return new Vector(this.x, this.y);
  }

  static sub(v1: Vector, v2: Vector) {
    return new Vector(v1.x - v2.x, v1.y - v2.y);
  }

  static dot(v1: Vector, v2: Vector) {
    return v1.x * v2.x + v1.y * v2.y;
  }
}

class Body {
  force: Vector;
  radius: number;
  isStatic: boolean;
  type: string;

  constructor(
    public position: Vector,
    public velocity = new Vector(),
    public mass = 1,
    public restitution = 0.7,
    public color = "red",
    public shape = "circle",
    public width = 40,
    public height = 40
  ) {
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

  applyForce(force: Vector) {
    this.force.add(force);
  }

  update(dt: number) {
    if (this.isStatic) return;

    const acceleration = this.force.copy().scale(1 / this.mass);
    this.velocity.add(acceleration.scale(dt));
    this.position.add(this.velocity.copy().scale(dt));
    this.force = new Vector();
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    if (this.shape === "circle") {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === "square") {
      ctx.fillRect(
        this.position.x - this.width / 2,
        this.position.y - this.height / 2,
        this.width,
        this.height
      );
    }
  }
}

class PhysicsWorld {
  bodies: Body[];
  constructor(
    private canvas: HTMLCanvasElement,
    private gravity = new Vector(0, 0)
  ) {
    this.bodies = [];
  }

  addBody(body: Body) {
    this.bodies.push(body);
  }

  clearBricks() {
    this.bodies = this.bodies.filter((body) => body.type !== "brick");
  }

  update(dt: number) {
    for (const body of this.bodies) {
      body.applyForce(this.gravity.copy().scale(body.mass));
      body.update(dt);
    }

    this.checkCollisions();
    this.checkWallCollisions();
  }

  checkWallCollisions() {
    for (const body of this.bodies) {
      if (body.isStatic) continue;

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
  }

  checkCollisions() {
    const bricks = this.bodies.filter((body) => body.type === "brick");
    const ball = this.bodies.find((body) => body.type === "ball");
    const paddle = this.bodies.find((body) => body.type === "paddle");

    if (!ball || !paddle) return;

    const paddleRect = {
      x: paddle.position.x - paddle.width / 2,
      y: paddle.position.y - paddle.height / 2,
      width: paddle.width,
      height: paddle.height,
    };

    const ballCircle = {
      x: ball.position.x,
      y: ball.position.y,
      radius: ball.radius,
    };

    const collision = this.checkCircleRectCollision(ballCircle, paddleRect);
    if (collision.hit) {
      const normal = collision.normal;
      const relativeVelocity = Vector.sub(ball.velocity, paddle.velocity);
      const velocityAlongNormal = Vector.dot(relativeVelocity, normal!);

      if (velocityAlongNormal < 0) {
        ball.velocity.sub(
          normal!.scale(2 * velocityAlongNormal * ball.restitution)
        );
      }
    }

    for (let i = bricks.length - 1; i >= 0; i--) {
      const brick = bricks[i];
      const brickRect = {
        x: brick.position.x - brick.width / 2,
        y: brick.position.y - brick.height / 2,
        width: brick.width,
        height: brick.height,
      };

      const collision = this.checkCircleRectCollision(ballCircle, brickRect);

      if (collision.hit) {
        const normal = collision.normal ?? new Vector();
        const relativeVelocity = ball.velocity;
        const velocityAlongNormal = Vector.dot(relativeVelocity, normal!);

        if (velocityAlongNormal < 0) {
          ball.velocity.sub(
            normal!.scale(2 * velocityAlongNormal * ball.restitution)
          );
        }

        score += 10;
        document.getElementById(
          "scoreDisplay"
        )!.textContent = `Score: ${score}`;
        this.bodies.splice(this.bodies.indexOf(brick), 1);
        break;
      }
    }
  }

  checkCircleRectCollision(
    circle: {
      x: number;
      y: number;
      radius: number;
    },
    rect: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    const distanceSq = Math.pow(dx, 2) + Math.pow(dy, 2);

    const hit = distanceSq <= circle.radius * circle.radius;

    if (hit) {
      const normal = new Vector(
        circle.x - closestX,
        circle.y - closestY
      ).normalize();
      return { hit: true, normal: normal };
    }
    return { hit: false };
  }
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
const gameMessageElement = document.getElementById("gameMessage");

let gameRunning = false;
let gameOver = false;
let launchRequested = false;
let score = 0;
let currentLevel = 1;
let maxLevels = 3;
let isLevelTransitioning = false;

function resizeCanvas() {
  canvas.width = window.innerWidth * 0.9;
  canvas.height = window.innerHeight * 0.9;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const world = new PhysicsWorld(canvas);

const ball = new Body(
  new Vector(canvas.width / 2, canvas.height - 50),
  new Vector(0, 0),
  1,
  1,
  "red",
  "circle"
);
ball.type = "ball";
world.addBody(ball);

const paddle = new Body(
  new Vector(canvas.width / 2, canvas.height - 20),
  new Vector(0, 0),
  Infinity,
  1,
  "black",
  "square",
  100,
  20
);

paddle.isStatic = true;
paddle.type = "paddle";
world.addBody(paddle);

function createBricks(level) {
  const brickWidth = 80;
  const brickHeight = 20;
  const brickPadding = 10;
  const brickOffsetTop = 30;
  const brickOffsetLeft = 30;
  const colors = [
    "#f44336",
    "#e91e63",
    "#9c27b0",
    "#673ab7",
    "#3f51b5",
    "#2196f3",
    "#03a9f4",
  ];

  let layout;
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

  const numCols = layout[0].length;
  const numRows = layout.length;
  const horizontalOffset =
    (canvas.width - (numCols * brickWidth + (numCols - 1) * brickPadding)) / 2;

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const brickX =
        c * (brickWidth + brickPadding) + horizontalOffset + brickWidth / 2;
      const brickY =
        r * (brickHeight + brickPadding) + brickPadding + brickHeight / 2;
      const brick = new Body(
        new Vector(brickX, brickY),
        new Vector(0, 0),
        Infinity,
        1,
        colors[r % colors.length],
        "square",
        brickWidth,
        brickHeight
      );
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
  document.getElementById(
    "levelDisplay"
  )!.textContent = `Level: ${currentLevel}`;
  gameMessageElement!.style.display = "none";
}

function resetGame() {
  score = 0;
  currentLevel = 1;
  document.getElementById("scoreDisplay")!.textContent = `Score: ${score}`;
  world.bodies = [];
  world.addBody(ball);
  world.addBody(paddle);
  startLevel();
  gameOver = false;
}

startLevel();

canvas.addEventListener("mousedown", () => {
  if (!gameRunning && !gameOver) {
    launchRequested = true;
  } else if (gameOver) {
    resetGame();
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (!gameRunning) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  paddle.position.x = Math.max(
    paddle.width / 2,
    Math.min(mouseX, canvas.width - paddle.width / 2)
  );
});

function checkWinLoss() {
  if (isLevelTransitioning) return;

  const bricksRemaining = world.bodies.filter((b) => b.type === "brick").length;
  if (bricksRemaining === 0) {
    if (currentLevel < maxLevels) {
      isLevelTransitioning = true;
      currentLevel++;
      gameMessageElement!.textContent = `Level ${currentLevel - 1} Complete!`;
      gameMessageElement!.style.display = "block";
      setTimeout(startLevel, 1500);
    } else {
      gameOver = true;
      gameMessageElement!.textContent = "You win";
      gameMessageElement!.style.display = "block";
    }
  }

  if (ball.position.y > canvas.height) {
    gameOver = true;
    gameMessageElement!.textContent = "Game Over";
    gameMessageElement!.style.display = "block";
  }
}

function gameLoop() {
  ctx?.clearRect(0, 0, canvas.width, canvas.height);

  const dt = 16 / 1000;

  if (launchRequested) {
    ball.velocity.y = -250;
    ball.velocity.x = 100;
    gameRunning = true;
    launchRequested = false;
  }

  if (gameRunning) {
    world.update(dt);
    checkWinLoss();
  } else if (!gameOver) {
    ball.position.x = paddle.position.x;
  }

  for (const body of world.bodies) {
    body.draw(ctx!);
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

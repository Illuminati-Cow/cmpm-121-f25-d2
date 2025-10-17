interface Point {
  x: number;
  y: number;
}
interface Line {
  points: Array<Point>;
}

const eventBus = new EventTarget();
const mainCanvas = document.getElementById("main-canvas") as HTMLCanvasElement;
const ctx = mainCanvas.getContext("2d")!;
let isDrawing = false;
const dpr = globalThis.window.devicePixelRatio || 1;
mainCanvas.width = 1000 * dpr;
mainCanvas.height = 1000 * dpr;
ctx.scale(dpr, dpr);

const leftToolbar = document.getElementById("left-toolbar") as HTMLDivElement;
// const _rightToolbar = document.getElementById("right-toolbar") as HTMLDivElement;
const lines: Array<Line> = [];
const undoneLines: Array<Line> = [];

eventBus.addEventListener("canvas-changed", draw);

const drawingTools = {
  clear: {
    name: "Clear Canvas",
    icon: "🧽",
    tooltip: "Clear the entire canvas",
    keyboardShortcut: "KeyC",
    action: () => {
      lines.splice(0);
      eventBus.dispatchEvent(new Event("canvas-changed"));
    },
  },
  undo: {
    name: "Undo",
    icon: "↩️",
    tooltip: "Undo the last action",
    keyboardShortcut: "KeyZ",
    action: undo,
  },
  redo: {
    name: "Redo",
    icon: "↪️",
    tooltip: "Redo the last undone action",
    keyboardShortcut: "KeyY",
    action: redo,
  },
};

for (const [id, tool] of Object.entries(drawingTools)) {
  const button = document.createElement("button");
  button.id = id;
  button.title = `[${tool.keyboardShortcut}] ${tool.tooltip}`;
  button.textContent = tool.icon;
  button.addEventListener("click", tool.action);
  leftToolbar.appendChild(button);
}

mainCanvas.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  isDrawing = true;
  lines.push({ points: [] });
});

mainCanvas.addEventListener("mouseup", (event) => {
  if (event.button !== 0) return;
  isDrawing = false;
});

mainCanvas.addEventListener("mousemove", (event) => {
  if (!isDrawing) return;
  const point = screenToCanvasCoords(event.clientX, event.clientY);
  lines[lines.length - 1]!.points.push(point);
  eventBus.dispatchEvent(new Event("canvas-changed"));
});

mainCanvas.addEventListener("mouseenter", (event) => {
  if (event.buttons === 1) {
    isDrawing = true;
  }
});

mainCanvas.addEventListener("mouseleave", () => {
  isDrawing = false;
});

document.addEventListener("keydown", (event) => {
  for (const tool of Object.values(drawingTools)) {
    if (event.code === tool.keyboardShortcut) {
      tool.action();
    }
  }
});

function draw() {
  ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 5;
  for (const line of lines) {
    ctx.beginPath();
    if (line.points.length === 0) {
      continue;
    }
    ctx.moveTo(line.points[0]!.x, line.points[0]!.y);
    for (const point of line.points) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }
}

function undo() {
  if (lines.length === 0) return;
  undoneLines.push(lines.pop()!);
  eventBus.dispatchEvent(new Event("canvas-changed"));
}

function redo() {
  if (undoneLines.length === 0) return;
  lines.push(undoneLines.pop()!);
  eventBus.dispatchEvent(new Event("canvas-changed"));
}

//#region Utilities
function screenToCanvasCoords(x: number, y: number) {
  const rect = mainCanvas.getBoundingClientRect();
  return {
    x: (x - rect.left) * (mainCanvas.width / rect.width) / dpr,
    y: (y - rect.top) * (mainCanvas.height / rect.height) / dpr,
  };
}
//#endregion

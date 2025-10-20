interface Point {
  x: number;
  y: number;
}

interface Line {
  points: Array<Point>;
}

interface Tool {
  name: string;
  icon: string;
  tooltip: string;
  keyboardShortcut: string;
}

interface DrawingTool extends Tool {
  makeCommand: () => DrawCommand;
}

interface EditingTool extends Tool {
  action: () => void;
}

interface Command {
  execute(ctx: CanvasRenderingContext2D): void;
}

interface DrawCommand extends Command {
  addPoint(point: Point): void;
}

class MarkerCommand implements DrawCommand {
  #line: Line;

  constructor(line: Line) {
    this.#line = line;
  }

  execute(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 5;
    if (this.#line.points.length === 0) {
      return;
    }
    ctx.moveTo(this.#line.points[0]!.x, this.#line.points[0]!.y);
    for (const point of this.#line.points) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  addPoint(point: Point) {
    this.#line.points.push(point);
  }
}

class PencilCommand implements DrawCommand {
  #line: Line;

  constructor(line: Line) {
    this.#line = line;
  }

  execute(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 2;
    if (this.#line.points.length === 0) {
      return;
    }
    ctx.moveTo(this.#line.points[0]!.x, this.#line.points[0]!.y);
    for (const point of this.#line.points) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  addPoint(point: Point) {
    this.#line.points.push(point);
  }
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
const rightToolbar = document.getElementById("right-toolbar") as HTMLDivElement;
const commands: Array<DrawCommand> = [];
const undoneCommands: Array<DrawCommand> = [];
let currentCommand: DrawCommand | null = null;
let currentTool: DrawingTool | null = null;

eventBus.addEventListener("canvas-changed", draw);

const editingTools: Array<EditingTool> = [
  {
    name: "Clear Canvas",
    icon: "🧽",
    tooltip: "Clear the entire canvas",
    keyboardShortcut: "KeyC",
    action: () => {
      undoneCommands.splice(0);
      commands.splice(0);
      currentCommand = null;
      eventBus.dispatchEvent(new Event("canvas-changed"));
    },
  },
  {
    name: "Undo",
    icon: "↩️",
    tooltip: "Undo the last action",
    keyboardShortcut: "KeyZ",
    action: undo,
  },
  {
    name: "Redo",
    icon: "↪️",
    tooltip: "Redo the last undone action",
    keyboardShortcut: "KeyY",
    action: redo,
  },
];

const drawingTools: Array<DrawingTool> = [
  {
    name: "Marker",
    icon: "🖊️",
    tooltip: "Draw with the marker tool",
    keyboardShortcut: "KeyM",
    makeCommand: () => new MarkerCommand({ points: [] }),
  },
  {
    name: "Pencil",
    icon: "✏️",
    tooltip: "Draw with the pencil tool",
    keyboardShortcut: "KeyP",
    makeCommand: () => new PencilCommand({ points: [] }),
  },
];

for (const tool of editingTools) {
  createToolbarButton(tool, leftToolbar);
}

for (const tool of drawingTools) {
  createToolbarButton(tool, rightToolbar);
}

mainCanvas.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  if (currentTool === null) return;
  isDrawing = true;
  currentCommand = currentTool.makeCommand();
  commands.push(currentCommand);
});

mainCanvas.addEventListener("mouseup", (event) => {
  if (event.button !== 0) return;
  isDrawing = false;
  currentCommand = null;
  undoneCommands.splice(0);
});

mainCanvas.addEventListener("mousemove", (event) => {
  if (!isDrawing || currentCommand === null) return;
  const point = screenToCanvasCoords(event.clientX, event.clientY);
  currentCommand.addPoint(point);
  eventBus.dispatchEvent(new Event("canvas-changed"));
});

mainCanvas.addEventListener("mouseenter", (_event) => {
  // No action needed on mouse enter for now
});

mainCanvas.addEventListener("mouseleave", () => {
  isDrawing = false;
  currentCommand = null;
});

document.addEventListener("keydown", (event) => {
  for (const tool of Object.values(editingTools)) {
    if (event.code === tool.keyboardShortcut) {
      tool.action();
    }
  }
});

function createToolbarButton(tool: Tool, toolbar: HTMLDivElement) {
  const button = document.createElement("button");
  button.id = tool.name.toLowerCase().replace(/\s+/g, "-") + "-button";
  button.title = `[${tool.keyboardShortcut}] ${tool.tooltip}`;
  button.textContent = tool.icon;
  if ("action" in tool) {
    button.addEventListener("click", () => (tool as EditingTool).action());
  } else if (tool as DrawingTool) {
    button.addEventListener("click", () => {
      selectDrawingTool(tool, button, toolbar);
    });
  }
  toolbar.appendChild(button);
}

function selectDrawingTool(
  tool: Tool,
  button: HTMLButtonElement,
  toolbar: HTMLDivElement,
) {
  currentTool = tool as DrawingTool;
  button.classList.add("active-tool");
  // Deactivate other buttons
  for (const sibling of toolbar.children) {
    if (sibling !== button) {
      sibling.classList.remove("active-tool");
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
  for (const command of commands) {
    command.execute(ctx);
  }
}

function undo() {
  if (commands.length === 0) return;
  undoneCommands.push(commands.pop()!);
  eventBus.dispatchEvent(new Event("canvas-changed"));
}

function redo() {
  if (undoneCommands.length === 0) return;
  commands.push(undoneCommands.pop()!);
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

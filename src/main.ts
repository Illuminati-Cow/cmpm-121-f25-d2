import {
  Command,
  DrawCommand,
  DrawCursorCommand,
  MarkerCommand,
  PencilCommand,
} from "./Command.ts";
import {
  createToolbarButton,
  currentTool,
  DrawingTool,
  EditingTool,
} from "./Tools.ts";

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
const commands: Array<Command> = [];
const undoneCommands: Array<Command> = [];
let currentCommand: DrawCommand | null = null;
let cursorCommand: DrawCursorCommand | null = null;

eventBus.addEventListener("canvas-changed", draw);
eventBus.addEventListener("tool-changed", () => {
  cursorCommand = new DrawCursorCommand({ x: 0, y: 0 }, currentTool!);
  console.log("Tool changed to:", currentTool?.name);
});
// Draw cursor on tool move
eventBus.addEventListener("tool-moved", (baseEvent) => {
  if (cursorCommand === null) return;
  const moveEvent = (baseEvent as CustomEvent<MouseEvent>).detail as MouseEvent;
  const point = screenToCanvasCoords(moveEvent.clientX, moveEvent.clientY);
  cursorCommand.recordPoint(point);
  draw();
  // Draw the cursor on top
  cursorCommand.execute(ctx);
});

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
    makeCommand: (point) => new MarkerCommand({ points: [point] }),
  },
  {
    name: "Pencil",
    icon: "✏️",
    tooltip: "Draw with the pencil tool",
    keyboardShortcut: "KeyP",
    makeCommand: (point) => new PencilCommand({ points: [point] }),
  },
];

for (const tool of editingTools) {
  createToolbarButton(tool, leftToolbar, eventBus);
}

for (const tool of drawingTools) {
  createToolbarButton(tool, rightToolbar, eventBus);
}

mainCanvas.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  if (currentTool === null) return;
  isDrawing = true;
  const point = screenToCanvasCoords(event.clientX, event.clientY);
  currentCommand = currentTool.makeCommand({
    x: point.x,
    y: point.y,
  });
  commands.push(currentCommand);
  mainCanvas.style.cursor = "none";
  eventBus.dispatchEvent(new Event("canvas-changed"));
});

mainCanvas.addEventListener("mouseup", (event) => {
  if (event.button !== 0) return;
  isDrawing = false;
  currentCommand = null;
  undoneCommands.splice(0);
  eventBus.dispatchEvent(
    new CustomEvent<MouseEvent>("tool-moved", { detail: event }),
  );
});

mainCanvas.addEventListener("mousemove", (event) => {
  if (currentTool === null) return;
  mainCanvas.style.cursor = "none";
  if (!isDrawing) {
    eventBus.dispatchEvent(
      new CustomEvent<MouseEvent>("tool-moved", { detail: event }),
    );
    return;
  }
  if (currentCommand === null) return;
  const point = screenToCanvasCoords(event.clientX, event.clientY);
  currentCommand.recordPoint(point);
  eventBus.dispatchEvent(new Event("canvas-changed"));
});

mainCanvas.addEventListener("mouseenter", (_event) => {
  // No action needed on mouse enter for now
});

mainCanvas.addEventListener("mouseleave", () => {
  isDrawing = false;
  currentCommand = null;
  mainCanvas.style.cursor = "default";
});

document.addEventListener("keydown", (event) => {
  for (const tool of Object.values(editingTools)) {
    if (event.code === tool.keyboardShortcut) {
      tool.action();
    }
  }
});

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

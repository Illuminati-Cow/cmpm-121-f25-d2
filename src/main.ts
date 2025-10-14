const mainCanvas = document.getElementById("main-canvas") as HTMLCanvasElement;
const ctx = mainCanvas.getContext("2d")!;
let isDrawing = false;
const dpr = globalThis.window.devicePixelRatio || 1;
mainCanvas.width = 1000 * dpr;
mainCanvas.height = 1000 * dpr;
ctx.scale(dpr, dpr);

const leftToolbar = document.getElementById("left-toolbar") as HTMLDivElement;
// const _rightToolbar = document.getElementById("right-toolbar") as HTMLDivElement;

const drawingTools = {
  clear: {
    name: "Clear Canvas",
    icon: "🧽",
    tooltip: "Clear the entire canvas",
    keyboardShortcut: "KeyC",
    action: () => {
      ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    },
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
  console.log("Mouse down at", event.clientX, event.clientY);
});

mainCanvas.addEventListener("mouseup", (event) => {
  if (event.button !== 0) return;
  isDrawing = false;
  ctx.beginPath(); // Reset the path so lines don't connect
});

mainCanvas.addEventListener("mousemove", (event) => {
  if (!isDrawing) return;

  const { x, y } = screenToCanvasCoords(event.clientX, event.clientY);

  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
});

mainCanvas.addEventListener("mouseenter", (event) => {
  if (event.buttons === 1) {
    isDrawing = true;
  }
});

mainCanvas.addEventListener("mouseleave", () => {
  isDrawing = false;
  ctx.beginPath(); // Reset the path so lines don't connect
});

document.addEventListener("keydown", (event) => {
  for (const tool of Object.values(drawingTools)) {
    if (event.code === tool.keyboardShortcut) {
      tool.action();
    }
  }
});

//#region Utilities
function screenToCanvasCoords(x: number, y: number) {
  const rect = mainCanvas.getBoundingClientRect();
  return {
    x: (x - rect.left) * (mainCanvas.width / rect.width) / dpr,
    y: (y - rect.top) * (mainCanvas.height / rect.height) / dpr,
  };
}
//#endregion

import {
  Command,
  DrawCommand,
  DrawCursorCommand,
  DrawPoint,
  DrawStickerCommand,
  MarkerCommand,
  PencilCommand,
} from "./Command.ts";
import {
  createToolbarButton,
  currentTool,
  DrawingTool,
  EditingTool,
  Sticker,
  StickerTool,
} from "./Tools.ts";

const eventBus = new EventTarget();
const mainCanvas = document.getElementById("main-canvas") as HTMLCanvasElement;
const ctx = mainCanvas.getContext("2d")!;
const dpr = globalThis.window.devicePixelRatio || 1;
mainCanvas.width = 512 * dpr;
mainCanvas.height = 512 * dpr;
ctx.scale(dpr, dpr);

const leftToolbar = document.getElementById("left-toolbar") as HTMLDivElement;
const rightToolbar = document.getElementById("right-toolbar") as HTMLDivElement;
const toolOptionsWindow = document.getElementById(
  "tool-options-window",
) as HTMLDivElement;

const commands: Array<Command> = [];
const undoneCommands: Array<Command> = [];
let currentCommand: DrawCommand | null = null;
let cursorCommand: DrawCursorCommand | null = null;
const stickers: Array<Sticker> = [
  { image: await DrawStickerCommand.createImageFromText("😀"), scale: 1 },
  { image: await DrawStickerCommand.createImageFromText("🚀"), scale: 1 },
  { image: await DrawStickerCommand.createImageFromText("🌟"), scale: 1 },
];

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

// Make tool options window draggable
{
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  toolOptionsWindow.style.left = mainCanvas.offsetLeft + "px";
  toolOptionsWindow.style.top = mainCanvas.offsetTop + "px";

  toolOptionsWindow.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    isDragging = true;
    offsetX = event.clientX - toolOptionsWindow.offsetLeft;
    offsetY = event.clientY - toolOptionsWindow.offsetTop;
  });

  document.addEventListener("mousemove", (event) => {
    if (!isDragging) return;
    toolOptionsWindow.style.left = `${event.clientX - offsetX}px`;
    toolOptionsWindow.style.top = `${event.clientY - offsetY}px`;
  });

  document.addEventListener("mouseup", (event) => {
    if (event.button !== 0) return;
    isDragging = false;
  });

  eventBus.addEventListener("tool-changed", (event) => {
    const newTool = (event as CustomEvent).detail.newTool;
    const contentDiv = document.getElementById(
      "tool-options-content",
    ) as HTMLDivElement;
    contentDiv.innerHTML = "";
    console.log("Updating tool options window for tool:", newTool.name);
    switch (newTool.name) {
      case "Sticker":
        initializeStickerToolOptions();
        break;
      case "Marker":
      case "Pencil":
        initializeDrawingToolOptions(newTool as DrawingTool);
        break;
      default:
        // No options to show
        contentDiv.textContent = "No options available for this tool.";
        break;
    }
  });
}

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
  {
    name: "Tool Options",
    icon: "🧰",
    tooltip: "Adjust tool options",
    keyboardShortcut: "KeyO",
    action: () => {
      toolOptionsWindow.style.display =
        toolOptionsWindow.style.display === "block" ? "none" : "block";
    },
  },
  {
    name: "Export",
    icon: "💾",
    tooltip: "Export the canvas as an image",
    keyboardShortcut: "KeyE",
    action: () => {
      const printCanvas = document.createElement("canvas");
      printCanvas.width = 1024;
      printCanvas.height = 1024;
      const printCtx = printCanvas.getContext("2d")!;
      printCtx.scale(
        2,
        2,
      );
      printCtx.fillStyle = "white";
      printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);
      for (const command of commands) {
        command.execute(printCtx);
      }
      const link = document.createElement("a");
      link.download = "canvas.png";
      link.href = printCanvas.toDataURL("image/png");
      link.click();
    },
  },
];

const stickerTool: StickerTool = {
  name: "Sticker",
  icon: "📌",
  tooltip: "Place a sticker",
  keyboardShortcut: "KeyS",
  sticker: { image: new Image(), scale: 1.0 },
  scale: 1.0,
  color: "#000000",
  canLeaveCanvas: true,
  makeCommand(point: DrawPoint): DrawCommand {
    const stickerCommand = new DrawStickerCommand(point);
    stickerCommand.setImage(stickerTool.sticker.image);
    stickerCommand.setScale(stickerTool.scale * stickerTool.sticker.scale);
    return stickerCommand;
  },
};

const drawingTools: Array<DrawingTool> = [
  {
    name: "Marker",
    icon: "🖊️",
    tooltip: "Draw with the marker tool",
    keyboardShortcut: "KeyM",
    scale: 3,
    color: "#000000",
    makeCommand(point: DrawPoint): DrawCommand {
      return new MarkerCommand({ points: [point] });
    },
  },
  {
    name: "Pencil",
    icon: "✏️",
    tooltip: "Draw with the pencil tool",
    keyboardShortcut: "KeyP",
    scale: 1,
    color: "#252525ff",
    makeCommand(point: DrawPoint): DrawCommand {
      return new PencilCommand({ points: [point] });
    },
  },
  stickerTool,
];

for (const tool of editingTools) {
  createToolbarButton(tool, leftToolbar, eventBus);
}

for (const tool of drawingTools) {
  createToolbarButton(tool, rightToolbar, eventBus);
}

// Handle canvas mouse events
{
  let isDrawing = false;
  mainCanvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    if (currentTool === null) return;
    isDrawing = true;
    const point = screenToCanvasCoords(event.clientX, event.clientY);
    currentCommand = currentTool.makeCommand({
      x: point.x,
      y: point.y,
      color: currentTool.color,
      scale: currentTool.scale,
    });
    commands.push(currentCommand!);
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
    currentCommand.recordPoint(point, currentTool.color, currentTool.scale);
    eventBus.dispatchEvent(new Event("canvas-changed"));
  });

  mainCanvas.addEventListener("mouseenter", (event) => {
    if (currentTool === null) return;
    cursorCommand = new DrawCursorCommand({ x: 0, y: 0 }, currentTool!);
    eventBus.dispatchEvent(
      new CustomEvent<MouseEvent>("tool-moved", {
        detail: event as MouseEvent,
      }),
    );
  });

  mainCanvas.addEventListener("mouseleave", () => {
    if (currentTool?.canLeaveCanvas) return;
    isDrawing = false;
    currentCommand = null;
    mainCanvas.style.cursor = "default";
    if (cursorCommand === null) return;
    cursorCommand = null;
    eventBus.dispatchEvent(new Event("canvas-changed"));
  });
}

document.addEventListener("keydown", (event) => {
  for (const tool of Object.values(editingTools)) {
    if (event.code === tool.keyboardShortcut) {
      tool.action();
    }
  }
});

function initializeStickerToolOptions() {
  const contentDiv = document.getElementById(
    "tool-options-content",
  ) as HTMLDivElement;
  contentDiv.classList.add("sticker-tool-options");
  contentDiv.innerHTML = "";
  const stickerDisplayDiv = document.createElement("div");
  stickerDisplayDiv.classList.add("sticker-display");
  contentDiv.appendChild(stickerDisplayDiv);
  const addStickerFromFileButton = document.createElement("button");
  addStickerFromFileButton.textContent = "📂";
  addStickerFromFileButton.title = "Add Sticker From File";
  stickerDisplayDiv.appendChild(addStickerFromFileButton);
  const addNewStickerButton = document.createElement("button");
  addNewStickerButton.textContent = "➕";
  addNewStickerButton.title = "Add New Sticker";
  stickerDisplayDiv.appendChild(addNewStickerButton);
  addStickerFromFileButton.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.click();
    // Listen for file selection and load the sticker, then add it to the sticker options
    input.addEventListener("change", () => {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const readFileAsDataURL = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        };
        readFileAsDataURL(file).then((dataURL) => {
          addStickerFromFileButton.disabled = true;
          const img = new Image();
          img.onload = () => {
            const sticker = {
              image: img,
              scale: img.naturalWidth > 128 ? 128 / img.naturalWidth : 1.0,
            };
            stickers.push(sticker);
            addStickerOption(sticker);
            selectSticker(sticker);
          };
          img.width = 100;
          img.src = dataURL;
        }).catch((error) => {
          console.error("Error reading sticker file:", error);
        }).finally(() => {
          addStickerFromFileButton.disabled = false;
        });
      }
    });
  });

  addNewStickerButton.addEventListener("click", () => {
    const stickerText = prompt("Enter emoji or text for the new sticker:");
    if (stickerText && stickerText.trim().length > 0) {
      const imgPromise = DrawStickerCommand.createImageFromText(
        stickerText.trim(),
      );
      imgPromise.then((img) => {
        const sticker = { image: img, scale: 1 };
        stickers.push(sticker);
        addStickerOption(sticker);
        selectSticker(sticker);
      });
    }
  });

  updateStickerDisplay();

  function updateStickerDisplay() {
    // Clear existing stickers except the add button
    stickerDisplayDiv
      .querySelectorAll(".sticker-option")
      .forEach((el) => el.remove());
    for (const sticker of stickers) {
      addStickerOption(sticker);
    }
  }

  function addStickerOption(sticker: Sticker): HTMLImageElement {
    const image = sticker.image;
    image.classList.add("sticker-option");
    image.title = "Select this sticker";
    image.id = "sticker-option-" + stickers.length;
    image.addEventListener("click", () => selectSticker(sticker));
    stickerDisplayDiv.appendChild(image);
    return image;
  }
}

function selectSticker(sticker: Sticker) {
  stickerTool.sticker = sticker;
  const stickerDisplayDiv = document.querySelector(
    ".sticker-display",
  ) as HTMLDivElement;
  stickerDisplayDiv.querySelectorAll(".sticker-option").forEach((el) => {
    if (el === sticker.image) {
      el.classList.add("selected-sticker");
    } else {
      el.classList.remove("selected-sticker");
    }
  });
}

function initializeDrawingToolOptions(tool: DrawingTool) {
  const contentDiv = document.getElementById(
    "tool-options-content",
  ) as HTMLDivElement;
  contentDiv.classList.add("drawing-tool-options");
  contentDiv.innerHTML = "";
  // For simplicity, we will just add a color picker and size slider for drawing tools
  const colorLabel = document.createElement("label");
  colorLabel.textContent = "Color: ";
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = "#000000";
  colorLabel.appendChild(colorInput);
  contentDiv.appendChild(colorLabel);

  const sizeLabel = document.createElement("label");
  sizeLabel.textContent = " Size: ";
  const sizeInput = document.createElement("input");
  sizeInput.type = "range";
  sizeInput.min = "1";
  sizeInput.max = "50";
  sizeInput.value = "5";
  sizeLabel.appendChild(sizeInput);
  contentDiv.appendChild(sizeLabel);

  // Update tool properties on input change
  colorInput.addEventListener("input", () => {
    tool.color = colorInput.value;
  });
  sizeInput.addEventListener("input", () => {
    tool.scale = parseInt(sizeInput.value, 10);
  });
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

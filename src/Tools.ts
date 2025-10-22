import { DrawCommand, DrawPoint } from "./Command.ts";

export let currentTool: DrawingTool | null = null;
export interface Tool {
  name: string;
  icon: string;
  tooltip: string;
  keyboardShortcut: string;
}
export interface DrawingTool extends Tool {
  makeCommand(point: DrawPoint): DrawCommand;
  canLeaveCanvas?: boolean;
  scale: number;
  color: string;
}
export type Sticker = {
  image: HTMLImageElement;
  scale: number;
};
export interface StickerTool extends DrawingTool {
  sticker: Sticker;
}
export interface EditingTool extends Tool {
  action: () => void;
}
export function createToolbarButton(
  tool: Tool,
  toolbar: HTMLDivElement,
  eventBus: EventTarget,
) {
  const button = document.createElement("button");
  button.id = tool.name.toLowerCase().replace(/\s+/g, "-") + "-button";
  button.title = `[${tool.keyboardShortcut}] ${tool.tooltip}`;
  button.textContent = tool.icon;
  if ("action" in tool) {
    button.addEventListener("click", () => (tool as EditingTool).action());
  } else if (tool as DrawingTool) {
    button.addEventListener("click", () => {
      selectDrawingTool(tool, button, toolbar, eventBus);
    });
  }
  toolbar.appendChild(button);
}

function selectDrawingTool(
  tool: Tool,
  button: HTMLButtonElement,
  toolbar: HTMLDivElement,
  eventBus: EventTarget,
) {
  currentTool = tool as DrawingTool;
  eventBus.dispatchEvent(
    new CustomEvent("tool-changed", { detail: { newTool: tool } }),
  );
  button.classList.add("active-tool");
  // Deactivate other buttons
  for (const sibling of toolbar.children) {
    if (sibling !== button) {
      sibling.classList.remove("active-tool");
    }
  }
}

import { DrawingTool } from "./Tools.ts";

export interface Point {
  x: number;
  y: number;
}
interface Line {
  points: Array<Point>;
}

export interface Command {
  execute(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  ): void;
}
export interface DrawCommand extends Command {
  recordPoint(point: Point): void;
}
export class DrawStickerCommand implements DrawCommand {
  #point: Point;
  #image: ImageBitmap | HTMLImageElement;

  constructor(
    point: Point,
    image: ImageBitmap | HTMLImageElement = new Image(32, 32),
  ) {
    this.#point = point;
    this.#image = image;
  }

  recordPoint(point: Point): DrawStickerCommand {
    this.#point = point;
    return this;
  }

  setImage(image: ImageBitmap | HTMLImageElement): DrawStickerCommand {
    this.#image = image;
    return this;
  }

  static async createImageFromText(text: string): Promise<HTMLImageElement> {
    const offscreen = new OffscreenCanvas(200, 50);
    const offscreenCtx = offscreen.getContext("2d")!;
    offscreenCtx.font = "30px Arial";
    offscreenCtx.fillStyle = "black";
    offscreenCtx.fillText(text, 10, 35);
    const img = new Image();
    const blob = await offscreen.convertToBlob();
    const url = URL.createObjectURL(blob);
    img.src = url;
    return new Promise((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        img.onerror = reject;
        reject(e);
      };
    });
  }

  execute(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(this.#image, this.#point.x, this.#point.y);
  }
}
export class DrawCursorCommand implements DrawCommand {
  #point: Point;
  #offscreenCanvas: OffscreenCanvas;
  tool: DrawingTool;

  constructor(point: Point, tool: DrawingTool) {
    this.#point = point;
    this.tool = tool;
    this.#offscreenCanvas = new OffscreenCanvas(32, 32);
  }

  execute(ctx: CanvasRenderingContext2D) {
    const offscreenCtx = this.#offscreenCanvas.getContext("2d")!;
    offscreenCtx.clearRect(
      0,
      0,
      this.#offscreenCanvas.width,
      this.#offscreenCanvas.height,
    );
    const command = this.tool.makeCommand({
      x: this.#offscreenCanvas.width / 2,
      y: this.#offscreenCanvas.height / 2,
    });
    command.execute(offscreenCtx);
    ctx.drawImage(
      this.#offscreenCanvas,
      this.#point.x - this.#offscreenCanvas.width / 2,
      this.#point.y - this.#offscreenCanvas.height / 2,
    );
  }

  recordPoint(point: Point) {
    this.#point = point;
  }
}
export class MarkerCommand implements DrawCommand {
  #line: Line;

  constructor(line: Line) {
    this.#line = line;
  }

  execute(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.lineWidth = 5;
    if (this.#line.points.length === 0) {
      return;
    }
    // Draw a dot if only one point as a one point line is not visible
    if (this.#line.points.length === 1) {
      const point = this.#line.points[0]!;
      ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.moveTo(this.#line.points[0]!.x, this.#line.points[0]!.y);
    for (const point of this.#line.points) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  recordPoint(point: Point) {
    this.#line.points.push(point);
  }
}
export class PencilCommand implements DrawCommand {
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
    if (this.#line.points.length === 1) {
      const point = this.#line.points[0]!;
      ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
      ctx.fillStyle = "gray";
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.moveTo(this.#line.points[0]!.x, this.#line.points[0]!.y);
    for (const point of this.#line.points) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  recordPoint(point: Point) {
    this.#line.points.push(point);
  }
}

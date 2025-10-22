import { DrawingTool } from "./Tools.ts";

export interface Point {
  x: number;
  y: number;
}
export interface StylizedPoint extends Point {
  color: string;
  scale: number;
}
interface Line {
  points: Array<StylizedPoint>;
}

export interface Command {
  execute(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  ): void;
}
export interface DrawCommand extends Command {
  recordPoint(point: Point, color: string, scale: number): void;
}
export class DrawStickerCommand implements DrawCommand {
  constructor(
    private point: Point,
    private image: ImageBitmap | HTMLImageElement = new Image(32, 32),
    private scale: number = 1.0,
  ) {}

  recordPoint(point: Point): DrawStickerCommand {
    this.point = point;
    return this;
  }

  execute(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.point.x, this.point.y);
    ctx.scale(this.scale, this.scale);
    ctx.drawImage(this.image, 0, 0);
    ctx.restore();
  }
}
export class DrawCursorCommand implements DrawCommand {
  #offscreenCanvas: OffscreenCanvas = new OffscreenCanvas(256, 256);

  constructor(private point: Point, public tool: DrawingTool) {}

  execute(ctx: CanvasRenderingContext2D) {
    const offscreenCtx = this.#offscreenCanvas.getContext("2d")!;
    offscreenCtx.globalAlpha = 0.8;
    offscreenCtx.clearRect(
      0,
      0,
      this.#offscreenCanvas.width,
      this.#offscreenCanvas.height,
    );
    const command = this.tool.makeCommand({
      x: this.#offscreenCanvas.width / 2,
      y: this.#offscreenCanvas.height / 2,
      color: this.tool.color,
      scale: this.tool.scale,
    });
    command.execute(offscreenCtx);
    ctx.drawImage(
      this.#offscreenCanvas,
      this.point.x - this.#offscreenCanvas.width / 2,
      this.point.y - this.#offscreenCanvas.height / 2,
    );
  }

  recordPoint(point: Point) {
    this.point = point;
  }
}
export class MarkerCommand implements DrawCommand {
  constructor(private line: Line) {}

  execute(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.beginPath();
    if (this.line.points.length === 0) {
      return;
    }
    // Draw a dot if only one point as a one point line is not visible
    if (this.line.points.length === 1) {
      const point = this.line.points[0]!;
      ctx.fillStyle = point.color;
      ctx.arc(
        point.x,
        point.y,
        this.line.points[0]!.scale / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.line.points[0]!.color;
    ctx.lineWidth = this.line.points[0]!.scale;
    ctx.moveTo(this.line.points[0]!.x, this.line.points[0]!.y);
    for (const point of this.line.points) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  recordPoint(point: Point, color: string, scale: number) {
    this.line.points.push({ ...point, color, scale });
  }
}
export class PencilCommand implements DrawCommand {
  constructor(private line: Line) {}

  execute(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.beginPath();
    if (this.line.points.length === 0) {
      return;
    }
    if (this.line.points.length === 1) {
      const point = this.line.points[0]!;
      ctx.arc(
        point.x,
        point.y,
        this.line.points[0]!.scale / 2,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = point.color;
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.line.points[0]!.color;
    ctx.lineWidth = this.line.points[0]!.scale;
    ctx.moveTo(this.line.points[0]!.x, this.line.points[0]!.y);
    for (const point of this.line.points) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  recordPoint(point: Point, color: string, scale: number) {
    this.line.points.push({ ...point, color, scale });
  }
}

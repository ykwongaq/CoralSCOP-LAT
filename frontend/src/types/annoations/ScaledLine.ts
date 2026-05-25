import { type Point } from "../Point";

export interface ScaledLine {
    id: number;
    start: Point;
    end: Point;
    scale: number;
    unit: "cm" | "mm" | "m";
}
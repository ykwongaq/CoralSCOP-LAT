// Re-export all types from subfolders for easy imports
export * from "./annoations";
export * from "./projectCreation";

// Re-export root-level types
export { type CompressedRLE } from "./CompressedRLE";
export { type default as Color } from "./Color";
export { type ImageData } from "./ImageData";
export { type Point } from "./Point";
export { type RLE } from "./RLE";
export * from "./api";
export { type default as CoralWatchCard, type ClassPoint } from "./CoralWatch/CoralWatchCard";

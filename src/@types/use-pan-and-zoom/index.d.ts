import { position, transform } from './utils';
export default function usePanZoom({
  enablePan,
  enableZoom,
  requireCtrlToZoom,
  disableWheel,
  panOnDrag,
  preventClickOnPan,
  zoomSensitivity,
  minZoom,
  maxZoom,
  minX,
  maxX,
  minY,
  maxY,
  initialZoom,
  initialPan,
  onPanStart,
  onPan,
  onPanEnd,
  onZoom,
}?: {
  enablePan?: boolean;
  enableZoom?: boolean;
  requireCtrlToZoom?: boolean;
  disableWheel?: boolean;
  panOnDrag?: boolean;
  preventClickOnPan?: boolean;
  zoomSensitivity?: number;
  minZoom?: number;
  maxZoom?: number;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  initialZoom?: number;
  initialPan?: position;
  onPanStart?: (touches: position[], transform: transform) => void;
  onPan?: (touches: position[], transform: transform) => void;
  onPanEnd?: () => void;
  onZoom?: (transform: transform) => void;
}): {
  container: HTMLElement | null;
  setContainer: (el: unknown) => (() => void) | undefined;
  transform: string;
  center: position;
  pan: {
    x: number;
    y: number;
  };
  zoom: number;
  setPan: (value: position | ((current: position) => position)) => transform;
  setZoom: (
    value: number | ((current: number) => number),
    maybeCenter?: position | undefined
  ) => void;
  panZoomHandlers:
    | {
        onTouchStart: (event: React.TouchEvent) => void;
        onTouchMove: (event: React.TouchEvent) => void;
        onTouchEnd: (event: React.TouchEvent) => void;
        onTouchCancel: (event: React.TouchEvent) => void;
        onMouseDown: (event: React.MouseEvent) => void;
        onMouseMove: (event: React.MouseEvent) => void;
        onMouseUp: () => void;
        onMouseLeave: () => void;
        onClickCapture: (event: React.MouseEvent) => void;
      }
    | {
        onTouchStart?: undefined;
        onTouchMove?: undefined;
        onTouchEnd?: undefined;
        onTouchCancel?: undefined;
        onMouseDown?: undefined;
        onMouseMove?: undefined;
        onMouseUp?: undefined;
        onMouseLeave?: undefined;
        onClickCapture?: undefined;
      };
};

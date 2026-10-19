/**
 * shapes.js — single source of truth for the preview "shape system".
 *
 * This file is loaded two different ways:
 *   1. require()d from the Electron main process (Node/CommonJS context).
 *   2. Loaded via a plain <script> tag in the renderer (browser context),
 *      where it attaches itself to window.SHAPES / window.getShape.
 *
 * To add a new shape, add one entry to SHAPES below.
 */
(function attachShapes(root) {
  var SHAPES = [
    {
      id: 'circle',
      label: 'Circle',
      clipPath: 'circle(50% at 50% 50%)',
      borderRadius: '0',
      aspectRatio: 1,
      lockAspect: true
    },
    {
      id: 'squircle',
      label: 'Squircle',
      clipPath: 'none',
      borderRadius: '32%',
      aspectRatio: 1,
      lockAspect: true
    },
    {
      id: 'rounded',
      label: 'Rounded',
      clipPath: 'none',
      borderRadius: '24px',
      aspectRatio: 16 / 9,
      lockAspect: false
    },
    {
      id: 'hexagon',
      label: 'Hexagon',
      clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
      borderRadius: '0',
      aspectRatio: 1,
      lockAspect: true
    },
    {
      id: 'heart',
      label: 'Heart',
      clipPath: 'polygon(50% 18%, 62% 6%, 76% 5%, 88% 12%, 96% 24%, 98% 38%, 93% 53%, 82% 67%, 50% 95%, 18% 67%, 7% 53%, 2% 38%, 4% 24%, 12% 12%, 24% 5%, 38% 6%)',
      borderRadius: '0',
      aspectRatio: 1,
      lockAspect: true
    },
    {
      id: 'star',
      label: 'Star',
      clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
      borderRadius: '0',
      aspectRatio: 1,
      lockAspect: true
    },
    {
      id: 'diamond',
      label: 'Diamond',
      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      borderRadius: '0',
      aspectRatio: 1,
      lockAspect: true
    },
    {
      id: 'octagon',
      label: 'Octagon',
      clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
      borderRadius: '0',
      aspectRatio: 1,
      lockAspect: true
    },
    {
      id: 'square',
      label: 'Square',
      clipPath: 'none',
      borderRadius: '0',
      aspectRatio: 1,
      lockAspect: true
    },
    {
      id: 'rectangle',
      label: 'Rectangle',
      clipPath: 'none',
      borderRadius: '0',
      aspectRatio: 16 / 9,
      lockAspect: false
    }
  ];

  function getShape(id) {
    for (var i = 0; i < SHAPES.length; i++) {
      if (SHAPES[i].id === id) return SHAPES[i];
    }
    return SHAPES[0];
  }

  var api = { SHAPES: SHAPES, getShape: getShape };

  // CommonJS (Electron main process / Node)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  // Browser / renderer global
  if (typeof root !== 'undefined' && root) {
    root.SHAPES = SHAPES;
    root.getShape = getShape;
  }
})(typeof window !== 'undefined' ? window : undefined);

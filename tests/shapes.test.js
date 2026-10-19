const test = require("node:test");
const assert = require("node:assert");
const { SHAPES, getShape } = require("../shared/shapes");

test("SHAPES array contains 10 defined shapes", () => {
  assert.ok(Array.isArray(SHAPES));
  assert.strictEqual(SHAPES.length, 10);
});

test("Each shape has required properties", () => {
  for (const s of SHAPES) {
    assert.ok(s.id, "Shape must have an id");
    assert.ok(s.label, "Shape must have a label");
    assert.ok(typeof s.aspectRatio === "number", "Shape must have numeric aspectRatio");
    assert.ok(typeof s.lockAspect === "boolean", "Shape must have boolean lockAspect");
    assert.ok(s.clipPath !== undefined, "Shape must have clipPath");
    assert.ok(s.borderRadius !== undefined, "Shape must have borderRadius");
  }
});

test("getShape returns correct shape by id", () => {
  const circle = getShape("circle");
  assert.strictEqual(circle.id, "circle");
  assert.strictEqual(circle.lockAspect, true);

  const rounded = getShape("rounded");
  assert.strictEqual(rounded.id, "rounded");
  assert.strictEqual(rounded.lockAspect, false);

  const star = getShape("star");
  assert.strictEqual(star.id, "star");
});

test("getShape falls back to default shape (circle) on invalid id", () => {
  const fallback = getShape("non-existent-shape-123");
  assert.strictEqual(fallback.id, "circle");
});

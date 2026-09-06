import assert from "node:assert/strict";
import { createElement } from "react";
import { describe, it } from "node:test";
import { isNativeButtonRender } from "./button";

describe("isNativeButtonRender", () => {
  it("defaults to a native button when render is omitted", () => {
    assert.equal(isNativeButtonRender(undefined), true);
  });

  it("keeps nativeButton when render is a real button", () => {
    assert.equal(isNativeButtonRender(createElement("button")), true);
  });

  it("disables nativeButton for links and other non-button renders", () => {
    function Link() {
      return null;
    }

    assert.equal(isNativeButtonRender(createElement("a", { href: "/" })), false);
    assert.equal(isNativeButtonRender(createElement(Link)), false);
    assert.equal(isNativeButtonRender(() => createElement("a", { href: "/" })), false);
  });
});

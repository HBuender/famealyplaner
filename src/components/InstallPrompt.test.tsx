import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InstallPrompt } from "./InstallPrompt";

function setMatchMedia(standalone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("standalone") ? standalone : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function setUserAgent(ua: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)";

describe("InstallPrompt", () => {
  beforeEach(() => {
    setMatchMedia(false);
  });

  it("shows the iOS Add-to-Home-Screen hint on iOS when not installed", async () => {
    setUserAgent(IOS_UA);
    render(<InstallPrompt />);
    expect(
      await screen.findByText(/Add to Home Screen/i),
    ).toBeInTheDocument();
  });

  it("renders nothing when already installed (display-mode: standalone)", () => {
    setMatchMedia(true);
    setUserAgent(IOS_UA);
    const { container } = render(<InstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });
});

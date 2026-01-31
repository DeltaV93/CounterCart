import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test("landing page should have no critical accessibility issues", async ({ page }) => {
    await page.goto("/");

    // Check that page has a main landmark
    const main = page.locator("main");
    await expect(main).toBeVisible();

    // Check that all images have alt text
    const images = page.locator("img");
    const imageCount = await images.count();
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      expect(alt).not.toBeNull();
    }

    // Check that buttons are keyboard accessible
    const buttons = page.locator("button, a[role='button']");
    const buttonCount = await buttons.count();
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        await button.focus();
        await expect(button).toBeFocused();
      }
    }
  });

  test("login page should have proper form labels", async ({ page }) => {
    await page.goto("/login");

    // Check that email input has a label
    const emailInput = page.getByRole("textbox", { name: /email/i });
    await expect(emailInput).toBeVisible();
  });

  test("should support keyboard navigation", async ({ page }) => {
    await page.goto("/");

    // Tab through interactive elements
    await page.keyboard.press("Tab");

    // First focusable element should be focused
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });
});

test.describe("Mobile Responsiveness", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("landing page should be responsive on mobile", async ({ page }) => {
    await page.goto("/");

    // Main content should be visible
    await expect(page.locator("h1")).toBeVisible();

    // CTA should be visible
    await expect(page.getByRole("link", { name: /get started/i }).first()).toBeVisible();
  });

  test("login page should be usable on mobile", async ({ page }) => {
    await page.goto("/login");

    // Form should be visible and usable
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue|sign in|submit/i })).toBeVisible();
  });
});

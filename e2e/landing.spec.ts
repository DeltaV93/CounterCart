import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should display the landing page", async ({ page }) => {
    await page.goto("/");

    // Check main heading
    await expect(page.locator("h1")).toContainText("Offset Your Purchases");

    // Check CTA buttons
    await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
  });

  test("should navigate to signup from CTA", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /get started/i }).first().click();

    await expect(page).toHaveURL(/\/signup/);
  });

  test("should navigate to login", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/login/);
  });

  test("should have working footer links", async ({ page }) => {
    await page.goto("/");

    // Check privacy link
    const privacyLink = page.getByRole("link", { name: /privacy/i });
    await expect(privacyLink).toBeVisible();

    // Check terms link
    const termsLink = page.getByRole("link", { name: /terms/i });
    await expect(termsLink).toBeVisible();
  });
});

test.describe("Legal Pages", () => {
  test("should display privacy policy", async ({ page }) => {
    await page.goto("/privacy");

    await expect(page.locator("h1")).toContainText("Privacy Policy");
  });

  test("should display terms of service", async ({ page }) => {
    await page.goto("/terms");

    await expect(page.locator("h1")).toContainText("Terms of Service");
  });

  test("should display FAQ", async ({ page }) => {
    await page.goto("/faq");

    await expect(page.locator("h1")).toContainText("FAQ");
  });
});

test.describe("Auth Pages", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("h1")).toContainText(/sign in|log in|welcome/i);
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  });

  test("should display signup page", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.locator("h1")).toContainText(/sign up|create|get started/i);
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  });

  test("should show validation error for invalid email", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("textbox", { name: /email/i }).fill("invalid-email");
    await page.getByRole("button", { name: /continue|sign in|submit/i }).click();

    // Should show some form of validation feedback
    await expect(page.locator("text=/invalid|valid email|error/i")).toBeVisible();
  });
});

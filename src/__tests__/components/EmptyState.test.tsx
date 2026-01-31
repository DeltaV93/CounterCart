import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/EmptyState";
import { CreditCard, Plus } from "lucide-react";

describe("EmptyState", () => {
  it("should render title and description", () => {
    render(
      <EmptyState
        icon={CreditCard}
        title="No transactions"
        description="Your transactions will appear here"
      />
    );

    expect(screen.getByText("No transactions")).toBeInTheDocument();
    expect(screen.getByText("Your transactions will appear here")).toBeInTheDocument();
  });

  it("should render action button with href", () => {
    render(
      <EmptyState
        icon={CreditCard}
        title="No data"
        description="Get started by connecting"
        action={{
          label: "Connect Bank",
          href: "/connect",
        }}
      />
    );

    const link = screen.getByRole("link", { name: /connect bank/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/connect");
  });

  it("should render action button with icon", () => {
    render(
      <EmptyState
        icon={CreditCard}
        title="No data"
        description="Add something"
        action={{
          label: "Add New",
          href: "/add",
          icon: Plus,
        }}
      />
    );

    expect(screen.getByRole("link", { name: /add new/i })).toBeInTheDocument();
  });

  it("should not render action button when not provided", () => {
    render(
      <EmptyState
        icon={CreditCard}
        title="Empty"
        description="Nothing here"
      />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

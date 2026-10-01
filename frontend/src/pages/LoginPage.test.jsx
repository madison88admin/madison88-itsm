import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./LoginPage";
import apiClient from "../api/client";

jest.mock("../api/client", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

test("submits credentials through the API and returns the authenticated user", async () => {
  const user = userEvent.setup();
  const onLogin = jest.fn();
  apiClient.post.mockResolvedValueOnce({
    data: { user: { user_id: "u-1", role: "end_user" } },
  });

  render(
    <MemoryRouter>
      <LoginPage onLogin={onLogin} />
    </MemoryRouter>,
  );

  const textboxes = screen.getAllByRole("textbox");
  await user.type(textboxes[0], "employee@madison88.com");
  await user.type(screen.getByLabelText("Password"), "correct-password");
  await user.click(screen.getByRole("button", { name: "Login" }));

  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
    email: "employee@madison88.com",
    password: "correct-password",
  }));
  expect(onLogin).toHaveBeenCalledWith(null, { user_id: "u-1", role: "end_user" });
});

test("shows an API error without exposing implementation details", async () => {
  const user = userEvent.setup();
  apiClient.post.mockRejectedValueOnce({ response: { data: { message: "Invalid credentials" } } });

  render(
    <MemoryRouter>
      <LoginPage onLogin={jest.fn()} />
    </MemoryRouter>,
  );

  const textboxes = screen.getAllByRole("textbox");
  await user.type(textboxes[0], "employee@madison88.com");
  await user.type(screen.getByLabelText("Password"), "wrong-password");
  await user.click(screen.getByRole("button", { name: "Login" }));

  expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
});

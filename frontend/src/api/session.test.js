import { clearAuthToken, getAuthToken, setAuthToken } from "./session";

afterEach(() => clearAuthToken());

test("keeps the access token in memory instead of browser storage", () => {
  setAuthToken("test-token");
  expect(getAuthToken()).toBe("test-token");
  expect(window.localStorage.getItem("token")).toBeNull();
  clearAuthToken();
  expect(getAuthToken()).toBeNull();
});

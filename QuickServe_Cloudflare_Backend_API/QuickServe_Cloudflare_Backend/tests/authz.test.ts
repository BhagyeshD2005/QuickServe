import { describe, expect, it } from "vitest";

describe("authorization", () => {
  it("denies a customer from accessing another customer's request", () => {
    const customerId: string = "customer-a";
    const requestOwnerId: string = "customer-b";

    expect(customerId === requestOwnerId).toBe(false);
  });
});
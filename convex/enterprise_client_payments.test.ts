/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("listClientPayments returns empty for unknown org", async () => {
  const t = convexTest(schema, modules);
  const result = await t.query(api.enterprise_client_payments.listClientPayments, {});
  expect(result).toEqual([]);
});

test("getClientPaymentStats returns zero stats for unknown org", async () => {
  const t = convexTest(schema, modules);
  const result = await t.query(api.enterprise_client_payments.getClientPaymentStats, {});
  expect(result.totalCollected).toBe(0);
  expect(result.totalPending).toBe(0);
  expect(result.totalFailed).toBe(0);
  expect(result.totalCount).toBe(0);
});

test("createClientInvoice fails without auth", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.enterprise_client_payments.createClientInvoice, {
      customerName: "Test",
      customerEmail: "test@example.com",
      amount: 1000,
      currency: "NGN",
      description: "Test invoice",
    })
  ).rejects.toThrow("Not authenticated");
});

test("adminListAllEnterprisePayments fails without admin token", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.query(api.enterprise_client_payments.adminListAllEnterprisePayments, {
      adminToken: "invalid",
    })
  ).rejects.toThrow("Not authenticated");
});

test("getOrgBankAccounts returns empty for unknown org", async () => {
  const t = convexTest(schema, modules);
  const result = await t.query(api.enterprise_client_payments.getOrgBankAccounts, {});
  expect(result).toEqual([]);
});

test("addBankAccount fails without auth", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.enterprise_client_payments.addBankAccount, {
      bankName: "GTBank",
      bankCode: "058",
      accountNumber: "1234567890",
      accountName: "Test Account",
    })
  ).rejects.toThrow("Not authenticated");
});

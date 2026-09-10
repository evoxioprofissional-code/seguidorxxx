import assert from "node:assert/strict";
import test from "node:test";
import { normalizeReferralCode } from "../src/lib/referral-code.ts";

test("normaliza o código vindo da URL", () => {
  assert.equal(normalizeReferralCode(" ab12-cd34 "), "AB12CD34");
});

test("remove caracteres que não pertencem ao código", () => {
  assert.equal(normalizeReferralCode("<script>alert(1)</script>"), "SCRIPTALERT1SCRIPT");
});

test("limita o tamanho armazenado", () => {
  assert.equal(normalizeReferralCode("a".repeat(100)).length, 32);
});

test("valor ausente vira código vazio", () => {
  assert.equal(normalizeReferralCode(null), "");
});

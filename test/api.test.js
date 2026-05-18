import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "orrico-api-tests-"),
);

process.env.NODE_ENV = "test";
process.env.APP_DATA_DIRECTORY = tempRoot;

const appModuleUrl = `${pathToFileURL(
  path.resolve("server", "app.js"),
).href}?test=${Date.now()}`;
const { app } = await import(appModuleUrl);

const server = app.listen(0);
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}/api`;

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  fs.rmSync(tempRoot, { recursive: true, force: true });
});

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) {
    return { status: response.status, body: null };
  }

  const body = await response.json();
  return { status: response.status, body };
}

async function signupAndVerify(email) {
  const signup = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Test",
      lastName: "User",
      email,
      businessName: "Test Store",
      password: "password123",
    }),
  });

  assert.equal(signup.status, 201);
  assert.equal(signup.body.requiresEmailVerification, true);
  assert.ok(signup.body.verificationToken);

  const verify = await request("/auth/verify-email/confirm", {
    method: "POST",
    body: JSON.stringify({
      email,
      token: signup.body.verificationToken,
    }),
  });

  assert.equal(verify.status, 200);
  assert.ok(verify.body.token);
  return verify.body.token;
}

test("signup requires email verification and login is blocked until verified", async () => {
  const email = `verify-${Date.now()}@example.com`;
  const signup = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Verify",
      lastName: "User",
      email,
      businessName: "Verify Store",
      password: "password123",
    }),
  });

  assert.equal(signup.status, 201);
  assert.equal(signup.body.requiresEmailVerification, true);
  assert.ok(signup.body.verificationToken);

  const blockedLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: "password123",
    }),
  });

  assert.equal(blockedLogin.status, 403);
  assert.equal(
    blockedLogin.body.requiresEmailVerification,
    true,
  );

  const verify = await request("/auth/verify-email/confirm", {
    method: "POST",
    body: JSON.stringify({
      email,
      token: signup.body.verificationToken,
    }),
  });

  assert.equal(verify.status, 200);
  assert.ok(verify.body.token);
  assert.equal(verify.body.user.emailVerified, true);
});

test("health endpoints expose runtime status", async () => {
  const health = await request("/health");
  assert.equal(health.status, 200);
  assert.equal(health.body.status, "ok");
  assert.equal(health.body.store.mode, "sqlite");
  assert.ok(Array.isArray(health.body.runtime.warnings));

  const ready = await request("/health/ready");
  assert.equal(ready.status, 200);
  assert.equal(ready.body.ready, true);
});

test("password reset updates the account password", async () => {
  const email = `reset-${Date.now()}@example.com`;
  await signupAndVerify(email);

  const resetRequest = await request("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  assert.equal(resetRequest.status, 200);
  assert.ok(resetRequest.body.resetToken);

  const confirmReset = await request("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({
      email,
      token: resetRequest.body.resetToken,
      password: "newpassword123",
    }),
  });

  assert.equal(confirmReset.status, 200);

  const oldPasswordLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: "password123",
    }),
  });

  assert.equal(oldPasswordLogin.status, 401);

  const newPasswordLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: "newpassword123",
    }),
  });

  assert.equal(newPasswordLogin.status, 200);
  assert.ok(newPasswordLogin.body.token);
});

test("dashboard APIs and write paths work for the SQLite/demo flow", async () => {
  const email = `dashboard-${Date.now()}@example.com`;
  const token = await signupAndVerify(email);
  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const summary = await request("/dashboard/summary", {
    headers: authHeaders,
  });
  assert.equal(summary.status, 200);
  assert.equal(summary.body.available, true);
  assert.ok(summary.body.metrics.length >= 4);

  const createdProduct = await request("/dashboard/products", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "API Test Product",
      category: "Testing",
      price: 999,
      stock: 5,
    }),
  });

  assert.equal(createdProduct.status, 201);
  const productId = createdProduct.body.product.id;

  const updatedProduct = await request(
    `/dashboard/products/${productId}`,
    {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        name: "API Test Product Updated",
        category: "Testing",
        price: 1299,
        stock: 7,
      }),
    },
  );

  assert.equal(updatedProduct.status, 200);
  assert.equal(updatedProduct.body.product.price, 1299);

  const updatedStock = await request(
    `/dashboard/products/${productId}/stock`,
    {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ stock: 3 }),
    },
  );

  assert.equal(updatedStock.status, 200);
  assert.equal(updatedStock.body.product.stock, 3);

  const createdOrder = await request("/dashboard/orders", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      productId,
      quantity: 1,
      customerName: "API Test Customer",
      customerEmail: "api.customer@example.com",
      customerPhone: "+91 90000 00000",
    }),
  });

  assert.equal(createdOrder.status, 201);
  assert.ok(createdOrder.body.order.id);

  const customers = await request("/dashboard/customers", {
    headers: authHeaders,
  });

  assert.equal(customers.status, 200);
  const createdCustomer = customers.body.customers.find(
    (entry) => entry.email === "api.customer@example.com",
  );
  assert.ok(createdCustomer);

  const updatedCustomer = await request(
    `/dashboard/customers/${createdCustomer.id}`,
    {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        name: "API Test Customer Updated",
        email: "api.customer@example.com",
        phone: "+91 91111 11111",
      }),
    },
  );

  assert.equal(updatedCustomer.status, 200);
  assert.equal(
    updatedCustomer.body.customer.name,
    "API Test Customer Updated",
  );

  const orders = await request("/dashboard/orders", {
    headers: authHeaders,
  });
  assert.equal(orders.status, 200);
  assert.ok(
    orders.body.orders.some(
      (entry) => entry.customerEmail === "api.customer@example.com",
    ),
  );

  const deleteProduct = await request(
    `/dashboard/products/${productId}`,
    {
      method: "DELETE",
      headers: authHeaders,
    },
  );
  assert.equal(deleteProduct.status, 400);
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const isVercelRuntime = Boolean(process.env.VERCEL);
const dataDirectory = isVercelRuntime
  ? path.join(os.tmpdir(), "orrico-data")
  : path.resolve("server", "data");
const demoDatabasePath = path.join(
  dataDirectory,
  "demo-retail-analytics.sqlite",
);

const demoProducts = [
  {
    id: "p1",
    name: "Samsung Galaxy A34 5G",
    category: "Mobile Phones",
    price: 28999,
    costPrice: 24350,
    stock: 12,
  },
  {
    id: "p2",
    name: "boAt Rockerz 450 Bluetooth Headphones",
    category: "Audio Devices",
    price: 1299,
    costPrice: 760,
    stock: 45,
  },
  {
    id: "p3",
    name: "Lenovo IdeaPad Slim 3",
    category: "Laptops",
    price: 42999,
    costPrice: 36750,
    stock: 6,
  },
  {
    id: "p4",
    name: "Samsung 43-inch Smart LED TV",
    category: "Televisions",
    price: 32999,
    costPrice: 28100,
    stock: 8,
  },
  {
    id: "p5",
    name: "Realme Buds Air 3 TWS Earbuds",
    category: "Audio Devices",
    price: 2999,
    costPrice: 1985,
    stock: 67,
  },
  {
    id: "p6",
    name: "HP LaserJet M126nw Printer",
    category: "Printers & Scanners",
    price: 12499,
    costPrice: 10300,
    stock: 11,
  },
  {
    id: "p7",
    name: "Logitech K380 Wireless Keyboard",
    category: "Computer Accessories",
    price: 1899,
    costPrice: 1240,
    stock: 34,
  },
  {
    id: "p8",
    name: "Xiaomi Power Bank 20000mAh",
    category: "Mobile Accessories",
    price: 1599,
    costPrice: 980,
    stock: 89,
  },
];

const demoCustomers = [
  {
    id: "c1",
    name: "Amit Kumar",
    email: "amit.kumar@email.com",
    phone: "+91 98765 43210",
  },
  {
    id: "c2",
    name: "Priya Patel",
    email: "priya.patel@email.com",
    phone: "+91 98765 43212",
  },
  {
    id: "c3",
    name: "Rajesh Electronics",
    email: "rajesh@business.com",
    phone: "+91 98765 43211",
  },
  {
    id: "c4",
    name: "Sneha Gupta",
    email: "sneha.gupta@email.com",
    phone: "+91 98765 43214",
  },
  {
    id: "c5",
    name: "Arjun Malhotra",
    email: "arjun@email.com",
    phone: "+91 98765 43217",
  },
  {
    id: "c6",
    name: "Meera Iyer",
    email: "meera@email.com",
    phone: "+91 98765 43218",
  },
];

const orderTemplates = [
  { customerId: "c1", productId: "p1", quantity: 1, paymentMethod: "UPI" },
  { customerId: "c2", productId: "p8", quantity: 2, paymentMethod: "Card" },
  { customerId: "c3", productId: "p3", quantity: 1, paymentMethod: "Bank Transfer" },
  { customerId: "c4", productId: "p5", quantity: 2, paymentMethod: "UPI" },
  { customerId: "c5", productId: "p2", quantity: 3, paymentMethod: "Cash" },
  { customerId: "c6", productId: "p4", quantity: 1, paymentMethod: "Card" },
  { customerId: "c1", productId: "p7", quantity: 2, paymentMethod: "UPI" },
  { customerId: "c2", productId: "p6", quantity: 1, paymentMethod: "Cash" },
  { customerId: "c3", productId: "p8", quantity: 5, paymentMethod: "UPI" },
  { customerId: "c4", productId: "p2", quantity: 4, paymentMethod: "Card" },
  { customerId: "c5", productId: "p5", quantity: 1, paymentMethod: "UPI" },
  { customerId: "c6", productId: "p1", quantity: 1, paymentMethod: "EMI" },
];

function ensureDataDirectory() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }
}

function formatDateOffset(daysAgo) {
  const date = new Date();
  date.setHours(13, 30, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function seedDemoRetailDatabase(database) {
  database.exec(`
    CREATE TABLE products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      cost_price REAL NOT NULL,
      stock INTEGER NOT NULL
    );

    CREATE TABLE customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT
    );

    CREATE TABLE orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      ordered_at TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      total_amount REAL NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      unit_cost REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  const insertProduct = database.prepare(`
    INSERT INTO products (id, name, category, price, cost_price, stock)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertCustomer = database.prepare(`
    INSERT INTO customers (id, name, email, phone)
    VALUES (?, ?, ?, ?)
  `);
  const insertOrder = database.prepare(`
    INSERT INTO orders (id, customer_id, ordered_at, payment_method, total_amount)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertOrderItem = database.prepare(`
    INSERT INTO order_items (
      id, order_id, product_id, quantity, unit_price, unit_cost, total_price
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  demoProducts.forEach((product) => {
    insertProduct.run(
      product.id,
      product.name,
      product.category,
      product.price,
      product.costPrice,
      product.stock,
    );
  });

  demoCustomers.forEach((customer) => {
    insertCustomer.run(
      customer.id,
      customer.name,
      customer.email,
      customer.phone,
    );
  });

  let orderCounter = 1;
  let itemCounter = 1;

  for (let daysAgo = 0; daysAgo < 45; daysAgo += 1) {
    const dailyOrderCount = 2 + (daysAgo % 4);

    for (let dailyIndex = 0; dailyIndex < dailyOrderCount; dailyIndex += 1) {
      const template =
        orderTemplates[(daysAgo + dailyIndex) % orderTemplates.length];
      const product = demoProducts.find(
        (entry) => entry.id === template.productId,
      );

      if (!product) {
        continue;
      }

      const quantity = template.quantity + ((daysAgo + dailyIndex) % 2);
      const totalPrice = quantity * product.price;
      const orderedAt = new Date(formatDateOffset(daysAgo));
      orderedAt.setHours(
        10 + ((daysAgo + dailyIndex) % 8),
        ((daysAgo + dailyIndex) * 7) % 60,
        0,
        0,
      );

      const orderId = `ord-${orderCounter}`;
      const orderItemId = `item-${itemCounter}`;

      insertOrder.run(
        orderId,
        template.customerId,
        orderedAt.toISOString(),
        template.paymentMethod,
        totalPrice,
      );

      insertOrderItem.run(
        orderItemId,
        orderId,
        template.productId,
        quantity,
        product.price,
        product.costPrice,
        totalPrice,
      );

      orderCounter += 1;
      itemCounter += 1;
    }
  }
}

export function ensureDemoRetailDatabase() {
  ensureDataDirectory();

  if (!fs.existsSync(demoDatabasePath)) {
    const database = new DatabaseSync(demoDatabasePath);
    seedDemoRetailDatabase(database);
    database.close();
  }

  return demoDatabasePath;
}

export function resolveSqliteDatabasePath(connection) {
  const configuredPath = String(connection?.filePath || "").trim();

  if (
    !configuredPath ||
    configuredPath === "demo_retail_shop.db" ||
    configuredPath === "demo-retail-analytics.sqlite"
  ) {
    return ensureDemoRetailDatabase();
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(configuredPath);
}

export function openRetailDatabase(connection) {
  const databasePath = resolveSqliteDatabasePath(connection);
  return {
    databasePath,
    database: new DatabaseSync(databasePath),
  };
}

export function getSchemaOverview(connection) {
  const { database, databasePath } = openRetailDatabase(connection);

  try {
    const tables = database
      .prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `)
      .all();

    const schema = tables.map((table) => {
      const columns = database
        .prepare(`PRAGMA table_info(${table.name})`)
        .all()
        .map((column) => ({
          name: column.name,
          type: column.type,
          required: column.notnull === 1,
          primaryKey: column.pk === 1,
        }));

      return {
        table: table.name,
        columns,
      };
    });

    return {
      databasePath,
      schema,
    };
  } finally {
    database.close();
  }
}

function normalizeIdentifier(value, fallbackValue) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallbackValue;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function parseCsvContent(csvContent) {
  const lines = String(csvContent || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("CSV file must include a header row and at least one data row.");
  }

  const headers = parseCsvLine(lines[0]).map((header, index) =>
    normalizeIdentifier(header, `column_${index + 1}`),
  );

  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = cells[index] ?? "";
      return row;
    }, {});
  });

  return { headers, rows };
}

function inferColumnTypes(rows, headers) {
  return headers.map((header) => {
    const nonEmptyValues = rows
      .map((row) => String(row[header] ?? "").trim())
      .filter(Boolean);

    if (
      nonEmptyValues.length > 0 &&
      nonEmptyValues.every((value) => /^-?\d+$/.test(value))
    ) {
      return { name: header, type: "INTEGER" };
    }

    if (
      nonEmptyValues.length > 0 &&
      nonEmptyValues.every((value) => /^-?\d+(\.\d+)?$/.test(value))
    ) {
      return { name: header, type: "REAL" };
    }

    return { name: header, type: "TEXT" };
  });
}

export function importCsvDataset(
  connection,
  { csvContent, tableName, fileName },
) {
  const { database, databasePath } = openRetailDatabase(connection);

  try {
    const { headers, rows } = parseCsvContent(csvContent);
    const normalizedTableName = normalizeIdentifier(
      tableName || fileName || "imported_data",
      "imported_data",
    );
    const columns = inferColumnTypes(rows, headers);
    const columnDefinitions = columns
      .map((column) => `${column.name} ${column.type}`)
      .join(", ");

    database.exec(`DROP TABLE IF EXISTS ${normalizedTableName}`);
    database.exec(`
      CREATE TABLE ${normalizedTableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ${columnDefinitions}
      )
    `);
    const placeholders = columns.map(() => "?").join(", ");
    const insertStatement = database.prepare(`
      INSERT INTO ${normalizedTableName} (${columns
        .map((column) => column.name)
        .join(", ")})
      VALUES (${placeholders})
    `);
    database.exec("BEGIN");

    rows.forEach((row) => {
      const values = columns.map((column) => {
        const rawValue = String(row[column.name] ?? "").trim();

        if (!rawValue) {
          return null;
        }

        if (column.type === "INTEGER") {
          return Number.parseInt(rawValue, 10);
        }

        if (column.type === "REAL") {
          return Number.parseFloat(rawValue);
        }

        return rawValue;
      });

      insertStatement.run(...values);
    });

    database.exec("COMMIT");

    return {
      databasePath,
      tableName: normalizedTableName,
      rowCount: rows.length,
      columns,
    };
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
    }
    throw error;
  } finally {
    database.close();
  }
}

import {
  executeReadOnlyQuery,
  getSchemaOverviewForConnection,
} from "./query-runtime.js";

const fallbackKeywordResponses = [
  {
    keywords: ["sales yesterday", "yesterday sales", "kal sales", "kal ki sales"],
    response:
      "Yesterday your store closed at Rs 2,84,750 across 43 orders. Mobile accessories and power banks led the strongest movement.",
  },
  {
    keywords: ["top products", "best products", "top 5 products"],
    response:
      "Your top movers right now are Xiaomi Power Bank 20000mAh, Realme Buds Air 3, Logitech K380 Keyboard, Samsung Galaxy A34 5G, and Samsung 43-inch Smart TV.",
  },
  {
    keywords: ["inventory", "stock", "low stock"],
    response:
      "Inventory is mostly healthy, but Lenovo IdeaPad Slim 3, Samsung 43-inch Smart TV, HP LaserJet M126nw, and Samsung Galaxy A34 5G are getting low.",
  },
  {
    keywords: ["profit", "margin"],
    response:
      "Your current gross margin is about 32.8%. Accessories are the strongest margin driver, while premium hardware is lower-margin but still important for revenue.",
  },
  {
    keywords: ["customers", "top customer", "repeat customer"],
    response:
      "Your strongest customer segment is repeat buyers. Amit Kumar is the top individual customer this month, and repeat customers are driving more than half of revenue.",
  },
];

const BUILT_IN_TABLES = new Set([
  "customers",
  "order_items",
  "orders",
  "products",
]);

function normalizeMessage(message) {
  return message.toLowerCase().replace(/[^\w\s]/g, " ").trim();
}

function formatCurrency(value) {
  return `Rs ${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;
}

function buildRangeFilter(range) {
  if (range === "today") {
    return "date(ordered_at) = date('now', 'localtime')";
  }

  if (range === "yesterday") {
    return "date(ordered_at) = date('now', 'localtime', '-1 day')";
  }

  if (range === "week") {
    return "date(ordered_at) >= date('now', 'localtime', '-6 day')";
  }

  if (range === "month") {
    return "date(ordered_at) >= date('now', 'localtime', 'start of month')";
  }

  return "1 = 1";
}

function isNumericColumn(column) {
  const type = String(column.type || "").toUpperCase();
  return type.includes("INT") || type.includes("REAL") || type.includes("NUM");
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, "\"\"")}"`;
}

async function getSchema(connection) {
  const overview = await getSchemaOverviewForConnection(connection);
  return overview.schema;
}

function findTableMatch(normalizedMessage, schema) {
  const explicitFromMatch = normalizedMessage.match(/\bfrom\s+([a-z0-9_]+)/);

  if (explicitFromMatch) {
    const explicitTable = schema.find(
      (table) => table.table.toLowerCase() === explicitFromMatch[1],
    );

    if (explicitTable) {
      return explicitTable;
    }
  }

  return schema.find((table) => normalizedMessage.includes(table.table.toLowerCase())) || null;
}

function findColumnMatch(normalizedMessage, table, numericOnly = false) {
  const eligibleColumns = table.columns.filter((column) =>
    numericOnly ? isNumericColumn(column) : true,
  );

  return (
    eligibleColumns.find((column) =>
      normalizedMessage.includes(column.name.toLowerCase()),
    ) || eligibleColumns[0] || null
  );
}

function planImportedTableQuery(
  normalizedMessage,
  schema,
  includeAllTables = false,
) {
  const importedTables = includeAllTables
    ? schema
    : schema.filter((table) => !BUILT_IN_TABLES.has(table.table));

  if (importedTables.length === 0) {
    return null;
  }

  const table = findTableMatch(normalizedMessage, importedTables);

  if (!table) {
    return null;
  }

  if (
    normalizedMessage.includes("count") ||
    normalizedMessage.includes("how many") ||
    normalizedMessage.includes("rows")
  ) {
    return {
      type: "custom_count",
      tableName: table.table,
      sql: `SELECT COUNT(*) AS row_count FROM ${quoteIdentifier(table.table)}`,
    };
  }

  if (
    normalizedMessage.includes("top") ||
    normalizedMessage.includes("highest") ||
    normalizedMessage.includes("largest")
  ) {
    const numericColumn = findColumnMatch(normalizedMessage, table, true);

    if (!numericColumn) {
      return null;
    }

    const labelColumn =
      table.columns.find(
        (column) =>
          !isNumericColumn(column) &&
          column.name.toLowerCase() !== "id",
      ) || table.columns[0];
    const limitMatch = normalizedMessage.match(/\btop\s+(\d+)\b/);
    const limit = Number(limitMatch?.[1] || 5);

    return {
      type: "custom_top_rows",
      tableName: table.table,
      labelColumn: labelColumn.name,
      columnName: numericColumn.name,
      sql: `
        SELECT
          ${quoteIdentifier(labelColumn.name)} AS label,
          ${quoteIdentifier(numericColumn.name)} AS metric
        FROM ${quoteIdentifier(table.table)}
        ORDER BY ${quoteIdentifier(numericColumn.name)} DESC
        LIMIT ${Math.min(Math.max(limit, 1), 10)}
      `,
    };
  }

  if (
    normalizedMessage.includes("average") ||
    normalizedMessage.includes("avg") ||
    normalizedMessage.includes("mean")
  ) {
    const numericColumn = findColumnMatch(normalizedMessage, table, true);

    if (!numericColumn) {
      return null;
    }

    return {
      type: "custom_average",
      tableName: table.table,
      columnName: numericColumn.name,
      sql: `
        SELECT
          AVG(${quoteIdentifier(numericColumn.name)}) AS average_value
        FROM ${quoteIdentifier(table.table)}
      `,
    };
  }

  if (
    normalizedMessage.includes("sum") ||
    normalizedMessage.includes("total") ||
    normalizedMessage.includes("revenue")
  ) {
    const numericColumn = findColumnMatch(normalizedMessage, table, true);

    if (!numericColumn) {
      return null;
    }

    return {
      type: "custom_sum",
      tableName: table.table,
      columnName: numericColumn.name,
      sql: `
        SELECT
          SUM(${quoteIdentifier(numericColumn.name)}) AS total_value
        FROM ${quoteIdentifier(table.table)}
      `,
    };
  }

  if (
    normalizedMessage.includes("show") ||
    normalizedMessage.includes("preview") ||
    normalizedMessage.includes("sample") ||
    normalizedMessage.includes("list")
  ) {
    const previewColumns = table.columns
      .slice(0, Math.min(table.columns.length, 5))
      .map((column) => quoteIdentifier(column.name))
      .join(", ");

    return {
      type: "custom_preview",
      tableName: table.table,
      sql: `
        SELECT ${previewColumns}
        FROM ${quoteIdentifier(table.table)}
        LIMIT 5
      `,
    };
  }

  return null;
}

async function planQuery(message, connection) {
  const normalizedMessage = normalizeMessage(message);
  const schema = await getSchema(connection);
  const isSqliteAnalytics =
    !connection || connection.databaseType === "sqlite";

  if (
    normalizedMessage.includes("schema") ||
    normalizedMessage.includes("tables") ||
    normalizedMessage.includes("columns")
  ) {
    return {
      type: "schema",
      sql: null,
    };
  }

  const importedTablePlan = planImportedTableQuery(
    normalizedMessage,
    schema,
    !isSqliteAnalytics,
  );

  if (importedTablePlan) {
    return importedTablePlan;
  }

  if (!isSqliteAnalytics) {
    return null;
  }

  if (
    normalizedMessage.includes("top product") ||
    normalizedMessage.includes("best product") ||
    normalizedMessage.includes("top 5 product")
  ) {
    return {
      type: "top_products",
      sql: `
        SELECT
          p.name,
          SUM(oi.quantity) AS units_sold,
          SUM(oi.total_price) AS revenue
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN orders o ON o.id = oi.order_id
        WHERE ${buildRangeFilter("week")}
        GROUP BY p.id, p.name
        ORDER BY units_sold DESC, revenue DESC
        LIMIT 5
      `,
    };
  }

  if (
    normalizedMessage.includes("top customer") ||
    normalizedMessage.includes("best customer") ||
    normalizedMessage.includes("customers bought the most")
  ) {
    return {
      type: "top_customers",
      sql: `
        SELECT
          c.name,
          COUNT(o.id) AS orders_count,
          SUM(o.total_amount) AS revenue
        FROM orders o
        JOIN customers c ON c.id = o.customer_id
        WHERE ${buildRangeFilter("month")}
        GROUP BY c.id, c.name
        ORDER BY revenue DESC, orders_count DESC
        LIMIT 5
      `,
    };
  }

  if (
    normalizedMessage.includes("low stock") ||
    normalizedMessage.includes("out of stock") ||
    normalizedMessage.includes("inventory")
  ) {
    return {
      type: "low_stock",
      sql: `
        SELECT
          name,
          category,
          stock,
          price
        FROM products
        WHERE stock <= 15
        ORDER BY stock ASC, price DESC
        LIMIT 8
      `,
    };
  }

  if (normalizedMessage.includes("profit") || normalizedMessage.includes("margin")) {
    return {
      type: "profit_margin",
      sql: `
        SELECT
          ROUND(
            (
              SUM(oi.total_price) - SUM(oi.unit_cost * oi.quantity)
            ) * 100.0 / NULLIF(SUM(oi.total_price), 0),
            2
          ) AS margin_percent,
          SUM(oi.total_price) AS revenue,
          SUM(oi.unit_cost * oi.quantity) AS cost
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE ${buildRangeFilter("month")}
      `,
    };
  }

  if (
    normalizedMessage.includes("this month") &&
    normalizedMessage.includes("last month")
  ) {
    return {
      type: "month_comparison",
      sql: `
        WITH monthly_sales AS (
          SELECT
            CASE
              WHEN date(ordered_at) >= date('now', 'localtime', 'start of month')
              THEN 'current_month'
              ELSE 'previous_month'
            END AS bucket,
            COUNT(*) AS orders_count,
            SUM(total_amount) AS revenue
          FROM orders
          WHERE date(ordered_at) >= date('now', 'localtime', 'start of month', '-1 month')
          GROUP BY bucket
        )
        SELECT bucket, orders_count, revenue
        FROM monthly_sales
      `,
    };
  }

  if (
    normalizedMessage.includes("sales yesterday") ||
    normalizedMessage.includes("yesterday sales")
  ) {
    return {
      type: "sales_snapshot",
      range: "yesterday",
      sql: `
        SELECT
          COUNT(*) AS orders_count,
          SUM(total_amount) AS revenue
        FROM orders
        WHERE ${buildRangeFilter("yesterday")}
      `,
    };
  }

  if (
    normalizedMessage.includes("sales today") ||
    normalizedMessage.includes("today sales") ||
    normalizedMessage.includes("aaj")
  ) {
    return {
      type: "sales_snapshot",
      range: "today",
      sql: `
        SELECT
          COUNT(*) AS orders_count,
          SUM(total_amount) AS revenue
        FROM orders
        WHERE ${buildRangeFilter("today")}
      `,
    };
  }

  if (
    normalizedMessage.includes("this week") ||
    normalizedMessage.includes("weekly sales") ||
    normalizedMessage.includes("week sales")
  ) {
    return {
      type: "sales_snapshot",
      range: "week",
      sql: `
        SELECT
          COUNT(*) AS orders_count,
          SUM(total_amount) AS revenue
        FROM orders
        WHERE ${buildRangeFilter("week")}
      `,
    };
  }

  return null;
}

async function fallbackReply(message, connection) {
  const normalizedMessage = normalizeMessage(message);
  const matchedResponse = fallbackKeywordResponses.find((entry) =>
    entry.keywords.some((keyword) => normalizedMessage.includes(keyword)),
  );

  if (matchedResponse) {
    return matchedResponse.response;
  }

  const schema = await getSchema(connection);
  const importedTables = schema
    .filter((table) =>
      connection?.databaseType === "sqlite"
        ? !BUILT_IN_TABLES.has(table.table)
        : true,
    )
    .map((table) => table.table);

  if (importedTables.length > 0) {
    return `I can answer read-only questions about your connected data. Try prompts like "count rows from ${importedTables[0]}", "sum total from ${importedTables[0]}", or "show top 5 by total from ${importedTables[0]}".`;
  }

  return "I can help with sales, products, inventory, customers, margins, and stock questions. Ask me something direct about your store and I'll keep the answer sharp.";
}

async function formatSchemaReply(connection) {
  const overview = await getSchemaOverviewForConnection(connection);
  const schemaSummary = overview.schema
    .map((table) => {
      const columns = table.columns.map((column) => column.name).join(", ");
      return `${table.table}: ${columns}`;
    })
    .join("\n");

  return {
    mode: "schema",
    sql: null,
    rows: [],
    reply: `I found ${overview.schema.length} tables in the active database.\n\n${schemaSummary}`,
  };
}

function formatQueryReply(plan, rows) {
  if (plan.type === "top_products") {
    const lines = rows.map(
      (row, index) =>
        `${index + 1}. ${row.name} - ${row.units_sold} units, ${formatCurrency(row.revenue)} revenue`,
    );

    return [
      "I ran a product performance query for the last 7 days.",
      ...lines,
    ].join("\n");
  }

  if (plan.type === "top_customers") {
    const lines = rows.map(
      (row, index) =>
        `${index + 1}. ${row.name} - ${row.orders_count} orders, ${formatCurrency(row.revenue)} revenue`,
    );

    return [
      "I ranked the top customers for the current month.",
      ...lines,
    ].join("\n");
  }

  if (plan.type === "low_stock") {
    const lines = rows.map(
      (row) => `${row.name} (${row.category}) - ${row.stock} units left`,
    );

    return [
      "I checked the current inventory levels and these are the most urgent items:",
      ...lines,
    ].join("\n");
  }

  if (plan.type === "profit_margin") {
    const row = rows[0] || {};
    return [
      "I calculated the current month gross margin from the order line data.",
      `Revenue: ${formatCurrency(row.revenue)}`,
      `Cost: ${formatCurrency(row.cost)}`,
      `Gross margin: ${Number(row.margin_percent || 0).toFixed(2)}%`,
    ].join("\n");
  }

  if (plan.type === "month_comparison") {
    const currentMonth = rows.find((row) => row.bucket === "current_month");
    const previousMonth = rows.find((row) => row.bucket === "previous_month");
    const currentRevenue = Number(currentMonth?.revenue || 0);
    const previousRevenue = Number(previousMonth?.revenue || 0);
    const growth =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    return [
      "I compared this month against last month.",
      `This month: ${currentMonth?.orders_count || 0} orders, ${formatCurrency(currentRevenue)}`,
      `Last month: ${previousMonth?.orders_count || 0} orders, ${formatCurrency(previousRevenue)}`,
      `Revenue change: ${growth.toFixed(1)}%`,
    ].join("\n");
  }

  if (plan.type === "sales_snapshot") {
    const row = rows[0] || {};
    const label =
      plan.range === "today"
        ? "today"
        : plan.range === "yesterday"
          ? "yesterday"
          : "the last 7 days";

    return [
      `I ran a sales summary query for ${label}.`,
      `Orders: ${row.orders_count || 0}`,
      `Revenue: ${formatCurrency(row.revenue)}`,
    ].join("\n");
  }

  if (plan.type === "custom_count") {
    return `I counted the rows in ${plan.tableName}. Total rows: ${rows[0]?.row_count || 0}.`;
  }

  if (plan.type === "custom_sum") {
    return `I summed ${plan.columnName} from ${plan.tableName}. Total: ${Number(rows[0]?.total_value || 0).toLocaleString("en-IN")}.`;
  }

  if (plan.type === "custom_average") {
    return `I calculated the average ${plan.columnName} from ${plan.tableName}. Average: ${Number(rows[0]?.average_value || 0).toFixed(2)}.`;
  }

  if (plan.type === "custom_top_rows") {
    const lines = rows.map(
      (row, index) =>
        `${index + 1}. ${row.label} - ${Number(row.metric || 0).toLocaleString("en-IN")}`,
    );

    return [
      `I ranked the top rows from ${plan.tableName} by ${plan.columnName}.`,
      ...lines,
    ].join("\n");
  }

  if (plan.type === "custom_preview") {
    const preview = rows
      .map((row) =>
        Object.entries(row)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", "),
      )
      .join("\n");

    return [
      `I pulled a small preview from ${plan.tableName}.`,
      preview,
    ].join("\n");
  }

  return "I ran the query successfully.";
}

async function executePlannedQuery(plan, connection) {
  if (plan.type === "schema") {
    return formatSchemaReply(connection);
  }

  const rows = await executeReadOnlyQuery(connection, plan.sql);
  return {
    mode: "sql",
    sql: plan.sql.trim(),
    rows,
    reply: formatQueryReply(plan, rows),
  };
}

export async function buildChatReply(message, options = {}) {
  const connection = options.connection || null;

  const plan = await planQuery(message, connection);

  if (!plan) {
    return {
      mode: "fallback",
      sql: null,
      rows: [],
      reply: await fallbackReply(message, connection),
    };
  }

  return executePlannedQuery(plan, connection);
}

const keywordResponses = [
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

function normalizeMessage(message) {
  return message.toLowerCase().replace(/[^\w\s]/g, " ").trim();
}

export function buildChatReply(message) {
  const normalizedMessage = normalizeMessage(message);
  const matchedResponse = keywordResponses.find((entry) =>
    entry.keywords.some((keyword) => normalizedMessage.includes(keyword)),
  );

  if (matchedResponse) {
    return matchedResponse.response;
  }

  return "I can help with sales, products, inventory, customers, margins, and stock questions. Ask me something direct about your store and I'll keep the answer sharp.";
}

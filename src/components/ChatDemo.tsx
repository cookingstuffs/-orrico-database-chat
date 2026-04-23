 import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Mic, MicOff, Send, User, Bot } from "lucide-react";

export function ChatDemo() {
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: "bot",
      content:
        "Hello! I'm your retail data assistant. Ask me anything about your store data. Try saying something like 'Show me today's best selling products' or 'What's my inventory status?'",
    },
  ]);

  // Ref for messages container
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight; // 👈 only chat box scrolls
    }
  }, [messages]);

  const sampleQueries = [
    "What are my top 5 selling products this week?",
    "Show me customers who haven't visited in 30 days",
    "What's my current inventory value?",
    "Which products are running low on stock?",
    "How much did I make yesterday compared to last week?",
  ];

  const handleSampleQuery = (query: string) => {
    setMessages((prev) => [
      ...prev,
      { type: "user", content: query },
      {
        type: "bot",
        content: query.includes("top 5")
          ? "Here are your top 5 selling products this week:\n\n1. iPhone 15 Pro - 23 units sold\n2. Samsung Galaxy Buds - 18 units\n3. Wireless Charger - 15 units\n4. Phone Cases - 12 units\n5. Screen Protectors - 10 units\n\nTotal revenue from these items: ₹8,54,750"
          : query.includes("inventory value")
          ? "Your current inventory value is ₹47,83,200 across 1,247 items. This includes:\n\n• Electronics: ₹32,15,000 (67%)\n• Accessories: ₹12,68,000 (27%)\n• Other: ₹3,00,200 (6%)\n\nInventory turnover rate: 2.3x this quarter"
          : "I found the information you requested. Your data shows positive trends across key metrics. Would you like me to break down any specific area in more detail?",
      },
    ]);
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
        setMessages((prev) => [
          ...prev,
          { type: "user", content: "Show me today's sales summary" },
          {
            type: "bot",
            content:
              "Today's sales summary:\n\n💰 Total Revenue: ₹2,84,750\n📊 Transactions: 47\n📈 Avg. Order Value: ₹6,057\n\n🔥 Top Category: Electronics (65% of sales)\n⏰ Peak Hour: 2-3 PM (8 transactions)\n\nComparison to yesterday: +12% revenue, +5 transactions",
          },
        ]);
      }, 3000);
    }
  };

  return (
    <section id="demo" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold mb-4">
            See It In
            <span className="text-primary"> Action</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience how easy it is to get insights from your retail data. Try
            the demo below or click on sample questions.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-8">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  Orrico Assistant
                  <Badge variant="secondary" className="ml-auto">
                    Demo
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden">
                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2"
                >
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.type === "user" ? "justify-end" : ""
                      }`}
                    >
                      <div
                        className={`flex gap-3 max-w-[80%] ${
                          message.type === "user" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.type === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {message.type === "user" ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            message.type === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-line">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input area */}
                <div className="flex gap-2">
                  <Button
                    variant={isListening ? "destructive" : "outline"}
                    size="icon"
                    onClick={toggleListening}
                    className={isListening ? "animate-pulse" : ""}
                  >
                    {isListening ? (
                      <Mic className="w-4 h-4" />
                    ) : (
                      <MicOff className="w-4 h-4" />
                    )}
                  </Button>
                  <div className="flex-1 flex items-center px-4 py-2 bg-muted rounded-lg">
                    {isListening ? (
                      <span className="text-sm text-muted-foreground animate-pulse">
                        Listening...
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Click the mic to start speaking or try a sample question
                        →
                      </span>
                    )}
                  </div>
                  <Button size="icon" variant="outline">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sample Queries */}
          <div className="space-y-4">
            <h3 className="font-semibold">Try These Questions:</h3>
            <div className="space-y-3">
              {sampleQueries.map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full text-left h-auto p-4 justify-start whitespace-normal"
                  onClick={() => handleSampleQuery(query)}
                >
                  {query}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

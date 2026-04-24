import { useState, useEffect, useRef } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  Package,
  IndianRupee,
  MessageSquare,
  Database,
  Settings,
  LogOut,
  HelpCircle,
  User,
  Calendar,
  Eye,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
  Plus,
  AlertCircle,
} from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Progress } from "./ui/progress";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";

interface DashboardPageProps {
  onLogout: () => void;
  onNavigateToSupport: () => void;
  onNavigateToChat: () => void;
  onNavigateToLanding?: () => void;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  sold: number;
  revenue: number;
  stock: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  orders: number;
  totalSpent: number;
  lastOrder: string;
}

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  productId: string;
  productName: string;
  quantity: number;
  total: number;
  date: string;
}

// Data version - increment this when you want to reset localStorage data
const DATA_VERSION = "2.2";

// Initial data
const initialProducts: Product[] = [
  {
    id: "1",
    name: "Samsung Galaxy A34 5G",
    category: "Mobile Phones",
    price: 28999,
    sold: 47,
    revenue: 1362953,
    stock: 12,
  },
  {
    id: "2",
    name: "boAt Rockerz 450 Bluetooth Headphones",
    category: "Audio Devices",
    price: 1299,
    sold: 156,
    revenue: 202644,
    stock: 45,
  },
  {
    id: "3",
    name: "Lenovo IdeaPad Slim 3",
    category: "Laptops",
    price: 42999,
    sold: 23,
    revenue: 988977,
    stock: 6,
  },
  {
    id: "4",
    name: "Samsung 43\" Smart LED TV",
    category: "Televisions",
    price: 32999,
    sold: 34,
    revenue: 1121966,
    stock: 8,
  },
  {
    id: "5",
    name: "Realme Buds Air 3 TWS Earbuds",
    category: "Audio Devices",
    price: 2999,
    sold: 89,
    revenue: 266911,
    stock: 67,
  },
  {
    id: "6",
    name: "HP LaserJet M126nw Printer",
    category: "Printers & Scanners",
    price: 12499,
    sold: 19,
    revenue: 237481,
    stock: 11,
  },
  {
    id: "7",
    name: "Logitech K380 Wireless Keyboard",
    category: "Computer Accessories",
    price: 1899,
    sold: 78,
    revenue: 148122,
    stock: 34,
  },
  {
    id: "8",
    name: "Xiaomi Power Bank 20000mAh",
    category: "Mobile Accessories",
    price: 1599,
    sold: 134,
    revenue: 214266,
    stock: 89,
  },
];

const initialCustomers: Customer[] = [
  // Top tier customers (15-20 orders)
  {
    id: "1",
    name: "Amit Kumar",
    email: "amit.kumar@email.com",
    phone: "+91 98765 43210",
    orders: 18,
    totalSpent: 187450,
    lastOrder: "2 hours ago",
  },
  {
    id: "2",
    name: "Rajesh Electronics",
    email: "rajesh@business.com",
    phone: "+91 98765 43211",
    orders: 16,
    totalSpent: 165800,
    lastOrder: "5 hours ago",
  },
  {
    id: "3",
    name: "Priya Patel",
    email: "priya.patel@email.com",
    phone: "+91 98765 43212",
    orders: 15,
    totalSpent: 143200,
    lastOrder: "1 day ago",
  },
  
  // High value customers (10-14 orders)
  {
    id: "4",
    name: "Vikash Singh",
    email: "vikash@email.com",
    phone: "+91 98765 43213",
    orders: 14,
    totalSpent: 128900,
    lastOrder: "1 day ago",
  },
  {
    id: "5",
    name: "Sneha Gupta",
    email: "sneha.gupta@email.com",
    phone: "+91 98765 43214",
    orders: 12,
    totalSpent: 98600,
    lastOrder: "2 days ago",
  },
  {
    id: "6",
    name: "Karthik Reddy",
    email: "karthik@email.com",
    phone: "+91 98765 43215",
    orders: 11,
    totalSpent: 89750,
    lastOrder: "2 days ago",
  },
  {
    id: "7",
    name: "Divya Sharma",
    email: "divya@email.com",
    phone: "+91 98765 43216",
    orders: 10,
    totalSpent: 76400,
    lastOrder: "3 days ago",
  },
  
  // Regular customers (6-9 orders)
  {
    id: "8",
    name: "Arjun Malhotra",
    email: "arjun@email.com",
    phone: "+91 98765 43217",
    orders: 9,
    totalSpent: 67200,
    lastOrder: "3 days ago",
  },
  {
    id: "9",
    name: "Meera Iyer",
    email: "meera@email.com",
    phone: "+91 98765 43218",
    orders: 8,
    totalSpent: 58900,
    lastOrder: "4 days ago",
  },
  {
    id: "10",
    name: "Rohit Verma",
    email: "rohit@email.com",
    phone: "+91 98765 43219",
    orders: 8,
    totalSpent: 54300,
    lastOrder: "5 days ago",
  },
  {
    id: "11",
    name: "Anjali Desai",
    email: "anjali@email.com",
    phone: "+91 98765 43220",
    orders: 7,
    totalSpent: 49800,
    lastOrder: "5 days ago",
  },
  {
    id: "12",
    name: "Sanjay Mehta",
    email: "sanjay@email.com",
    phone: "+91 98765 43221",
    orders: 7,
    totalSpent: 46200,
    lastOrder: "6 days ago",
  },
  {
    id: "13",
    name: "Pooja Nair",
    email: "pooja@email.com",
    phone: "+91 98765 43222",
    orders: 6,
    totalSpent: 42100,
    lastOrder: "1 week ago",
  },
  
  // Mid-tier customers (4-5 orders)
  {
    id: "14",
    name: "Ravi Krishnan",
    email: "ravi@email.com",
    phone: "+91 98765 43223",
    orders: 5,
    totalSpent: 36700,
    lastOrder: "1 week ago",
  },
  {
    id: "15",
    name: "Neha Kapoor",
    email: "neha@email.com",
    phone: "+91 98765 43224",
    orders: 5,
    totalSpent: 33400,
    lastOrder: "1 week ago",
  },
  {
    id: "16",
    name: "Suresh Babu",
    email: "suresh@email.com",
    phone: "+91 98765 43225",
    orders: 4,
    totalSpent: 29600,
    lastOrder: "2 weeks ago",
  },
  {
    id: "17",
    name: "Kavita Singh",
    email: "kavita@email.com",
    phone: "+91 98765 43226",
    orders: 4,
    totalSpent: 27300,
    lastOrder: "2 weeks ago",
  },
  {
    id: "18",
    name: "Manoj Tiwari",
    email: "manoj@email.com",
    phone: "+91 98765 43227",
    orders: 4,
    totalSpent: 24800,
    lastOrder: "2 weeks ago",
  },
  
  // Regular customers (2-3 orders)
  {
    id: "19",
    name: "Deepa Rao",
    email: "deepa@email.com",
    phone: "+91 98765 43228",
    orders: 3,
    totalSpent: 19500,
    lastOrder: "2 weeks ago",
  },
  {
    id: "20",
    name: "Anil Joshi",
    email: "anil@email.com",
    phone: "+91 98765 43229",
    orders: 3,
    totalSpent: 17200,
    lastOrder: "3 weeks ago",
  },
  {
    id: "21",
    name: "Sunita Devi",
    email: "sunita@email.com",
    phone: "+91 98765 43230",
    orders: 3,
    totalSpent: 15600,
    lastOrder: "3 weeks ago",
  },
  {
    id: "22",
    name: "Ramesh Pillai",
    email: "ramesh@email.com",
    phone: "+91 98765 43231",
    orders: 2,
    totalSpent: 12400,
    lastOrder: "3 weeks ago",
  },
  {
    id: "23",
    name: "Geeta Agarwal",
    email: "geeta@email.com",
    phone: "+91 98765 43232",
    orders: 2,
    totalSpent: 10800,
    lastOrder: "1 month ago",
  },
  {
    id: "24",
    name: "Harish Chandra",
    email: "harish@email.com",
    phone: "+91 98765 43233",
    orders: 2,
    totalSpent: 9200,
    lastOrder: "1 month ago",
  },
  {
    id: "25",
    name: "Lakshmi Menon",
    email: "lakshmi@email.com",
    phone: "+91 98765 43234",
    orders: 2,
    totalSpent: 8500,
    lastOrder: "1 month ago",
  },
];

// Initial sample orders showing customer purchase history
const initialOrders: Order[] = [
  {
    id: "ord-2024110501",
    customerId: "1",
    customerName: "Amit Kumar",
    customerEmail: "amit.kumar@email.com",
    customerPhone: "+91 98765 43210",
    productId: "1",
    productName: "Samsung Galaxy A34 5G",
    quantity: 2,
    total: 57998,
    date: "03 Nov 2024 14:30",
  },
  {
    id: "ord-2024110502",
    customerId: "2",
    customerName: "Rajesh Electronics",
    customerEmail: "rajesh@business.com",
    customerPhone: "+91 98765 43211",
    productId: "3",
    productName: "Lenovo IdeaPad Slim 3",
    quantity: 1,
    total: 42999,
    date: "03 Nov 2024 15:45",
  },
  {
    id: "ord-2024110503",
    customerId: "3",
    customerName: "Priya Patel",
    customerEmail: "priya.patel@email.com",
    customerPhone: "+91 98765 43212",
    productId: "2",
    productName: "boAt Rockerz 450 Bluetooth Headphones",
    quantity: 3,
    total: 3897,
    date: "04 Nov 2024 10:15",
  },
  {
    id: "ord-2024110504",
    customerId: "1",
    customerName: "Amit Kumar",
    customerEmail: "amit.kumar@email.com",
    customerPhone: "+91 98765 43210",
    productId: "8",
    productName: "Xiaomi Power Bank 20000mAh",
    quantity: 5,
    total: 7995,
    date: "04 Nov 2024 11:20",
  },
  {
    id: "ord-2024110505",
    customerId: "4",
    customerName: "Vikash Singh",
    customerEmail: "vikash@email.com",
    customerPhone: "+91 98765 43213",
    productId: "4",
    productName: "Samsung 43\" Smart LED TV",
    quantity: 1,
    total: 32999,
    date: "04 Nov 2024 12:30",
  },
  {
    id: "ord-2024110506",
    customerId: "5",
    customerName: "Sneha Gupta",
    customerEmail: "sneha.gupta@email.com",
    customerPhone: "+91 98765 43214",
    productId: "5",
    productName: "Realme Buds Air 3 TWS Earbuds",
    quantity: 2,
    total: 5998,
    date: "04 Nov 2024 13:45",
  },
  {
    id: "ord-2024110507",
    customerId: "6",
    customerName: "Karthik Reddy",
    customerEmail: "karthik@email.com",
    customerPhone: "+91 98765 43215",
    productId: "7",
    productName: "Logitech K380 Wireless Keyboard",
    quantity: 4,
    total: 7596,
    date: "04 Nov 2024 16:00",
  },
  {
    id: "ord-2024110508",
    customerId: "2",
    customerName: "Rajesh Electronics",
    customerEmail: "rajesh@business.com",
    customerPhone: "+91 98765 43211",
    productId: "6",
    productName: "HP LaserJet M126nw Printer",
    quantity: 1,
    total: 12499,
    date: "05 Nov 2024 09:30",
  },
  {
    id: "ord-2024110509",
    customerId: "7",
    customerName: "Divya Sharma",
    customerEmail: "divya@email.com",
    customerPhone: "+91 98765 43216",
    productId: "1",
    productName: "Samsung Galaxy A34 5G",
    quantity: 1,
    total: 28999,
    date: "05 Nov 2024 10:45",
  },
  {
    id: "ord-2024110510",
    customerId: "8",
    customerName: "Arjun Malhotra",
    customerEmail: "arjun@email.com",
    customerPhone: "+91 98765 43217",
    productId: "2",
    productName: "boAt Rockerz 450 Bluetooth Headphones",
    quantity: 6,
    total: 7794,
    date: "05 Nov 2024 11:15",
  },
  {
    id: "ord-2024110511",
    customerId: "9",
    customerName: "Meera Iyer",
    customerEmail: "meera@email.com",
    customerPhone: "+91 98765 43218",
    productId: "4",
    productName: "Samsung 43\" Smart LED TV",
    quantity: 1,
    total: 32999,
    date: "05 Nov 2024 13:00",
  },
  {
    id: "ord-2024110512",
    customerId: "3",
    customerName: "Priya Patel",
    customerEmail: "priya.patel@email.com",
    customerPhone: "+91 98765 43212",
    productId: "8",
    productName: "Xiaomi Power Bank 20000mAh",
    quantity: 10,
    total: 15990,
    date: "05 Nov 2024 14:20",
  },
];

export function DashboardPage({
  onLogout,
  onNavigateToSupport,
  onNavigateToChat,
  onNavigateToLanding,
}: DashboardPageProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState("dashboard");
  const [posEnabled, setPosEnabled] = useState(() => {
    const saved = localStorage.getItem("orrico_pos_enabled");
    return saved ? JSON.parse(saved) : false;
  });
  const posIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State for dynamic data
  const [products, setProducts] = useState<Product[]>(() => {
    const savedVersion = localStorage.getItem("orrico_data_version");
    
    // If version doesn't match, reset to initial data
    if (savedVersion !== DATA_VERSION) {
      localStorage.setItem("orrico_data_version", DATA_VERSION);
      return initialProducts;
    }
    
    const saved = localStorage.getItem("orrico_products");
    return saved ? JSON.parse(saved) : initialProducts;
  });

  // Generate full customer list (68 customers)
  const getFullCustomerList = () => {
    const additionalCustomers: Customer[] = [];
    const names = [
      "Prakash Jain", "Reena Saxena", "Nitin Gupta", "Shilpa Reddy", "Gaurav Singh",
      "Manju Devi", "Yogesh Kumar", "Radha Krishna", "Sunil Patil", "Kamala Bai",
      "Ashok Mehta", "Swati Kulkarni", "Vinod Sharma", "Pushpa Rani", "Mukesh Tiwari",
      "Sarita Devi", "Kishore Rao", "Usha Nair", "Dinesh Verma", "Anita Singh",
      "Brijesh Pandey", "Lata Mishra", "Santosh Kumar", "Parvati Devi", "Mahesh Gupta",
      "Savita Sharma", "Naresh Yadav", "Rekha Kumari", "Praveen Kumar", "Sushila Devi",
      "Hari Singh", "Shakuntala Rao", "Ramakant Joshi", "Mangala Bai", "Umesh Patil",
      "Vidya Devi", "Gopal Krishna", "Suman Gupta", "Satish Kumar", "Lalita Singh",
      "Pankaj Mehta", "Bharati Devi", "Navin Kumar"
    ];
    
    for (let i = 0; i < 43; i++) {
      additionalCustomers.push({
        id: (26 + i).toString(),
        name: names[i],
        email: `${names[i].toLowerCase().replace(" ", ".")}@email.com`,
        phone: `+91 ${98765 - i} ${43235 + i}`,
        orders: i < 10 ? 2 : 1,
        totalSpent: i < 10 ? Math.floor(7000 + Math.random() * 3000) : Math.floor(3000 + Math.random() * 4000),
        lastOrder: i < 15 ? "1 month ago" : "2 months ago",
      });
    }
    
    return [...initialCustomers, ...additionalCustomers];
  };

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const savedVersion = localStorage.getItem("orrico_data_version");
    const saved = localStorage.getItem("orrico_customers");
    
    // If version doesn't match or no saved data, use full customer list
    if (savedVersion !== DATA_VERSION || !saved) {
      return getFullCustomerList();
    }
    
    // Check if saved data has enough customers (should be 68)
    const parsedCustomers = JSON.parse(saved);
    if (parsedCustomers.length < 68) {
      return getFullCustomerList();
    }
    
    return parsedCustomers;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const savedVersion = localStorage.getItem("orrico_data_version");
    const saved = localStorage.getItem("orrico_orders");
    
    // If version doesn't match, reset to initial orders
    if (savedVersion !== DATA_VERSION) {
      return initialOrders;
    }
    
    return saved ? JSON.parse(saved) : initialOrders;
  });

  const [todayRevenue, setTodayRevenue] = useState(() => {
    const saved = localStorage.getItem("orrico_today_revenue");
    return saved ? parseFloat(saved) : 145750;
  });

  const [todayOrders, setTodayOrders] = useState(() => {
    const saved = localStorage.getItem("orrico_today_orders");
    return saved ? parseInt(saved) : 18;
  });

  // Form state
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
  });

  const [newOrder, setNewOrder] = useState({
    isNewCustomer: false,
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    productId: "",
    quantity: "1",
  });

  // Persist data to localStorage
  useEffect(() => {
    localStorage.setItem("orrico_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("orrico_customers", JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem("orrico_orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem("orrico_today_revenue", todayRevenue.toString());
  }, [todayRevenue]);

  useEffect(() => {
    localStorage.setItem("orrico_today_orders", todayOrders.toString());
  }, [todayOrders]);

  useEffect(() => {
    localStorage.setItem("orrico_pos_enabled", JSON.stringify(posEnabled));
  }, [posEnabled]);

  // POS Integration - Simulates automatic sales from POS system
  useEffect(() => {
    if (posEnabled) {
      // Generate random POS transaction every 8-15 seconds
      const startPosSimulation = () => {
        const randomDelay = Math.random() * 7000 + 8000; // 8-15 seconds
        posIntervalRef.current = setTimeout(() => {
          simulatePosTransaction();
          startPosSimulation(); // Schedule next transaction
        }, randomDelay);
      };

      startPosSimulation();
      toast.success("POS System Connected", {
        description: "Transactions will now sync automatically",
      });

      return () => {
        if (posIntervalRef.current) {
          clearTimeout(posIntervalRef.current);
        }
      };
    } else {
      if (posIntervalRef.current) {
        clearTimeout(posIntervalRef.current);
      }
    }
  }, [posEnabled]);

  // Simulate a POS transaction
  const simulatePosTransaction = () => {
    // Only proceed if we have products and customers
    if (products.length === 0 || customers.length === 0) return;

    // Select random customer (80% existing, 20% new)
    let selectedCustomer: Customer;
    const useExistingCustomer = Math.random() > 0.2;

    if (useExistingCustomer && customers.length > 0) {
      selectedCustomer = customers[Math.floor(Math.random() * customers.length)];
    } else {
      // Create new walk-in customer
      const newCustomerNames = [
        "Store Customer",
        "Anil Verma",
        "Pooja Singh",
        "Rajesh Mehta",
        "Kavita Sharma",
        "Suresh Patel",
        "Neha Gupta",
        "Manoj Kumar",
      ];
      const randomName = newCustomerNames[Math.floor(Math.random() * newCustomerNames.length)];
      const customerId = `pos-${Date.now()}`;
      
      selectedCustomer = {
        id: customerId,
        name: randomName,
        email: `${randomName.toLowerCase().replace(/\s+/g, '')}@shop.com`,
        phone: `+91 ${Math.floor(Math.random() * 90000) + 10000} ${Math.floor(Math.random() * 90000) + 10000}`,
        orders: 0,
        totalSpent: 0,
        lastOrder: "Just now",
      };
      
      setCustomers(prev => [selectedCustomer, ...prev]);
    }

    // Select 1-3 random products
    const numProducts = Math.floor(Math.random() * 3) + 1;
    const selectedProducts: { product: Product; quantity: number }[] = [];
    
    for (let i = 0; i < numProducts; i++) {
      const availableProducts = products.filter(p => p.stock > 0);
      if (availableProducts.length === 0) break;
      
      const product = availableProducts[Math.floor(Math.random() * availableProducts.length)];
      const maxQuantity = Math.min(product.stock, 5);
      const quantity = Math.floor(Math.random() * maxQuantity) + 1;
      
      selectedProducts.push({ product, quantity });
    }

    if (selectedProducts.length === 0) return;

    // Calculate total
    const total = selectedProducts.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    // Update products
    setProducts(prev =>
      prev.map(p => {
        const purchasedItem = selectedProducts.find(sp => sp.product.id === p.id);
        if (purchasedItem) {
          return {
            ...p,
            sold: p.sold + purchasedItem.quantity,
            stock: p.stock - purchasedItem.quantity,
            revenue: p.revenue + (p.price * purchasedItem.quantity),
          };
        }
        return p;
      })
    );

    // Update customer
    setCustomers(prev =>
      prev.map(c =>
        c.id === selectedCustomer.id
          ? {
              ...c,
              orders: c.orders + 1,
              totalSpent: c.totalSpent + total,
              lastOrder: "Just now",
            }
          : c
      )
    );

    // Update metrics
    setTodayRevenue(prev => prev + total);
    setTodayOrders(prev => prev + 1);

    // Create order record
    const now = new Date();
    const dateStr = `${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    
    const order: Order = {
      id: `pos-${Date.now()}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerEmail: selectedCustomer.email,
      customerPhone: selectedCustomer.phone,
      productId: selectedProducts[0].product.id,
      productName: selectedProducts.map(sp => `${sp.quantity}x ${sp.product.name}`).join(', '),
      quantity: selectedProducts.reduce((sum, item) => sum + item.quantity, 0),
      total,
      date: dateStr,
    };
    setOrders(prev => [order, ...prev]);

    // Show notification
    const productSummary = selectedProducts.length === 1
      ? `${selectedProducts[0].quantity}x ${selectedProducts[0].product.name}`
      : `${selectedProducts.length} items`;

    toast.success("New POS Sale", {
      description: `${selectedCustomer.name} | ${productSummary} | Rs ${total.toLocaleString()}`,
    });
  };

  const togglePosSystem = () => {
    setPosEnabled(!posEnabled);
    if (!posEnabled) {
      toast.info("Enabling POS System...");
    } else {
      toast.info("POS System Disconnected");
    }
  };

  const salesData = [
    { date: "Mon", revenue: 125000, orders: 14 },
    { date: "Tue", revenue: 98000, orders: 11 },
    { date: "Wed", revenue: 156000, orders: 19 },
    { date: "Thu", revenue: 189000, orders: 22 },
    { date: "Fri", revenue: 167000, orders: 18 },
    { date: "Sat", revenue: 234000, orders: 28 },
    { date: "Sun", revenue: 198000, orders: 24 },
  ];

  const categoryData = [
    {
      name: "Mobile Phones",
      value: 32,
      revenue: 456780,
      color: "#8884d8",
    },
    {
      name: "Laptops",
      value: 18,
      revenue: 387650,
      color: "#82ca9d",
    },
    {
      name: "Televisions",
      value: 15,
      revenue: 298450,
      color: "#ffc658",
    },
    {
      name: "Audio Devices",
      value: 22,
      revenue: 178340,
      color: "#ff7300",
    },
    {
      name: "Accessories",
      value: 13,
      revenue: 124560,
      color: "#00ff88",
    },
  ];

  // Handler functions
  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info("Refreshing dashboard data...");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRefreshing(false);
    toast.success("Dashboard data refreshed!");
  };

  const handleExport = () => {
    toast.info("Preparing export...");
    setTimeout(() => {
      toast.success("Dashboard data exported successfully!");
    }, 1000);
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.category || !newProduct.price || !newProduct.stock) {
      toast.error("Please fill in all fields");
      return;
    }

    const product: Product = {
      id: Date.now().toString(),
      name: newProduct.name,
      category: newProduct.category,
      price: parseFloat(newProduct.price),
      sold: 0,
      revenue: 0,
      stock: parseInt(newProduct.stock),
    };

    setProducts([...products, product]);
    setNewProduct({ name: "", category: "", price: "", stock: "" });
    setShowAddProductDialog(false);
    toast.success(`Product "${product.name}" added successfully!`);
  };

  const handleNewOrder = () => {
    // Validate product and quantity
    if (!newOrder.productId || !newOrder.quantity) {
      toast.error("Please select a product and quantity");
      return;
    }

    const product = products.find((p) => p.id === newOrder.productId);
    if (!product) {
      toast.error("Invalid product");
      return;
    }

    let customer: Customer;

    // Handle new customer or existing customer
    if (newOrder.isNewCustomer) {
      // Validate new customer fields
      if (!newOrder.customerName || !newOrder.customerEmail) {
        toast.error("Please enter customer name and email");
        return;
      }

      // Create new customer
      customer = {
        id: Date.now().toString(),
        name: newOrder.customerName,
        email: newOrder.customerEmail,
        phone: newOrder.customerPhone,
        orders: 0,
        totalSpent: 0,
        lastOrder: "Just now",
      };

      // Add to customers list
      setCustomers([customer, ...customers]);
    } else {
      // Use existing customer
      if (!newOrder.customerId) {
        toast.error("Please select a customer");
        return;
      }

      const existingCustomer = customers.find((c) => c.id === newOrder.customerId);
      if (!existingCustomer) {
        toast.error("Invalid customer");
        return;
      }
      customer = existingCustomer;
    }

    const quantity = parseInt(newOrder.quantity);
    const total = product.price * quantity;

    // Create order
    const now = new Date();
    const dateStr = `${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    
    const order: Order = {
      id: Date.now().toString(),
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      productId: newOrder.productId,
      productName: product.name,
      quantity,
      total,
      date: dateStr,
    };

    // Update products (increase sold, decrease stock, increase revenue)
    setProducts(
      products.map((p) =>
        p.id === newOrder.productId
          ? {
              ...p,
              sold: p.sold + quantity,
              stock: p.stock - quantity,
              revenue: p.revenue + total,
            }
          : p
      )
    );

    // Update customers (increase orders, increase total spent)
    if (!newOrder.isNewCustomer) {
      setCustomers(
        customers.map((c) =>
          c.id === customer.id
            ? {
                ...c,
                orders: c.orders + 1,
                totalSpent: c.totalSpent + total,
                lastOrder: "Just now",
              }
            : c
        )
      );
    } else {
      // For new customers, update the one we just added
      setCustomers(prev =>
        prev.map((c) =>
          c.id === customer.id
            ? {
                ...c,
                orders: 1,
                totalSpent: total,
                lastOrder: "Just now",
              }
            : c
        )
      );
    }

    // Update today's metrics
    setTodayRevenue(todayRevenue + total);
    setTodayOrders(todayOrders + 1);

    setOrders([...orders, order]);
    setNewOrder({ 
      isNewCustomer: false,
      customerId: "", 
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      productId: "", 
      quantity: "1" 
    });
    setShowNewOrderDialog(false);
    
    const successMessage = newOrder.isNewCustomer 
      ? `New customer "${customer.name}" added and order created! ${quantity}x ${product.name} for Rs ${total.toLocaleString()}`
      : `Order created! ${customer.name} purchased ${quantity}x ${product.name} for Rs ${total.toLocaleString()}`;
    
    toast.success(successMessage);
  };

  const handleNavigation = (item: string) => {
    setActiveNavItem(item);
  };

  const handleSettings = () => {
    setShowSettingsDialog(true);
  };

  // Calculate metrics
  const totalCustomers = customers.length;
  const totalProductsSold = products.reduce((acc, p) => acc + p.sold, 0);

  const metrics = [
    {
      title: "Today's Revenue",
      value: `Rs ${todayRevenue.toLocaleString()}`,
      change: "+12.5%",
      positive: true,
      icon: <IndianRupee className="h-4 w-4" />,
    },
    {
      title: "Today's Orders",
      value: todayOrders.toString(),
      change: "+8.2%",
      positive: true,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
      title: "Total Customers",
      value: totalCustomers.toString(),
      change: "+15.3%",
      positive: true,
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Products Sold",
      value: totalProductsSold.toLocaleString(),
      change: "-2.1%",
      positive: false,
      icon: <Package className="h-4 w-4" />,
    },
  ];

  // Get top products (sorted by revenue)
  const topProducts = [...products]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Get recent customers (sorted by last order)
  const recentCustomers = [...customers].slice(0, 5);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="flex w-80 shrink-0 flex-col overflow-hidden border-r bg-muted/20">
        {/* Header */}
        <div className="p-6 border-b">
          <Logo iconClassName="h-6 w-6" className="mb-4" onClick={onNavigateToLanding} clickable={!!onNavigateToLanding} />
          <div className="flex items-center gap-2 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>JS</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">Gupta Electronics</p>
              <p className="text-sm text-muted-foreground">
                Vyapar Pro
              </p>
            </div>
          </div>
          
          {/* POS Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              {posEnabled ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">POS Connected</p>
                    <p className="text-xs text-muted-foreground">Live sync active</p>
                  </div>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">POS Offline</p>
                    <p className="text-xs text-muted-foreground">Manual mode</p>
                  </div>
                </>
              )}
            </div>
            <Button
              variant={posEnabled ? "default" : "outline"}
              size="sm"
              onClick={togglePosSystem}
            >
              <Zap className="h-3 w-3 mr-1" />
              {posEnabled ? "On" : "Off"}
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-6 border-b">
          <h3 className="font-medium mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Button
              onClick={onNavigateToChat}
              size="sm"
              className="w-full justify-start"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Assistant
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <h3 className="font-medium mb-3">Navigation</h3>
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className={`w-full justify-start ${
                activeNavItem === "dashboard" ? "bg-accent" : ""
              }`}
              onClick={() => handleNavigation("dashboard")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`w-full justify-start ${
                activeNavItem === "products" ? "bg-accent" : ""
              }`}
              onClick={() => handleNavigation("products")}
            >
              <Package className="h-4 w-4 mr-2" />
              Products
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`w-full justify-start ${
                activeNavItem === "customers" ? "bg-accent" : ""
              }`}
              onClick={() => handleNavigation("customers")}
            >
              <Users className="h-4 w-4 mr-2" />
              Customers
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`w-full justify-start ${
                activeNavItem === "inventory" ? "bg-accent" : ""
              }`}
              onClick={() => handleNavigation("inventory")}
            >
              <Database className="h-4 w-4 mr-2" />
              Inventory
            </Button>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="p-6 border-t space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={onNavigateToSupport}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Support
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleSettings}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-w-0 flex-1 overflow-auto">
        {/* Header */}
        <div className="p-6 border-b bg-background">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">
                {activeNavItem === "dashboard" && "Dashboard"}
                {activeNavItem === "products" && "Products"}
                {activeNavItem === "customers" && "Customers"}
                {activeNavItem === "inventory" && "Inventory"}
              </h1>
              <p className="text-muted-foreground">
                {activeNavItem === "dashboard" && "Welcome back! Here's what's happening with your store today."}
                {activeNavItem === "products" && "View and manage all your products"}
                {activeNavItem === "customers" && "Manage your customer relationships"}
                {activeNavItem === "inventory" && "Monitor stock levels and inventory"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>
              <Button>
                <Calendar className="h-4 w-4 mr-2" />
                Last 7 days
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Dashboard View */}
          {activeNavItem === "dashboard" && (
            <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.title}
                  </CardTitle>
                  {metric.icon}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metric.value}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {metric.positive ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span
                      className={
                        metric.positive
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {metric.change}
                    </span>
                    <span>from last week</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>
                  Daily revenue for the past week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [
                          `Rs ${value.toLocaleString()}`,
                        "Revenue",
                      ]}
                    />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
                <CardDescription>
                  Revenue distribution across product categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        `${value}%`,
                        "Share",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {categoryData.map((category, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: category.color,
                          }}
                        />
                        <span className="text-sm">
                          {category.name}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        Rs {category.revenue.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tables Section */}
          <Tabs defaultValue="products" className="space-y-4">
            <TabsList>
              <TabsTrigger value="products">
                Top Products
              </TabsTrigger>
              <TabsTrigger value="customers">
                Recent Customers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Products</CardTitle>
                  <CardDescription>
                    Your best performing products this week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Sold</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {product.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            Rs {product.price.toLocaleString()}
                          </TableCell>
                          <TableCell>{product.sold}</TableCell>
                          <TableCell>
                            Rs {product.revenue.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{product.stock}</span>
                              {product.stock < 30 && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Low
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Customers</CardTitle>
                  <CardDescription>
                    Latest customer activity and orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Total Spent</TableHead>
                        <TableHead>Last Order</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {customer.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {customer.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {customer.email}
                          </TableCell>
                          <TableCell>
                            {customer.orders}
                          </TableCell>
                          <TableCell>
                            Rs {customer.totalSpent.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {customer.lastOrder}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
            </>
          )}

          {/* Products View - All products ever sold */}
          {activeNavItem === "products" && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Products Catalog</CardTitle>
                  <CardDescription>
                    All products that have been sold, regardless of current availability
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Units Sold</TableHead>
                      <TableHead>Revenue Generated</TableHead>
                      <TableHead>Availability</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell>Rs {product.price.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{product.sold} sold</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          Rs {product.revenue.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {product.stock > 0 ? (
                            <Badge className="bg-green-600">
                              In Stock ({product.stock})
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              Out of Stock
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Customers View */}
          {activeNavItem === "customers" && (
            <Card>
              <CardHeader>
                <CardTitle>All Customers</CardTitle>
                <CardDescription>
                  Manage your customer base and relationships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Last Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          {customer.name}
                        </TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{customer.orders} orders</Badge>
                        </TableCell>
                        <TableCell>Rs {customer.totalSpent.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {customer.lastOrder}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Inventory View - Only available products */}
          {activeNavItem === "inventory" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Available Products
                    </CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {products.filter(p => p.stock > 0).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Currently in stock
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Low Stock Items
                    </CardTitle>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {products.filter(p => p.stock > 0 && p.stock < 10).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Need immediate restock
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Stock Value
                    </CardTitle>
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      Rs {products.filter(p => p.stock > 0).reduce((acc, p) => acc + (p.stock * p.price), 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Available inventory value
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Available Inventory</CardTitle>
                      <CardDescription>
                        Products currently in stock and available for sale
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowAddProductDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {products.filter(p => p.stock > 0).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Current Stock</TableHead>
                          <TableHead>Stock Value</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.filter(p => p.stock > 0).map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">
                              {product.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{product.category}</Badge>
                            </TableCell>
                            <TableCell>Rs {product.price.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  product.stock < 10
                                    ? "destructive"
                                    : product.stock < 30
                                    ? "outline"
                                    : "default"
                                }
                              >
                                {product.stock} units
                              </Badge>
                            </TableCell>
                            <TableCell>
                              Rs {(product.stock * product.price).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {product.stock < 10 ? (
                                <Badge variant="destructive">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Critical
                                </Badge>
                              ) : product.stock < 30 ? (
                                <Badge variant="outline">
                                  Low Stock
                                </Badge>
                              ) : (
                                <Badge className="bg-green-600">
                                  In Stock
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2">No products in stock</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        All products are currently out of stock
                      </p>
                      <Button onClick={() => setShowAddProductDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Add a new product to your inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                placeholder="Enter product name"
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={newProduct.category}
                onValueChange={(value) =>
                  setNewProduct({ ...newProduct, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mobile Phones">Mobile Phones</SelectItem>
                  <SelectItem value="Laptops">Laptops</SelectItem>
                  <SelectItem value="Televisions">Televisions</SelectItem>
                  <SelectItem value="Audio Devices">Audio Devices</SelectItem>
                  <SelectItem value="Computer Accessories">Computer Accessories</SelectItem>
                  <SelectItem value="Mobile Accessories">Mobile Accessories</SelectItem>
                  <SelectItem value="Printers & Scanners">Printers & Scanners</SelectItem>
                  <SelectItem value="Smart Watches">Smart Watches</SelectItem>
                  <SelectItem value="Cameras">Cameras</SelectItem>
                  <SelectItem value="Gaming">Gaming</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (Rs)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0"
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, price: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="0"
                  value={newProduct.stock}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, stock: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddProductDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddProduct}>
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Order Dialog */}
      <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
            <DialogDescription>
              Create a new order and optionally add a new customer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Customer Type Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border-2">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">New Customer</p>
                  <p className="text-xs text-muted-foreground">
                    {newOrder.isNewCustomer 
                      ? "Adding a new customer with this order" 
                      : "Select from existing customers"}
                  </p>
                </div>
              </div>
              <Switch
                checked={newOrder.isNewCustomer}
                onCheckedChange={(checked) => setNewOrder({ 
                  ...newOrder, 
                  isNewCustomer: checked,
                  customerId: "",
                  customerName: "",
                  customerEmail: "",
                  customerPhone: "",
                })}
              />
            </div>

            {/* Existing Customer Selection */}
            {!newOrder.isNewCustomer && (
              <div className="space-y-2">
                <Label htmlFor="orderCustomer">Select Customer</Label>
                <Select
                  value={newOrder.customerId}
                  onValueChange={(value) =>
                    setNewOrder({ ...newOrder, customerId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* New Customer Fields */}
            {newOrder.isNewCustomer && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newCustomerName">Customer Name</Label>
                  <Input
                    id="newCustomerName"
                    placeholder="Enter customer name"
                    value={newOrder.customerName}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, customerName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newCustomerEmail">Email</Label>
                  <Input
                    id="newCustomerEmail"
                    type="email"
                    placeholder="customer@dukaan.in"
                    value={newOrder.customerEmail}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, customerEmail: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newCustomerPhone">Phone Number (Optional)</Label>
                  <Input
                    id="newCustomerPhone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newOrder.customerPhone}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, customerPhone: e.target.value })
                    }
                  />
                </div>
              </>
            )}
            {/* Product Selection */}
            <div className="space-y-2">
              <Label htmlFor="orderProduct">Product</Label>
              <Select
                value={newOrder.productId}
                onValueChange={(value) =>
                  setNewOrder({ ...newOrder, productId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - Rs {product.price.toLocaleString()} (Stock: {product.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="1"
                min="1"
                value={newOrder.quantity}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, quantity: e.target.value })
                }
              />
            </div>

            {/* Order Total */}
            {newOrder.productId && newOrder.quantity && (
              <div className="p-4 bg-muted rounded-lg border-2 border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Order Total:</span>
                  <span className="text-2xl font-bold">
                    Rs{" "}
                    {(
                      (products.find((p) => p.id === newOrder.productId)
                        ?.price || 0) * parseInt(newOrder.quantity || "1")
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewOrderDialog(false);
                setNewOrder({ 
                  isNewCustomer: false,
                  customerId: "", 
                  customerName: "",
                  customerEmail: "",
                  customerPhone: "",
                  productId: "", 
                  quantity: "1" 
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleNewOrder}>
              {newOrder.isNewCustomer ? "Add Customer & Create Order" : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Manage your account and application settings
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="account" className="py-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="pos">POS System</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shopName">Shop Name</Label>
                <Input id="shopName" defaultValue="Gupta Electronics" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Name</Label>
                <Input id="ownerName" defaultValue="Arjun Sharma" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settingsEmail">Email</Label>
                <Input
                  id="settingsEmail"
                  type="email"
                  defaultValue="demo@orrico.com"
                />
              </div>
            </TabsContent>
            <TabsContent value="database" className="space-y-4">
              <div className="space-y-2">
                <Label>Database Type</Label>
                <Input disabled value="MySQL" />
              </div>
              <div className="space-y-2">
                <Label>Connection Status</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">
                    Connected
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    retail_shop_demo
                  </span>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Reconnect Database
              </Button>
            </TabsContent>
            <TabsContent value="pos" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {posEnabled ? (
                      <Wifi className="h-5 w-5 text-green-600" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">POS System Integration</p>
                      <p className="text-sm text-muted-foreground">
                        {posEnabled 
                          ? "Automatically sync sales from POS terminal"
                          : "Enable to sync transactions in real-time"
                        }
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={posEnabled ? "default" : "outline"}
                    onClick={togglePosSystem}
                  >
                    {posEnabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>POS Terminal ID</Label>
                  <Input disabled value="TERM-2024-001" />
                </div>
                
                <div className="space-y-2">
                  <Label>Sync Status</Label>
                  <div className="flex items-center gap-2">
                    {posEnabled ? (
                      <>
                        <Badge variant="default" className="bg-green-600">
                          Live Sync Active
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Last sync: Just now
                        </span>
                      </>
                    ) : (
                      <Badge variant="secondary">
                        Manual Mode
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-600" />
                    <p className="font-medium text-sm">How POS Integration Works</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    When enabled, transactions from your POS terminal automatically update inventory, revenue, and customer data in real-time. New customers are automatically added to your database.
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="notifications" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about your orders
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Low Stock Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when products are low in stock
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sales Reports</p>
                  <p className="text-sm text-muted-foreground">
                    Receive weekly sales summary reports
                  </p>
                </div>
                <input type="checkbox" className="w-4 h-4" />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSettingsDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success("Settings saved successfully!");
                setShowSettingsDialog(false);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

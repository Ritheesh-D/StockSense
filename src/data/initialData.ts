import { Product, Supplier, Customer, Invoice, PurchaseOrder, InventoryBatch, StoreSettings } from '../types';

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Fresh Foods Ltd',
    contactPerson: 'Rajesh Sharma',
    phone: '9876543210',
    email: 'orders@freshfoodsltd.com',
    address: 'Warehouse #12, Wholesale Market, Mumbai',
    leadTimeDays: 2,
    productCount: 8,
    rating: 4.8
  },
  {
    id: 'sup-2',
    name: 'Beverages Co',
    contactPerson: 'Sunil Verma',
    phone: '9876501234',
    email: 'supply@beveragesco.in',
    address: 'Plot 45, Industrial Area, Thane',
    leadTimeDays: 3,
    productCount: 4,
    rating: 4.6
  },
  {
    id: 'sup-3',
    name: 'Snacks Plus Distributors',
    contactPerson: 'Anita Rao',
    phone: '9876512345',
    email: 'anita@snacksplus.com',
    address: 'Sector 8, MIDC, Navi Mumbai',
    leadTimeDays: 4,
    productCount: 6,
    rating: 4.9
  },
  {
    id: 'sup-4',
    name: 'Dairy Best Co-operative',
    contactPerson: 'Gopal Patel',
    phone: '9876587654',
    email: 'logistics@dairybest.coop',
    address: 'Dairy Colony, Pune Bypass',
    leadTimeDays: 2,
    productCount: 5,
    rating: 4.7
  },
  {
    id: 'sup-5',
    name: 'Hindustan Daily Essentials',
    contactPerson: 'Vikas Kumar',
    phone: '9876599887',
    email: 'fmcg@hde-supply.com',
    address: 'Central Logistics Park, Bhiwandi',
    leadTimeDays: 3,
    productCount: 7,
    rating: 4.8
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'MAG-280-F',
    barcode: '8901058852301',
    name: 'Maggi 2-Minute Noodles',
    category: 'Food & Grains',
    purchasePrice: 12.00,
    sellingPrice: 18.00,
    stock: 50,
    minStock: 15,
    unit: 'pack',
    supplierId: 'sup-1',
    shelfLifeDays: 270,
    lastRestockedDate: '2026-10-15'
  },
  {
    id: 'prod-2',
    sku: 'COCA-600-B',
    barcode: '8901764012224',
    name: 'Coca Cola Pet Bottle 600ml',
    category: 'Beverages',
    purchasePrice: 20.00,
    sellingPrice: 30.00,
    stock: 32,
    minStock: 12,
    unit: 'bottle',
    supplierId: 'sup-2',
    shelfLifeDays: 180,
    lastRestockedDate: '2026-10-18'
  },
  {
    id: 'prod-3',
    sku: 'LAYS-MAS-50',
    barcode: '8901491101838',
    name: 'Lays India\'s Magic Masala 50g',
    category: 'Snacks & Packaged',
    purchasePrice: 15.00,
    sellingPrice: 25.00,
    stock: 28,
    minStock: 15,
    unit: 'pack',
    supplierId: 'sup-3',
    shelfLifeDays: 120,
    lastRestockedDate: '2026-10-12'
  },
  {
    id: 'prod-4',
    sku: 'AMUL-TON-500',
    barcode: '8901262010052',
    name: 'Amul Taaza Toned Milk 500ml',
    category: 'Dairy & Bakery',
    purchasePrice: 28.00,
    sellingPrice: 40.00,
    stock: 20,
    minStock: 10,
    unit: 'pouch',
    supplierId: 'sup-4',
    shelfLifeDays: 4,
    lastRestockedDate: '2026-10-22'
  },
  {
    id: 'prod-5',
    sku: 'BRIT-MAR-150',
    barcode: '8901063012448',
    name: 'Britannia Marie Gold 150g',
    category: 'Snacks & Packaged',
    purchasePrice: 12.00,
    sellingPrice: 20.00,
    stock: 15,
    minStock: 10,
    unit: 'pack',
    supplierId: 'sup-3',
    shelfLifeDays: 180,
    lastRestockedDate: '2026-10-10'
  },
  {
    id: 'prod-6',
    sku: 'TATA-SALT-1K',
    barcode: '8904004400030',
    name: 'Tata Salt Vacuum Evaporated 1kg',
    category: 'Condiments & Spices',
    purchasePrice: 21.00,
    sellingPrice: 28.00,
    stock: 45,
    minStock: 12,
    unit: 'packet',
    supplierId: 'sup-1',
    shelfLifeDays: 730,
    lastRestockedDate: '2026-10-14'
  },
  {
    id: 'prod-7',
    sku: 'AASH-ATTA-5K',
    barcode: '8901725181223',
    name: 'Aashirvaad Shudh Chakki Atta 5kg',
    category: 'Food & Grains',
    purchasePrice: 215.00,
    sellingPrice: 260.00,
    stock: 18,
    minStock: 8,
    unit: 'bag',
    supplierId: 'sup-1',
    shelfLifeDays: 180,
    lastRestockedDate: '2026-10-19'
  },
  {
    id: 'prod-8',
    sku: 'FORT-OIL-1L',
    barcode: '8906007281021',
    name: 'Fortune Sunlite Refined Oil 1L',
    category: 'Food & Grains',
    purchasePrice: 125.00,
    sellingPrice: 155.00,
    stock: 22,
    minStock: 10,
    unit: 'pouch',
    supplierId: 'sup-1',
    shelfLifeDays: 270,
    lastRestockedDate: '2026-10-17'
  },
  {
    id: 'prod-9',
    sku: 'COLG-MAX-150',
    barcode: '8901314010321',
    name: 'Colgate MaxFresh Red Gel 150g',
    category: 'Personal Care',
    purchasePrice: 78.00,
    sellingPrice: 110.00,
    stock: 16,
    minStock: 8,
    unit: 'box',
    supplierId: 'sup-5',
    shelfLifeDays: 720,
    lastRestockedDate: '2026-10-11'
  },
  {
    id: 'prod-10',
    sku: 'DETT-SOAP-125',
    barcode: '8901396120017',
    name: 'Dettol Original Bathing Soap 125g',
    category: 'Personal Care',
    purchasePrice: 42.00,
    sellingPrice: 58.00,
    stock: 35,
    minStock: 12,
    unit: 'bar',
    supplierId: 'sup-5',
    shelfLifeDays: 1080,
    lastRestockedDate: '2026-10-13'
  },
  {
    id: 'prod-11',
    sku: 'NESC-CLAS-50',
    barcode: '8901058863024',
    name: 'Nescafe Classic Instant Coffee 50g',
    category: 'Beverages',
    purchasePrice: 140.00,
    sellingPrice: 190.00,
    stock: 12,
    minStock: 6,
    unit: 'jar',
    supplierId: 'sup-2',
    shelfLifeDays: 540,
    lastRestockedDate: '2026-10-08'
  },
  {
    id: 'prod-12',
    sku: 'SURF-EXC-1K',
    barcode: '8901030364023',
    name: 'Surf Excel Easy Wash Detergent 1kg',
    category: 'Household Supplies',
    purchasePrice: 115.00,
    sellingPrice: 145.00,
    stock: 24,
    minStock: 10,
    unit: 'pack',
    supplierId: 'sup-5',
    shelfLifeDays: 720,
    lastRestockedDate: '2026-10-16'
  },
  {
    id: 'prod-13',
    sku: 'AMUL-BUT-100',
    barcode: '8901262020013',
    name: 'Amul Pasteurised Butter 100g',
    category: 'Dairy & Bakery',
    purchasePrice: 44.00,
    sellingPrice: 58.00,
    stock: 18,
    minStock: 8,
    unit: 'pack',
    supplierId: 'sup-4',
    shelfLifeDays: 180,
    lastRestockedDate: '2026-10-21'
  },
  {
    id: 'prod-14',
    sku: 'KISS-KET-500',
    barcode: '8901030012016',
    name: 'Kissan Fresh Tomato Ketchup 500g',
    category: 'Condiments & Spices',
    purchasePrice: 75.00,
    sellingPrice: 105.00,
    stock: 14,
    minStock: 6,
    unit: 'bottle',
    supplierId: 'sup-1',
    shelfLifeDays: 360,
    lastRestockedDate: '2026-10-09'
  },
  {
    id: 'prod-15',
    sku: 'HALD-BHU-200',
    barcode: '8904063200114',
    name: 'Haldiram\'s Aloo Bhujia 200g',
    category: 'Snacks & Packaged',
    purchasePrice: 38.00,
    sellingPrice: 55.00,
    stock: 26,
    minStock: 10,
    unit: 'pack',
    supplierId: 'sup-3',
    shelfLifeDays: 150,
    lastRestockedDate: '2026-10-15'
  }
];

export const INITIAL_BATCHES: InventoryBatch[] = [
  {
    id: 'batch-1',
    productId: 'prod-4',
    batchNo: 'B001',
    quantity: 10,
    expiryDate: '2026-10-28', // Expiring in 5 days!
    purchaseDate: '2026-10-22',
    purchasePrice: 28.00,
    status: 'expiring_soon'
  },
  {
    id: 'batch-2',
    productId: 'prod-3',
    batchNo: 'B002',
    quantity: 15,
    expiryDate: '2026-11-05', // Expiring in 13 days
    purchaseDate: '2026-10-12',
    purchasePrice: 15.00,
    status: 'expiring_soon'
  },
  {
    id: 'batch-3',
    productId: 'prod-2',
    batchNo: 'B003',
    quantity: 20,
    expiryDate: '2026-12-15',
    purchaseDate: '2026-10-18',
    purchasePrice: 20.00,
    status: 'normal'
  },
  {
    id: 'batch-4',
    productId: 'prod-1',
    batchNo: 'B004',
    quantity: 25,
    expiryDate: '2027-02-20',
    purchaseDate: '2026-10-15',
    purchasePrice: 12.00,
    status: 'normal'
  },
  {
    id: 'batch-5',
    productId: 'prod-5',
    batchNo: 'B005',
    quantity: 10,
    expiryDate: '2026-11-02', // Expiring in 10 days
    purchaseDate: '2026-10-10',
    purchasePrice: 12.00,
    status: 'expiring_soon'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Aarav Mehta',
    phone: '9820112233',
    email: 'aarav.m@example.com',
    totalSpent: 4320,
    totalVisits: 12,
    lastVisit: '2026-10-22'
  },
  {
    id: 'cust-2',
    name: 'Pooja Iyer',
    phone: '9820445566',
    email: 'pooja.i@example.com',
    totalSpent: 2890,
    totalVisits: 7,
    lastVisit: '2026-10-21'
  },
  {
    id: 'cust-3',
    name: 'Rohan Deshmukh',
    phone: '9819998877',
    email: 'rohan.d@example.com',
    totalSpent: 6450,
    totalVisits: 18,
    lastVisit: '2026-10-23'
  },
  {
    id: 'cust-4',
    name: 'Sunita Singhania',
    phone: '9819123456',
    email: 'sunita@example.com',
    totalSpent: 1850,
    totalVisits: 4,
    lastVisit: '2026-10-19'
  }
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-1',
    orderNumber: 'PO-2026-001',
    supplierId: 'sup-1',
    supplierName: 'Fresh Foods Ltd',
    orderDate: '2026-10-20',
    expectedDate: '2026-10-22',
    status: 'pending',
    items: [
      { productId: 'prod-1', productName: 'Maggi 2-Minute Noodles', sku: 'MAG-280-F', quantity: 50, unitCost: 12.00, totalCost: 600.00 },
      { productId: 'prod-7', productName: 'Aashirvaad Shudh Chakki Atta 5kg', sku: 'AASH-ATTA-5K', quantity: 10, unitCost: 215.00, totalCost: 2150.00 }
    ],
    totalAmount: 2750.00,
    notes: 'Urgent restocking for weekend surge'
  },
  {
    id: 'po-2',
    orderNumber: 'PO-2026-002',
    supplierId: 'sup-2',
    supplierName: 'Beverages Co',
    orderDate: '2026-10-18',
    expectedDate: '2026-10-21',
    receivedDate: '2026-10-21',
    status: 'received',
    items: [
      { productId: 'prod-2', productName: 'Coca Cola Pet Bottle 600ml', sku: 'COCA-600-B', quantity: 60, unitCost: 20.00, totalCost: 1200.00 },
      { productId: 'prod-11', productName: 'Nescafe Classic Instant Coffee 50g', sku: 'NESC-CLAS-50', quantity: 20, unitCost: 140.00, totalCost: 2800.00 }
    ],
    totalAmount: 4000.00,
    notes: 'Delivered and checked in full'
  },
  {
    id: 'po-3',
    orderNumber: 'PO-2026-003',
    supplierId: 'sup-3',
    supplierName: 'Snacks Plus Distributors',
    orderDate: '2026-10-15',
    expectedDate: '2026-10-19',
    receivedDate: '2026-10-19',
    status: 'received',
    items: [
      { productId: 'prod-3', productName: 'Lays India\'s Magic Masala 50g', sku: 'LAYS-MAS-50', quantity: 40, unitCost: 15.00, totalCost: 600.00 },
      { productId: 'prod-15', productName: 'Haldiram\'s Aloo Bhujia 200g', sku: 'HALD-BHU-200', quantity: 30, unitCost: 38.00, totalCost: 1140.00 }
    ],
    totalAmount: 1740.00
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-0038',
    createdAt: '2026-10-23T09:15:00Z',
    customerId: 'cust-1',
    customerName: 'Aarav Mehta',
    customerPhone: '9820112233',
    items: [
      { productId: 'prod-1', sku: 'MAG-280-F', barcode: '8901058852301', name: 'Maggi 2-Minute Noodles', category: 'Food & Grains', unitPrice: 18.00, purchasePrice: 12.00, quantity: 2, discountAmount: 0, lineTotal: 36.00 }
    ],
    subtotal: 36.00,
    billDiscountPercent: 0,
    billDiscountAmount: 0,
    taxPercent: 0,
    taxAmount: 0,
    grandTotal: 36.00,
    payment: {
      method: 'cash',
      amountPaid: 50.00,
      changeGiven: 14.00,
      cashierName: 'Admin'
    },
    status: 'completed',
    isDemo: true
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-0039',
    createdAt: '2026-10-23T10:45:00Z',
    customerName: 'Walk-in Customer',
    items: [
      { productId: 'prod-2', sku: 'COCA-600-B', barcode: '8901764012224', name: 'Coca Cola Pet Bottle 600ml', category: 'Beverages', unitPrice: 30.00, purchasePrice: 20.00, quantity: 1, discountAmount: 0, lineTotal: 30.00 }
    ],
    subtotal: 30.00,
    billDiscountPercent: 0,
    billDiscountAmount: 0,
    taxPercent: 0,
    taxAmount: 0,
    grandTotal: 30.00,
    payment: {
      method: 'upi',
      amountPaid: 30.00,
      changeGiven: 0,
      transactionRef: 'UPI/261023/8892',
      cashierName: 'Admin'
    },
    status: 'completed',
    isDemo: true
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2026-0040',
    createdAt: '2026-10-23T11:20:00Z',
    customerId: 'cust-3',
    customerName: 'Rohan Deshmukh',
    customerPhone: '9819998877',
    items: [
      { productId: 'prod-3', sku: 'LAYS-MAS-50', barcode: '8901491101838', name: 'Lays India\'s Magic Masala 50g', category: 'Snacks & Packaged', unitPrice: 25.00, purchasePrice: 15.00, quantity: 3, discountAmount: 0, lineTotal: 75.00 }
    ],
    subtotal: 75.00,
    billDiscountPercent: 0,
    billDiscountAmount: 0,
    taxPercent: 0,
    taxAmount: 0,
    grandTotal: 75.00,
    payment: {
      method: 'cash',
      amountPaid: 100.00,
      changeGiven: 25.00,
      cashierName: 'Admin'
    },
    status: 'completed',
    isDemo: true
  },
  {
    id: 'inv-4',
    invoiceNumber: 'INV-2026-0041',
    createdAt: '2026-10-22T16:40:00Z',
    customerName: 'Walk-in Customer',
    items: [
      { productId: 'prod-4', sku: 'AMUL-TON-500', barcode: '8901262010052', name: 'Amul Taaza Toned Milk 500ml', category: 'Dairy & Bakery', unitPrice: 40.00, purchasePrice: 28.00, quantity: 1, discountAmount: 0, lineTotal: 40.00 }
    ],
    subtotal: 40.00,
    billDiscountPercent: 0,
    billDiscountAmount: 0,
    taxPercent: 0,
    taxAmount: 0,
    grandTotal: 40.00,
    payment: {
      method: 'card',
      amountPaid: 40.00,
      changeGiven: 0,
      transactionRef: 'TXN-CARD-9912',
      cashierName: 'Admin'
    },
    status: 'completed',
    isDemo: true
  },
  {
    id: 'inv-5',
    invoiceNumber: 'INV-2026-0042',
    createdAt: '2026-10-22T18:10:00Z',
    customerId: 'cust-2',
    customerName: 'Pooja Iyer',
    customerPhone: '9820445566',
    items: [
      { productId: 'prod-5', sku: 'BRIT-MAR-150', barcode: '8901063012448', name: 'Britannia Marie Gold 150g', category: 'Snacks & Packaged', unitPrice: 20.00, purchasePrice: 12.00, quantity: 2, discountAmount: 0, lineTotal: 40.00 }
    ],
    subtotal: 40.00,
    billDiscountPercent: 0,
    billDiscountAmount: 0,
    taxPercent: 0,
    taxAmount: 0,
    grandTotal: 40.00,
    payment: {
      method: 'upi',
      amountPaid: 40.00,
      changeGiven: 0,
      transactionRef: 'UPI/261022/4118',
      cashierName: 'Admin'
    },
    status: 'completed',
    isDemo: true
  }
];

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'StockSense Retail Mart',
  tagline: 'Fresh Groceries & Daily Essentials',
  address: 'Shop 4-5, Ground Floor, Sai Plaza, MG Road, Mumbai 400001',
  phone: '+91 98200 12345',
  email: 'contact@stocksenseretail.in',
  taxRegistrationNumber: '', // Unconfigured by default as requested in guidelines
  taxEnabled: false,
  defaultTaxPercent: 5,
  taxLabel: 'GST',
  currencySymbol: '₹',
  currencyCode: 'INR',
  invoicePrefix: 'INV-2026-',
  nextInvoiceSequence: 43,
  receiptSize: '80mm',
  defaultPaymentMethod: 'cash',
  cashierName: 'Admin',
  footerMessage: 'Thank you for shopping with StockSense! Visit again.'
};

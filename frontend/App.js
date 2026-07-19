import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// --- GRUVBOX COLOR THEME CONFIGS ---
const COLORS = {
  bg: '#1d2021',       // Dark hard
  panel: '#282828',    // Dark medium
  border: '#3c3836',   // Dark soft
  text0: '#fbf1c7',    // Light cream
  text1: '#ebdbb2',    // Light sand
  textMuted: '#a89984',// Gray
  orange: '#fe8019',   // Accent
  green: '#b8bb26',    // Active / Success
  red: '#fb4934',      // Alert
  yellow: '#fabd2f',   // Warning
  aqua: '#8ec07c',     // Informative
};

export default function App() {
  // Navigation & Session States
  const [currentScreen, setCurrentScreen] = useState('login'); // login | tables | order | cart | checkout
  const [ipAddress, setIpAddress] = useState('192.168.1.100'); // Spring Boot Server IP
  const [user, setUser] = useState(null); // Authenticated Staff User
  const [loading, setLoading] = useState(false);

  // Business States
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  
  // Cart & Transaction States
  const [cart, setCart] = useState({}); // { productId: { product, quantity, instructions } }
  const [activeOrder, setActiveOrder] = useState(null); // Active order for the table being checked out

  const API_BASE = `http://${ipAddress}:8080/api`;

  // Fetch Tables & Products
  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch tables
      const tableRes = await fetch(`${API_BASE}/tables`);
      if (tableRes.ok) {
        const tableData = await tableRes.json();
        setTables(tableData);
      }
      
      // 2. Fetch products
      const productRes = await fetch(`${API_BASE}/products`);
      if (productRes.ok) {
        const productData = await productRes.json();
        setProducts(productData);
      }
    } catch (err) {
      console.log('Error connecting to backend:', err.message);
      Alert.alert(
        'Backend Connection Error',
        `Unable to reach server at http://${ipAddress}:8080. Please make sure the Spring Boot server is running and your IP is correct.`
      );
    } finally {
      setLoading(false);
    }
  };

  // Seed default server data
  const seedServerData = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/auth/setup`, { method: 'POST' });
      await fetch(`${API_BASE}/tables/setup`, { method: 'POST' });
      await fetch(`${API_BASE}/products/setup`, { method: 'POST' });
      Alert.alert('Success', 'Seeded initial staff, tables, and product catalog on database!');
      loadInitialData();
    } catch (err) {
      Alert.alert('Error', 'Connection failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Staff Login Handler
  const handleLogin = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setCurrentScreen('tables');
        loadInitialData();
      } else {
        Alert.alert('Unauthorized', 'Invalid credentials. Try admin/admin123 or elaine/waiter123.');
      }
    } catch (err) {
      Alert.alert('Error', 'Cannot connect to auth endpoint: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Table selection handler
  const handleTableSelect = async (table) => {
    setSelectedTable(table);
    setCart({});
    
    if (table.status === 'OCCUPIED') {
      // Fetch active order for checkout/edit
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/orders/table/${table.id}`);
        if (res.ok) {
          const order = await res.json();
          setActiveOrder(order);
          setCurrentScreen('checkout');
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to fetch table bill: ' + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Start a new order
      setCurrentScreen('order');
    }
  };

  // Cart operations
  const addToCart = (product) => {
    setCart(prev => {
      const current = prev[product.id] || { product, quantity: 0, instructions: '' };
      return {
        ...prev,
        [product.id]: {
          ...current,
          quantity: current.quantity + 1
        }
      };
    });
  };

  const removeFromCart = (product) => {
    setCart(prev => {
      const current = prev[product.id];
      if (!current) return prev;
      
      const updated = { ...prev };
      if (current.quantity <= 1) {
        delete updated[product.id];
      } else {
        updated[product.id] = {
          ...current,
          quantity: current.quantity - 1
        };
      }
      return updated;
    });
  };

  const updateInstructions = (productId, instructions) => {
    setCart(prev => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          instructions
        }
      };
    });
  };

  // Calculate cart totals
  const getCartTotal = () => {
    return Object.values(cart).reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
  };

  // Submit Order to kitchen
  const submitOrder = async () => {
    const items = Object.values(cart).map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      specialInstructions: item.instructions
    }));

    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add products first.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: selectedTable.id,
          waiterId: user.id,
          items
        })
      });

      if (res.ok) {
        Alert.alert('Order Placed', 'Kitchen notification triggered successfully.');
        setCart({});
        setCurrentScreen('tables');
        loadInitialData(); // reload status
      } else {
        const errMsg = await res.text();
        Alert.alert('Failure', 'Failed to place order: ' + errMsg);
      }
    } catch (err) {
      Alert.alert('Error', 'Connection failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Checkout table bill
  const handlePayment = async () => {
    if (!activeOrder) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/orders/${activeOrder.id}/pay`, {
        method: 'POST'
      });
      if (res.ok) {
        Alert.alert('Transaction Complete', `Order #${activeOrder.id} finalized successfully.`);
        setActiveOrder(null);
        setCurrentScreen('tables');
        loadInitialData();
      } else {
        Alert.alert('Payment Failure', 'Failed to log checkout transaction.');
      }
    } catch (err) {
      Alert.alert('Error', 'Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('login');
  };

  // --- SCREEN RENDERS ---

  // Screen 1: Login
  const renderLoginScreen = () => {
    const [username, setUsername] = useState('elaine');
    const [password, setPassword] = useState('waiter123');

    return (
      <View style={styles.container}>
        <View style={styles.loginCard}>
          <Text style={styles.brandTitle}>Mobile POS</Text>
          <Text style={styles.brandSub}>Mobile Order Pad</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Server IP Address</Text>
            <TextInput
              style={styles.input}
              value={ipAddress}
              onChangeText={setIpAddress}
              placeholder="192.168.1.100"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="elaine"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity 
            style={[styles.btn, styles.btnPrimary]} 
            onPress={() => handleLogin(username, password)}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.btnTextDark}>Login Terminal</Text>}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btn, styles.btnSecondary, { marginTop: 15 }]} 
            onPress={seedServerData}
            disabled={loading}
          >
            <Text style={styles.btnTextLight}>Seed DB Mock Data</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Screen 2: Tables Grid
  const renderTablesScreen = () => {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Dinings</Text>
            <Text style={styles.headerSub}>Staff: {user?.fullName}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.headerBtn} onPress={loadInitialData}>
              <Text style={{ color: COLORS.text1 }}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: COLORS.red }]} onPress={handleLogout}>
              <Text style={{ color: COLORS.bg }}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.orange} />
          </View>
        ) : (
          <FlatList
            data={tables}
            keyExtractor={item => item.id.toString()}
            numColumns={2}
            contentContainerStyle={styles.tablesList}
            renderItem={({ item }) => {
              const statusColor = item.status === 'OCCUPIED' ? COLORS.red : item.status === 'RESERVED' ? COLORS.yellow : COLORS.green;
              return (
                <TouchableOpacity 
                  style={styles.tableCard}
                  onPress={() => handleTableSelect(item)}
                >
                  <Text style={styles.tableNumber}>{item.tableNumber}</Text>
                  <Text style={[styles.tableStatus, { color: statusColor }]}>{item.status}</Text>
                  <Text style={styles.tableCap}>Cap: {item.capacity} pax</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    );
  };

  // Screen 3: Menu Pad
  const renderOrderScreen = () => {
    const categories = ['ALL', 'GRILLED', 'CLASSIC', 'BREAKFAST', 'DESSERT', 'DRINK'];
    
    const filteredProducts = activeCategory === 'ALL'
      ? products
      : products.filter(p => p.category === activeCategory);

    const cartCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{selectedTable?.tableNumber}</Text>
            <Text style={styles.headerSub}>Add items to order</Text>
          </View>
          <TouchableOpacity 
            style={[styles.headerBtn, { backgroundColor: COLORS.orange }]}
            onPress={() => setCurrentScreen('cart')}
          >
            <Text style={{ color: COLORS.bg, fontWeight: '700' }}>Cart ({cartCount})</Text>
          </TouchableOpacity>
        </View>

        {/* Categories Bar */}
        <View style={{ height: 50, marginVertical: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15, gap: 10 }}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.catTab, activeCategory === cat && styles.catTabActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products Grid */}
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.menuRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuName}>{item.name}</Text>
                <Text style={styles.menuPrice}>₱{item.price.toFixed(2)}</Text>
              </View>
              
              <View style={styles.qtyContainer}>
                {cart[item.id] ? (
                  <>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item)}>
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{cart[item.id].quantity}</Text>
                  </>
                ) : null}
                <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: COLORS.orange }]} onPress={() => addToCart(item)}>
                  <Text style={[styles.qtyBtnText, { color: COLORS.bg }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        <View style={styles.footerNav}>
          <TouchableOpacity style={[styles.btn, styles.btnSecondary, { flex: 1 }]} onPress={() => setCurrentScreen('tables')}>
            <Text style={styles.btnTextLight}>Back to Map</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };

  // Screen 4: Cart / Review Order
  const renderCartScreen = () => {
    const cartItems = Object.values(cart);

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Order Cart</Text>
          <Text style={styles.headerSub}>{selectedTable?.tableNumber}</Text>
        </View>

        {cartItems.length === 0 ? (
          <View style={styles.emptyCartContainer}>
            <Text style={styles.emptyCartText}>No items added to cart yet.</Text>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 20 }]} onPress={() => setCurrentScreen('order')}>
              <Text style={styles.btnTextDark}>Back to Menu</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={cartItems}
              keyExtractor={item => item.product.id.toString()}
              contentContainerStyle={{ padding: 15 }}
              renderItem={({ item }) => (
                <View style={styles.cartRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.cartName}>{item.product.name} (x{item.quantity})</Text>
                      <Text style={styles.cartPrice}>₱{(item.product.price * item.quantity).toFixed(2)}</Text>
                    </View>
                    <TextInput
                      style={styles.cartNotesInput}
                      placeholder="Kitchen instructions (e.g. less oil, extra egg)..."
                      placeholderTextColor={COLORS.textMuted}
                      value={item.instructions}
                      onChangeText={(txt) => updateInstructions(item.product.id, txt)}
                    />
                  </View>
                </View>
              )}
            />

            <View style={styles.cartSummary}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                <Text style={styles.summaryLabel}>Total Estimate:</Text>
                <Text style={styles.summaryValue}>₱{getCartTotal().toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 15 }}>
                <TouchableOpacity style={[styles.btn, styles.btnSecondary, { flex: 1 }]} onPress={() => setCurrentScreen('order')}>
                  <Text style={styles.btnTextLight}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnPrimary, { flex: 1.5 }]} onPress={submitOrder} disabled={loading}>
                  {loading ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.btnTextDark}>Send to Kitchen</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </SafeAreaView>
    );
  };

  // Screen 5: Checkout / Payment Details
  const renderCheckoutScreen = () => {
    if (!activeOrder) return null;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{selectedTable?.tableNumber}</Text>
            <Text style={styles.headerSub}>Billing Statement</Text>
          </View>
          <View style={styles.badgePending}>
            <Text style={{ color: COLORS.orange, fontSize: 11, fontWeight: '700' }}>{activeOrder.status}</Text>
          </View>
        </View>

        <ScrollView style={{ padding: 15 }}>
          <View style={styles.receiptContainer}>
            <Text style={styles.receiptHeader}>POS TERMINAL</Text>
            <Text style={styles.receiptSub}>Terminal Store #1</Text>
            <View style={styles.dashedDivider} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 }}>
              <Text style={styles.receiptMeta}>Order ID: #{activeOrder.id}</Text>
              <Text style={styles.receiptMeta}>Waiter: {activeOrder.waiter?.fullName}</Text>
            </View>
            <View style={styles.dashedDivider} />

            {activeOrder.items?.map((item, idx) => (
              <View key={idx} style={styles.receiptItemRow}>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.receiptItemName}>{item.product?.name}</Text>
                  {item.specialInstructions ? (
                    <Text style={{ fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' }}>* {item.specialInstructions}</Text>
                  ) : null}
                </View>
                <Text style={{ flex: 0.5, textAlign: 'center', color: COLORS.text1 }}>x{item.quantity}</Text>
                <Text style={{ flex: 1, textAlign: 'right', color: COLORS.text1 }}>₱{(item.unitPrice * item.quantity).toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.dashedDivider} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 }}>
              <Text style={[styles.receiptTotalLabel, { fontSize: 18 }]}>TOTAL DUE:</Text>
              <Text style={[styles.receiptTotalVal, { fontSize: 18 }]}>₱{activeOrder.totalAmount?.toFixed(2)}</Text>
            </View>
          </View>

          {/* Payment CTA Box */}
          <View style={{ marginTop: 20, gap: 15 }}>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { width: '100%' }]} onPress={handlePayment} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.btnTextDark}>Finalize Cash Payment</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.btnSecondary, { width: '100%' }]} onPress={() => setCurrentScreen('tables')}>
              <Text style={styles.btnTextLight}>Back to Map</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  // State Switch Router
  switch (currentScreen) {
    case 'login': return renderLoginScreen();
    case 'tables': return renderTablesScreen();
    case 'order': return renderOrderScreen();
    case 'cart': return renderCartScreen();
    case 'checkout': return renderCheckoutScreen();
    default: return renderLoginScreen();
  }
}

// --- GRUVBOX STYLES CONFIG ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Login Screen Styles
  loginCard: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.orange,
    textAlign: 'center',
    fontFamily: 'serif',
  },
  brandSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 40,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text0,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: COLORS.orange,
  },
  btnSecondary: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnTextDark: {
    color: COLORS.bg,
    fontSize: 16,
    fontWeight: '700',
  },
  btnTextLight: {
    color: COLORS.text1,
    fontSize: 16,
    fontWeight: '600',
  },
  // Header Component
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.panel,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text0,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    justifyContent: 'center',
  },
  // Tables Map Styles
  tablesList: {
    padding: 15,
    gap: 15,
  },
  tableCard: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  tableNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text0,
    marginBottom: 4,
  },
  tableStatus: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  tableCap: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  // Category tabs
  catTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: COLORS.panel,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },
  catTabActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  catText: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  catTextActive: {
    color: COLORS.bg,
  },
  // Menu list
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.panel,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text0,
    marginBottom: 2,
  },
  menuPrice: {
    fontSize: 14,
    color: COLORS.orange,
    fontWeight: '700',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: COLORS.text0,
    fontSize: 18,
    fontWeight: '600',
  },
  qtyText: {
    color: COLORS.text0,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 15,
    textAlign: 'center',
  },
  // Footer navigation
  footerNav: {
    padding: 15,
    backgroundColor: COLORS.panel,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  // Cart Page
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyCartText: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
  cartRow: {
    backgroundColor: COLORS.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 12,
  },
  cartName: {
    fontSize: 16,
    color: COLORS.text0,
    fontWeight: '600',
  },
  cartPrice: {
    fontSize: 16,
    color: COLORS.orange,
    fontWeight: '700',
  },
  cartNotesInput: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    color: COLORS.text1,
    paddingVertical: 5,
    marginTop: 10,
    fontSize: 13,
  },
  cartSummary: {
    backgroundColor: COLORS.panel,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 20,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  summaryValue: {
    color: COLORS.orange,
    fontSize: 20,
    fontWeight: '700',
  },
  // Checkout & Receipt Styles
  badgePending: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(254, 128, 25, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.orange,
    borderRadius: 6,
  },
  receiptContainer: {
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  receiptHeader: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.orange,
    fontFamily: 'serif',
  },
  receiptSub: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  dashedDivider: {
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: COLORS.textMuted,
    marginVertical: 10,
  },
  receiptMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  receiptItemName: {
    color: COLORS.text0,
    fontSize: 14,
    fontWeight: '500',
  },
  receiptTotalLabel: {
    color: COLORS.text0,
    fontWeight: '700',
  },
  receiptTotalVal: {
    color: COLORS.orange,
    fontWeight: '700',
  }
});

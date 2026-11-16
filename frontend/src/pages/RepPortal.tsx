import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  Plus,
  Search,
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Send,
  DollarSign,
  FileText,
  X,
  ChevronRight,
  Package,
  Calendar,
  Share2,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  UserCheck,
  Smartphone,
  Check,
  ArrowLeft,
  Truck,
} from 'lucide-react';
import type { Shop, Product, RepOrder, RepSummary } from '../types';
import { repApi } from '../services/repApi';

interface RepPortalProps {
  currentUser?: any;
  onBackToPos?: () => void;
}

type TabType = 'shops' | 'new_bill' | 'stock' | 'summary';

export const RepPortal: React.FC<RepPortalProps> = ({ currentUser, onBackToPos }) => {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<TabType>('shops');
  const [selectedRoute, setSelectedRoute] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data States
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<RepSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cart / New Bill State
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [cartItems, setCartItems] = useState<{ [productId: string]: number }>({});
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT' | 'CHEQUE' | 'PARTIAL'>('CASH');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [completedOrderReceipt, setCompletedOrderReceipt] = useState<any | null>(null);

  // Modals
  const [isAddShopModalOpen, setIsAddShopModalOpen] = useState<boolean>(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState<boolean>(false);
  const [collectShop, setCollectShop] = useState<Shop | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMethod, setCollectMethod] = useState<string>('CASH');
  const [collectCheque, setCollectCheque] = useState<string>('');
  const [collectNotes, setCollectNotes] = useState<string>('');
  const [isSubmittingCollection, setIsSubmittingCollection] = useState<boolean>(false);

  // New Shop Form State
  const [newShopName, setNewShopName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRoute, setNewRoute] = useState('Route A - Colombo Suburbs');
  const [newAddress, setNewAddress] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('50000');
  const [newNotes, setNewNotes] = useState('');
  const [isSavingShop, setIsSavingShop] = useState(false);

  // Rep Identity
  const repName = currentUser?.username || 'Rep Dilshan';
  const repId = currentUser?.id || 'usr_rep1';

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, [selectedRoute]);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const [shopsData, productsData, summaryData] = await Promise.all([
        repApi.getShops({ route: selectedRoute, search: searchQuery }),
        repApi.getProducts(),
        repApi.getDailySummary(),
      ]);
      setShops(shopsData);
      setProducts(productsData);
      setSummary(summaryData);
    } catch (err: any) {
      setErrorMsg(err.message || 'දත්ත ලබාගැනීමට නොහැකි විය');
    } finally {
      setIsLoading(false);
    }
  };

  // Toast auto-clear
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Derived available routes
  const availableRoutes = useMemo(() => {
    const set = new Set<string>();
    shops.forEach((s) => {
      if (s.route) set.add(s.route);
    });
    return Array.from(set);
  }, [shops]);

  // Filtered Shops
  const filteredShops = useMemo(() => {
    return shops.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.phone && s.phone.includes(searchQuery)) ||
        (s.owner_name && s.owner_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRoute = selectedRoute === 'ALL' || s.route === selectedRoute;
      return matchesSearch && matchesRoute;
    });
  }, [shops, searchQuery, selectedRoute]);

  // Cart Calculations
  const cartSummary = useMemo(() => {
    let subtotal = 0;
    const items: Array<{ product: Product; qty: number; lineTotal: number }> = [];

    Object.entries(cartItems).forEach(([prodId, qty]) => {
      if (qty > 0) {
        const prod = products.find((p) => p.id === prodId);
        if (prod) {
          const lineTotal = prod.selling_price * qty;
          subtotal += lineTotal;
          items.push({ product: prod, qty, lineTotal });
        }
      }
    });

    const total = subtotal;
    let finalPaid = total;
    if (paymentMethod === 'CREDIT') finalPaid = 0;
    else if (paymentMethod === 'PARTIAL') finalPaid = parseFloat(paidAmount) || 0;
    else if (paymentMethod === 'CHEQUE') finalPaid = total;

    const balanceDue = Math.max(0, total - finalPaid);

    return { subtotal, total, finalPaid, balanceDue, items, totalItemCount: items.length };
  }, [cartItems, products, paymentMethod, paidAmount]);

  // Handle Cart item changes
  const updateCartQty = (prodId: string, delta: number) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    const currentQty = cartItems[prodId] || 0;
    const newQty = Math.max(0, currentQty + delta);

    if (newQty > prod.stock_quantity) {
      alert(`ස්ටොක් ප්‍රමාණය ඉක්මවා ඇත! Main Stock හි ඇත්තේ ${prod.stock_quantity} ${prod.unit || 'pcs'} පමණි.`);
      return;
    }

    setCartItems((prev) => {
      const next = { ...prev };
      if (newQty === 0) delete next[prodId];
      else next[prodId] = newQty;
      return next;
    });
  };

  const setCartExactQty = (prodId: string, val: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed <= 0) {
      setCartItems((prev) => {
        const next = { ...prev };
        delete next[prodId];
        return next;
      });
      return;
    }
    if (parsed > prod.stock_quantity) {
      alert(`ස්ටොක් ප්‍රමාණය ඉක්මවා ඇත! Main Stock හි ඇත්තේ ${prod.stock_quantity} ${prod.unit || 'pcs'} පමණි.`);
      return;
    }
    setCartItems((prev) => ({ ...prev, [prodId]: parsed }));
  };

  // Add Shop Handler
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) {
      alert('කරුණාකර කඩයේ නම ඇතුළත් කරන්න');
      return;
    }
    try {
      setIsSavingShop(true);
      const created = await repApi.addShop({
        name: newShopName.trim(),
        owner_name: newOwnerName.trim(),
        phone: newPhone.trim(),
        route: newRoute,
        address: newAddress.trim(),
        credit_limit: parseFloat(newCreditLimit) || 50000,
        notes: newNotes.trim(),
        created_by_rep: repName,
      });

      setShops((prev) => [created, ...prev]);
      setSuccessMsg(`"${created.name}" කඩය සාර්ථකව එකතු කෙරිණි!`);
      setIsAddShopModalOpen(false);
      // Reset form
      setNewShopName('');
      setNewOwnerName('');
      setNewPhone('');
      setNewAddress('');
      setNewNotes('');
    } catch (err: any) {
      alert(err.message || 'කඩය ඇතුළත් කිරීම අසාර්ථක විය');
    } finally {
      setIsSavingShop(false);
    }
  };

  // Submit Order / Issue Products
  const handleSubmitOrder = async () => {
    if (!selectedShop) {
      alert('කරුණාකර බිල නිකුත් කරන කඩය තෝරන්න (Select Shop)');
      return;
    }
    if (cartSummary.items.length === 0) {
      alert('කරුණාකර අවම වශයෙන් එක් භාණ්ඩයක්වත් තෝරන්න');
      return;
    }

    try {
      setIsSubmittingOrder(true);
      setErrorMsg(null);

      const itemsPayload = cartSummary.items.map((it) => ({
        product_id: it.product.id,
        product_name: it.product.name,
        quantity: it.qty,
        unit_price: it.product.selling_price,
      }));

      const res = await repApi.createOrder({
        shop_id: selectedShop.id,
        rep_id: repId,
        rep_name: repName,
        payment_method: paymentMethod,
        paid_amount: cartSummary.finalPaid,
        cheque_number: chequeNumber,
        notes: orderNotes,
        items: itemsPayload,
      });

      setSuccessMsg('බිල සාර්ථකව නිකුත් කර Main Stock එකෙන් අඩු කරන ලදී!');
      setCompletedOrderReceipt(res.order);
      setCartItems({});
      setPaidAmount('');
      setChequeNumber('');
      setOrderNotes('');

      // Refresh stock & shops data
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'බිල නිකුත් කිරීම අසාර්ථක විය');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Submit Payment Collection
  const handleSubmitCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectShop) return;
    const amountNum = parseFloat(collectAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('කරුණාකර වලංගු මුදල් ප්‍රමාණයක් ඇතුළත් කරන්න');
      return;
    }

    try {
      setIsSubmittingCollection(true);
      await repApi.recordCollection({
        shop_id: collectShop.id,
        amount: amountNum,
        payment_method: collectMethod,
        cheque_number: collectCheque,
        rep_id: repId,
        rep_name: repName,
        notes: collectNotes,
      });

      setSuccessMsg(`රු. ${amountNum.toLocaleString()} මුදල සාර්ථකව සටහන් විය!`);
      setIsCollectModalOpen(false);
      setCollectShop(null);
      setCollectAmount('');
      setCollectCheque('');
      setCollectNotes('');
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'මුදල් එකතු කිරීම සටහන් කරගත නොහැකි විය');
    } finally {
      setIsSubmittingCollection(false);
    }
  };

  // WhatsApp Share Builder
  const handleShareWhatsApp = (receipt: any) => {
    if (!receipt || !receipt.shop) return;
    const phone = receipt.shop.phone ? receipt.shop.phone.replace(/[^0-9]/g, '') : '';
    const intlPhone = phone.startsWith('0') ? '94' + phone.substring(1) : phone;

    let text = `*--- INVOICE / බිල්පත ---*\n`;
    text += `*Shop:* ${receipt.shop.name}\n`;
    text += `*Bill No:* ${receipt.order_number}\n`;
    text += `*Date:* ${new Date(receipt.created_at).toLocaleDateString()}\n`;
    text += `*Rep:* ${repName}\n`;
    text += `------------------------\n`;
    receipt.items.forEach((it: any) => {
      text += `${it.product_name}\n`;
      text += `  ${it.quantity} x Rs.${it.unit_price} = Rs.${it.total_price.toLocaleString()}\n`;
    });
    text += `------------------------\n`;
    text += `*Total Amount:* Rs. ${receipt.total_amount.toLocaleString()}\n`;
    text += `*Paid (${receipt.payment_method}):* Rs. ${receipt.paid_amount.toLocaleString()}\n`;
    if (receipt.balance_amount > 0) {
      text += `*Credit Added:* Rs. ${receipt.balance_amount.toLocaleString()}\n`;
    }
    text += `*Total Due / මුළු හිඟ මුදල:* Rs. ${(receipt.shop.outstanding_balance || 0).toLocaleString()}\n`;
    text += `\nThank you for your business!`;

    const url = `https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 pb-20 md:pb-6">
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER: White & Emerald Green Premium Look               */}
      {/* ------------------------------------------------------------- */}
      <header className="bg-white border-b border-emerald-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBackToPos && (
              <button
                onClick={onBackToPos}
                className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
                title="Back to POS"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Field Sales Rep Portal
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                  Tab & Mobile
                </span>
              </h1>
              <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Rep: <span className="font-semibold text-slate-800">{repName}</span>
                <span className="text-slate-300">|</span>
                Main Stock Auto-Sync
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadAllData}
              disabled={isLoading}
              className="p-2 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition active:scale-95 flex items-center gap-1 text-xs font-medium"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setIsAddShopModalOpen(true)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs md:text-sm shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Shop Add</span>
            </button>
          </div>
        </div>

        {/* Desktop / Tablet Tab Switcher */}
        <div className="hidden md:flex max-w-7xl mx-auto px-4 border-t border-slate-100 space-x-1">
          <button
            onClick={() => setActiveTab('shops')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'shops'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-emerald-600'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>කඩවල් (Shops Directory)</span>
            <span className="ml-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
              {shops.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('new_bill')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition relative ${
              activeTab === 'new_bill'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-emerald-600'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>බිලක් දැමීම (New Bill)</span>
            {cartSummary.totalItemCount > 0 && (
              <span className="text-xs bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                {cartSummary.totalItemCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'stock'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-emerald-600'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Main Stock (භාණ්ඩ තොගය)</span>
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'summary'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-emerald-600'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>දවසේ වාර්තාව (Day Summary)</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {successMsg && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed top-16 right-4 z-50 bg-red-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA                                             */}
      {/* ------------------------------------------------------------- */}
      <main className="max-w-7xl w-full mx-auto p-4 flex-1">
        {/* ============================================================ */}
        {/* TAB 1: SHOPS DIRECTORY (කඩවල්)                                */}
        {/* ============================================================ */}
        {activeTab === 'shops' && (
          <div className="space-y-4">
            {/* Quick Filter Bar */}
            <div className="bg-white p-3 md:p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="කඩයේ නම හෝ Phone No සොයන්න..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              {/* Route Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setSelectedRoute('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    selectedRoute === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Routes
                </button>
                {availableRoutes.map((rt) => (
                  <button
                    key={rt}
                    onClick={() => setSelectedRoute(rt)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      selectedRoute === rt
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {rt}
                  </button>
                ))}
              </div>
            </div>

            {/* Shop Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredShops.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-6">
                  <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">කිසිදු කඩයක් සොයාගත නොහැකි විය</p>
                  <button
                    onClick={() => setIsAddShopModalOpen(true)}
                    className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700"
                  >
                    ➕ අලුත් කඩයක් ලියාපදිංචි කරන්න (Add Shop)
                  </button>
                </div>
              ) : (
                filteredShops.map((shop) => (
                  <div
                    key={shop.id}
                    className="bg-white rounded-2xl border border-emerald-100/80 p-4 shadow-sm hover:shadow-md hover:border-emerald-300 transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base leading-tight">
                            {shop.name}
                          </h3>
                          {shop.owner_name && (
                            <p className="text-xs text-slate-500 mt-0.5">අයිතිකරු: {shop.owner_name}</p>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                          {shop.route || 'General'}
                        </span>
                      </div>

                      {/* Contact & Address */}
                      <div className="space-y-1 text-xs text-slate-600 mb-4">
                        {shop.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <a
                              href={`tel:${shop.phone}`}
                              className="text-slate-700 font-medium hover:text-emerald-700 hover:underline"
                            >
                              {shop.phone}
                            </a>
                          </div>
                        )}
                        {shop.address && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{shop.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Outstanding Debt Badge */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between mb-4">
                        <span className="text-xs text-slate-500 font-medium">ලැබිය යුතු හිඟ මුදල (Due):</span>
                        <span
                          className={`text-sm font-bold ${
                            shop.outstanding_balance > 0 ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          Rs. {(shop.outstanding_balance || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setSelectedShop(shop);
                          setActiveTab('new_bill');
                        }}
                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>බිලක් දමන්න</span>
                      </button>

                      <button
                        onClick={() => {
                          setCollectShop(shop);
                          setCollectAmount(shop.outstanding_balance > 0 ? String(shop.outstanding_balance) : '');
                          setIsCollectModalOpen(true);
                        }}
                        className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ණය අයකරන්න</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: NEW BILL / ORDER ISSUANCE (බිලක් දැමීම)                */}
        {/* ============================================================ */}
        {activeTab === 'new_bill' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / TOP: Shop Selector & Products Picker (8 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Selected Shop Banner */}
              <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">තෝරාගත් කඩය (Selected Shop):</span>
                    <h2 className="text-base font-bold text-slate-900">
                      {selectedShop ? selectedShop.name : 'කඩයක් තෝරා නැත (Select Shop)'}
                    </h2>
                    {selectedShop && (
                      <p className="text-xs text-emerald-700 font-medium">
                        හිඟ මුදල (Debt): Rs. {(selectedShop.outstanding_balance || 0).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('shops')}
                  className="px-3 py-1.5 text-xs font-semibold border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
                >
                  {selectedShop ? 'මාරු කරන්න' : 'කඩයක් තෝරන්න'}
                </button>
              </div>

              {/* Product Catalog Picker */}
              <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" />
                    Main Stock Products (භාණ්ඩ තෝරන්න)
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {products.length} Products Available
                  </span>
                </div>

                {/* Product Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Product name හෝ Barcode සොයන්න..."
                    onChange={(e) => {
                      const q = e.target.value.toLowerCase();
                      // Fast local search
                      if (!q) {
                        repApi.getProducts().then(setProducts);
                      } else {
                        setProducts((prev) =>
                          prev.filter(
                            (p) =>
                              p.name.toLowerCase().includes(q) ||
                              (p.barcode && p.barcode.includes(q)) ||
                              (p.sku && p.sku.toLowerCase().includes(q))
                          )
                        );
                      }
                    }}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* Products List / Grid */}
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {products.map((prod) => {
                    const currentQty = cartItems[prod.id] || 0;
                    const isOutOfStock = prod.stock_quantity <= 0;

                    return (
                      <div
                        key={prod.id}
                        className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                          currentQty > 0
                            ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                            : 'bg-white border-slate-100 hover:border-emerald-200'
                        }`}
                      >
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">
                            {prod.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-emerald-700">
                              Rs. {prod.selling_price.toLocaleString()}
                            </span>
                            <span className="text-slate-300 text-xs">•</span>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                isOutOfStock
                                  ? 'bg-red-100 text-red-700'
                                  : prod.stock_quantity < 20
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              Stock: {prod.stock_quantity} {prod.unit || 'pcs'}
                            </span>
                          </div>
                        </div>

                        {/* Quantity Counter Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {currentQty > 0 ? (
                            <>
                              <button
                                onClick={() => updateCartQty(prod.id, -1)}
                                className="w-8 h-8 rounded-lg bg-emerald-200 text-emerald-900 hover:bg-emerald-300 flex items-center justify-center font-bold text-base transition active:scale-95"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                max={prod.stock_quantity}
                                value={currentQty}
                                onChange={(e) => setCartExactQty(prod.id, e.target.value)}
                                className="w-12 h-8 text-center font-bold text-slate-900 bg-white border border-emerald-300 rounded-lg text-sm focus:outline-none"
                              />
                              <button
                                onClick={() => updateCartQty(prod.id, 1)}
                                disabled={currentQty >= prod.stock_quantity}
                                className="w-8 h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center font-bold text-base transition active:scale-95"
                              >
                                +
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => updateCartQty(prod.id, 1)}
                              disabled={isOutOfStock}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition disabled:opacity-40 disabled:hover:bg-emerald-50 disabled:hover:text-emerald-700"
                            >
                              {isOutOfStock ? 'No Stock' : '+ Add'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT / BOTTOM: Cart Summary & Billing Confirmation (5 cols) */}
            <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-emerald-200 shadow-md space-y-4 sticky top-20">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  Bill Summary (බිල් සාරාංශය)
                </h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                  {cartSummary.totalItemCount} Items
                </span>
              </div>

              {/* Items List in Cart */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {cartSummary.items.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    භාණ්ඩ තවම එකතු කර නැත (No items added)
                  </p>
                ) : (
                  cartSummary.items.map((it) => (
                    <div
                      key={it.product.id}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50"
                    >
                      <div className="flex-1 pr-2">
                        <span className="font-semibold text-slate-800">{it.product.name}</span>
                        <span className="text-slate-400 block text-[11px]">
                          {it.qty} x Rs. {it.product.selling_price}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">
                        Rs. {it.lineTotal.toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Grand Total */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-900">මුළු බිල්පත් එකතුව (Total Due):</span>
                  <div className="text-2xl font-black text-emerald-800">
                    Rs. {cartSummary.total.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">ගෙවීම් ක්‍රමය (Payment Method):</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['CASH', 'CREDIT', 'PARTIAL', 'CHEQUE'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition text-center ${
                        paymentMethod === method
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Payment Fields */}
              {paymentMethod === 'PARTIAL' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">දැන් ගෙවන මුදල (Cash Paid):</label>
                  <input
                    type="number"
                    placeholder="Rs. මුදල ඇතුළත් කරන්න"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="text-xs text-amber-600 font-semibold pt-1">
                    ඉතිරි ණයට යන මුදල (Balance to Credit): Rs. {cartSummary.balanceDue.toLocaleString()}
                  </div>
                </div>
              )}

              {paymentMethod === 'CHEQUE' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Cheque Number:</label>
                  <input
                    type="text"
                    placeholder="චෙක්පත් අංකය..."
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <input
                  type="text"
                  placeholder="Notes / සටහන් (Optional)..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Confirm & Issue Button */}
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmittingOrder || cartSummary.items.length === 0 || !selectedShop}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
              >
                {isSubmittingOrder ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>ස්ටොක් අඩු කරමින් පවතී...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>බිල Confirm කරන්න (Deduct Stock)</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-400">
                * Confirm කළ සැනින් Main Stock එකෙන් ස්වයංක්‍රීයව ප්‍රමාණය අඩු වේ.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: MAIN STOCK VIEW (ස්ටොක් එක බලාගැනීම)                  */}
        {/* ============================================================ */}
        {activeTab === 'stock' && (
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Main Stock Inventory (ප්‍රධාන ගබඩාවේ තොගය)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ඔබේ Rep ලා කඩවල් වලට බිල් දමන විට මෙම ප්‍රමාණයන් auto අඩු වේ.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  Total Products: {products.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {products.map((p) => {
                const isOut = p.stock_quantity <= 0;
                const isLow = p.stock_quantity > 0 && p.stock_quantity < 20;

                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <span className="text-[11px] font-mono text-slate-400">{p.sku || p.barcode}</span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isOut
                              ? 'bg-red-100 text-red-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{p.name}</h4>
                    </div>

                    <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Selling Price</span>
                        <span className="text-sm font-bold text-slate-800">
                          Rs. {p.selling_price.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 block">Available Qty</span>
                        <span className="text-base font-extrabold text-emerald-700">
                          {p.stock_quantity} <span className="text-xs font-normal text-slate-500">{p.unit || 'pcs'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: DAILY SUMMARY (දවසේ වාර්තාව)                          */}
        {/* ============================================================ */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Header Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block">අද මුළු විකුණුම් (Total Sales)</span>
                <div className="text-xl md:text-2xl font-black text-emerald-700 mt-1">
                  Rs. {(summary?.total_sales || 0).toLocaleString()}
                </div>
                <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
                  {summary?.total_bills_count || 0} Bills Issued
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block">අතේ ඇති Cash (Cash in Hand)</span>
                <div className="text-xl md:text-2xl font-black text-slate-900 mt-1">
                  Rs. {(summary?.total_cash_in_hand || 0).toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Sales + Collections</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block">ණයට දුන් මුදල (Credit Given)</span>
                <div className="text-xl md:text-2xl font-black text-amber-600 mt-1">
                  Rs. {(summary?.total_credit_issued || 0).toLocaleString()}
                </div>
                <span className="text-[11px] text-amber-600 font-medium mt-1 block">Added to Debt</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block">ගිය කඩවල් (Shops Visited)</span>
                <div className="text-xl md:text-2xl font-black text-teal-700 mt-1">
                  {summary?.shops_visited_count || 0}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Out of {shops.length} total</span>
              </div>
            </div>

            {/* Quick Actions / Tips */}
            <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-950 text-sm">
                    දවසේ වැඩ සටහන සහ Balance එක
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    දවස අවසානයේ එකතු වූ මුළු Cash මුදල (Rs. {(summary?.total_cash_in_hand || 0).toLocaleString()}) Main Office එකට භාර දෙන්න.
                  </p>
                </div>
              </div>

              <button
                onClick={loadAllData}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Refresh Summary
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* COMPLETED ORDER RECEIPT & WHATSAPP SHARE MODAL                */}
      {/* ------------------------------------------------------------- */}
      {completedOrderReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-200 animate-scale-in space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">බිල සාර්ථකව සම්පූර්ණ විය!</h3>
              <p className="text-xs text-emerald-700 font-semibold">
                Bill No: {completedOrderReceipt.order_number}
              </p>
              <p className="text-xs text-slate-500">
                Main Stock එකෙන් භාණ්ඩ ප්‍රමාණයන් සාර්ථකව අඩු කෙරිණි.
              </p>
            </div>

            {/* Receipt Breakdown Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2">
              <div className="flex justify-between font-semibold text-slate-700 border-b pb-1.5">
                <span>Shop:</span>
                <span className="font-bold text-slate-900">{completedOrderReceipt.shop?.name}</span>
              </div>
              <div className="space-y-1 py-1">
                {completedOrderReceipt.items?.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-slate-600">
                    <span>
                      {it.product_name} (x{it.quantity})
                    </span>
                    <span className="font-semibold">Rs. {it.total_price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
                <span>Total:</span>
                <span className="text-emerald-700">
                  Rs. {completedOrderReceipt.total_amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Paid ({completedOrderReceipt.payment_method}):</span>
                <span>Rs. {completedOrderReceipt.paid_amount.toLocaleString()}</span>
              </div>
              {completedOrderReceipt.balance_amount > 0 && (
                <div className="flex justify-between text-amber-600 font-bold">
                  <span>New Credit Due:</span>
                  <span>Rs. {completedOrderReceipt.balance_amount.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleShareWhatsApp(completedOrderReceipt)}
                className="w-full py-3 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp මගින් කඩේට බිල යවන්න</span>
              </button>

              <button
                onClick={() => {
                  setCompletedOrderReceipt(null);
                  setActiveTab('shops');
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold text-xs transition"
              >
                Close & Return to Shops
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD NEW SHOP                                           */}
      {/* ------------------------------------------------------------- */}
      {isAddShopModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-600" />
                අලුත් කඩයක් ලියාපදිංචි කිරීම (Add New Shop)
              </h3>
              <button
                onClick={() => setIsAddShopModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShop} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  කඩයේ නම (Shop Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. Nimal Grocery Store"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    අයිතිකරුගේ නම (Owner Name)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. Nimal Perera"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    දුරකථන අංකය (Phone Number)
                  </label>
                  <input
                    type="tel"
                    placeholder="077xxxxxxx"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Route / නගරය
                </label>
                <input
                  type="text"
                  placeholder="उदा. Route A - Colombo Suburbs"
                  value={newRoute}
                  onChange={(e) => setNewRoute(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ලිපිනය (Address / Landmark)
                </label>
                <input
                  type="text"
                  placeholder="उदा. 45 Main Street, Maharagama"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ණය සීමාව (Credit Limit in Rs.)
                </label>
                <input
                  type="number"
                  placeholder="50000"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingShop}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  {isSavingShop ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>සුරකිමින් පවතී...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>කඩය ඇතුළත් කරන්න (Save Shop)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: COLLECT PAYMENT FROM SHOP DEBT                         */}
      {/* ------------------------------------------------------------- */}
      {isCollectModalOpen && collectShop && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">ණය මුදල් අයකර ගැනීම</h3>
                <p className="text-xs text-slate-500">{collectShop.name}</p>
              </div>
              <button
                onClick={() => setIsCollectModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs flex justify-between items-center">
              <span className="font-semibold text-amber-900">දැනට ලැබිය යුතු මුළු හිඟ මුදල:</span>
              <span className="text-base font-bold text-amber-700">
                Rs. {(collectShop.outstanding_balance || 0).toLocaleString()}
              </span>
            </div>

            <form onSubmit={handleSubmitCollection} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  අයකරගත් මුදල (Amount Collected in Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={collectShop.outstanding_balance || 9999999}
                  placeholder="Rs. මුදල ඇතුළත් කරන්න"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ගෙවූ ආකාරය (Payment Mode)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['CASH', 'CHEQUE'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCollectMethod(m)}
                      className={`py-2 rounded-xl text-xs font-bold transition text-center ${
                        collectMethod === m
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {collectMethod === 'CHEQUE' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Cheque Number
                  </label>
                  <input
                    type="text"
                    placeholder="චෙක්පත් අංකය..."
                    value={collectCheque}
                    onChange={(e) => setCollectCheque(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingCollection}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingCollection ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>සටහන් කරමින් පවතී...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>මුදල් ලබාගැනීම සටහන් කරන්න</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* BOTTOM NAVIGATION BAR: MOBILE & TABLET ONE-THUMB NAV           */}
      {/* ------------------------------------------------------------- */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-emerald-100 md:hidden z-40 px-3 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('shops')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'shops' ? 'text-emerald-700 font-bold' : 'text-slate-400'
          }`}
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px]">කඩවල්</span>
        </button>

        <button
          onClick={() => setActiveTab('new_bill')}
          className={`flex flex-col items-center gap-1 relative transition ${
            activeTab === 'new_bill' ? 'text-emerald-700 font-bold' : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {cartSummary.totalItemCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                {cartSummary.totalItemCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">බිල</span>
        </button>

        <button
          onClick={() => setActiveTab('stock')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'stock' ? 'text-emerald-700 font-bold' : 'text-slate-400'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px]">Stock</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'summary' ? 'text-emerald-700 font-bold' : 'text-slate-400'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px]">වාර්තාව</span>
        </button>
      </nav>
    </div>
  );
};

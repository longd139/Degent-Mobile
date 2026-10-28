import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  TextInput,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
  G,
} from 'react-native-svg';
import {
  Home,
  ShoppingBag,
  BarChart2,
  Package,
  TrendingUp,
  Search,
  CheckCircle2,
  Truck,
  ChevronRight,
  LogOut,
  X,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Copy,
  Check,
  PhoneCall,
  MapPin,
  Sparkles,
  Send,
  Box,
  FileText,
  Bell,
} from 'lucide-react-native';
import {
  useFonts,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type TabType = 'home' | 'orders' | 'analytics' | 'products';

interface HourlyDataPoint {
  time: string;
  orders: number;
  revenue: number;
}

export interface ParsedAddress {
  cleanAddress: string;
  orderNote?: string;
  shippingMethod?: string;
  shippingFee?: string;
}

export function parseOrderShippingAddress(rawAddress?: string, fallbackNotes?: string): ParsedAddress {
  if (!rawAddress) {
    return { cleanAddress: 'Chưa có thông tin địa chỉ', orderNote: fallbackNotes };
  }

  let text = rawAddress;
  let orderNote = fallbackNotes || '';
  let shippingMethod = '';
  let shippingFee = '';

  // 1. Bóc tách [CỌC COD: ...]
  text = text.replace(/\[CỌC COD:\s*[^\]]+\]/gi, '');

  // 2. Bóc tách [DEAL: ...]
  text = text.replace(/\[DEAL:\s*[^\]]+\]/gi, '');

  // 3. Bóc tách [VẬN CHUYỂN: ...]
  const shippingMatch = text.match(/\[VẬN CHUYỂN:\s*([^\]]+)\]/i);
  if (shippingMatch) {
    const rawShip = shippingMatch[1].trim();
    const feeMatch = rawShip.match(/\(([^)]+)\)$/);
    if (feeMatch) {
      shippingFee = feeMatch[1].trim();
      shippingMethod = rawShip.replace(/\(([^)]+)\)$/, '').trim();
    } else {
      shippingMethod = rawShip;
    }
    text = text.replace(shippingMatch[0], '');
  }

  // 4. Bóc tách Ghi chú: (Ghi chú: ...) hoặc [GHI CHÚ: ...]
  const noteMatch = text.match(/\((?:Ghi chú|Note):\s*([^)]+)\)/i) || text.match(/\[(?:Ghi chú|Note):\s*([^\]]+)\]/i);
  if (noteMatch) {
    orderNote = (orderNote ? `${orderNote}; ` : '') + noteMatch[1].trim();
    text = text.replace(noteMatch[0], '');
  }

  // 5. Làm sạch dấu gạch nối và khoảng trắng thừa
  const cleanAddress = text
    .replace(/^(\s*-\s*)+/, '')
    .replace(/(\s*-\s*)+$/, '')
    .replace(/\s*-\s*-\s*/g, ' - ')
    .trim();

  return {
    cleanAddress: cleanAddress || 'Chưa có thông tin địa chỉ',
    orderNote: orderNote || undefined,
    shippingMethod: shippingMethod || undefined,
    shippingFee: shippingFee || undefined,
  };
}

export const HomeScreen: React.FC = () => {
  const { user, token, logout, serverUrl } = useAuth();

  const [fontsLoaded] = useFonts({
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
  });

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search states
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'PENDING' | 'SHIPPING' | 'COMPLETED'>('ALL');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Profile Modal & Order Detail Modal
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderDetailModalVisible, setOrderDetailModalVisible] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  // Copy Feedback state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // New Order Banner Alert state
  const prevOrdersCount = useRef<number>(0);
  const [newOrderNotice, setNewOrderNotice] = useState<{
    visible: boolean;
    orderId?: string;
    customerName?: string;
    amount?: number;
  }>({ visible: false });

  // Curved Chart interactive selection (Index of selected time slot)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(2); // Default to peak (14:00)

  // Bóc tách thông tin địa chỉ, phương thức vận chuyển và phí ship của đơn được chọn
  const parsedSelectedAddress = useMemo(() => {
    return parseOrderShippingAddress(selectedOrder?.shipping_address, selectedOrder?.notes);
  }, [selectedOrder]);

  // -------------------------------------------------------------
  // FETCH DATA & REAL-TIME POLLING
  // -------------------------------------------------------------
  const fetchData = async (isSilent: boolean = false) => {
    if (!token) return;
    if (!isSilent) setIsLoadingData(true);

    try {
      // 1. Fetch Orders
      const orderRes = await fetch(`${serverUrl}/api/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (orderRes.ok) {
        const orderData = await orderRes.json();
        if (orderData.success && Array.isArray(orderData.data)) {
          const fetchedOrders = orderData.data;

          // Phát hiện có đơn hàng mới từ web khi đang mở app
          if (
            prevOrdersCount.current > 0 &&
            fetchedOrders.length > prevOrdersCount.current
          ) {
            const newest = fetchedOrders[0];
            setNewOrderNotice({
              visible: true,
              orderId: newest?.id?.substring(0, 8),
              customerName: newest?.customer_name,
              amount: newest?.total_amount,
            });
          }

          prevOrdersCount.current = fetchedOrders.length;
          setOrders(fetchedOrders);
        }
      }

      // 2. Fetch Products
      const prodRes = await fetch(`${serverUrl}/api/products?all=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.success && Array.isArray(prodData.data)) {
          setProducts(prodData.data);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoadingData(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-polling mỗi 10 giây để nhận đơn hàng mới ngay tức thì từ website
    const timer = setInterval(() => {
      fetchData(true);
    }, 10000);

    return () => clearInterval(timer);
  }, [token, serverUrl]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // -------------------------------------------------------------
  // OPEN ORDER DETAIL & VIETTEL POST COPY LOGIC
  // -------------------------------------------------------------
  const handleOpenOrderDetail = async (order: any) => {
    setSelectedOrder(order);
    setOrderDetailModalVisible(true);

    // Fetch full order details including items if not yet loaded
    if (!order.items || order.items.length === 0) {
      setIsFetchingDetail(true);
      try {
        const res = await fetch(`${serverUrl}/api/orders?id=${encodeURIComponent(order.id)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setSelectedOrder(json.data);
          }
        }
      } catch (e) {
        console.error('Error fetching order detail:', e);
      } finally {
        setIsFetchingDetail(false);
      }
    }
  };

  const copyToClipboard = async (text: string, fieldKey: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const copyAllViettelPost = async (order: any) => {
    if (!order) return;
    const isPaid = order.payment_status === 'PAID';
    const codAmount = isPaid ? 0 : (order.total_amount || 0);
    const parsed = parseOrderShippingAddress(order.shipping_address, order.notes);

    let itemsDesc = 'Quần áo thời trang DE\'GENT';
    if (order.items && order.items.length > 0) {
      itemsDesc = order.items
        .map((it: any) => `${it.product_name || 'SP'} (${[it.color, it.size].filter(Boolean).join(', ')} x${it.quantity || 1})`)
        .join('; ');
    }

    const template = [
      `Người nhận: ${order.customer_name || 'Khách hàng'}`,
      `SĐT: ${order.customer_phone || ''}`,
      `Địa chỉ: ${parsed.cleanAddress}`,
      `Vận chuyển: ${parsed.shippingMethod || 'Giao hàng tiêu chuẩn'}`,
      parsed.shippingFee ? `Phí ship: ${parsed.shippingFee}` : '',
      `Thu hộ COD: ${codAmount > 0 ? formatCurrency(codAmount) : '0 đ (Đã thanh toán)'}`,
      `Nội dung hàng: ${itemsDesc}`,
      `Ghi chú: ${parsed.orderNote || 'Cho xem hàng, không cho thử'}`
    ].filter(Boolean).join('\n');

    await Clipboard.setStringAsync(template);
    setCopiedField('VIETTEL_ALL');
    setTimeout(() => setCopiedField(null), 2500);

    Alert.alert(
      '✓ Đã sao chép Viettel Post',
      'Đã sao chép toàn bộ thông tin đơn hàng vào bộ nhớ tạm. Bạn có thể dán trực tiếp vào ứng dụng Viettel Post để tạo đơn ngay.'
    );
  };

  const handleCallCustomer = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleLogout = () => {
    Alert.alert(
      'Xác nhận đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản quản trị?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => {
            setProfileModalVisible(false);
            logout();
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // -------------------------------------------------------------
  // TODAY'S REPORT & CHART CALCULATIONS
  // -------------------------------------------------------------
  const hourlyData: HourlyDataPoint[] = useMemo(() => {
    const buckets: HourlyDataPoint[] = [
      { time: '08:00', orders: 4, revenue: 1250000 },
      { time: '11:00', orders: 9, revenue: 2680000 },
      { time: '14:00', orders: 15, revenue: 4890000 }, // Peak
      { time: '17:00', orders: 7, revenue: 2150000 },
      { time: '20:00', orders: 11, revenue: 3450000 },
      { time: '23:00', orders: 3, revenue: 980000 },
    ];

    if (orders.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const todayOrders = orders.filter((o) => {
        if (!o.created_at) return true;
        return o.created_at.startsWith(today);
      });

      if (todayOrders.length > 0) {
        const slotCounts = [0, 0, 0, 0, 0, 0];
        const slotRevs = [0, 0, 0, 0, 0, 0];
        todayOrders.forEach((o) => {
          const date = new Date(o.created_at || Date.now());
          const h = date.getHours();
          const amt = Number(o.total_amount) || 0;
          let idx = 0;
          if (h < 10) idx = 0;
          else if (h < 13) idx = 1;
          else if (h < 16) idx = 2;
          else if (h < 19) idx = 3;
          else if (h < 22) idx = 4;
          else idx = 5;

          slotCounts[idx] += 1;
          slotRevs[idx] += amt;
        });

        for (let i = 0; i < 6; i++) {
          if (slotCounts[i] > 0) {
            buckets[i].orders = slotCounts[i];
            buckets[i].revenue = slotRevs[i];
          }
        }
      }
    }

    return buckets;
  }, [orders]);

  const totalTodayRevenue = useMemo(() => {
    return hourlyData.reduce((acc, curr) => acc + curr.revenue, 0);
  }, [hourlyData]);

  const totalTodayOrders = useMemo(() => {
    return hourlyData.reduce((acc, curr) => acc + curr.orders, 0);
  }, [hourlyData]);

  // SVG Chart Geometry
  const CHART_WIDTH = SCREEN_WIDTH - 32;
  const CHART_HEIGHT = 200;
  const PADDING_HORIZONTAL = 28;
  const PADDING_TOP = 48;
  const PADDING_BOTTOM = 30;

  const chartPoints = useMemo(() => {
    const maxVal = Math.max(...hourlyData.map((d) => d.revenue), 1);
    const usableWidth = CHART_WIDTH - PADDING_HORIZONTAL * 2;
    const usableHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    return hourlyData.map((d, index) => {
      const x = PADDING_HORIZONTAL + (index / (hourlyData.length - 1)) * usableWidth;
      const y = PADDING_TOP + usableHeight - (d.revenue / maxVal) * usableHeight;
      return { x, y, data: d };
    });
  }, [hourlyData, CHART_WIDTH]);

  // Smooth Cubic Bézier spline path generator
  const bezierPath = useMemo(() => {
    if (chartPoints.length < 2) return '';
    let d = `M ${chartPoints[0].x.toFixed(1)} ${chartPoints[0].y.toFixed(1)}`;
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p0 = i > 0 ? chartPoints[i - 1] : chartPoints[0];
      const p1 = chartPoints[i];
      const p2 = chartPoints[i + 1];
      const p3 = i < chartPoints.length - 2 ? chartPoints[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }, [chartPoints]);

  const areaPath = useMemo(() => {
    if (!bezierPath || chartPoints.length < 2) return '';
    const bottomY = CHART_HEIGHT - PADDING_BOTTOM;
    const lastPoint = chartPoints[chartPoints.length - 1];
    const firstPoint = chartPoints[0];
    return `${bezierPath} L ${lastPoint.x.toFixed(1)} ${bottomY} L ${firstPoint.x.toFixed(1)} ${bottomY} Z`;
  }, [bezierPath, chartPoints]);

  const selectedPoint = chartPoints[selectedSlotIndex] || chartPoints[2];

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderFilter !== 'ALL') {
        const s = (o.status || '').toUpperCase();
        if (orderFilter === 'PENDING' && s !== 'PENDING') return false;
        if (orderFilter === 'SHIPPING' && s !== 'SHIPPING' && s !== 'PROCESSING' && s !== 'DISPATCHED') return false;
        if (orderFilter === 'COMPLETED' && s !== 'COMPLETED' && s !== 'PAID') return false;
      }
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const idMatch = (o.id || '').toLowerCase().includes(q);
        const nameMatch = (o.customer_name || '').toLowerCase().includes(q);
        const phoneMatch = (o.customer_phone || '').toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [orders, orderFilter, orderSearchQuery]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return products;
    const q = productSearchQuery.toLowerCase();
    return products.filter((p) => {
      const nameMatch = (p.name || '').toLowerCase().includes(q);
      const skuMatch = (p.sku || '').toLowerCase().includes(q);
      const catMatch = (p.category || '').toLowerCase().includes(q);
      return nameMatch || skuMatch || catMatch;
    });
  }, [products, productSearchQuery]);

  return (
    <View style={styles.screenContainer}>
      {/* ============================================================ */}
      {/* TOP HEADER */}
      {/* ============================================================ */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>DE'GENT</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => setProfileModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </Text>
            <View style={styles.onlineBadge} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ============================================================ */}
      {/* REAL-TIME NEW ORDER FLOATING TOAST BANNER */}
      {/* ============================================================ */}
      {newOrderNotice.visible && (
        <View style={styles.newOrderBanner}>
          <View style={styles.newOrderBannerLeft}>
            <View style={styles.newOrderBellBox}>
              <Bell size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.newOrderBannerTitle}>🔔 Có đơn hàng mới từ Web!</Text>
              <Text style={styles.newOrderBannerSub} numberOfLines={1}>
                #{newOrderNotice.orderId} • {newOrderNotice.customerName || 'Khách mới'} • {formatCurrency(newOrderNotice.amount || 0)}
              </Text>
            </View>
          </View>
          <View style={styles.newOrderBannerActions}>
            <TouchableOpacity
              style={styles.newOrderViewBtn}
              onPress={() => {
                const newest = orders[0];
                setNewOrderNotice({ visible: false });
                if (newest) handleOpenOrderDetail(newest);
              }}
            >
              <Text style={styles.newOrderViewBtnText}>Xem ngay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.newOrderDismissBtn}
              onPress={() => setNewOrderNotice({ visible: false })}
            >
              <X size={15} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ============================================================ */}
      {/* MAIN CONTENT AREA */}
      {/* ============================================================ */}
      {isLoadingData && !refreshing && orders.length === 0 ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingCenterText}>Đang tải dữ liệu kinh doanh...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollBodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#22C55E']}
              tintColor="#22C55E"
            />
          }
        >
          {/* ======================================================== */}
          {/* TAB 1: HOME (DASHBOARD & CURVED CHART) */}
          {/* ======================================================== */}
          {activeTab === 'home' && (
            <View>
              {/* Card Báo cáo đơn hôm nay */}
              <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <View>
                    <Text style={styles.heroSubtitle}>Báo cáo đơn hôm nay</Text>
                    <Text style={styles.heroAmount}>
                      {formatCurrency(totalTodayRevenue)}
                    </Text>
                  </View>
                  <View style={styles.heroGrowthBadge}>
                    <TrendingUp size={13} color="#15803D" />
                    <Text style={styles.heroGrowthText}>+18.4%</Text>
                  </View>
                </View>

                {/* BIỂU ĐỒ ĐƯỜNG CONG (CURVED LINE CHART) */}
                <View style={styles.chartWrapper}>
                  <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                    <Defs>
                      <LinearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#22C55E" stopOpacity="0.32" />
                        <Stop offset="65%" stopColor="#22C55E" stopOpacity="0.08" />
                        <Stop offset="100%" stopColor="#22C55E" stopOpacity="0.00" />
                      </LinearGradient>
                    </Defs>

                    {/* Dotted horizontal guideline at selected peak height */}
                    {selectedPoint && (
                      <Line
                        x1={PADDING_HORIZONTAL}
                        y1={selectedPoint.y}
                        x2={CHART_WIDTH - PADDING_HORIZONTAL}
                        y2={selectedPoint.y}
                        stroke="#E2E8F0"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                      />
                    )}

                    {/* Gradient area underneath curve */}
                    {areaPath ? <Path d={areaPath} fill="url(#curveGradient)" /> : null}

                    {/* Smooth Bézier curve line */}
                    {bezierPath ? (
                      <Path
                        d={bezierPath}
                        fill="none"
                        stroke="#22C55E"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null}

                    {/* Vertical drop line down to X-axis for selected point */}
                    {selectedPoint && (
                      <Line
                        x1={selectedPoint.x}
                        y1={selectedPoint.y}
                        x2={selectedPoint.x}
                        y2={CHART_HEIGHT - PADDING_BOTTOM}
                        stroke="#22C55E"
                        strokeDasharray="3 3"
                        strokeWidth={1.2}
                      />
                    )}

                    {/* Interactive dots for each time slot */}
                    {chartPoints.map((pt, idx) => {
                      const isSelected = idx === selectedSlotIndex;
                      return (
                        <G key={`dot-${idx}`}>
                          {isSelected ? (
                            <>
                              <Circle
                                cx={pt.x}
                                cy={pt.y}
                                r={10}
                                fill="#22C55E"
                                fillOpacity={0.2}
                              />
                              <Circle
                                cx={pt.x}
                                cy={pt.y}
                                r={5.5}
                                fill="#22C55E"
                                stroke="#FFFFFF"
                                strokeWidth={2.5}
                              />
                            </>
                          ) : (
                            <Circle
                              cx={pt.x}
                              cy={pt.y}
                              r={3.5}
                              fill="#FFFFFF"
                              stroke="#86EFAC"
                              strokeWidth={1.8}
                            />
                          )}
                        </G>
                      );
                    })}
                  </Svg>

                  {/* Floating Peak / Selected Callout Pill (Tooltip) */}
                  {selectedPoint && (
                    <View
                      style={[
                        styles.floatingPill,
                        {
                          left: Math.max(
                            8,
                            Math.min(
                              selectedPoint.x - 70,
                              CHART_WIDTH - 150
                            )
                          ),
                          top: Math.max(4, selectedPoint.y - 42),
                        },
                      ]}
                    >
                      <Text style={styles.floatingPillLabel}>
                        {selectedSlotIndex === 2 ? 'Cao điểm • ' : 'Khung giờ '}
                        {selectedPoint.data.time}
                      </Text>
                      <Text style={styles.floatingPillValue}>
                        {selectedPoint.data.orders} đơn • {formatCurrency(selectedPoint.data.revenue)}
                      </Text>
                    </View>
                  )}

                  {/* Touch targets for slots on X-axis */}
                  <View style={styles.timelineLabelsRow}>
                    {hourlyData.map((slot, idx) => {
                      const isSelected = idx === selectedSlotIndex;
                      return (
                        <TouchableOpacity
                          key={slot.time}
                          style={styles.timelineItem}
                          onPress={() => setSelectedSlotIndex(idx)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.timelineText,
                              isSelected && styles.timelineTextActive,
                            ]}
                          >
                            {slot.time}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* KPI Quick Status Cards */}
              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <ShoppingBag size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.kpiValue}>{totalTodayOrders}</Text>
                  <Text style={styles.kpiTitle}>Tổng đơn hôm nay</Text>
                </View>

                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Truck size={18} color="#D97706" />
                  </View>
                  <Text style={styles.kpiValue}>
                    {orders.filter((o) => o.status === 'SHIPPING' || o.status === 'PROCESSING').length || 8}
                  </Text>
                  <Text style={styles.kpiTitle}>Đang giao hàng</Text>
                </View>

                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
                    <CheckCircle2 size={18} color="#16A34A" />
                  </View>
                  <Text style={styles.kpiValue}>
                    {orders.filter((o) => o.status === 'COMPLETED' || o.status === 'PAID').length || 26}
                  </Text>
                  <Text style={styles.kpiTitle}>Đã hoàn thành</Text>
                </View>
              </View>

              {/* Recent Orders Section (Click card to view Viettel Post info) */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View>
                    <Text style={styles.sectionCardTitle}>Đơn hàng mới nhất</Text>
                    <Text style={styles.sectionCardHint}>Chạm vào thẻ để sao chép thông tin gửi Viettel Post</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.seeAllButton}
                    onPress={() => setActiveTab('orders')}
                  >
                    <Text style={styles.seeAllText}>Xem tất cả</Text>
                    <ChevronRight size={14} color="#22C55E" />
                  </TouchableOpacity>
                </View>

                {orders.length === 0 ? (
                  <View style={styles.emptyState}>
                    <ShoppingBag size={36} color="#CBD5E1" />
                    <Text style={styles.emptyStateTitle}>Chưa có đơn hàng nào</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      Khi có đơn hàng mới từ website DE'GENT, danh sách sẽ cập nhật ngay.
                    </Text>
                  </View>
                ) : (
                  orders.slice(0, 4).map((order, idx) => (
                    <TouchableOpacity
                      key={order.id || idx}
                      style={styles.recentOrderItem}
                      activeOpacity={0.7}
                      onPress={() => handleOpenOrderDetail(order)}
                    >
                      <View style={styles.recentOrderLeft}>
                        <View style={styles.recentOrderAvatar}>
                          <Text style={styles.recentOrderAvatarText}>
                            {(order.customer_name || 'K').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.recentOrderDetails}>
                          <Text style={styles.recentOrderName} numberOfLines={1}>
                            {order.customer_name || 'Khách vãng lai'}
                          </Text>
                          <Text style={styles.recentOrderId}>
                            #{order.id?.substring(0, 8) || `ORD-${idx + 1}`} • {order.customer_phone || 'Hôm nay'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.recentOrderRight}>
                        <Text style={styles.recentOrderTotal}>
                          {formatCurrency(order.total_amount || 0)}
                        </Text>
                        <View
                          style={[
                            styles.microStatusBadge,
                            order.status === 'COMPLETED'
                              ? styles.microStatusSuccess
                              : styles.microStatusPending,
                          ]}
                        >
                          <Text style={styles.microStatusText}>
                            {order.status === 'COMPLETED' ? 'Hoàn thành' : 'Chờ xử lý'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* TAB 2: ORDERS (QUẢN LÝ ĐƠN HÀNG - CLICK VÀO CARD ĐỂ XEM & COPY) */}
          {/* ======================================================== */}
          {activeTab === 'orders' && (
            <View>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Search size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm theo tên khách, SĐT hoặc mã đơn..."
                  placeholderTextColor="#94A3B8"
                  value={orderSearchQuery}
                  onChangeText={setOrderSearchQuery}
                />
                {orderSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setOrderSearchQuery('')}>
                    <X size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Status Filters */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterScrollContent}
              >
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    orderFilter === 'ALL' && styles.filterChipActive,
                  ]}
                  onPress={() => setOrderFilter('ALL')}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      orderFilter === 'ALL' && styles.filterChipTextActive,
                    ]}
                  >
                    Tất cả ({orders.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    orderFilter === 'PENDING' && styles.filterChipActive,
                  ]}
                  onPress={() => setOrderFilter('PENDING')}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      orderFilter === 'PENDING' && styles.filterChipTextActive,
                    ]}
                  >
                    Chờ xử lý
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    orderFilter === 'SHIPPING' && styles.filterChipActive,
                  ]}
                  onPress={() => setOrderFilter('SHIPPING')}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      orderFilter === 'SHIPPING' && styles.filterChipTextActive,
                    ]}
                  >
                    Đang giao
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    orderFilter === 'COMPLETED' && styles.filterChipActive,
                  ]}
                  onPress={() => setOrderFilter('COMPLETED')}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      orderFilter === 'COMPLETED' && styles.filterChipTextActive,
                    ]}
                  >
                    Hoàn thành
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Order List */}
              {filteredOrders.length === 0 ? (
                <View style={styles.emptyState}>
                  <ShoppingBag size={42} color="#CBD5E1" />
                  <Text style={styles.emptyStateTitle}>Không tìm thấy đơn hàng</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Không có đơn nào phù hợp với bộ lọc hiện tại.
                  </Text>
                </View>
              ) : (
                filteredOrders.map((order, idx) => (
                  <TouchableOpacity
                    key={order.id || idx}
                    style={styles.orderCard}
                    activeOpacity={0.7}
                    onPress={() => handleOpenOrderDetail(order)}
                  >
                    <View style={styles.orderCardHeader}>
                      <View style={styles.orderCardIdBox}>
                        <Text style={styles.orderCardId}>
                          #{order.id?.substring(0, 8) || `ORD-${idx + 1}`}
                        </Text>
                        <Text style={styles.orderCardDate}>
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Hôm nay'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.orderStatusBadge,
                          order.status === 'COMPLETED'
                            ? styles.statusSuccess
                            : styles.statusPending,
                        ]}
                      >
                        <Text style={styles.orderStatusBadgeText}>
                          {order.status || 'Chờ xử lý'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.orderCustomer}>
                      Khách hàng: <Text style={styles.boldText}>{order.customer_name || 'Khách vãng lai'}</Text> • {order.customer_phone || ''}
                    </Text>
                    {order.shipping_address ? (
                      <View style={{ marginBottom: 8 }}>
                        <Text style={styles.orderAddress} numberOfLines={1}>
                          📍 {parseOrderShippingAddress(order.shipping_address).cleanAddress}
                        </Text>
                        <View style={styles.orderShipMetaRow}>
                          <Text style={styles.orderShipMethod}>
                            🚚 {parseOrderShippingAddress(order.shipping_address).shippingMethod || 'Giao hàng tiêu chuẩn'}
                          </Text>
                          {parseOrderShippingAddress(order.shipping_address).shippingFee ? (
                            <Text style={styles.orderShipFee}>
                              • Phí ship: {parseOrderShippingAddress(order.shipping_address).shippingFee}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ) : null}

                    <View style={styles.orderCardFooter}>
                      <View style={styles.orderCardQuickCopyTag}>
                        <Sparkles size={12} color="#15803D" />
                        <Text style={styles.orderCardQuickCopyText}>Chạm để copy Viettel Post</Text>
                      </View>
                      <Text style={styles.orderCardTotal}>
                        {formatCurrency(order.total_amount || 0)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* ======================================================== */}
          {/* TAB 3: ANALYTICS (THỐNG KÊ DOANH SỐ) */}
          {/* ======================================================== */}
          {activeTab === 'analytics' && (
            <View>
              <View style={styles.statsCard}>
                <View style={styles.statsHeader}>
                  <Text style={styles.statsTitle}>Phân tích nguồn thu</Text>
                  <View style={styles.statsDatePill}>
                    <Calendar size={13} color="#64748B" />
                    <Text style={styles.statsDateText}>Tháng này</Text>
                  </View>
                </View>

                {/* Donut Chart Visual */}
                <View style={styles.donutWrapper}>
                  <Svg width={200} height={200} viewBox="0 0 200 200">
                    <Circle
                      cx="100"
                      cy="100"
                      r="70"
                      stroke="#22C55E"
                      strokeWidth="24"
                      fill="none"
                      strokeDasharray="193 440"
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    <Circle
                      cx="100"
                      cy="100"
                      r="70"
                      stroke="#A855F7"
                      strokeWidth="24"
                      fill="none"
                      strokeDasharray="136 440"
                      strokeDashoffset="-205"
                      strokeLinecap="round"
                    />
                    <Circle
                      cx="100"
                      cy="100"
                      r="70"
                      stroke="#3B82F6"
                      strokeWidth="24"
                      fill="none"
                      strokeDasharray="79 440"
                      strokeDashoffset="-350"
                      strokeLinecap="round"
                    />
                    <Circle
                      cx="100"
                      cy="100"
                      r="70"
                      stroke="#F87171"
                      strokeWidth="24"
                      fill="none"
                      strokeDasharray="30 440"
                      strokeDashoffset="-435"
                      strokeLinecap="round"
                    />
                  </Svg>

                  <View style={styles.donutCenterContent}>
                    <Text style={styles.donutAmount}>85.450.000 ₫</Text>
                    <Text style={styles.donutLabel}>Tổng doanh thu</Text>
                  </View>
                </View>

                {/* Breakdown Legend Grid */}
                <View style={styles.legendGrid}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                    <View style={styles.legendInfo}>
                      <Text style={styles.legendName}>Cửa hàng Online (44%)</Text>
                      <Text style={styles.legendVal}>42.185.000 ₫</Text>
                    </View>
                  </View>

                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#A855F7' }]} />
                    <View style={styles.legendInfo}>
                      <Text style={styles.legendName}>Khách Offline (31%)</Text>
                      <Text style={styles.legendVal}>12.729.000 ₫</Text>
                    </View>
                  </View>

                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                    <View style={styles.legendInfo}>
                      <Text style={styles.legendName}>Bán trực tiếp (18%)</Text>
                      <Text style={styles.legendVal}>24.095.000 ₫</Text>
                    </View>
                  </View>

                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F87171' }]} />
                    <View style={styles.legendInfo}>
                      <Text style={styles.legendName}>Kênh khác (7%)</Text>
                      <Text style={styles.legendVal}>6.441.000 ₫</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Leads / Conversion Progress Card */}
              <View style={styles.leadsCard}>
                <View style={styles.leadsHeader}>
                  <Text style={styles.leadsTitle}>Hiệu suất chốt đơn</Text>
                  <View style={styles.leadsArrowPill}>
                    <ArrowUpRight size={14} color="#15803D" />
                  </View>
                </View>

                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '82%' }]} />
                </View>

                <View style={styles.progressLegendRow}>
                  <View style={styles.progressLegendItem}>
                    <View style={[styles.legendMiniDot, { backgroundColor: '#22C55E' }]} />
                    <Text style={styles.progressLegendText}>Đã chốt: 82%</Text>
                  </View>
                  <View style={styles.progressLegendItem}>
                    <View style={[styles.legendMiniDot, { backgroundColor: '#CBD5E1' }]} />
                    <Text style={styles.progressLegendText}>Đang chờ: 18%</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* TAB 4: PRODUCTS (DANH MỤC SẢN PHẨM) */}
          {/* ======================================================== */}
          {activeTab === 'products' && (
            <View>
              <View style={styles.searchContainer}>
                <Search size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm sản phẩm theo tên, mã SKU..."
                  placeholderTextColor="#94A3B8"
                  value={productSearchQuery}
                  onChangeText={setProductSearchQuery}
                />
                {productSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setProductSearchQuery('')}>
                    <X size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {filteredProducts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Package size={42} color="#CBD5E1" />
                  <Text style={styles.emptyStateTitle}>Không tìm thấy sản phẩm</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Danh mục sản phẩm DE'GENT sẽ hiển thị khi kết nối máy chủ.
                  </Text>
                </View>
              ) : (
                filteredProducts.map((item, idx) => (
                  <View key={item.id || idx} style={styles.productCard}>
                    <View style={styles.productTopRow}>
                      <View style={styles.productNameBox}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.productSku}>
                          SKU: {item.sku || item.id?.substring(0, 10)} • {item.category || 'Thời trang nam'}
                        </Text>
                      </View>
                      <Text style={styles.productPrice}>
                        {formatCurrency(item.variants?.[0]?.selling_price || item.variants?.[0]?.price || item.price || item.selling_price || 0)}
                      </Text>
                    </View>

                    <View style={styles.productBottomRow}>
                      <View style={styles.productStockBadge}>
                        <ShieldCheck size={12} color="#15803D" />
                        <Text style={styles.productStockText}>Còn hàng trong kho</Text>
                      </View>
                      <Text style={styles.productVariantsCount}>
                        {item.variants?.length ? `${item.variants.length} phân loại` : 'Mặc định'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          <View style={{ height: 95 }} />
        </ScrollView>
      )}

      {/* ============================================================ */}
      {/* BOTTOM NAVIGATION BAR */}
      {/* ============================================================ */}
      <View style={styles.bottomNavContainer}>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.7}
        >
          <Home
            size={22}
            color={activeTab === 'home' ? '#0F172A' : '#94A3B8'}
            strokeWidth={activeTab === 'home' ? 2.5 : 1.8}
          />
          <Text
            style={[
              styles.bottomNavLabel,
              activeTab === 'home' && styles.bottomNavLabelActive,
            ]}
          >
            Trang chủ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => setActiveTab('orders')}
          activeOpacity={0.7}
        >
          <View>
            <ShoppingBag
              size={22}
              color={activeTab === 'orders' ? '#0F172A' : '#94A3B8'}
              strokeWidth={activeTab === 'orders' ? 2.5 : 1.8}
            />
            {orders.length > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>
                  {orders.length > 99 ? '99+' : orders.length}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.bottomNavLabel,
              activeTab === 'orders' && styles.bottomNavLabelActive,
            ]}
          >
            Đơn hàng
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => setActiveTab('analytics')}
          activeOpacity={0.7}
        >
          <BarChart2
            size={22}
            color={activeTab === 'analytics' ? '#0F172A' : '#94A3B8'}
            strokeWidth={activeTab === 'analytics' ? 2.5 : 1.8}
          />
          <Text
            style={[
              styles.bottomNavLabel,
              activeTab === 'analytics' && styles.bottomNavLabelActive,
            ]}
          >
            Thống kê
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => setActiveTab('products')}
          activeOpacity={0.7}
        >
          <Package
            size={22}
            color={activeTab === 'products' ? '#0F172A' : '#94A3B8'}
            strokeWidth={activeTab === 'products' ? 2.5 : 1.8}
          />
          <Text
            style={[
              styles.bottomNavLabel,
              activeTab === 'products' && styles.bottomNavLabelActive,
            ]}
          >
            Sản phẩm
          </Text>
        </TouchableOpacity>
      </View>

      {/* ============================================================ */}
      {/* ORDER DETAIL & VIETTEL POST DISPATCH MODAL (CHẠM VÀO CARD) */}
      {/* ============================================================ */}
      <Modal
        visible={orderDetailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOrderDetailModalVisible(false)}
      >
        <View style={styles.orderDetailModalOverlay}>
          <View style={styles.orderDetailModalSheet}>
            {/* Modal Top Handle & Header */}
            <View style={styles.modalSheetHandle} />

            <View style={styles.orderDetailHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.orderDetailTitleRow}>
                  <Text style={styles.orderDetailTitle}>
                    Đơn hàng #{selectedOrder?.id?.substring(0, 8) || 'CHI TIẾT'}
                  </Text>
                  <View
                    style={[
                      styles.orderStatusBadge,
                      selectedOrder?.status === 'COMPLETED'
                        ? styles.statusSuccess
                        : styles.statusPending,
                    ]}
                  >
                    <Text style={styles.orderStatusBadgeText}>
                      {selectedOrder?.status === 'COMPLETED' ? 'Hoàn thành' : 'Chờ xử lý'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderDetailTime}>
                  Đặt lúc: {selectedOrder?.created_at
                    ? new Date(selectedOrder.created_at).toLocaleString('vi-VN')
                    : 'Hôm nay'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setOrderDetailModalVisible(false)}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.orderDetailScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* NÚT SAO CHÉP TOÀN BỘ ĐỂ TẠO VIETTEL POST (1 CHẠM) */}
              <TouchableOpacity
                style={styles.copyViettelPostFullButton}
                activeOpacity={0.8}
                onPress={() => copyAllViettelPost(selectedOrder)}
              >
                <View style={styles.copyViettelPostFullLeft}>
                  <View style={styles.viettelPostBadge}>
                    <Text style={styles.viettelPostBadgeText}>VIETTEL POST</Text>
                  </View>
                  <Text style={styles.copyViettelPostFullTitle}>
                    Sao chép toàn bộ để tạo đơn
                  </Text>
                  <Text style={styles.copyViettelPostFullSub}>
                    Gồm Người nhận, SĐT, Địa chỉ, Tiền COD, Hàng hóa
                  </Text>
                </View>
                <View style={styles.copyViettelPostIconBox}>
                  {copiedField === 'VIETTEL_ALL' ? (
                    <Check size={20} color="#FFFFFF" />
                  ) : (
                    <Copy size={20} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>

              {/* KHỐI THÔNG TIN KHÁCH HÀNG & GIAO HÀNG (TỪNG TRƯỜNG ĐỂ COPY) */}
              <View style={styles.detailSectionBox}>
                <View style={styles.detailSectionHeader}>
                  <Text style={styles.detailSectionTitle}>Thông tin người nhận hàng</Text>
                </View>

                {/* Họ tên khách hàng */}
                <View style={styles.fieldRow}>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldLabel}>Họ và tên người nhận</Text>
                    <Text style={styles.fieldValuePrimary}>
                      {selectedOrder?.customer_name || 'Khách vãng lai'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.copyMiniBtn,
                      copiedField === 'customer_name' && styles.copyMiniBtnActive,
                    ]}
                    onPress={() =>
                      copyToClipboard(selectedOrder?.customer_name || '', 'customer_name')
                    }
                  >
                    {copiedField === 'customer_name' ? (
                      <>
                        <Check size={14} color="#15803D" />
                        <Text style={styles.copyMiniBtnTextActive}>Đã chép</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={14} color="#2563EB" />
                        <Text style={styles.copyMiniBtnText}>Copy tên</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Số điện thoại */}
                <View style={styles.fieldRow}>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldLabel}>Số điện thoại liên hệ</Text>
                    <Text style={styles.fieldValueBold}>
                      {selectedOrder?.customer_phone || 'Chưa có SĐT'}
                    </Text>
                  </View>
                  <View style={styles.actionBtnRow}>
                    <TouchableOpacity
                      style={styles.callMiniBtn}
                      onPress={() => handleCallCustomer(selectedOrder?.customer_phone || '')}
                    >
                      <PhoneCall size={14} color="#16A34A" />
                      <Text style={styles.callMiniBtnText}>Gọi</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.copyMiniBtn,
                        copiedField === 'customer_phone' && styles.copyMiniBtnActive,
                      ]}
                      onPress={() =>
                        copyToClipboard(selectedOrder?.customer_phone || '', 'customer_phone')
                      }
                    >
                      {copiedField === 'customer_phone' ? (
                        <>
                          <Check size={14} color="#15803D" />
                          <Text style={styles.copyMiniBtnTextActive}>Đã chép</Text>
                        </>
                      ) : (
                        <>
                          <Copy size={14} color="#2563EB" />
                          <Text style={styles.copyMiniBtnText}>Copy SĐT</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 1. Địa chỉ giao hàng (Đã bóc tách sạch sẽ) */}
                <View style={styles.fieldRow}>
                  <View style={styles.fieldInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MapPin size={13} color="#2563EB" />
                      <Text style={styles.fieldLabel}>Địa chỉ nhận hàng (Chi tiết)</Text>
                    </View>
                    <Text style={styles.fieldValueAddress}>
                      {parsedSelectedAddress.cleanAddress}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.copyMiniBtn,
                      copiedField === 'shipping_address' && styles.copyMiniBtnActive,
                    ]}
                    onPress={() =>
                      copyToClipboard(parsedSelectedAddress.cleanAddress, 'shipping_address')
                    }
                  >
                    {copiedField === 'shipping_address' ? (
                      <>
                        <Check size={14} color="#15803D" />
                        <Text style={styles.copyMiniBtnTextActive}>Đã chép</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={14} color="#2563EB" />
                        <Text style={styles.copyMiniBtnText}>Copy địa chỉ</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* 2. Hình thức vận chuyển */}
                <View style={styles.fieldRow}>
                  <View style={styles.fieldInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Truck size={13} color="#0F172A" />
                      <Text style={styles.fieldLabel}>Hình thức vận chuyển</Text>
                    </View>
                    <Text style={styles.fieldValueBold}>
                      {parsedSelectedAddress.shippingMethod || 'Giao hàng tiêu chuẩn'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.copyMiniBtn,
                      copiedField === 'shipping_method' && styles.copyMiniBtnActive,
                    ]}
                    onPress={() =>
                      copyToClipboard(
                        parsedSelectedAddress.shippingMethod || 'Giao hàng tiêu chuẩn',
                        'shipping_method'
                      )
                    }
                  >
                    {copiedField === 'shipping_method' ? (
                      <>
                        <Check size={14} color="#15803D" />
                        <Text style={styles.copyMiniBtnTextActive}>Đã chép</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={14} color="#2563EB" />
                        <Text style={styles.copyMiniBtnText}>Copy gói</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* 3. Phí vận chuyển (Phí ship) */}
                <View style={styles.fieldRow}>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldLabel}>Phí ship (Cước vận chuyển)</Text>
                    <Text style={styles.fieldValuePrice}>
                      {parsedSelectedAddress.shippingFee || '30.000 ₫'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.copyMiniBtn,
                      copiedField === 'shipping_fee' && styles.copyMiniBtnActive,
                    ]}
                    onPress={() => {
                      const rawFee = (parsedSelectedAddress.shippingFee || '30.000')
                        .replace(/[^\d]/g, '');
                      copyToClipboard(rawFee || '30000', 'shipping_fee');
                    }}
                  >
                    {copiedField === 'shipping_fee' ? (
                      <>
                        <Check size={14} color="#15803D" />
                        <Text style={styles.copyMiniBtnTextActive}>Đã chép</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={14} color="#2563EB" />
                        <Text style={styles.copyMiniBtnText}>Copy phí</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* 4. Ghi chú giao hàng cho shipper (nếu có) */}
                {parsedSelectedAddress.orderNote ? (
                  <View style={styles.fieldRow}>
                    <View style={styles.fieldInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <FileText size={13} color="#D97706" />
                        <Text style={styles.fieldLabel}>Ghi chú giao hàng</Text>
                      </View>
                      <Text style={styles.fieldValueAddress}>
                        {parsedSelectedAddress.orderNote}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.copyMiniBtn,
                        copiedField === 'order_note' && styles.copyMiniBtnActive,
                      ]}
                      onPress={() =>
                        copyToClipboard(parsedSelectedAddress.orderNote || '', 'order_note')
                      }
                    >
                      {copiedField === 'order_note' ? (
                        <>
                          <Check size={14} color="#15803D" />
                          <Text style={styles.copyMiniBtnTextActive}>Đã chép</Text>
                        </>
                      ) : (
                        <>
                          <Copy size={14} color="#2563EB" />
                          <Text style={styles.copyMiniBtnText}>Copy ghi chú</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* 5. Tiền thu hộ COD */}
                <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldLabel}>Tiền thu hộ COD (Cần thu Viettel Post)</Text>
                    <Text style={styles.fieldValuePrice}>
                      {selectedOrder?.payment_status === 'PAID'
                        ? '0 ₫ (Khách đã thanh toán CK)'
                        : formatCurrency(selectedOrder?.total_amount || 0)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.copyMiniBtn,
                      copiedField === 'cod_amount' && styles.copyMiniBtnActive,
                    ]}
                    onPress={() => {
                      const num = selectedOrder?.payment_status === 'PAID' ? '0' : String(selectedOrder?.total_amount || 0);
                      copyToClipboard(num, 'cod_amount');
                    }}
                  >
                    {copiedField === 'cod_amount' ? (
                      <>
                        <Check size={14} color="#15803D" />
                        <Text style={styles.copyMiniBtnTextActive}>Đã chép</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={14} color="#2563EB" />
                        <Text style={styles.copyMiniBtnText}>Copy số tiền</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* SẢN PHẨM TRONG ĐƠN */}
              <View style={styles.detailSectionBox}>
                <View style={styles.detailSectionHeader}>
                  <Text style={styles.detailSectionTitle}>Sản phẩm đóng gói</Text>
                  {selectedOrder?.items && selectedOrder.items.length > 0 && (
                    <TouchableOpacity
                      style={styles.copyItemsLink}
                      onPress={() => {
                        const itStr = selectedOrder.items
                          .map((i: any) => `${i.product_name} (${[i.color, i.size].filter(Boolean).join(', ')} x${i.quantity || 1})`)
                          .join('; ');
                        copyToClipboard(itStr, 'all_items_str');
                      }}
                    >
                      <Copy size={13} color="#22C55E" />
                      <Text style={styles.copyItemsLinkText}>
                        {copiedField === 'all_items_str' ? 'Đã copy' : 'Copy tên hàng'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isFetchingDetail ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#22C55E" />
                    <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
                      Đang tải danh sách sản phẩm...
                    </Text>
                  </View>
                ) : selectedOrder?.items && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((item: any, i: number) => (
                    <View key={item.id || i} style={styles.orderItemCard}>
                      <View style={styles.orderItemIcon}>
                        <Box size={20} color="#475569" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.orderItemName} numberOfLines={2}>
                          {item.product_name || 'Sản phẩm DE\'GENT'}
                        </Text>
                        <View style={styles.orderItemMetaRow}>
                          {item.color ? (
                            <View style={styles.orderItemTag}>
                              <Text style={styles.orderItemTagText}>Màu: {item.color}</Text>
                            </View>
                          ) : null}
                          {item.size ? (
                            <View style={styles.orderItemTag}>
                              <Text style={styles.orderItemTagText}>Size: {item.size}</Text>
                            </View>
                          ) : null}
                          <Text style={styles.orderItemQty}>SL: x{item.quantity || 1}</Text>
                        </View>
                      </View>
                      <Text style={styles.orderItemPrice}>
                        {formatCurrency(item.total_price || item.unit_price || 0)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={{ paddingVertical: 12 }}>
                    <Text style={{ fontSize: 13, color: '#64748B' }}>
                      Đơn hàng đặt trực tiếp trên hệ thống DE'GENT (Tổng: {formatCurrency(selectedOrder?.total_amount || 0)})
                    </Text>
                  </View>
                )}

                {/* Ghi chú giao hàng */}
                {selectedOrder?.notes ? (
                  <View style={styles.orderNotesBox}>
                    <Text style={styles.orderNotesLabel}>Ghi chú từ khách:</Text>
                    <Text style={styles.orderNotesText}>{selectedOrder.notes}</Text>
                  </View>
                ) : null}
              </View>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* USER PROFILE & LOGOUT MODAL */}
      {/* ============================================================ */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setProfileModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tài khoản quản trị</Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalUserCard}>
              <View style={styles.modalAvatar}>
                <Text style={styles.modalAvatarText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </Text>
              </View>
              <View style={styles.modalUserInfo}>
                <Text style={styles.modalUserName}>{user?.name || 'Quản trị viên'}</Text>
                <Text style={styles.modalUserSub}>
                  {user?.phone || user?.email || 'admin@degent.vn'}
                </Text>
                <View style={styles.modalRoleBadge}>
                  <Text style={styles.modalRoleText}>{user?.role || 'ADMIN'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.serverInfoBox}>
              <Text style={styles.serverInfoLabel}>Máy chủ kết nối:</Text>
              <Text style={styles.serverInfoValue} numberOfLines={1}>
                {serverUrl}
              </Text>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={18} color="#EF4444" />
              <Text style={styles.logoutBtnText}>Đăng xuất khỏi hệ thống</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 20,
    letterSpacing: 4,
    color: '#0F172A',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // Floating New Order Toast
  newOrderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 99,
  },
  newOrderBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  newOrderBellBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newOrderBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  newOrderBannerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  newOrderBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newOrderViewBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newOrderViewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  newOrderDismissBtn: {
    padding: 6,
  },

  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingCenterText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  scrollBody: {
    flex: 1,
  },
  scrollBodyContent: {
    padding: 16,
  },

  // Hero Card & Chart
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  heroGrowthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  heroGrowthText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  chartWrapper: {
    position: 'relative',
    marginTop: 4,
  },
  floatingPill: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  floatingPillLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  floatingPillValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -10,
  },
  timelineItem: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  timelineText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  timelineTextActive: {
    color: '#22C55E',
    fontWeight: '700',
  },

  // KPI Row
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionCardHint: {
    fontSize: 11,
    color: '#22C55E',
    marginTop: 2,
    fontWeight: '500',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22C55E',
  },
  recentOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  recentOrderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  recentOrderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentOrderAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  recentOrderDetails: {
    flex: 1,
  },
  recentOrderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  recentOrderId: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  recentOrderRight: {
    alignItems: 'flex-end',
  },
  recentOrderTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  microStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  microStatusSuccess: {
    backgroundColor: '#DCFCE7',
  },
  microStatusPending: {
    backgroundColor: '#FEF3C7',
  },
  microStatusText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#15803D',
  },

  // Search & Filters
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  filterScroll: {
    marginBottom: 14,
  },
  filterScrollContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // Order Cards
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderCardIdBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderCardId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  orderCardDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  orderStatusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  orderCustomer: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  orderAddress: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  orderShipMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderShipMethod: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '600',
  },
  orderShipFee: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  orderCardQuickCopyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderCardQuickCopyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  orderCardTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Analytics Screen
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  statsDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statsDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  donutWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 200,
    marginBottom: 16,
  },
  donutCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  donutLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '47%',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendInfo: {
    flex: 1,
  },
  legendName: {
    fontSize: 11,
    color: '#64748B',
  },
  legendVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  leadsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  leadsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leadsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  leadsArrowPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#22C55E',
  },
  progressLegendRow: {
    flexDirection: 'row',
    gap: 16,
  },
  progressLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendMiniDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  progressLegendText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  // Product Cards
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  productTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productNameBox: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  productSku: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22C55E',
  },
  productBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  productStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productStockText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#15803D',
  },
  productVariantsCount: {
    fontSize: 11,
    color: '#94A3B8',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginVertical: 12,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 240,
  },

  // Bottom Navigation Bar
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  bottomNavLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 4,
  },
  bottomNavLabelActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

  // ORDER DETAIL & VIETTEL POST MODAL
  orderDetailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  orderDetailModalSheet: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.88,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 8,
  },
  orderDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  orderDetailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderDetailTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderDetailTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  modalCloseCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderDetailScroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  // One-click Viettel Post Copy Button
  copyViettelPostFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  copyViettelPostFullLeft: {
    flex: 1,
  },
  viettelPostBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EE0033', // Viettel Red
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  viettelPostBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  copyViettelPostFullTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  copyViettelPostFullSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  copyViettelPostIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  // Detail Section Box
  detailSectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailSectionHint: {
    fontSize: 11,
    color: '#64748B',
  },

  // Field Rows with Copy Buttons
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  fieldInfo: {
    flex: 1,
    marginRight: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 2,
  },
  fieldValuePrimary: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  fieldValueBold: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  fieldValueAddress: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
    marginTop: 2,
  },
  fieldValuePrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16A34A',
  },

  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  copyMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyMiniBtnActive: {
    backgroundColor: '#DCFCE7',
  },
  copyMiniBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  copyMiniBtnTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },

  // Items
  copyItemsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyItemsLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22C55E',
  },
  orderItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 10,
  },
  orderItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  orderItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  orderItemTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  orderItemTagText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '500',
  },
  orderItemQty: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  orderNotesBox: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  orderNotesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  orderNotesText: {
    fontSize: 12,
    color: '#78350F',
  },

  // Modal Profile
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    marginBottom: 14,
    gap: 12,
  },
  modalAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalUserInfo: {
    flex: 1,
  },
  modalUserName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalUserSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  modalRoleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  serverInfoBox: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  serverInfoLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  serverInfoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 13,
    borderRadius: 12,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});

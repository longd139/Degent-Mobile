import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export const HomeScreen: React.FC = () => {
  const { user, token, logout, serverUrl } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders');

  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    setIsLoadingData(true);
    try {
      // 1. Fetch Orders
      const orderRes = await fetch(`${serverUrl}/api/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        if (orderData.success && Array.isArray(orderData.data)) {
          setOrders(orderData.data);
        }
      }

      // 2. Fetch Products
      const prodRes = await fetch(`${serverUrl}/api/products?all=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
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
  }, [token, serverUrl]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = () => {
    Alert.alert(
      'Xác nhận đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc hiện tại?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerUserRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || 'Quản trị viên'}
              </Text>
              <View style={[styles.roleBadge, user?.role === 'ADMIN' ? styles.roleAdmin : styles.roleUser]}>
                <Text style={styles.roleBadgeText}>{user?.role || 'USER'}</Text>
              </View>
            </View>
            <Text style={styles.userPhone}>
              {user?.phone || user?.email || 'Chưa có thông tin'}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        {/* Server Connection Banner */}
        <View style={styles.serverStatusRow}>
          <View style={styles.onlineDot} />
          <Text style={styles.serverStatusText} numberOfLines={1}>
            Kết nối: {serverUrl}
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'orders' && styles.tabItemActive]}
            onPress={() => setActiveTab('orders')}
          >
            <Text style={[styles.tabItemText, activeTab === 'orders' && styles.tabItemTextActive]}>
              📦 Đơn hàng ({orders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'products' && styles.tabItemActive]}
            onPress={() => setActiveTab('products')}
          >
            <Text style={[styles.tabItemText, activeTab === 'products' && styles.tabItemTextActive]}>
              🏷️ Sản phẩm ({products.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Area */}
      {isLoadingData && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Đang tải dữ liệu từ máy chủ...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === 'orders' ? (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Danh sách đơn hàng gần đây</Text>
                <TouchableOpacity onPress={fetchData}>
                  <Text style={styles.refreshLink}>Làm mới</Text>
                </TouchableOpacity>
              </View>

              {orders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>📦</Text>
                  <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
                  <Text style={styles.emptySubtitle}>
                    Khi có khách đặt mua qua web CAISHOP, đơn hàng sẽ hiển thị tại đây.
                  </Text>
                </View>
              ) : (
                orders.map((item, idx) => (
                  <View key={item.id || idx} style={styles.orderCard}>
                    <View style={styles.orderCardHeader}>
                      <Text style={styles.orderId}>#{item.id?.substring(0, 8) || `ORD-${idx + 1}`}</Text>
                      <View style={[
                        styles.statusBadge,
                        item.status === 'COMPLETED' ? styles.statusSuccess : styles.statusPending
                      ]}>
                        <Text style={styles.statusBadgeText}>{item.status || 'Chờ xử lý'}</Text>
                      </View>
                    </View>
                    <Text style={styles.customerName}>
                      Khách: {item.customer_name || 'Khách vãng lai'} • {item.customer_phone || ''}
                    </Text>
                    <View style={styles.orderFooter}>
                      <Text style={styles.orderDate}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : 'Hôm nay'}
                      </Text>
                      <Text style={styles.orderTotal}>
                        {formatCurrency(item.total_amount || 0)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Danh mục sản phẩm CAISHOP</Text>
                <TouchableOpacity onPress={fetchData}>
                  <Text style={styles.refreshLink}>Làm mới</Text>
                </TouchableOpacity>
              </View>

              {products.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>🏷️</Text>
                  <Text style={styles.emptyTitle}>Chưa có sản phẩm nào</Text>
                  <Text style={styles.emptySubtitle}>
                    Dữ liệu danh mục sản phẩm từ hệ thống CAISHOP sẽ hiển thị ở đây.
                  </Text>
                </View>
              ) : (
                products.map((item, idx) => (
                  <View key={item.id || idx} style={styles.productCard}>
                    <View style={styles.productTopRow}>
                      <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.productPrice}>
                        {formatCurrency(item.variants?.[0]?.price || item.price || 0)}
                      </Text>
                    </View>
                    <Text style={styles.productCategory}>
                      Mã: {item.sku || item.id?.substring(0, 10)} • {item.category || 'Thời trang'}
                    </Text>
                    <View style={styles.variantBadgeRow}>
                      <Text style={styles.variantCount}>
                        {item.variants ? `${item.variants.length} biến thể` : 'Có sẵn'}
                      </Text>
                      <View style={styles.stockBadge}>
                        <Text style={styles.stockBadgeText}>Tồn kho</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    maxWidth: 160,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleAdmin: {
    backgroundColor: '#eff6ff',
  },
  roleUser: {
    backgroundColor: colors.surfaceSubtle,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
  },
  userPhone: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.surfaceSubtle,
  },
  logoutButtonText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
  serverStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  serverStatusText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  tabItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textMuted,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  refreshLink: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusSuccess: {
    backgroundColor: colors.successLight,
  },
  statusPending: {
    backgroundColor: colors.warningLight,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  customerName: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  productCategory: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  variantBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variantCount: {
    fontSize: 12,
    color: colors.textLight,
  },
  stockBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockBadgeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
});

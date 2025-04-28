import { StyleSheet, Dimensions } from 'react-native';

// 화면 크기에 따른 반응형 스타일 처리를 위한 설정
const windowWidth = Dimensions.get('window').width;
const isSmallScreen = windowWidth < 640;

// 색상 상수
const colors = {
  background: '#f8fafc',
  white: 'white',
  primary: '#16a34a',
  primaryDark: '#15803d',
  border: '#e2e8f0',
  textDark: '#1e293b',
  textMedium: '#334155',
  textLight: '#64748b',
  price: '#ef4444',
  itemBackground: '#f8fafc',
  itemHoverBackground: '#f1f5f9',
};

const PickupResult =  StyleSheet.create({
  // 컨테이너
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // 내용 컨테이너
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: isSmallScreen ? 16 : 24,
    maxWidth: 768, // ~48rem
  },

  // 카드 스타일
  card: {
    backgroundColor: colors.white,
    borderRadius: isSmallScreen ? 12 : 16,
    padding: isSmallScreen ? 20 : 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // 섹션 스타일
  section: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastSection: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },

  // 섹션 헤더
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: colors.textDark,
    letterSpacing: -0.5,
  },

  // 서브섹션 제목
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMedium,
    marginBottom: 16,
  },

  // 그리드 레이아웃
  grid: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  gridRow: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastGridRow: {
    borderBottomWidth: 0,
  },
  label: {
    width: isSmallScreen ? '100%' : 120,
    color: colors.textLight,
    fontWeight: '500',
    marginBottom: isSmallScreen ? 4 : 0,
  },
  value: {
    flex: isSmallScreen ? 0 : 1,
    color: colors.textDark,
  },

  // 주소 스타일
  address: {
    marginTop: isSmallScreen ? 4 : 0,
    flex: isSmallScreen ? 0 : 1,
  },
  addressDetail: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4,
  },

  // 가격 스타일
  price: {
    color: colors.price,
    fontWeight: '600',
  },

  // 폐기물 목록
  wasteList: {
    marginTop: 8,
  },
  wasteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isSmallScreen ? 12 : 16,
    backgroundColor: colors.itemBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  lastWasteItem: {
    marginBottom: 0,
  },
  wasteInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wasteType: {
    fontSize: 15,
    color: colors.textDark,
    fontWeight: '500',
    flex: 1,
  },
  wasteQuantity: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '400',
    width: 40,
  },
  wastePrice: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    width: 70,
    textAlign: 'right',
  },

  // 제출 버튼
  submitButton: {
    width: '100%',
    marginTop: 32,
    marginBottom: 32,
    paddingVertical: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.textDark,
  },
  homeButton: {
    padding: 8,
  },
  homeButtonText: {
    fontSize: 20,
    color: colors.textDark,
  },

  // 안전 영역 (노치, 홈 바 등 고려)
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },

  // 로딩 상태
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.primary,
    marginTop: 8,
  },

  // 애니메이션 관련 (React Native에서는 Animated API 사용)
  animatedContent: {
    flex: 1,
  },
});

export default PickupResult;
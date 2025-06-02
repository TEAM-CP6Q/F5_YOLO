import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal, 
  FlatList,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  Image,
  StatusBar,
  SafeAreaView,
  TouchableWithoutFeedback,
  StyleSheet
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import Postcode from '@actbase/react-daum-postcode';
import { CameraView } from 'expo-camera';
import * as Camera from 'expo-camera'; 
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import styles from "../styles/PickupRequestStyles";
import result from '../styles/PickupResultStyle';

// 상단바 높이 계산
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

// 스타일 확장
const extendedStyles = {
  ...styles,
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mainContainer: {
    ...styles.mainContainer,
    paddingTop: Platform.OS === 'android' ? STATUSBAR_HEIGHT : 0,
  },
  scrollContent: {
    ...styles.scrollContent,
    paddingTop: 10, // 상단 여백 추가
  },
  header: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dropdownIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
};

// 모달 관련 스타일
const modalStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#059669', // 앱 테마 색상 적용
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    fontSize: 16,
    color: 'white',
    padding: 5,
  },
  // 리스트 컨테이너에 패딩 추가
  listContainer: {
    paddingBottom: 10,
  },
  itemButton: {
    padding: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  itemText: {
    fontSize: 16,
    color: '#333',
  },
  // 선택 효과를 위한 스타일
  selectedItemButton: {
    backgroundColor: '#f5f5f5',
  },
  selectedItemText: {
    color: '#059669',
    fontWeight: 'bold',
  },
  // 애니메이션을 위한 스타일
  fadeIn: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  fadeOut: {
    opacity: 0,
    transform: [{ scale: 0.9 }],
  },
});

const { width } = Dimensions.get('window');

// 서버 API URL
const WASTE_API_URL = "https://refresh-f5-server.o-r.kr/api/pickup/waste/type-list";
// YOLO 서버 URL을 실제 서버 URL로 설정 (배포 시 변경 필요)
const WASTE_DETECTION_API_URL = "https://yolo.o-r.kr/api/detect-waste";
// const WASTE_DETECTION_API_URL = "http://192.168.0.2:8080/api/detect-waste";

const PickupRequestPage = () => {
  const navigation = useNavigation();
  const [currentScreen, setCurrentScreen] = useState(1);
  const [slideDirection, setSlideDirection] = useState("none");
  const [isOpen, setIsOpen] = useState(false); // 주소검색 모달 상태 추가

  // 애니메이션 값 추가
  const slideAnim = useState(new Animated.Value(0))[0];

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Second screen state with default user data
  const [userData, setUserData] = useState("");

  // 카메라 및 분석 관련 상태
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraType, setCameraType] = useState(0); // 0: 후면, 1: 전면
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognizedItems, setRecognizedItems] = useState([]);
  const [capturedImage, setCapturedImage] = useState(null);
  const cameraRef = useRef(null);

  // 폐기물 관련 state
  const [wasteTypes, setWasteTypes] = useState({}); // 전체 폐기물 타입 데이터
  const [modalVisible, setModalVisible] = useState(false); // 폐기물 선택 모달 상태
  const [selectedItems, setSelectedItems] = useState([]); // 선택된 폐기물 목록
  const [currentItems, setCurrentItems] = useState([]); // 현재 모달에 표시할 아이템 목록
  const [currentCategory, setCurrentCategory] = useState(""); // 현재 선택된 카테고리
  const [currentWaste, setCurrentWaste] = useState({ // 현재 선택된 폐기물 정보
    category: "",
    item: null,
    quantity: 1
  });
  const [totalPrice, setTotalPrice] = useState(0);

  // 주소 검색 완료 핸들러 추가
  const completeHandler = (data) => {
    setUserData(prev => ({
      ...prev,
      postalCode: data.zonecode,
      roadNameAddress: data.roadAddress
    }));
    setIsOpen(false);
  };

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const email = await AsyncStorage.getItem('email');
        const token = await AsyncStorage.getItem('token');

        if (!email || !token) {
          console.error('이메일 또는 토큰이 없습니다.');
          return;
        }

        const response = await fetch(`https://refresh-f5-server.o-r.kr/api/account/search-account/${email}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 200) {
          const data = await response.json();
          setUserData({
            name: data.name,
            phoneNumber: data.phoneNumber,
            email: email,
            postalCode: data.postalCode || '',
            roadNameAddress: data.roadNameAddress || '',
            detailedAddress: data.detailedAddress || ''
          });
        } else {
          console.error('사용자 정보를 가져오는데 실패했습니다.');
        }
      } catch (error) {
        console.error('API 호출 중 에러 발생:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleBack = () => {
    navigation.replace('WebView', {
      targetUrl: 'https://refresh-f5.store'
    });
  };

  const handleHome = () => {
    navigation.replace('WebView', {
      targetUrl: 'https://refresh-f5.store'
    });
  };

  // 폐기물 타입 데이터 불러오기
  useEffect(() => {
    const fetchWasteTypes = async () => {
      try {
        const response = await fetch(WASTE_API_URL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setWasteTypes(data);
      
        }
      } catch (error) {
        console.error('폐기물 타입 데이터 로드 실패:', error);
      }
    };

    fetchWasteTypes();
  }, []);

  // 카메라 권한 요청 및 처리
  const handleOpenCamera = async () => {
    try {
      // CameraView를 사용할 때는 직접 권한 확인을 별도로 해야 함
      const { status } = await Camera.Camera.requestCameraPermissionsAsync();
      
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          '카메라 권한 필요',
          '폐기물 촬영을 위해 카메라 접근 권한이 필요합니다.',
          [
            { text: '취소', style: 'cancel' },
            { 
              text: '설정으로 이동', 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
        return;
      }
      
      // 권한이 허용된 경우만 카메라 열기
      setCameraVisible(true);
      console.log('카메라 모달 열림');
    } catch (error) {
      console.error("카메라 열기 실패:", error);
      
      // 오류가 발생해도 카메라를 시도해 볼 수 있도록 함
      console.log("권한 확인 실패, 카메라 사용 시도...");
      setCameraVisible(true);
    }
  };

  // 이미지 캡처 및 분석
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setCapturedImage(photo.uri);
      setCameraVisible(false);
      
      // 이미지 분석 시작
      analyzeImage(photo.uri);
    } catch (e) {
      console.error("사진 촬영 오류:", e);
      Alert.alert('오류', '사진 촬영 중 오류가 발생했습니다.');
    }
  };

  // 이미지 분석 함수 - YOLO 서버 API 사용
  const analyzeImage = async (uri) => {
    setIsAnalyzing(true);

    try {
      console.log("폐기물 인식 시작...");
      
      // 이미지 리사이징 및 압축 (서버 전송 최적화)
      const resizedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 600, height: 600 } }], // 크기를 더 작게 조정
        { format: 'jpeg', base64: true, compress: 0.5 } // 압축률 50%로 설정
      );
      
      console.log("이미지 리사이징 완료");

      // FormData 준비
      const formData = new FormData();
      formData.append('image', resizedImage.base64);

      // 서버에 이미지 전송 및 분석 요청
      const response = await fetch(WASTE_DETECTION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.mapped_items && result.mapped_items.length > 0) {
        console.log("서버 인식 결과:", result);
        
        // 인식된 아이템 설정
        setRecognizedItems(result.mapped_items);
      } else {
        console.log("인식 결과 없음 또는 오류:", result);
        
        // 사용자에게 알림
        Alert.alert(
          "인식 실패", 
          "폐기물을 인식하지 못했습니다. 다시 시도하거나 직접 선택해주세요.",
          [{ text: "확인" }]
        );
        
        // 인식된 아이템 초기화
        setRecognizedItems([]);
      }
      
    } catch (error) {
      console.error("이미지 분석 실패:", error);
      
      // 사용자에게 오류 알림
      Alert.alert(
        "분석 실패", 
        "이미지 분석 중 오류가 발생했습니다. 다시 시도하거나 직접 선택해주세요.",
        [{ text: "확인" }]
      );
      
      // 인식된 아이템 초기화
      setRecognizedItems([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 인식된 아이템 추가 함수
  const addRecognizedItems = () => {
    if (recognizedItems.length === 0) return;
    
    // 인식된 항목을 선택된 항목 목록에 추가
    setSelectedItems(prev => [...prev, ...recognizedItems]);
    
    // 총 금액 업데이트
    const additionalPrice = recognizedItems.reduce(
      (sum, item) => sum + item.totalPrice, 0
    );
    setTotalPrice(prev => prev + additionalPrice);
    
    // 추가 후 인식된 항목 목록 및 캡처된 이미지 초기화
    setRecognizedItems([]);
    setCapturedImage(null);
    
    // 사용자에게 알림
    Alert.alert("알림", "인식된 폐기물이 추가되었습니다.");
  };

  // 수량 변경 핸들러
  const handleQuantityChange = (value) => {
    setCurrentWaste(prev => ({
      ...prev,
      quantity: Math.max(1, value) // 최소 1개/kg 보장
    }));
  };

  // 폐기물 추가 핸들러
  const handleAddWaste = () => {
    if (!currentWaste.item) return;

    const newItem = {
      ...currentWaste.item,
      category: currentWaste.category,  // 카테고리 정보 추가
      quantity: currentWaste.quantity,
      totalPrice: currentWaste.item.price * currentWaste.quantity
    };

    setSelectedItems(prev => [...prev, newItem]);
    setTotalPrice(prev => prev + newItem.totalPrice);
    
    // 사용자에게 알림
    Alert.alert("알림", "폐기물이 추가되었습니다.");
  };

  // 폐기물 삭제 핸들러
  const handleRemoveWaste = (index) => {
    const removedItem = selectedItems[index];
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
    setTotalPrice(prev => prev - removedItem.totalPrice);
  };

  // 캘린더 관련 함수들
  const generateCalendarDates = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const dates = [];
    for (let i = 0; i < firstDay; i++) {
        dates.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        dates.push(new Date(currentYear, currentMonth, i));
    }

    return dates;
  };

  // timeSlots 객체
  const timeSlots = {
    morning: [
      { display: "06:00", minutes: 360 },
      { display: "06:30", minutes: 390 },
      { display: "07:00", minutes: 420 },
      { display: "07:30", minutes: 450 },
      { display: "08:00", minutes: 480 },
      { display: "08:30", minutes: 510 },
      { display: "09:00", minutes: 540 },
      { display: "09:30", minutes: 570 },
      { display: "10:00", minutes: 600 },
      { display: "10:30", minutes: 630 },
      { display: "11:00", minutes: 660 },
      { display: "11:30", minutes: 690 }
    ],
    afternoon: [
      { display: "12:00", minutes: 720 },
      { display: "12:30", minutes: 750 },
      { display: "13:00", minutes: 780 },
      { display: "13:30", minutes: 810 },
      { display: "14:00", minutes: 840 },
      { display: "14:30", minutes: 870 },
      { display: "15:00", minutes: 900 },
      { display: "15:30", minutes: 930 },
      { display: "16:00", minutes: 960 },
      { display: "16:30", minutes: 990 },
      { display: "17:00", minutes: 1020 },
      { display: "17:30", minutes: 1050 }
    ]
  };

  const handleNextScreen = () => {
    if (currentScreen === 1) {
      if (!selectedDate || selectedTime === null) {
        Alert.alert("알림", "날짜와 시간을 선택해주세요.");
        return;
      }
    } else if (currentScreen === 2) {
      if (!userData.name || !userData.phoneNumber || !userData.roadNameAddress) {
        Alert.alert("알림", "모든 필수 정보를 입력해주세요.");
        return;
      }
    } else if (currentScreen === 3) {
      if (selectedItems.length === 0) {
        Alert.alert("알림", "최소 하나 이상의 폐기물을 선택해주세요.");
        return;
      }
      
      // 데이터를 PickupResultPage로 직접 넘기기
      navigation.navigate('PickupResult', {
        selectedDate,
        selectedTime,
        userData,
        selectedItems,
        totalPrice
      });
      return;
    }
    // 애니메이션 효과로 슬라이드 처리
    Animated.timing(slideAnim, {
      toValue: -width,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setCurrentScreen(prev => prev + 1);
      slideAnim.setValue(0);
    });
  };

  const handlePrevScreen = () => {
    // 애니메이션 효과로 슬라이드 처리
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setCurrentScreen(prev => prev - 1);
      slideAnim.setValue(0);
    });
  };

  const handleInputChange = (field, value) => {
    if (field !== 'email') {
      setUserData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
  };

  const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // 시간 표시를 위한 유틸리티 함수
  const formatTimeDisplay = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // 인식된 폐기물 렌더링
  const renderRecognizedItems = () => {
    if (recognizedItems.length === 0) return null;
    
    return (
      <View style={extendedStyles.recognizedItemsContainer}>
        <Text style={extendedStyles.recognizedItemsHeader}>인식된 폐기물</Text>
        
        {/* 촬영한 이미지 표시 */}
        {capturedImage && (
          <View style={extendedStyles.capturedImageContainer}>
            <Image 
              source={{ uri: capturedImage }} 
              style={extendedStyles.capturedImageSmall}
              resizeMode="contain"
            />
          </View>
        )}
        
        {/* 인식된 폐기물 정보 */}
        {recognizedItems.map((item, index) => (
          <View key={index} style={extendedStyles.recognizedItem}>
            <View style={extendedStyles.recognizedItemHeader}>
              <Text style={extendedStyles.recognizedItemType}>
                {item.type} {item.description && `(${item.description})`}
              </Text>
              {item.confidence && (
                <Text style={extendedStyles.confidenceText}>정확도: {item.confidence}%</Text>
              )}
            </View>
            <View style={extendedStyles.recognizedItemDetails}>
              <Text>
                {item.quantity}
                {item.category === "재활용품" ? "kg" : "개"} x {item.price.toLocaleString()}원
              </Text>
              <Text style={extendedStyles.recognizedItemPrice}>
                {item.totalPrice.toLocaleString()}원
              </Text>
            </View>
          </View>
        ))}
        
        <TouchableOpacity
          style={extendedStyles.addRecognizedButton}
          onPress={addRecognizedItems}
        >
          <Text style={extendedStyles.addRecognizedButtonText}>인식된 폐기물 추가</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 폐기물 선택 모달 렌더링
  const renderWastePickerModal = () => (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={modalStyles.modalContainer}>
        <View style={modalStyles.modalContent}>
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle}>폐기물 선택</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={modalStyles.closeButton}>닫기</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={currentItems}
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={modalStyles.itemButton}
                onPress={() => {
                  // 아이템 선택 시 currentWaste 업데이트
                  setCurrentWaste(prev => ({
                    ...prev,
                    category: currentCategory,
                    item: item
                  }));
                  // 모달 닫기
                  setModalVisible(false);
                }}
              >
                <Text style={modalStyles.itemText}>
                  {item.type} {item.description || ''}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  // 카메라 모달 렌더링 함수
  const renderCameraModal = () => (
    <Modal
      visible={cameraVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setCameraVisible(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
        <View style={{ flex: 1 }}>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1, width: '100%', height: '100%' }}
            facing={cameraType}
            onCameraReady={() => console.log('카메라 준비됨')}
          >
            <View style={{ 
              position: 'absolute', 
              bottom: 30, 
              left: 0, 
              right: 0, 
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center'
            }}>
              <TouchableOpacity 
                onPress={() => setCameraVisible(false)}
                style={{
                  padding: 15,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  borderRadius: 30
                }}
              >
                <Text style={{ color: 'white', fontSize: 16 }}>닫기</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleCapture}
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  backgroundColor: 'white',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <View style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: '#059669',
                  borderWidth: 2,
                  borderColor: 'white'
                }} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setCameraType(cameraType === 0 ? 1 : 0)}
                style={{
                  padding: 15,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  borderRadius: 30
                }}
              >
                <Text style={{ color: 'white', fontSize: 16 }}>전환</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // 화면 렌더링 - 캘린더
  const renderCalendarScreen = () => (
    <View style={extendedStyles.calendarSection}>
      <View style={extendedStyles.instruction}>
        <Text style={extendedStyles.iconText}>📅</Text>
        <Text style={extendedStyles.instructionText}>수거 날짜와 시간을 선택해 주세요</Text>
      </View>

      {/* 선택된 날짜와 시간 표시 섹션 */}
      {(selectedDate || selectedTime !== null) && (
        <View style={extendedStyles.selectedDatetime}>
          <Text style={extendedStyles.selectedLabel}>선택된 일시:</Text>
          <Text style={extendedStyles.selectedValue}>
            {selectedDate?.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            {selectedTime !== null ? ` ${formatTimeDisplay(selectedTime)}` : ''}
          </Text>
        </View>
      )}

      <View style={extendedStyles.calendarHeader}>
        <Text style={extendedStyles.calendarTitle}>
          {currentYear}.{currentMonth + 1}
        </Text>
        <View style={extendedStyles.arrowContainer}>
          <TouchableOpacity onPress={handlePrevMonth}>
            <Text style={extendedStyles.arrowIcon}>◀️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNextMonth}>
            <Text style={extendedStyles.arrowIcon}>▶️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={extendedStyles.calendarGrid}>
        {["일", "월", "화", "수", "목", "금", "토"].map(day => (
          <View key={day} style={extendedStyles.calendarDayHeader}>
            <Text style={extendedStyles.dayHeaderText}>{day}</Text>
          </View>
        ))}
        {generateCalendarDates().map((date, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              extendedStyles.calendarDate,
              isToday(date) && extendedStyles.today,
              date && selectedDate && date.getDate() === selectedDate.getDate() &&
                date.getMonth() === selectedDate.getMonth() && extendedStyles.selected,
                isPastDate(date) && extendedStyles.pastDate,
              !date && extendedStyles.emptyDate
            ]}
            onPress={() => date && !isPastDate(date) && setSelectedDate(date)}
            disabled={!date || isPastDate(date)}
          >
            <Text style={[
              extendedStyles.dateText,
              isPastDate(date) && extendedStyles.pastDateText,
              date && selectedDate && date.getDate() === selectedDate.getDate() &&
                date.getMonth() === selectedDate.getMonth() && extendedStyles.selectedText
            ]}>
              {date?.getDate()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={extendedStyles.timeSection}>
        <Text style={extendedStyles.timeSectionTitle}>오전</Text>
        <View style={extendedStyles.timeGrid}>
          {timeSlots.morning.map(slot => (
            <TouchableOpacity
              key={slot.display}
              style={[
                extendedStyles.timeSlot,
                selectedTime === slot.minutes && extendedStyles.selectedTime
              ]}
              onPress={() => setSelectedTime(slot.minutes)}
            >
              <Text style={[
                extendedStyles.timeText,
                selectedTime === slot.minutes && extendedStyles.selectedTimeText
              ]}>
                {slot.display}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={extendedStyles.timeSectionTitle}>오후</Text>
        <View style={extendedStyles.timeGrid}>
          {timeSlots.afternoon.map(slot => (
            <TouchableOpacity
              key={slot.display}
              style={[
                extendedStyles.timeSlot,
                selectedTime === slot.minutes && extendedStyles.selectedTime
              ]}
              onPress={() => setSelectedTime(slot.minutes)}
            >
              <Text style={[
                extendedStyles.timeText,
                selectedTime === slot.minutes && extendedStyles.selectedTimeText
              ]}>
                {slot.display}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // 화면 렌더링 - 사용자 정보 폼
  const renderFormScreen = () => (
    <View style={extendedStyles.formSection}>
      <View style={extendedStyles.instruction}>
        <View style={extendedStyles.svgIcon}>
          <Text style={extendedStyles.iconText}>📄</Text>
        </View>
        <Text style={extendedStyles.instructionText}>신청자 정보를 확인해 주세요</Text>
      </View>

      <View style={extendedStyles.formGroup}>
        <Text style={extendedStyles.formLabel}>이름</Text>
        <TextInput
          value={userData.name}
          onChangeText={(text) => handleInputChange('name', text)}
          style={extendedStyles.formInput}
          placeholder="이름을 입력해주세요."
        />
      </View>

      <View style={extendedStyles.formGroup}>
        <Text style={extendedStyles.formLabel}>연락처</Text>
        <TextInput
          value={userData.phoneNumber}
          onChangeText={(text) => handleInputChange('phoneNumber', text)}
          style={extendedStyles.formInput}
          placeholder="연락처를 입력해주세요."
          keyboardType="phone-pad"
        />
      </View>

      <View style={extendedStyles.formGroup}>
        <Text style={extendedStyles.formLabel}>이메일</Text>
        <TextInput
          value={userData.email}
          editable={false}
          style={[extendedStyles.formInput, extendedStyles.disabledInput]}
        />
      </View>

      <View style={extendedStyles.formGroup}>
        <Text style={extendedStyles.formLabel}>수거지 주소</Text>
        <View style={extendedStyles.postalCodeGroup}>
          <TextInput
            value={userData.postalCode}
            style={[extendedStyles.formInput, extendedStyles.postalCodeInput]}
            onChangeText={(text) => handleInputChange('postalCode', text)}
            placeholder="우편번호"
            editable={false}
          />
          <TouchableOpacity
            style={extendedStyles.postalCodeButton}
            onPress={() => setIsOpen(true)}
          >
            <Text style={extendedStyles.postalCodeButtonText}>주소 검색</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          value={userData.roadNameAddress}
          onChangeText={(text) => handleInputChange('roadNameAddress', text)}
          style={[extendedStyles.formInput, extendedStyles.marginTop]}
          placeholder="주소를 입력해주세요."
          editable={false}
        />
        <TextInput
          value={userData.detailedAddress}
          onChangeText={(text) => handleInputChange('detailedAddress', text)}
          style={[extendedStyles.formInput, extendedStyles.marginTop, extendedStyles.textArea]}
          placeholder="상세주소와 함께 추가 요청사항을 작성해주세요."
          multiline={true}
          numberOfLines={4}
        />
      </View>
    </View>
  );

  // 화면 렌더링 - 폐기물 선택
  const renderWasteScreen = () => (
    <View style={extendedStyles.wasteSection}>
      <View style={extendedStyles.instruction}>
        <View style={extendedStyles.svgIcon}>
          <Text style={extendedStyles.iconText}>🗑️</Text>
        </View>
        <Text style={extendedStyles.instructionText}>폐기물 종류를 선택해 주세요</Text>
      </View>

      {/* 카메라로 폐기물 인식 버튼 */}
      <TouchableOpacity
        style={extendedStyles.cameraButton}
        onPress={handleOpenCamera}
      >
        <Text style={extendedStyles.cameraButtonText}>📷 사진으로 폐기물 인식</Text>
      </TouchableOpacity>

      {/* 안내 메시지 */}
      <View style={extendedStyles.guidanceContainer}>
        <Text style={extendedStyles.guidanceTitle}>⚠️ 안내사항</Text>
        <Text style={extendedStyles.guidanceText}>
          - 카메라로 폐기물을 가까이에서 찍어주세요.
          - 밝은 곳에서 촬영하면 인식률이 높아집니다.
          - 인식 결과가 부정확한 경우 직접 폐기물을 선택해주세요.
          - 여러 폐기물은 한 번에 하나씩 촬영해주세요.
        </Text>
      </View>

      {/* 분석 중 로딩 표시 */}
      {isAnalyzing && (
        <View style={extendedStyles.analyzingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={extendedStyles.analyzingText}>폐기물을 분석하고 있습니다...</Text>
        </View>
      )}

      {/* 인식된 폐기물 표시 */}
      {renderRecognizedItems()}

      {/* 폐기물 카테고리 선택 */}
      <ScrollView style={extendedStyles.wasteScrollView}
       keyboardShouldPersistTaps="handled">
        {Object.entries(wasteTypes).map(([category, items]) => (
          <View key={category} style={extendedStyles.wasteCategory}>
            <TouchableOpacity
              style={extendedStyles.categoryHeader}
              onPress={() => {
                // 이미 열린 카테고리를 다시 클릭하면 닫기
                if (currentWaste.category === category) {
                  setCurrentWaste(prev => ({
                    ...prev,
                    category: "",
                    item: null
                  }));
                } else {
                  setCurrentWaste(prev => ({
                    ...prev,
                    category,
                    item: items[0]
                  }));
                }
              }}
            >
              <Text style={extendedStyles.categoryText}>{category}({items.length})</Text>
              <Text style={extendedStyles.arrowIcon}>
                {currentWaste.category === category ? '⬇️' : '▶️'}
              </Text>
            </TouchableOpacity>

            {currentWaste.category === category && (
              <View style={extendedStyles.wasteDetails}>
               <View style={extendedStyles.wasteSelectGroup}>
                <TouchableOpacity
                  style={extendedStyles.pickerButton}
                  onPress={() => {
                    // 현재 카테고리의 아이템 목록 설정
                    setCurrentItems(items);
                    // 현재 카테고리 저장
                    setCurrentCategory(category);
                    // 모달 열기
                    setModalVisible(true);
                  }}
                >
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    width: '100%' 
                  }}>
                    <Text style={extendedStyles.pickerButtonText}>
                      {currentWaste.item ? `${currentWaste.item.type} ${currentWaste.item.description || ''}` : '폐기물 선택'}
                    </Text>
                    <Text style={extendedStyles.dropdownIcon}>⬇️</Text>
                  </View>
                </TouchableOpacity>
              </View>

                <View style={extendedStyles.quantityGroup}>
                  <View style={extendedStyles.quantityControl}>
                    <TextInput
                      keyboardType="numeric"
                      value={currentWaste.quantity.toString()}
                      onChangeText={(text) => handleQuantityChange(parseInt(text) || 1)}
                      style={extendedStyles.quantityInput}
                    />
                    <Text style={extendedStyles.quantityUnit}>
                      (단위: {currentWaste.category === "재활용품" ? "kg" : "개"})
                    </Text>
                  </View>
                  <Text style={extendedStyles.estimatedPrice}>
                    예상 금액: {currentWaste.item ? (currentWaste.item.price * currentWaste.quantity).toLocaleString() : 0}원
                  </Text>
                  <TouchableOpacity
                    style={extendedStyles.addButton}
                    onPress={handleAddWaste}
                  >
                    <Text style={extendedStyles.addButtonText}>추가하기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}

        {/* 선택된 폐기물 목록 */}
        <View style={extendedStyles.selectedItems}>
          <Text style={extendedStyles.selectedItemsHeader}>선택한 폐기물</Text>
          {selectedItems.length === 0 ? (
            <Text style={extendedStyles.noItems}>현재 선택한 폐기물이 없습니다.</Text>
          ) : (
            selectedItems.map((item, index) => (
              <View key={index} style={extendedStyles.selectedItem}>
                <Text style={extendedStyles.selectedItemText}>
                  {item.type} {item.description && `(${item.description})`} - {item.quantity}{item.category === "재활용품" ? "kg" : "개"} : {item.totalPrice.toLocaleString()}원
                </Text>
                <TouchableOpacity onPress={() => handleRemoveWaste(index)}>
                  <Text style={extendedStyles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* 총 예상 금액 */}
        <View style={extendedStyles.total}>
          <Text style={extendedStyles.totalPrice}>
            총 예상 금액: {totalPrice.toLocaleString()}원
          </Text>
          <Text style={extendedStyles.priceNote}>
            *실제 결제 금액은 예상 금액과 다를 수 있습니다.
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={extendedStyles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={extendedStyles.mainContainer}>
        {/* 헤더 추가 */}
        <View style={result.header}>
          <TouchableOpacity style={result.backButton} onPress={handleBack}>
            <Text style={result.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={result.headerTitle}>수거 신청하기</Text>
          <TouchableOpacity style={result.homeButton} onPress={handleHome}>
            <Text style={result.homeButtonText}>🏠</Text>
          </TouchableOpacity>
        </View>
        <Animated.View style={[
          extendedStyles.content,
          {transform: [{translateX: slideAnim}]}
        ]}>
          <ScrollView contentContainerStyle={extendedStyles.scrollContent}>
            {currentScreen === 1 ? renderCalendarScreen() : 
             currentScreen === 2 ? renderFormScreen() : 
             renderWasteScreen()}
          </ScrollView>
        </Animated.View>

        <View style={extendedStyles.footerContainer}>
          {currentScreen > 1 && (
            <TouchableOpacity 
              onPress={handlePrevScreen} 
              style={extendedStyles.prevButton}
            >
              <Text style={extendedStyles.prevButtonText}>이전으로</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNextScreen}
            style={[
              extendedStyles.nextButton,
              currentScreen > 1 && extendedStyles.withPrev
            ]}
          >
            <Text style={extendedStyles.nextButtonText}>다음으로 ({currentScreen}/3)</Text>
          </TouchableOpacity>
        </View>

        {/* 폐기물 선택 모달 */}
        {renderWastePickerModal()}

        {/* 주소 검색 모달 */}
        <Modal
          visible={isOpen}
          animationType="slide"
          transparent={true}
        >
          <View style={extendedStyles.modalContainer}>
            <View style={extendedStyles.modalContent}>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={extendedStyles.closeButton}
              >
                <Text style={extendedStyles.closeButtonText}>닫기</Text>
              </TouchableOpacity>
              <View style={extendedStyles.postcodeContainer}>
                <Postcode
                  onSelected={completeHandler}
                  style={extendedStyles.postcode}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* 카메라 모달 */}
        {renderCameraModal()}
      </View>
    </SafeAreaView>
  );
};

export default PickupRequestPage;
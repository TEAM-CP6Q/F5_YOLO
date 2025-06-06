import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import result from '../styles/PickupResultStyle';

const PickupResultPage = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { selectedDate, selectedTime, userData, selectedItems, totalPrice } = route.params;

  // 시간 포맷팅 함수
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // 날짜 표시용 포맷팅
  const formattedDisplayDate = `${selectedDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })} ${formatTime(selectedTime)}`;

  const handleSubmit = async () => {
    try {
      const hours = Math.floor(selectedTime / 60);
      const minutes = selectedTime % 60;
      
      // YYYY-MM-DD HH:mm:ss 형식으로 포맷팅
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDateTime = `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

      const requestData = {
        Info: {
          notes: "",
          pricePreview: totalPrice,
          pickupDate: formattedDateTime
        },
        Address: {
          name: userData.name,
          email: userData.email,
          phone: userData.phoneNumber,
          postalCode: userData.postalCode || "000000",
          roadNameAddress: userData.roadNameAddress,
          detailedAddress: userData.detailedAddress
        },
        Details: selectedItems
          .filter(item => item.id !== undefined)
          .map(item => ({
            wasteId: item.id,
            weight: item.quantity,
            pricePreview: item.totalPrice
          }))
      };
      

      console.log('Request Data:', requestData);

      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch('https://refresh-f5-server.o-r.kr/api/pickup/new-pickup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '수거 신청에 실패했습니다.');
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      // 웹뷰로 이동하면서 complete 페이지로 이동
      navigation.navigate('PickupComplete', {
        pickupId: result.pickupId,
        name: result.name,
        email: result.email
      });
      

    } catch (error) {
      console.error('수거 신청 실패:', error);
      Alert.alert('오류', '수거 신청 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleHome = () => {
    navigation.replace('WebView', {
      targetUrl: 'https://refresh-f5.store'
    });
  };

  return (
    <SafeAreaView style={result.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* 헤더 */}
      <View style={result.header}>
        <TouchableOpacity style={result.backButton} onPress={handleBack}>
          <Text style={result.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={result.headerTitle}>수거 신청하기</Text>
        <TouchableOpacity style={result.homeButton} onPress={handleHome}>
          <Text style={result.homeButtonText}>🏠</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={result.content}>
        <View style={result.card}>
          {/* 타이틀 섹션 */}
          <View style={result.sectionHeader}>
            <Text style={result.sectionIcon}>📄</Text>
            <Text style={result.sectionTitle}>신청 정보를 확인해주세요</Text>
          </View>

          {/* 신청자 정보 섹션 */}
          <View style={result.section}>
            <Text style={result.subsectionTitle}>신청자 정보</Text>
            <View style={result.grid}>
              <View style={result.gridRow}>
                <Text style={result.label}>이름</Text>
                <Text style={result.value}>{userData.name}</Text>
              </View>
              <View style={result.gridRow}>
                <Text style={result.label}>연락처</Text>
                <Text style={result.value}>{userData.phoneNumber}</Text>
              </View>
              <View style={result.gridRow}>
                <Text style={result.label}>이메일</Text>
                <Text style={result.value}>{userData.email}</Text>
              </View>
            </View>
          </View>

          {/* 수거 정보 섹션 */}
          <View style={result.section}>
            <Text style={result.subsectionTitle}>수거 정보</Text>
            <View style={result.grid}>
              <View style={result.gridRow}>
                <Text style={result.label}>수거 주소</Text>
                <View style={result.address}>
                  <Text style={result.value}>{userData.roadNameAddress}</Text>
                  <Text style={result.addressDetail}>{userData.detailedAddress}</Text>
                </View>
              </View>
              <View style={result.gridRow}>
                <Text style={result.label}>수거 날짜 및 시간</Text>
                <Text style={result.value}>
                  {formattedDisplayDate}
                </Text>
              </View>
              <View style={result.gridRow}>
                <Text style={result.label}>수거 예상 금액</Text>
                <Text style={result.price}>
                  {totalPrice.toLocaleString()}원
                </Text>
              </View>
            </View>
          </View>

          {/* 폐기물 정보 섹션 */}
          <View style={result.section}>
            <Text style={result.subsectionTitle}>폐기물 정보</Text>
            <View style={result.wasteList}>
              {selectedItems.map((item, index) => (
                <View
                  key={index}
                  style={result.wasteItem}
                >
                  <View style={result.wasteInfo}>
                    <Text style={result.wasteType}>
                      {item.type} {item.description && `(${item.description})`}
                    </Text>
                    <Text style={result.wasteQuantity}>
                      {item.quantity}{item.category === "재활용품" ? "kg" : "개"}
                    </Text>
                  </View>
                  <Text style={result.wastePrice}>
                    {item.totalPrice.toLocaleString()}원
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={result.submitButton}
          onPress={handleSubmit}
        >
          <Text style={result.submitButtonText}>신청하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PickupResultPage;
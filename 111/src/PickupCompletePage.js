// PickupCompletePage.js (React Native 버전)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CheckCircle, Home } from 'react-native-feather'; // lucide-react는 React Native에서 사용 안됨

const PickupCompletePage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { pickupId, name, email } = route.params || {};

  const handleHome = () => {
    navigation.replace('WebView', {
      targetUrl: 'https://refresh-f5.store'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>쓰레기 수거 신청 완료</Text>
        <Home 
          style={styles.homeIcon} 
          onPress={() => navigation.navigate('Home')} 
        />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <CheckCircle style={styles.successIcon} />
          <Text style={styles.subtitle}>
            수거 신청이 성공적으로{"\n"}접수되었습니다.
          </Text>
          <Text style={styles.description}>곧바로 수거를 준비하겠습니다.</Text>

          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>신청 번호</Text>
              <Text style={styles.infoValue}>{pickupId}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>신청자</Text>
              <Text style={styles.infoValue}>{name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>이메일</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.homeButton}  onPress={handleHome}>
            <Text style={styles.homeButtonText}>홈으로</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  homeIcon: {
    width: 24,
    height: 24,
    color: '#64748b',
  },
  content: {
    marginTop: 24,
    maxWidth: 760,
    // marginHorizontal: 'auto',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  successIcon: {
    width: 64,
    height: 64,
    color: '#16a34a',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
  },
  description: {
    color: '#64748b',
    marginBottom: 32,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    marginVertical: 24,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 16,
  },
  infoValue: {
    color: '#1e293b',
    fontWeight: '600',
    fontSize: 16,
  },
  homeButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default PickupCompletePage;

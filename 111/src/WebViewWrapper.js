import React from 'react';
import { Platform, SafeAreaView, StyleSheet, StatusBar, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';

const WebViewWrapper = () => {
  const navigation = useNavigation();

  const handleNavigationChange = (navState) => {
    const url = navState.url;
    console.log("현재 URL:", url);

    if (url.includes('/pickup-request')) {
      navigation.replace('pickupMain');
    }
  };

  return (
    <View style={styles.fullscreen}>
      {/* StatusBar 색 설정 (선택 사항) */}
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* 상단 여백을 위한 SafeArea + Android 패딩 */}
      <SafeAreaView style={styles.safeArea}>
        <WebView
          source={{ uri: 'https://refresh-f5.store' }}
          onNavigationStateChange={handleNavigationChange}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    </View>
  );
};

export default WebViewWrapper;

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});

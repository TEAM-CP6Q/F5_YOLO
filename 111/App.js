// import React, { useEffect, useRef } from 'react';
// import { View, Text, StyleSheet, Platform, SafeAreaView, StatusBar, BackHandler, Alert } from 'react-native';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { WebView } from 'react-native-webview';
// import PickupRequestPage from './src/PickupRequestPage';
// import PickupResultPage from './src/PickupResultPage';
// import PickupCompletePage from './src/PickupCompletePage';

// const Stack = createNativeStackNavigator();

// // 전역 오류 핸들러 설정
// if (!__DEV__) {
//   // 프로덕션 모드에서만 실행
//   const originalErrorHandler = ErrorUtils.getGlobalHandler();
  
//   ErrorUtils.setGlobalHandler((error, isFatal) => {
//     // 오류 정보를 Alert으로 표시
//     Alert.alert(
//       '앱 오류 발생',
//       `오류 메시지: ${error.message}\n\n스택: ${error.stack}`,
//       [{ text: 'OK' }]
//     );
    
//     // 원래 오류 핸들러 호출
//     originalErrorHandler(error, isFatal);
//   });
// }

// // WebView 화면 컴포넌트
// const WebViewScreen = ({ navigation }) => {
//   const webViewRef = useRef(null);
  
//   // 뒤로가기 버튼 처리
//   useEffect(() => {
//     const backAction = () => {
//       if (webViewRef.current) {
//         webViewRef.current.goBack();
//         return true;
//       }
//       return false;
//     };

//     const backHandler = BackHandler.addEventListener(
//       'hardwareBackPress',
//       backAction
//     );

//     return () => backHandler.remove();
//   }, []);
  
//   const handleNavigationChange = (navState) => {
//     try {
//       const url = navState.url;
//       console.log("현재 URL:", url);
//       if (url && url.includes('/pickup-request')) {
//         // setTimeout으로 약간의 지연 추가
//         setTimeout(() => {
//           try {
//             navigation.navigate('pickupMain');
//           } catch (navError) {
//             Alert.alert(
//               '네비게이션 전환 오류',
//               `오류: ${navError.message}`,
//               [{ text: 'OK' }]
//             );
//           }
//         }, 100);
//       }
//     } catch (error) {
//       Alert.alert(
//         'WebView 네비게이션 오류',
//         `오류 유형: ${error.name}\n메시지: ${error.message}`,
//         [{ text: 'OK' }]
//       );
//     }
//   };

//   return (
//     <View style={styles.fullscreen}>
//       <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
//       <SafeAreaView style={styles.safeArea}>
//         <WebView
//           ref={webViewRef}
//           source={{ uri: 'https://refresh-f5.store' }}
//           onNavigationStateChange={handleNavigationChange}
//           javaScriptEnabled={true}
//           domStorageEnabled={true}
//           cacheEnabled={true}
//           startInLoadingState={true}
//           renderLoading={() => (
//             <View style={styles.loader}>
//               <Text>로딩 중...</Text>
//             </View>
//           )}
//           onError={(syntheticEvent) => {
//             const { nativeEvent } = syntheticEvent;
//             Alert.alert(
//               'WebView 오류',
//               `코드: ${nativeEvent.code}\n설명: ${nativeEvent.description}`,
//               [{ text: 'OK' }]
//             );
//           }}
//           onHttpError={(syntheticEvent) => {
//             const { nativeEvent } = syntheticEvent;
//             if (nativeEvent.statusCode >= 400) {
//               Alert.alert(
//                 'HTTP 오류',
//                 `상태 코드: ${nativeEvent.statusCode}\nURL: ${nativeEvent.url}`,
//                 [{ text: 'OK' }]
//               );
//             }
//           }}
//           style={{ flex: 1 }}
//         />
//       </SafeAreaView>
//     </View>
//   );
// };

// // 스플래시 화면 컴포넌트
// const SplashScreen = ({ navigation }) => {
//   useEffect(() => {
//     try {
//       const timer = setTimeout(() => {
//         try {
//           navigation.replace('WebView');
//         } catch (error) {
//           Alert.alert(
//             '네비게이션 오류',
//             `오류: ${error.message}`,
//             [{ text: 'OK' }]
//           );
//         }
//       }, 2000);
      
//       return () => clearTimeout(timer);
//     } catch (error) {
//       Alert.alert(
//         'SplashScreen 오류',
//         `오류: ${error.message}`,
//         [{ text: 'OK' }]
//       );
//     }
//   }, [navigation]);
  
//   return (
//     <View style={styles.splashContainer}>
//       <Text style={styles.splashText}>REFRESH</Text>
//     </View>
//   );
// };

// const App = () => {
//   // 앱 오류 로깅 - Promise 관련 코드 제거
//   useEffect(() => {
//     console.log('App 컴포넌트 마운트됨');
    
//     return () => {
//       console.log('App 컴포넌트 언마운트됨');
//     };
//   }, []);

//   return (
//     <NavigationContainer
//       onStateChange={(state) => console.log('네비게이션 상태 변경:', state)}
//       fallback={<Text>Loading...</Text>}
//       onReady={() => console.log('네비게이션 준비 완료')}
//       onError={(error) => {
//         Alert.alert(
//           '네비게이션 컨테이너 오류',
//           `오류: ${error.message}`,
//           [{ text: 'OK' }]
//         );
//       }}
//     >
//       <Stack.Navigator 
//         initialRouteName="Splash"
//         screenOptions={{ 
//           headerShown: false,
//           animation: 'slide_from_right'
//         }}
//       >
//         <Stack.Screen 
//           name="Splash" 
//           component={SplashScreen} 
//           options={{ gestureEnabled: false }}
//         />
//         <Stack.Screen 
//           name="WebView" 
//           component={WebViewScreen} 
//           options={{ gestureEnabled: false }}
//         />
//         <Stack.Screen name="pickupMain" component={PickupRequestPage} />
//         <Stack.Screen name="PickupResult" component={PickupResultPage} />
//         <Stack.Screen name="PickupComplete" component={PickupCompletePage} />
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   splashContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//   },
//   splashText: {
//     fontSize: 48,
//     fontWeight: 'bold',
//     color: '#388e3c',
//   },
//   fullscreen: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   safeArea: {
//     flex: 1,
//     paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
//   },
//   loader: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
// });

// export default App;

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, SafeAreaView, StatusBar, BackHandler, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PickupRequestPage from './src/PickupRequestPage';
import PickupResultPage from './src/PickupResultPage';
import PickupCompletePage from './src/PickupCompletePage';

const Stack = createNativeStackNavigator();

// 전역 오류 핸들러 설정
if (!__DEV__) {
  // 프로덕션 모드에서만 실행
  const originalErrorHandler = ErrorUtils.getGlobalHandler();
  
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    // 오류 정보를 Alert으로 표시
    Alert.alert(
      '앱 오류 발생',
      `오류 메시지: ${error.message}\n\n스택: ${error.stack}`,
      [{ text: 'OK' }]
    );
    
    // 원래 오류 핸들러 호출
    originalErrorHandler(error, isFatal);
  });
}

// WebView 화면 컴포넌트
const WebViewScreen = ({ navigation }) => {
  const webViewRef = useRef(null);
  
  // 뒤로가기 버튼 처리
  useEffect(() => {
    const backAction = () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);
  
  // 웹뷰와 네이티브 간 통신을 위한 함수
  const onMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log("웹뷰로부터 메시지 수신:", data);
      
      if (data.type === 'userInfo') {
        // 로그인 정보를 AsyncStorage에 저장
        if (data.email) await AsyncStorage.setItem('email', data.email);
        if (data.token) await AsyncStorage.setItem('token', data.token);
        
        // 필요한 경우 다른 사용자 정보도 저장
        if (data.userData) {
          await AsyncStorage.setItem('userData', JSON.stringify(data.userData));
        }
        
        console.log('사용자 정보가 저장되었습니다.');
      }
    } catch (error) {
      console.error("웹뷰 메시지 처리 오류:", error);
    }
  };
  
  // URL 변경 처리 함수
  // const handleNavigationChange = (navState) => {
  //   try {
  //     const url = navState.url;
  //     console.log("현재 URL:", url);
      
  //     if (url && url.includes('/pickup-request')) {
  //       // 웹뷰에 메시지 요청 - 로그인 정보 요청
  //       webViewRef.current.injectJavaScript(`
  //         (function() {
  //           try {
  //             const userInfo = {
  //               type: 'userInfo',
  //               email: localStorage.getItem('email') || '',
  //               token: localStorage.getItem('token') || '',
  //               userData: JSON.parse(localStorage.getItem('userData') || '{}')
  //             };
  //             window.ReactNativeWebView.postMessage(JSON.stringify(userInfo));
  //           } catch (e) {
  //             console.error('정보 전송 오류:', e);
  //           }
  //           return true;
  //         })();
  //       `);
        
  //       // 약간의 지연 후 화면 전환
  //       setTimeout(() => {
  //         try {
  //           navigation.navigate('pickupMain');
  //         } catch (navError) {
  //           Alert.alert(
  //             '네비게이션 전환 오류',
  //             `오류: ${navError.message}`,
  //             [{ text: 'OK' }]
  //           );
  //         }
  //       }, 100); // 정보 전송을 위해 지연 시간 증가
  //     }
  //   } catch (error) {
  //     Alert.alert(
  //       'WebView 네비게이션 오류',
  //       `오류 유형: ${error.name}\n메시지: ${error.message}`,
  //       [{ text: 'OK' }]
  //     );
  //   }
  // };

  const handleNavigationChange = (navState) => {
    try {
      const url = navState.url;
      console.log("현재 URL:", url);
      
      if (url && url.includes('/pickup-request')) {
        // 웹뷰에 메시지 요청 - 로그인 정보 요청 (비동기 처리)
        webViewRef.current.injectJavaScript(`
          (function() {
            try {
              const userInfo = {
                type: 'userInfo',
                email: localStorage.getItem('email') || '',
                token: localStorage.getItem('token') || '',
                userData: JSON.parse(localStorage.getItem('userData') || '{}')
              };
              window.ReactNativeWebView.postMessage(JSON.stringify(userInfo));
            } catch (e) {
              console.error('정보 전송 오류:', e);
            }
            return true;
          })();
        `);
        
        // 지연 없이 바로 화면 전환
        navigation.navigate('pickupMain');
      }
    } catch (error) {
      Alert.alert(
        'WebView 네비게이션 오류',
        `오류 유형: ${error.name}\n메시지: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  // 웹뷰 초기화 스크립트
  const INJECTED_JAVASCRIPT = `
    (function() {
      window.isReactNativeWebView = true;
      
      // 로컬스토리지 변경 감지
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        
        // 로그인 관련 정보가 변경될 때 네이티브에 알림
        if (key === 'email' || key === 'token' || key === 'userData') {
          try {
            const userInfo = {
              type: 'userInfo',
              email: localStorage.getItem('email') || '',
              token: localStorage.getItem('token') || '',
              userData: JSON.parse(localStorage.getItem('userData') || '{}')
            };
            window.ReactNativeWebView.postMessage(JSON.stringify(userInfo));
          } catch(e) {
            console.error('Storage 변경 알림 오류:', e);
          }
        }
      };
      
      console.log('ReactNative WebView 초기화 완료');
      return true;
    })();
  `;

  return (
    <View style={styles.fullscreen}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaView style={styles.safeArea}>
        <WebView
          ref={webViewRef}
          source={{ uri: 'https://refresh-f5.store' }}
          onNavigationStateChange={handleNavigationChange}
   
          onMessage={onMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={true}
          startInLoadingState={true}
          injectedJavaScript={INJECTED_JAVASCRIPT}
        
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            Alert.alert(
              'WebView 오류',
              `코드: ${nativeEvent.code}\n설명: ${nativeEvent.description}`,
              [{ text: 'OK' }]
            );
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            if (nativeEvent.statusCode >= 400) {
              Alert.alert(
                'HTTP 오류',
                `상태 코드: ${nativeEvent.statusCode}\nURL: ${nativeEvent.url}`,
                [{ text: 'OK' }]
              );
            }
          }}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    </View>
  );
};

// 스플래시 화면 컴포넌트
const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    try {
      const timer = setTimeout(() => {
        try {
          navigation.replace('WebView');
        } catch (error) {
          Alert.alert(
            '네비게이션 오류',
            `오류: ${error.message}`,
            [{ text: 'OK' }]
          );
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    } catch (error) {
      Alert.alert(
        'SplashScreen 오류',
        `오류: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  }, [navigation]);
  
  return (
    <View style={styles.splashContainer}>
      <Text style={styles.splashText}>REFRESH</Text>
    </View>
  );
};

const App = () => {
  // 앱 오류 로깅
  useEffect(() => {
    console.log('App 컴포넌트 마운트됨');
    
    return () => {
      console.log('App 컴포넌트 언마운트됨');
    };
  }, []);

  return (
    <NavigationContainer
      onStateChange={(state) => console.log('네비게이션 상태 변경:', state)}
      fallback={<Text>Loading...</Text>}
      onReady={() => console.log('네비게이션 준비 완료')}
      onError={(error) => {
        Alert.alert(
          '네비게이션 컨테이너 오류',
          `오류: ${error.message}`,
          [{ text: 'OK' }]
        );
      }}
    >
      <Stack.Navigator 
        initialRouteName="Splash"
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen} 
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name="WebView" 
          component={WebViewScreen} 
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="pickupMain" component={PickupRequestPage} />
        <Stack.Screen name="PickupResult" component={PickupResultPage} />
        <Stack.Screen name="PickupComplete" component={PickupCompletePage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  splashText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#388e3c',
  },
  fullscreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
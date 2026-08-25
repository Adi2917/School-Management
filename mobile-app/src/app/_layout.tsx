import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/auth-context';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  useEffect(()=>{const open=(response:Notifications.NotificationResponse)=>{const data=response.notification.request.content.data as {eventType?:string;studentId?:string};if(data.eventType==='fee_updated')router.push(`/records?kind=fees${data.studentId?`&studentId=${data.studentId}`:''}` as never);else if(data.eventType==='result_updated')router.push(`/records?kind=results${data.studentId?`&studentId=${data.studentId}`:''}` as never);else if(data.eventType==='student_registered')router.push('/students' as never);else router.push('/records?kind=notices' as never)};const subscription=Notifications.addNotificationResponseReceivedListener(open);void Notifications.getLastNotificationResponseAsync().then(response=>response&&open(response));return()=>subscription.remove()},[]);
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('school-updates', {
      name:'School updates',importance:Notifications.AndroidImportance.HIGH,vibrationPattern:[0,250,150,250],lightColor:'#F4B93A',sound:'default',
    });
  }
  const current=await Notifications.getPermissionsAsync();
  const permission=current.status==='granted'?current:await Notifications.requestPermissionsAsync();
  if(permission.status!=='granted')return;
  const projectId=Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if(!projectId)return;
  const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;
  await api.registerPushToken(token,Platform.OS);
}

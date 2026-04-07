import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { enableScreens } from 'react-native-screens';
import Icon from 'react-native-vector-icons/Ionicons';

import Login from './src/screens/Login';
import Checkin from './src/screens/Checkin';
import History from './src/screens/History';

enableScreens(true);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs({ route }: any) {
  // userName is passed from Login → Home → forwarded to Checkin
  const userName = route?.params?.params?.userName ?? route?.params?.userName ?? 'User';

  return (
    <Tab.Navigator
      screenOptions={({ route: r }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Checkin: 'location-outline',
            History: 'time-outline',
          };

          return <Icon name={icons[r.name] || 'ellipse-outline'} size={size} color={color} />;
        },
      })}>
      <Tab.Screen
        name="Checkin"
        component={Checkin}
        initialParams={{ userName }}
      />
      <Tab.Screen name="History" component={History} />
    </Tab.Navigator>
  );
}

const App = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Home" component={HomeTabs} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default App;
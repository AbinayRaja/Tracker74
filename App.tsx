import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {enableScreens} from 'react-native-screens';

import Checkin from './src/screens/Checkin';
import Login from './src/screens/Login';
import Tracking from './src/screens/Tracking';

enableScreens(true);
const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Checkin" component={Checkin} />
        {/* <Stack.Screen name="Tracking" component={Tracking} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;

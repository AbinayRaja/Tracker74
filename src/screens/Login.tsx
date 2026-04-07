import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import styles from '../styles/loginStyles';

const Login = () => {
  const [name, setName] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const handleContinue = () => {
    if (!name.trim()) {
      Alert.alert('Please enter your name');
      return;
    }

    console.log('User Name:', name);

    navigation.replace('Home', {
      screen: 'Checkin',
      params: { userName: name },
    });
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome 👋</Text>
      <Text style={styles.subtitle}>Yourfarm</Text>

      <TextInput
        placeholder="Enter your name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Login;



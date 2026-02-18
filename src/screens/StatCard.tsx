import React from 'react';
import { View, Text } from 'react-native';
import styles from '../styles/dashboardStyles';
const StatCard = ({ title, value, subtitle, type }: any) => {
  return (
    // <View style={[styles.card, styles[type]]}>
    <View>

      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
    </View>
  );
};

export default StatCard;
 
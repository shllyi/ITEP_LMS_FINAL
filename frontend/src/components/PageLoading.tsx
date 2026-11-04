import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface Props {
  title: string;
  subtitle?: string;
}

export default function PageLoading({ title, subtitle }: Props) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={title}>
      <Image
        source={require('@/assets/images/mascot_gif.gif')}
        style={styles.mascot}
        resizeMode="contain"
        accessible={false}
      />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FDE680',
  },
  mascot: {
    width: 180,
    height: 180,
  },
  title: {
    marginTop: 8,
    color: '#4A1A24',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    color: '#8F5F68',
    fontSize: 15,
    textAlign: 'center',
  },
});

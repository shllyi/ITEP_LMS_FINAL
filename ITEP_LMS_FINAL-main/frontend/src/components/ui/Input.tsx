import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  TextInputProps,
  Platform,
} from 'react-native';
import { COLORS } from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  showPasswordToggle?: boolean;
  leftIcon?: React.ReactNode;
}

export function Input({ label, error, showPasswordToggle, leftIcon, secureTextEntry, style, ...props }: InputProps) {
  const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, isFocused && styles.inputFocused, !!error && styles.inputError]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, leftIcon && styles.inputWithLeftIcon, style]}
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          {...props}
        />
        {showPasswordToggle && (
          <Pressable onPress={() => setIsSecure(!isSecure)} style={styles.eyeButton}>
            <Text style={styles.eyeIcon}>{isSecure ? '👁️' : '🙈'}</Text>
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    ...Platform.select({
      web: { outlineWidth: 0 } as any,
    }),
  },
  inputError: {
    borderColor: COLORS.error,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  inputWithLeftIcon: { paddingLeft: 8 },
  leftIcon: {
    paddingLeft: 14,
    paddingRight: 4,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeIcon: { fontSize: 18 },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
    marginLeft: 4,
  },
});

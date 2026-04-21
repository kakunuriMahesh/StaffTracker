import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { triggerStaffReload } from '../services/staffReload';

const { width } = Dimensions.get('window');

let toastRef = null;
let toastTimeout = null;

export function showToast(message, onUndo = null, duration = 3000) {
  if (toastRef) {
    toastRef.show(message, onUndo, duration);
  }
}

export default function Toast() {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [hasUndo, setHasUndo] = React.useState(false);
  const callbackRef = useRef(null);

  useEffect(() => {
    toastRef = { show: show };
  }, []);

  const show = (msg, callback, dur) => {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    setMessage(msg);
    setHasUndo(!!callback);
    callbackRef.current = callback;
    setVisible(true);
    
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true })
    ]).start();

    toastTimeout = setTimeout(() => {
      hide();
    }, dur || duration);
  };

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true })
    ]).start(() => {
      setVisible(false);
    });
  };

  const handleUndo = async () => {
    if (callbackRef.current) {
      await callbackRef.current();
      callbackRef.current = null;
      triggerStaffReload();
    }
    hide();
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: [{ translateY }], opacity }
      ]}
    >
      <View style={styles.toast}>
        <Text style={styles.message}>{message}</Text>
        {hasUndo && (
          <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
            <Text style={styles.undoText}>UNDO</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  undoBtn: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
  },
  undoText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
});
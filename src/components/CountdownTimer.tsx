import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
  interpolateColor,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_HEIGHT = 8;
const CONTAINER_HEIGHT = 56;

interface CountdownTimerProps {
  duration: number; // in seconds
  onComplete?: () => void;
  onReset?: () => void;
  autoStart?: boolean;
  showControls?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  duration,
  onComplete,
  onReset,
  autoStart = false,
  showControls = true,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const pulseOpacity = useSharedValue(1);
  const progressWidth = useSharedValue(100);

  // Warning state (< 30 seconds)
  const isWarning = timeRemaining <= 30 && timeRemaining > 0;
  const isExpired = timeRemaining === 0;

  // Calculate progress percentage
  const progressPercent = (timeRemaining / duration) * 100;

  // Pulse animation for warning state
  useEffect(() => {
    if (isWarning && isRunning) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isWarning, isRunning]);

  // Update progress bar width
  useEffect(() => {
    progressWidth.value = withTiming(progressPercent, { 
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  }, [progressPercent]);

  // Timer logic
  useEffect(() => {
    if (isRunning && !isPaused && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, timeRemaining, onComplete]);

  // Reset when duration changes
  useEffect(() => {
    setTimeRemaining(duration);
    setIsRunning(autoStart);
    setIsPaused(false);
  }, [duration, autoStart]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const handlePause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleReset = useCallback(() => {
    setTimeRemaining(duration);
    setIsRunning(false);
    setIsPaused(false);
    onReset?.();
  }, [duration, onReset]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get colors based on state
  const getColors = () => {
    if (isExpired) return { primary: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' };
    if (isWarning) return { primary: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' };
    return { primary: '#6366F1', bg: 'rgba(99, 102, 241, 0.15)', text: '#A5B4FC' };
  };

  const colors = getColors();

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.contentRow}>
        {/* Time Display */}
        <View style={styles.timeSection}>
          <Text style={[styles.timeIcon]}>⏱️</Text>
          <Animated.Text style={[styles.timeText, { color: colors.text }, pulseStyle]}>
            {formatTime(timeRemaining)}
          </Animated.Text>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressBarContainer, { backgroundColor: colors.bg }]}>
          <Animated.View 
            style={[
              styles.progressBar, 
              { backgroundColor: colors.primary },
              progressBarStyle
            ]} 
          />
        </View>

        {/* Controls */}
        {showControls && (
          <View style={styles.controls}>
            {!isRunning && timeRemaining === duration ? (
              <TouchableOpacity style={[styles.controlBtn, styles.startBtn]} onPress={handleStart}>
                <Text style={styles.controlBtnText}>▶</Text>
              </TouchableOpacity>
            ) : isRunning && !isPaused ? (
              <TouchableOpacity style={[styles.controlBtn, styles.pauseBtn]} onPress={handlePause}>
                <Text style={styles.controlBtnText}>⏸</Text>
              </TouchableOpacity>
            ) : isPaused ? (
              <TouchableOpacity style={[styles.controlBtn, styles.resumeBtn]} onPress={handleResume}>
                <Text style={styles.controlBtnText}>▶</Text>
              </TouchableOpacity>
            ) : null}
            
            <TouchableOpacity style={[styles.controlBtn, styles.resetBtn]} onPress={handleReset}>
              <Text style={styles.controlBtnText}>↺</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 85,
  },
  timeIcon: {
    fontSize: 18,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressBarContainer: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: BAR_HEIGHT / 2,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtn: {
    backgroundColor: '#22C55E',
  },
  pauseBtn: {
    backgroundColor: '#F59E0B',
  },
  resumeBtn: {
    backgroundColor: '#22C55E',
  },
  resetBtn: {
    backgroundColor: '#374151',
  },
  controlBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
});

export default CountdownTimer;

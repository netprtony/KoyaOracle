import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Extrapolation,
  SharedValue,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.65;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;
const ROTATION_ANGLE = 12;
const STACK_OFFSET = 8;
const STACK_SCALE_STEP = 0.04;

// Types
export type SwipeEffect = 'default' | 'cube' | 'scroll' | 'card' | 'tilt';

interface CardData {
  id: string;
  icon?: string;
  name?: string;
  playerName?: string;
  content: React.ReactNode;
  onLongPress?: () => void;
}

interface SwipeableCardStackProps {
  cards: CardData[];
  currentIndex: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  canSwipeLeft?: boolean;
  canSwipeRight?: boolean;
  swipeEffect?: SwipeEffect;
  showHint?: boolean;
}

// Optimized timing configs
const FAST_TIMING_CONFIG = {
  duration: 200,
  easing: Easing.out(Easing.quad),
};

const SNAP_SPRING_CONFIG = {
  damping: 22,
  stiffness: 220,
  mass: 0.5,
};

const FLIP_SPRING_CONFIG = {
  damping: 18,
  stiffness: 120,
  mass: 0.8,
};

export const SwipeableCardStack: React.FC<SwipeableCardStackProps> = ({
  cards,
  currentIndex,
  onSwipeLeft,
  onSwipeRight,
  canSwipeLeft = true,
  canSwipeRight = true,
  swipeEffect = 'default',
  showHint = true,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const [hintVisible, setHintVisible] = useState(showHint);

  // Reset position when index changes
  React.useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    scale.value = 1;
  }, [currentIndex]);

  const hideHint = useCallback(() => {
    setHintVisible(false);
  }, []);

  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    hideHint();
    
    // Reset values for next card
    translateX.value = 0;
    translateY.value = 0;
    scale.value = 1;
    
    if (direction === 'left' && onSwipeLeft) {
      onSwipeLeft();
    } else if (direction === 'right' && onSwipeRight) {
      onSwipeRight();
    }
  }, [onSwipeLeft, onSwipeRight, hideHint, translateX, translateY, scale]);

  // Fast swipe animation
  const getSwipeAnimation = (
    translationY: number,
    velocity: number,
    direction: 'left' | 'right'
  ) => {
    'worklet';
    const targetX = direction === 'left' ? -SCREEN_WIDTH * 1.2 : SCREEN_WIDTH * 1.2;
    
    translateX.value = withTiming(
      targetX,
      {
        duration: Math.max(150, 250 - Math.abs(velocity) * 0.1),
        easing: Easing.out(Easing.quad),
      },
      (finished) => {
        if (finished) {
          runOnJS(handleSwipeComplete)(direction);
        }
      }
    );

    translateY.value = withTiming(translationY * 0.5, FAST_TIMING_CONFIG);
    scale.value = withTiming(0.9, FAST_TIMING_CONFIG);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      if (!canSwipeLeft && event.translationX < 0) {
        translateX.value = event.translationX * 0.12;
      } else if (!canSwipeRight && event.translationX > 0) {
        translateX.value = event.translationX * 0.12;
      } else {
        translateX.value = event.translationX;
        
        switch (swipeEffect) {
          case 'scroll':
            translateY.value = event.translationY * 0.4;
            break;
          case 'tilt':
            translateY.value = event.translationX * 0.12;
            break;
          default:
            translateY.value = event.translationY * 0.2;
        }
        
        const dragDistance = Math.abs(event.translationX);
        scale.value = 1 - Math.min(dragDistance / SCREEN_WIDTH, 0.06);
      }
    })
    .onEnd((event) => {
      const swipeDistance = event.translationX;
      const swipeVelocity = event.velocityX;
      
      const shouldSwipeRight = 
        canSwipeRight && 
        (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > 300);
      
      const shouldSwipeLeft = 
        canSwipeLeft && 
        (swipeDistance < -SWIPE_THRESHOLD || swipeVelocity < -300);

      if (shouldSwipeRight) {
        getSwipeAnimation(event.translationY, swipeVelocity, 'right');
      } else if (shouldSwipeLeft) {
        getSwipeAnimation(event.translationY, swipeVelocity, 'left');
      } else {
      translateX.value = withSpring(0, SNAP_SPRING_CONFIG);
        translateY.value = withSpring(0, SNAP_SPRING_CONFIG);
        scale.value = withSpring(1, SNAP_SPRING_CONFIG);
      }
    });

  // Render visible cards - current + next 2 (background cards only show front)
  const visibleCards = useMemo(() => {
    const result = [];
    for (let i = Math.min(2, cards.length - currentIndex - 1); i >= 0; i--) {
      const cardIndex = currentIndex + i;
      const card = cards[cardIndex];
      
      if (!card) continue;
      
      const isTopCard = i === 0;
      
      result.push(
        <AnimatedCard
          key={`${card.id}-${cardIndex}-${currentIndex}`}
          card={card}
          stackIndex={i}
          isTopCard={isTopCard}
          translateX={isTopCard ? translateX : undefined}
          translateY={isTopCard ? translateY : undefined}
          scale={isTopCard ? scale : undefined}
          panGesture={isTopCard ? panGesture : undefined}
          swipeEffect={swipeEffect}
        />
      );
    }
    return result;
  }, [cards, currentIndex, translateX, translateY, scale, panGesture, swipeEffect]);

  return (
    <View style={styles.container}>
      {visibleCards}
      
      {/* Enhanced Swipe Direction Indicators */}
      <SwipeIndicators 
        translateX={translateX} 
        canSwipeLeft={canSwipeLeft}
        canSwipeRight={canSwipeRight}
      />
      
      {/* Swipe Hint */}
      {hintVisible && (
        <Animated.View style={styles.hintContainer}>
          <Text style={styles.hintText}>🔄 Nhấn nút góc phải để lật • Vuốt để chuyển</Text>
        </Animated.View>
      )}
    </View>
  );
};

interface AnimatedCardProps {
  card: CardData;
  stackIndex: number;
  isTopCard: boolean;
  translateX?: SharedValue<number>;
  translateY?: SharedValue<number>;
  scale?: SharedValue<number>;
  panGesture?: any;
  swipeEffect: SwipeEffect;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  card,
  stackIndex,
  isTopCard,
  translateX,
  translateY,
  scale,
  panGesture,
  swipeEffect,
}) => {
  // Internal flip state - each card manages its own flip
  const flipRotation = useSharedValue(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Handle tap to flip
  const handleFlip = useCallback(() => {
    const newFlipped = !isFlipped;
    setIsFlipped(newFlipped);
    flipRotation.value = withSpring(newFlipped ? 180 : 0, FLIP_SPRING_CONFIG);
  }, [isFlipped, flipRotation]);
  // Container animation - handles swipe transforms
  const containerAnimatedStyle = useAnimatedStyle(() => {
    if (isTopCard && translateX && translateY && scale) {
      let transforms: any[] = [];
      
      switch (swipeEffect) {
        case 'cube':
          const cubeRotate = interpolate(
            translateX.value,
            [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
            [35, 0, -35],
            Extrapolation.CLAMP
          );
          transforms = [
            { perspective: 1000 },
            { translateX: translateX.value },
            { rotateY: `${cubeRotate}deg` },
            { scale: scale.value },
          ];
          break;

        case 'tilt':
          const tiltRotateX = interpolate(
            translateX.value,
            [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
            [-12, 0, 12],
            Extrapolation.CLAMP
          );
          const tiltRotateZ = interpolate(
            translateX.value,
            [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
            [-8, 0, 8],
            Extrapolation.CLAMP
          );
          transforms = [
            { perspective: 800 },
            { translateX: translateX.value },
            { translateY: translateY.value },
            { rotateX: `${tiltRotateX}deg` },
            { rotateZ: `${tiltRotateZ}deg` },
            { scale: scale.value },
          ];
          break;

        case 'scroll':
          const scrollScale = interpolate(
            Math.abs(translateY.value),
            [0, SCREEN_HEIGHT],
            [1, 0.75],
            Extrapolation.CLAMP
          );
          transforms = [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scrollScale },
          ];
          break;

        case 'card':
          const cardRotate = interpolate(
            translateX.value,
            [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
            [-6, 0, 6],
            Extrapolation.CLAMP
          );
          transforms = [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { rotate: `${cardRotate}deg` },
            { scale: scale.value },
          ];
          break;

        default:
          const rotate = interpolate(
            translateX.value,
            [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
            [-ROTATION_ANGLE, 0, ROTATION_ANGLE],
            Extrapolation.CLAMP
          );
          transforms = [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { rotate: `${rotate}deg` },
            { scale: scale.value },
          ];
      }

      const opacity = interpolate(
        Math.abs(translateX.value),
        [0, SCREEN_WIDTH * 0.8],
        [1, 0.5],
        Extrapolation.CLAMP
      );

      return {
        transform: transforms,
        opacity,
        zIndex: 10,
      };
    } else {
      // Background cards - stacked effect, properly centered
      const stackOffset = STACK_OFFSET * stackIndex;
      const stackScale = 1 - STACK_SCALE_STEP * stackIndex;
      const stackOpacity = 1 - 0.2 * stackIndex;

      return {
        transform: [
          { translateY: stackOffset },
          { scale: stackScale },
        ],
        opacity: stackOpacity,
        zIndex: 10 - stackIndex,
      };
    }
  });

  // Front card flip animation - only for top card
  const frontFlipStyle = useAnimatedStyle(() => {
    if (!isTopCard) return {};
    
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${flipRotation.value}deg` },
      ],
      backfaceVisibility: 'hidden' as const,
    };
  });

  // Back card flip animation - only for top card
  const backFlipStyle = useAnimatedStyle(() => {
    if (!isTopCard) {
      return { opacity: 0 };
    }
    
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${flipRotation.value - 180}deg` },
      ],
      backfaceVisibility: 'hidden' as const,
    };
  });

  // Render card back content - shows role reveal
  const renderCardBack = () => {
    // Debug logging
    console.log('[CardBack] Rendering for card:', {
      id: card.id,
      name: card.name,
      icon: card.icon,
      playerName: card.playerName,
    });
    
    const hasRole = card.playerName && card.playerName !== 'Chưa gán';
    
    return (
      <View style={styles.roleRevealContainer}>
        {/* Role Icon */}
        <View style={[styles.roleIconContainer, !hasRole && styles.roleIconContainerEmpty]}>
          <Text style={styles.roleIcon}>{card.icon || '🎭'}</Text>
        </View>
        
        {/* Role Name */}
        <Text style={styles.roleNameText}>{card.name || 'Vai trò'}</Text>
        
        {/* Player Name or Not Assigned */}
        <Text style={styles.playerNameText}>
          {hasRole ? card.playerName : 'Chưa được gán vai'}
        </Text>
        
        <View style={[styles.secretBadge, !hasRole && styles.secretBadgeEmpty]}>
          <Text style={styles.secretBadgeText}>
            {hasRole ? 'VAI TRÒ BÍ MẬT' : 'CHƯA GÁN'}
          </Text>
        </View>
        
        {!hasRole && (
          <Text style={styles.noRoleHint}>
            Vui lòng gán vai trước khi tiếp tục
          </Text>
        )}
      </View>
    );
  };

  // Top card with gesture - has flip capability via button
  if (isTopCard && panGesture) {
    return (
      <Animated.View 
        style={[styles.cardContainer, containerAnimatedStyle]}
      >
        {/* Front of Card - NO gesture wrapper, buttons work freely */}
        <Animated.View 
          style={[styles.card, styles.cardFront, frontFlipStyle]}
        >
          {card.content}
        </Animated.View>

        {/* Back of Card - Role Reveal */}
        <Animated.View 
          style={[styles.card, styles.cardBack, backFlipStyle]}
        >
          {renderCardBack()}
        </Animated.View>

        {/* Left Swipe Zone - invisible, detects swipe left */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={styles.swipeZoneLeft} />
        </GestureDetector>

        {/* Right Swipe Zone - invisible, detects swipe right */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={styles.swipeZoneRight} />
        </GestureDetector>

        {/* Flip Button - positioned at top-right corner */}
        <Pressable 
          style={styles.flipButton}
          onPress={handleFlip}
        >
          <Text style={styles.flipButtonText}>🔄</Text>
        </Pressable>
      </Animated.View>
    );
  }

  // Background cards - only front face, no interaction, properly centered
  return (
    <Animated.View style={[styles.cardContainer, containerAnimatedStyle]}>
      <View style={[styles.card, styles.cardFront]}>
        {card.content}
      </View>
    </Animated.View>
  );
};

interface SwipeIndicatorsProps {
  translateX: SharedValue<number>;
  canSwipeLeft: boolean;
  canSwipeRight: boolean;
}

const SwipeIndicators: React.FC<SwipeIndicatorsProps> = ({ translateX, canSwipeLeft, canSwipeRight }) => {
  const leftIndicatorStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [-SCREEN_WIDTH * 0.5, -SWIPE_THRESHOLD * 0.3, 0],
      [1, 0.9, 0],
      Extrapolation.CLAMP
    );
    
    const slideX = interpolate(
      translateX.value,
      [-SCREEN_WIDTH * 0.5, -SWIPE_THRESHOLD * 0.3, 0],
      [0, -5, -60],
      Extrapolation.CLAMP
    );
    
    const scaleValue = interpolate(
      translateX.value,
      [-SCREEN_WIDTH * 0.5, -SWIPE_THRESHOLD * 0.3, 0],
      [1.15, 1, 0.8],
      Extrapolation.CLAMP
    );

    return {
      opacity: progress,
      transform: [
        { translateX: slideX },
        { scale: scaleValue },
      ],
    };
  });

  const rightIndicatorStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 0.3, SCREEN_WIDTH * 0.5],
      [0, 0.9, 1],
      Extrapolation.CLAMP
    );
    
    const slideX = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 0.3, SCREEN_WIDTH * 0.5],
      [60, 5, 0],
      Extrapolation.CLAMP
    );
    
    const scaleValue = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 0.3, SCREEN_WIDTH * 0.5],
      [0.8, 1, 1.15],
      Extrapolation.CLAMP
    );

    return {
      opacity: progress,
      transform: [
        { translateX: slideX },
        { scale: scaleValue },
      ],
    };
  });

  return (
    <>
      {canSwipeLeft && (
        <Animated.View style={[styles.indicator, styles.leftIndicator, leftIndicatorStyle]}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.indicatorGradient}
          >
            <Text style={styles.indicatorArrow}>‹</Text>
            <View style={styles.indicatorTextContainer}>
              <Text style={styles.indicatorLabel}>Trước</Text>
              <Text style={styles.indicatorHint}>vuốt phải</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {canSwipeRight && (
        <Animated.View style={[styles.indicator, styles.rightIndicator, rightIndicatorStyle]}>
          <LinearGradient
            colors={['#8B5CF6', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.indicatorGradient}
          >
            <View style={styles.indicatorTextContainer}>
              <Text style={styles.indicatorLabel}>Tiếp</Text>
              <Text style={styles.indicatorHint}>vuốt trái</Text>
            </View>
            <Text style={styles.indicatorArrow}>›</Text>
          </LinearGradient>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: 'absolute',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardFront: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardBack: {
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  roleRevealContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  roleIconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#6366F1',
  },
  roleIconContainerEmpty: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    borderColor: '#6B7280',
  },
  roleIcon: {
    fontSize: 56,
  },
  roleNameText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#A5B4FC',
    textAlign: 'center',
    marginBottom: 8,
  },
  playerNameText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 14,
  },
  secretBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  secretBadgeEmpty: {
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
    borderColor: '#6B7280',
  },
  secretBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A5B4FC',
    letterSpacing: 1.5,
  },
  noRoleHint: {
    marginTop: 16,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  // Enhanced Swipe Indicators - positioned BEHIND cards
  indicator: {
    position: 'absolute',
    top: '45%',
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 5, // Below cards (cards have zIndex: 10)
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5, // Lower than cards
  },
  leftIndicator: {
    left: 8,
  },
  rightIndicator: {
    right: 8,
  },
  indicatorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  indicatorArrow: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 36,
  },
  indicatorTextContainer: {
    alignItems: 'center',
  },
  indicatorLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  indicatorHint: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  hintContainer: {
    position: 'absolute',
    bottom: 25,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
  },
  flipButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
  flipButtonText: {
    fontSize: 24,
  },
  swipeZoneLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    zIndex: 10,
  },
  swipeZoneRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    zIndex: 10,
  },
});

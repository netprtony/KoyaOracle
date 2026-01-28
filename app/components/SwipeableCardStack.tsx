import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
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
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.65;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const ROTATION_ANGLE = 15;
const STACK_OFFSET = 8;
const STACK_SCALE_STEP = 0.04;

interface CardData {
  id: string;
  icon: string;
  name: string;
  content: React.ReactNode;
}

interface SwipeableCardStackProps {
  cards: CardData[];
  currentIndex: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  canSwipeLeft?: boolean;
  canSwipeRight?: boolean;
}

export const SwipeableCardStack: React.FC<SwipeableCardStackProps> = ({
  cards,
  currentIndex,
  onSwipeLeft,
  onSwipeRight,
  canSwipeLeft = true,
  canSwipeRight = true,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const handleSwipeComplete = (direction: 'left' | 'right') => {
    'worklet';
    translateX.value = 0;
    translateY.value = 0;
    scale.value = 1;
    
    if (direction === 'left' && onSwipeLeft) {
      runOnJS(onSwipeLeft)();
    } else if (direction === 'right' && onSwipeRight) {
      runOnJS(onSwipeRight)();
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onUpdate((event) => {
      // Limit swipe based on permissions
      if (!canSwipeLeft && event.translationX < 0) {
        translateX.value = event.translationX * 0.2; // Resistance
      } else if (!canSwipeRight && event.translationX > 0) {
        translateX.value = event.translationX * 0.2; // Resistance
      } else {
        translateX.value = event.translationX;
        translateY.value = event.translationY * 0.3; // Slight vertical movement
        
        // Scale slightly on drag
        const dragDistance = Math.abs(event.translationX);
        scale.value = 1 - Math.min(dragDistance / SCREEN_WIDTH, 0.05);
      }
    })
    .onEnd((event) => {
      const swipeDistance = event.translationX;
      const swipeVelocity = event.velocityX;
      
      // Determine if swipe should trigger
      const shouldSwipeRight = 
        canSwipeRight && 
        (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > 500);
      
      const shouldSwipeLeft = 
        canSwipeLeft && 
        (swipeDistance < -SWIPE_THRESHOLD || swipeVelocity < -500);

      if (shouldSwipeRight) {
        // Swipe Right Animation
        translateX.value = withSpring(
          SCREEN_WIDTH * 1.5,
          {
            damping: 20,
            stiffness: 90,
            velocity: swipeVelocity,
          },
          () => handleSwipeComplete('right')
        );
        translateY.value = withSpring(event.translationY * 0.5);
      } else if (shouldSwipeLeft) {
        // Swipe Left Animation
        translateX.value = withSpring(
          -SCREEN_WIDTH * 1.5,
          {
            damping: 20,
            stiffness: 90,
            velocity: swipeVelocity,
          },
          () => handleSwipeComplete('left')
        );
        translateY.value = withSpring(event.translationY * 0.5);
      } else {
        // Snap back
        translateX.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
        });
        translateY.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
        });
        scale.value = withSpring(1);
      }
    });

  // Render cards in stack (show current + next 2)
  const visibleCards = [];
  for (let i = 0; i < Math.min(3, cards.length - currentIndex); i++) {
    const cardIndex = currentIndex + i;
    const card = cards[cardIndex];
    
    if (!card) continue;
    
    const isTopCard = i === 0;
    
    visibleCards.push(
      <AnimatedCard
        key={card.id}
        card={card}
        index={i}
        isTopCard={isTopCard}
        translateX={isTopCard ? translateX : undefined}
        translateY={isTopCard ? translateY : undefined}
        scale={isTopCard ? scale : undefined}
        gesture={isTopCard ? panGesture : undefined}
      />
    );
  }

  return (
    <View style={styles.container}>
      {visibleCards.reverse()}
      
      {/* Swipe Direction Indicators */}
      <SwipeIndicators translateX={translateX} />
    </View>
  );
};

interface AnimatedCardProps {
  card: CardData;
  index: number;
  isTopCard: boolean;
  translateX?: SharedValue<number>;
  translateY?: SharedValue<number>;
  scale?: SharedValue<number>;
  gesture?: any;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  card,
  index,
  isTopCard,
  translateX,
  translateY,
  scale,
  gesture,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    if (isTopCard && translateX && translateY && scale) {
      // Top card - full interaction
      const rotate = interpolate(
        translateX.value,
        [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        [-ROTATION_ANGLE, 0, ROTATION_ANGLE],
        Extrapolation.CLAMP
      );

      const opacity = interpolate(
        Math.abs(translateX.value),
        [0, SCREEN_WIDTH],
        [1, 0.3],
        Extrapolation.CLAMP
      );

      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { rotate: `${rotate}deg` },
          { scale: scale.value },
        ],
        opacity,
        zIndex: 10,
      };
    } else {
      // Background cards - stacked effect
      const stackOffset = STACK_OFFSET * index;
      const stackScale = 1 - STACK_SCALE_STEP * index;
      const stackOpacity = 1 - 0.2 * index;

      return {
        transform: [
          { translateY: stackOffset },
          { scale: stackScale },
        ],
        opacity: stackOpacity,
        zIndex: 10 - index,
      };
    }
  });

  const CardContent = isTopCard && gesture ? (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        {card.content}
      </Animated.View>
    </GestureDetector>
  ) : (
    <Animated.View style={[styles.card, animatedStyle]}>
      {card.content}
    </Animated.View>
  );

  return CardContent;
};

interface SwipeIndicatorsProps {
  translateX: SharedValue<number>;
}

const SwipeIndicators: React.FC<SwipeIndicatorsProps> = ({ translateX }) => {
  const leftIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, -SWIPE_THRESHOLD * 0.5, 0],
      [1, 0.8, 0],
      Extrapolation.CLAMP
    );
    
    const scale = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, -SWIPE_THRESHOLD * 0.5, 0],
      [1.2, 1, 0.8],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const rightIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 0.5, SCREEN_WIDTH],
      [0, 0.8, 1],
      Extrapolation.CLAMP
    );
    
    const scale = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 0.5, SCREEN_WIDTH],
      [0.8, 1, 1.2],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <>
      {/* Left Indicator (Previous) */}
      <Animated.View style={[styles.indicator, styles.leftIndicator, leftIndicatorStyle]}>
        <Text style={styles.indicatorIcon}>‹</Text>
        <Text style={styles.indicatorText}>Trước</Text>
      </Animated.View>

      {/* Right Indicator (Next) */}
      <Animated.View style={[styles.indicator, styles.rightIndicator, rightIndicatorStyle]}>
        <Text style={styles.indicatorText}>Tiếp</Text>
        <Text style={styles.indicatorIcon}>›</Text>
      </Animated.View>
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
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#1F2937',
    borderRadius: 24,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  indicator: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    top: SCREEN_HEIGHT * 0.25,
  },
  leftIndicator: {
    left: 30,
  },
  rightIndicator: {
    right: 30,
  },
  indicatorIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  indicatorText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
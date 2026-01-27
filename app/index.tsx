import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to tabs on app start
    router.replace('/(tabs)/game');
  }, []);

  return null;
}

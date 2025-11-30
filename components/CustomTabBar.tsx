import { View, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { FileText, GraduationCap, Stethoscope, User, Home } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const icons: Record<string, any> = {
    index: FileText,
    study: GraduationCap,
    home: Home,
    tools: Stethoscope,
    profile: User,
  };

  const labels: Record<string, string> = {
    index: 'Plan',
    study: 'Study',
    home: 'Home',
    tools: 'Tools',
    profile: 'Profile',
  };

  const routeOrder = ['index', 'study', 'brainie', 'tools', 'profile'];

  const isBrainieActive = state.routes[state.index].name === 'home';

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {routeOrder.map((routeName, index) => {
          if (routeName === 'brainie') {
            return (
              <View key="brainie" style={styles.centerButtonContainer}>
                <TouchableOpacity
                  style={styles.centerButton}
                  onPress={() => navigation.navigate('home')}
                  accessibilityRole="button"
                  accessibilityLabel="Home"
                >
                  <View style={styles.centerButtonCircle}>
                    <Image
                      source={require('@/assets/images/brainie.png')}
                      style={styles.brainieImage}
                      resizeMode="contain"
                    />
                  </View>
                </TouchableOpacity>
                <Text style={[styles.centerLabel, { color: isBrainieActive ? Colors.primary : Colors.text.tertiary }]}>
                  Home
                </Text>
              </View>
            );
          }

          const routeIndex = state.routes.findIndex(route => route.name === routeName);
          if (routeIndex === -1) return null;

          const route = state.routes[routeIndex];
          const { options } = descriptors[route.key];
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const Icon = icons[routeName];
          const label = labels[routeName];

          return (
            <TouchableOpacity
              key={routeName}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tab}
            >
              <Icon
                color={isFocused ? Colors.primary : Colors.text.tertiary}
                size={24}
              />
              <Text
                style={[
                  styles.label,
                  { color: isFocused ? Colors.primary : Colors.text.tertiary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  centerButton: {
    marginBottom: 4,
  },
  centerButtonCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  brainieImage: {
    width: 50,
    height: 50,
  },
  centerLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});

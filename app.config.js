/**
 * Merges Supabase settings into expo.extra for lib/supabase.ts (Constants.expoConfig.extra).
 *
 * Local dev: create .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * (see https://docs.expo.dev/guides/environment-variables/).
 *
 * EAS production: create variables for the production environment (plaintext or sensitive;
 * EXPO_PUBLIC_* cannot use "secret" visibility — they are embedded in the app bundle):
 *   eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT.supabase.co" --environment production --visibility plaintext
 *   eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --environment production --visibility sensitive
 * The production profile in eas.json sets "environment": "production" so these are injected on EAS Build.
 * Or use Expo dashboard → Project → Environment variables.
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra ?? {}),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});

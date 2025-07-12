module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@services': './src/services',
            '@hooks': './src/hooks',
            '@store': './src/store',
            '@utils': './src/utils',
            '@theme': './src/theme',
            '@types': './src/types',
            '@constants': './src/constants',
            '@config': './src/config',
          },
        },
      ],
      'react-native-reanimated/plugin',
      // Performance optimizations
      '@babel/plugin-transform-runtime',
      ['transform-remove-console', { exclude: ['error', 'warn'] }],
    ],
    env: {
      production: {
        plugins: ['transform-remove-console', 'react-native-paper/babel'],
      },
    },
  };
};

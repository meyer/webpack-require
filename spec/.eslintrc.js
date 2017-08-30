module.exports = {
  extends: ['eslint:recommended', 'plugin:jest/recommended'],
  plugins: ['jest'],
  env: {
    'jest/globals': true,
  },
};

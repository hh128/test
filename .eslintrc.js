module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'playwright'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:playwright/recommended',
        'prettier'
    ],
    env: {
        node: true
    },
    rules: {
        // Add custom project rules here
        '@typescript-eslint/no-explicit-any': 'warn',
        'playwright/no-wait-for-timeout': 'error',
        'playwright/expect-expect': 'warn'
    }
};

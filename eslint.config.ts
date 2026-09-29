import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  skipFormatting,

  {
    name: 'app/underscore-ignored-unused',
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    name: 'app/legacy-single-word-component-names',
    files: [
      'src/components/forms/FormElements/Dropzone.vue',
      'src/components/layout/Backdrop.vue',
      'src/components/profile/Modal.vue',
      'src/components/ui/Alert.vue',
      'src/components/ui/Avatar.vue',
      'src/components/ui/Badge.vue',
      'src/components/ui/Button.vue',
      'src/components/ui/Modal.vue',
      'src/views/Auth/Signin.vue',
      'src/views/Auth/Signup.vue',
      'src/views/Booking/Checkout.vue',
      'src/views/Ecommerce.vue',
      'src/views/Landing/landing.vue',
      'src/views/Others/Calendar.vue',
      'src/views/UiElements/Alerts.vue',
      'src/views/UiElements/Avatars.vue',
      'src/views/UiElements/Badges.vue',
      'src/views/UiElements/Buttons.vue',
      'src/views/UiElements/Images.vue',
      'src/views/UiElements/Videos.vue',
    ],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
)

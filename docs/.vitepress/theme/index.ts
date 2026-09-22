import DefaultTheme from 'vitepress/theme'
import SupportForm from './SupportForm.vue'

import './support-form.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('SupportForm', SupportForm)
  },
}

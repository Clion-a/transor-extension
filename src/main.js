import Vue from 'vue'
import App from './App.vue'
import store from './store'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import './assets/styles/main.css'

Vue.config.productionTip = false
Vue.use(ElementUI)

new Vue({
  store,
  render: h => h(App),
}).$mount('#app') 
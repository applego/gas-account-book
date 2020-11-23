import Vue from 'vue'
import Vuex from 'vuex'
import gasApi from '../api/gasApi'

Vue.use(Vuex)

/*
今回は「設定」「家計簿データ」の状態管理に Vuex を使用します。
さっそく、設定を保存／読み込みできるよう src/store/index.js を書き換えます。
設定の内容は永続的に保存したいので、localStorage を利用します。
 */
/**
 * State
 * Vuexの状態
 */
const state = {
/** 家計簿データ */
  abData: {},

/** ローディング状態 */
  loading: {
    fetch: false,
    add: false,
    update: false,
    delete:false
  },

/** エラーメッセージ */
  errorMessage: '',

/** 設定 */
  settings: {
    appName: 'GAS 家計簿',
    apiUrl: '',
    authToken: '',
    strIncomeItems: '給料, ボーナス, 繰越',
    strOutgoItems: '食費, 趣味, 交通費, 買い物, 交際費, 生活費, 住宅, 通信, 車, 税金',
    strTagItems: '固定費, カード'
  }
}

/** Mutations
 * ActionsからStateを更新する時に呼ばれます
 */
const mutations = {
/** 指定年月の家計簿データをセットします */
  setAbData(state, { yearMonth, list }) {
    state.abData[yearMonth] = list
  },

/** データを追加します */
  addAbData(state, { item }) {
    const yearMonth = item.date.slice(0, 7)
    const list = state.abData[yearMonth]
    if (list) {
      list.push(item)
    }
  },

/** 指定年月のデータを更新します */
  updateAbData(state, { yearMonth, item }) {
    const list = state.abData[yearMonth]
    if (list) {
      const index = list.findIndex(v => v.id === item.id)
      list.splice(index,1,item)
    }
  },

/** 指定年月&IDのデータを削除します */
  deleteAbData(state, { yearMonth, id }) {
    const list = state.abData[yearMonth]
    if (list) {
      const index = list.findIndex(v => v.id === id)
      list.splice(index,1)
    }
  },

/** ローディング状態をセットします */
  setLoading(state, { type, v }) {
    state.loading[type] = v
  },

/** エラーメッセージをセットします */
  setErrorMessage(state, { message }) {
    state.errorMessage = message
  },

/** 設定を保存します */
  saveSettings(state, { settings }) {
    state.settings = { ...settings }
    const { appName, apiUrl, authToken } = state.settings
    document.title = appName
    gasApi.setUrl(apiUrl)
    gasApi.setAuthToken(authToken)
    // 家計簿データを初期化
    state.abData = {}

    localStorage.setItem('settings',JSON.stringify(settings))
  },

/** 設定を読み込みます */
  loadSettings(state) {
    const settings = JSON.parse(localStorage.getItem('settings'))
    if (settings) {
      state.settings = Object.assign(state.settings,settings)
    }
    const { appName, apiUrl, authToken } = state.settings
    document.title = appName
    gasApi.setUrl(apiUrl)
    gasApi.setAuthToken(authToken)
  }
}

/**
 * Actions
 * 画面から呼ばれ、Mutationをコミットします
 */
const actions = {
/** 指定年月の家計簿データを取得します */
  //* 1
  // fetchAbData({ commit }, { yearMonth }) {
    // // サンプルデータを初期値として入れる
    // const list = [
    //   { id: 'a34109ed', date: `${yearMonth}-01`, title: '支出サンプル', category: '買い物', tags: 'タグ1', income: null, outgo: 2000, memo: 'メモ' },
    //   { id: '7c8fa764', date: `${yearMonth}-02`, title: '収入サンプル', category: '給料', tags:'タグ1,タグ2', income: 2000, outgo: null, memo: 'メモ' }
    // ]
    // commit('setAbData', { yearMonth, list })
  //* 2
  async fetchAbData({ commit }, { yearMonth }) {
    const type = 'fetch'
    // 取得の前にローディングをtrueにする
    commit('setLoading', { type, v: true })
    try {
      // APIリクエスト送信
      const res = await gasApi.fetch(yearMonth)
      // 取得できたらabDataにセットする
      commit('setAbData', { yearMonth, list:res.data})
    } catch (e) {
      // エラーが起きたらメッセージをセット
      commit('setErrorMessage', { message: e })
      // 空の配列をabDataにセット
      commit('setAbData',{yearMonth,list:[]})
    } finally {
      // 最後に成功／失敗関係なくローティングをfalseにする
      commit('setLoading',{type,v:false})
    }
  },

/** データを追加します */
  async addAbData({ commit }, { item }) {
    const type = 'add'
    commit('setLoading', { type, v: true })
    try {
      const res = await gasApi.add(item)
      commit('addAbData', { item: res.data })
    } catch (e) {
      commit('setErrorMessage', { message: e })
    } finally {
      commit('setLoading', { type, v: false })
    }
  },

/** データを更新します */
  async updateAbData({ commit }, { beforeYM, item }) {
    const type = 'update'
    const yearMonth = item.date.slice(0, 7)
    commit('setLoading', { type, v: true })
    try {
      const res = await gasApi.update(beforeYM, item)
      // 更新前後で年月の変更がなければそのまま値を更新
      if (yearMonth === beforeYM) {
        commit('updateAbData', { yearMonth, item })
        return
      }
      // 更新があれば、更新前年月のデータから削除して、新しくデータを追加する
      const id = item.id
      commit('deleteAbData', { yearMonth: beforeYM, id })
      commit('addAbData', { item: res.data })
    } catch (e) {
      commit('setErrorMessage',{ message: e})
    } finally {
      commit('setLoading', { type, v: false })
    }
  },

/** データを削除します */
  async deleteAbData({ commit }, { item }) {
    const type = 'delete'
    const yearMonth = item.date.slice(0, 7)
    const id = item.id
    commit('setLoading', { type, v: true })
    try {
      await gasApi.delete(yearMonth, id)
      commit('deleteAbData', { yearMonth, id })
    } catch (e) {
      commit('setErrorMessage', { message: e })
    } finally {
      commit('setLoading',{type,v: false})
    }
  },

/** 設定を保存します */
  saveSettings({ commit }, { settings }) {
    commit('saveSettings',{settings})
  },

/** 設定を読み込みます */
  loadSettings({ commit }) {
    commit('loadSettings')
  }
}

/** カンマ区切りの文字をトリミングして配列にします */
const createItems = v => v.split(',').map(v => v.trim()).filter(v => v.length !== 0)

/**
 * Getters
 * 画面から取得され、Stateを加工して渡します
 */
const getters = {
/** 収入カテゴリ(配列) */
  incomeItems(state) {
    return createItems(state.settings.strIncomeItems)
  },
/** 支出カテゴリ(配列) */
  outgoItems(state) {
    return createItems(state.settings.strOutgoItems)
  },
/** タグ(配列) */
  tagItems(state) {
    return createItems(state.settings.strTagItems)
  }
}

const store = new Vuex.Store({
  state,
  mutations,
  actions,
  getters
})

export default store

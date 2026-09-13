import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'ja-JP',
  title: 'おなか日記',
  description: 'おなか日記アプリの使い方',
  base: '/onaka_diary_docs/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: '使い方', link: '/guide/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'はじめに',
          items: [
            { text: 'おなか日記とは', link: '/guide/' },
            { text: '画面構成', link: '/guide/screens' },
          ],
        },
        {
          text: '日記を使う',
          items: [
            { text: '日記を登録する', link: '/guide/create-diary' },
            { text: '記録を確認する', link: '/guide/check-diary' },
            { text: '編集・削除する', link: '/guide/edit-diary' },
          ],
        },
        {
          text: '設定',
          items: [
            { text: '設定を変更する', link: '/guide/settings' },
            { text: '通知リマインダー', link: '/guide/notifications' },
          ],
        },
        {
          text: '困ったときは',
          items: [
            { text: 'よくある質問', link: '/guide/faq' },
          ],
        },
      ],
    },
    outline: 'deep',
    socialLinks: [],
  },
})

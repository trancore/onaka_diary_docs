# サポートフォームWorker

`trancore/onaka_diary`へ非公開Issueを作成するCloudflare Workerです。

```sh
pnpm support:types
pnpm support:test
pnpm support:dev
pnpm support:deploy
```

デプロイ前に、`GITHUB_TOKEN`（対象リポジトリのIssues書き込みだけを許可したFine-grained token）と`TURNSTILE_SECRET_KEY`をCloudflare Secretとして設定します。Turnstileは`trancore.github.io`を許可ドメインにして作成し、site keyとWorkerの`/support` URLを、それぞれGitHub Actions Variablesの`TURNSTILE_SITE_KEY`と`SUPPORT_API_URL`へ設定します。

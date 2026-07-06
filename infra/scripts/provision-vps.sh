#!/usr/bin/env bash
# 本番VPS(Ubuntu 24.04 LTS)初期構築ランブック
#
# 重要: このスクリプトはこの開発サンドボックスからは実行できません(実VPSへのSSHアクセスがないため)。
# 実際のVPSに root でログインした上で、内容を確認してから手動実行してください。
# docs/adr/0003-hosting-single-vps-docker.md, docs/adr/0009-non-root-deploy-user.md 参照。
#
# 使い方: ./provision-vps.sh <domain> <deploy_ssh_public_key_path>

set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> <deploy_ssh_public_key_path>}"
SSH_PUBKEY_PATH="${2:?Usage: $0 <domain> <deploy_ssh_public_key_path>}"

echo "==> apt更新"
apt-get update && apt-get upgrade -y

echo "==> deployユーザー作成(非root, docs/adr/0009)"
if ! id deploy &>/dev/null; then
  useradd -m -s /bin/bash deploy
fi
mkdir -p /home/deploy/.ssh
cat "$SSH_PUBKEY_PATH" >> /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

echo "==> パスワードログイン無効化・鍵認証のみに変更"
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh

echo "==> UFWファイアウォール設定(SSH/80/443のみ許可)"
apt-get install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Docker Engine + Compose pluginの導入"
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==> deployユーザーをdockerグループに追加(sudoは付与しない。docs/adr/0009)"
usermod -aG docker deploy

echo "==> certbot導入(HTTP-01チャレンジ用にwebrootを使用)"
apt-get install -y certbot

cat <<EOM

==> 手動で行うこと(このスクリプトでは自動化していない) <==

1. リポジトリをclone: su - deploy -c "git clone <repo-url> ~/saitama-council-watch"
2. .env を作成(.env.example参照)し、本番用の値を設定する
3. まずTLSなしでnginxを一時起動し、certbot webroot方式で証明書を発行:
     certbot certonly --webroot -w /var/www/certbot -d ${DOMAIN}
4. infra/docker/nginx/conf.d/default.conf の "DOMAIN" を ${DOMAIN} に置換
5. docker compose -f infra/docker/compose.yml --env-file .env up -d --build
6. certbot renewの自動更新をsystemdタイマーで確認: systemctl list-timers | grep certbot
7. infra/scripts/backup.sh をcron登録(毎日) — docs/design/01-basic-design.md §8

EOM

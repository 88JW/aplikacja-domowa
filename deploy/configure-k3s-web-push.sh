#!/bin/sh
set -eu

kubectl() { sudo k3s kubectl "$@"; }

# Keep the same VAPID key pair across deployments and never print its contents.
if ! kubectl get secret homeapp-web-push >/dev/null 2>&1; then
  umask 077
  key_file="$(mktemp /tmp/homeapp-vapid.XXXXXX)"
  trap 'rm -f "$key_file"' EXIT HUP INT TERM

  kubectl exec deployment/homeapp -- node -e '
    const ecdh = require("node:crypto").createECDH("prime256v1");
    ecdh.generateKeys();
    process.stdout.write(
      "VAPID_PUBLIC_KEY=" + ecdh.getPublicKey().toString("base64url") + "\n" +
      "VAPID_PRIVATE_KEY=" + ecdh.getPrivateKey().toString("base64url") + "\n" +
      "VAPID_SUBJECT=mailto:admin@miasoftware.pl\n"
    );
  ' > "$key_file"

  test -s "$key_file"
  kubectl create secret generic homeapp-web-push --from-env-file="$key_file"
fi

kubectl set env deployment/homeapp --from=secret/homeapp-web-push
kubectl rollout status deployment/homeapp --timeout=180s

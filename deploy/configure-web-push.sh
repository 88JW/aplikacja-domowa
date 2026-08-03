#!/bin/sh
set -eu

project_dir="/home/wojciech/projects/homeapp"
env_file="$project_dir/.env.production"

if grep -q '^VAPID_PRIVATE_KEY=' "$env_file"; then
  exit 0
fi

keys="$(docker run --rm node:22-alpine node -e '
  const { createECDH } = require("node:crypto");
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  process.stdout.write(
    ecdh.getPublicKey().toString("base64url") + "\n" +
    ecdh.getPrivateKey().toString("base64url") + "\n"
  );
')"

public_key="$(printf '%s\n' "$keys" | sed -n '1p')"
private_key="$(printf '%s\n' "$keys" | sed -n '2p')"

test -n "$public_key"
test -n "$private_key"

umask 077
{
  printf '\nVAPID_PUBLIC_KEY=%s\n' "$public_key"
  printf 'VAPID_PRIVATE_KEY=%s\n' "$private_key"
  printf 'VAPID_SUBJECT=mailto:admin@miasoftware.pl\n'
} >> "$env_file"

chmod 600 "$env_file"

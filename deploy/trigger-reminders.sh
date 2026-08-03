#!/bin/sh
set -eu

docker exec homeapp node -e '
  fetch("http://127.0.0.1:3000/api/cron/reminders", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  }).then(async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    console.log(await response.text());
  });
'

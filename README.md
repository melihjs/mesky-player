# mesky-player

## Yükleme

  - `npm install mesky-player`

## Kod

  ```js
  const { Client } = require('discord.js');
const { YouTube } = require('mesky-player');
const client = new Client();
const data = new YouTube(client);

client.on('ready', async () => console.log('ready'));

client.on('message', async (message) => {
  var args = message.content.split(" ");
  if (args[0] == "!oynat") {
    var miktar = args.slice(1).join(" ");
    if (!miktar) return message.channel.send("Music söyle!");
    data.oynat(message, miktar);
  } else if (args[0] == "!ses") {
    var ses = "100";
    data.ses(message, ses);
  } else if (args[0] == "!tekrarla") {
    data.tekrarla(message);
  }
});

client.login('token');
  ```

## Telif Hakkı

  - Ghost Development: [tıkla!](https://discord.gg/delimine)

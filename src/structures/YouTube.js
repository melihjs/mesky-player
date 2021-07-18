const { EventEmitter } = require('events');
const { Util, MessageEmbed } = require('discord.js');
const ytdl = require("ytdl-core");
const ytdlDiscord = require("ytdl-core-discord");
const yts = require("yt-search");

class YouTube extends EventEmitter {
  constructor(client) {
    super();

    if (!client) throw new Error("Bir client tanımı yapılmamış!");

    this.client = client;
    this.queue = new Map();

    this.client.on('ready', async () => console.log('Music ready!'));
  }

  async oynat(message, musc) {
    if (!message) throw new Error("Bir message tanımı yapılmamış!");
    var channel = message.member.voice.channel;
    if (!channel) {
      return message.channel.send(":x: Sen bir sesli kanalda değilsin!");
    } else {
      var perm = channel.permissionsFor(message.client.user.id);
      if (!perm.has("CONNECT")) {
        return mesasge.channel.send(":x: Kanala bağlanma yetkim yok!");
      } else if (!perm.has("SPEAK")) {
        return message.channel.send(":x: Kanalda konuşma yetkim yok!");
      };
      var url = musc ? musc.replace(/<(.+)>/g, "$1") : "";
      var serverQueue = this.queue.get(message.guild.id);
      var songInfo = null;
      var song = null;
      if (url.match(/^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.?be)\/.+$/gi)) {
        try {
          songInfo = await ytdl.getInfo(url);
          if (!songInfo) return message.channel.send(":x: Şarkıyı YouTube üzerinde bulamadım!");
          song = {
            id: songInfo.videoDetails.videoId,
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
            img: songInfo.player_response.videoDetails.thumbnail.thumbnails[0].url,
            duration: songInfo.videoDetails.lengthSeconds,
            ago: songInfo.videoDetails.publishDate,
            views: String(songInfo.videoDetails.viewCount).padStart(10, ' '),
            req: message.author
          };
        } catch (e) {
          throw new Error(e);
        }
      } else {
        try {
          var searched = await yts.search(musc);
          if (searched.videos.length < 1) return  message.channel.send(":x: Şarkıyı YouTube üzerinde bulamadım!");
          songInfo = searched.videos[0]
          song = {
            id: songInfo.videoId,
            title: Util.escapeMarkdown(songInfo.title),
            views: String(songInfo.views).padStart(10, ' '),
            url: songInfo.url,
            ago: songInfo.ago,
            duration: songInfo.duration.toString(),
            img: songInfo.image,
            req: message.author
          };
        } catch (e) {
          throw new Error(e);
        }
      }
      if (serverQueue) {
        var Embed = new MessageEmbed()
        .setAuthor("Şarkı Sıraya Eklendi!", "https://github.com/SudhanPlayz/Discord-MusicBot/blob/master/assets/logo.gif?raw=true", "https://discord.gg/delimine")
        .setThumbnail(song.img)
        .setColor("#5555dd")
        .addField("Şarkı Adı", song.title, true)
        .addField("Şarkı Süresi", song.duration, true)
        .addField("Şarkıyı Açan", song.req ? song.req.tag : song.req.username, true)
        .setFooter(message.client.user.username, message.client.user.displayAvatarURL())
        .setTimestamp();
        return message.channel.send({ embed: Embed });
      }
      const queueConstruct = {
        textChannel: message.channel,
        voiceChannel: channel,
        connection: null,
        songs: [],
        volume: 65,
        playing: true,
        loop: false
      };
      this.queue.set(message.guild.id, queueConstruct);
      queueConstruct.songs.push(song);
      var play = async (song) => {
        var queue = this.queue.get(message.guild.id);
        if (!song) {
          return this.queue.delete(message.guild.id);
        }
        var stream = null;
        if (song.url.includes("youtube.com")) {
          stream = await ytdl(song.url);
          stream.on('error', async (er) => {
            if (er) {
              if (queue) {
                queue.songs.shift();
                play(queue.songs[0]);
                return message.channel.send(":x: Beklenmedik bir hata oluştu!");
              }
            }
          });
        }
        queue.connection.on("disconnect", () => this.queue.delete(message.guild.id));
        var msc = queue.connection;
        msc.play(ytdl(song.url, { quality: 'highestaudio', highWaterMark: 1 << 25, type: "opus" }));
        msc.on("finish", () => {
          var shiffed = queue.songs.shift();
            if (queue.loop === true) {
                queue.songs.push(shiffed);
            };
          play(queue.songs[0])
        });
        msc.dispatcher.setVolumeLogarithmic(queue.volume / 100);
        var Embed = new MessageEmbed()
        .setAuthor("Müzik Çalmaya Başladı!", "https://github.com/SudhanPlayz/Discord-MusicBot/blob/master/assets/logo.gif?raw=true", "https://discord.gg/delimine")
        .setThumbnail(song.img)
        .setColor("#5555dd")
        .addField("Şarkı Adı", song.title, true)
        .addField("Şarkı Süresi", song.duration, true)
        .addField("Şarkıyı Açan", song.req ? song.req.tag : song.req.username, true)
        .setFooter(message.client.user.username, message.client.user.displayAvatarURL())
        .setTimestamp();
        return queue.textChannel.send({ embed: Embed });
      }
      try {
        var codeland = await channel.join();
        queueConstruct.connection = codeland;
        play(queueConstruct.songs[0]);
      } catch (e) {
        throw new Error(e);
      }
    }
  }

  async tekrarla(message) {
    var channel = message.member.voice.channel;
    if (!channel) {
      return message.channel.send(":x: Sen bir sesli kanalda değilsin!");
    } else {
      var serverQueue = this.queue.get(message.guild.id);
      if (serverQueue) {
        serverQueue.loop = !serverQueue.loop;
        var Embed = new MessageEmbed()
        .setAuthor("Döngü Ayarladı!", "https://github.com/SudhanPlayz/Discord-MusicBot/blob/master/assets/logo.gif?raw=true", "https://discord.gg/delimine")
        .setColor("#5555dd")
        .addField("Döngü", serverQueue.loop == true ? "Açık" : "Kapalı")
        .setFooter(message.client.user.username, message.client.user.displayAvatarURL())
        .setTimestamp();
        return message.channel.send({ embed: Embed });
      } else {
        return message.channel.send(":x: Bu sunucuda hiç bir şey oynatılmıyor!");
      }
    }
  }

  async durdur(message) {
    var channel = message.member.voice.channel;
    if (!channel) {
      return message.channel.send(":x: Sen bir sesli kanalda değilsin!");
    } else {
      var serverQueue = this.queue.get(message.guild.id);
      if (!serverQueue) {
        return message.channel.send(":x: Bu sunucuda hiç bir şey oynatılmıyor!"); 
      } else {
        if (!serverQueue.connection) return;
        if (!serverQueue.connection.dispatcher) return;
        var Embed = new MessageEmbed()
        .setAuthor("Müzik Ayarlandı!", "https://github.com/SudhanPlayz/Discord-MusicBot/blob/master/assets/logo.gif?raw=true", "https://discord.gg/delimine")
        .setColor("GREEN")
        .addField("Müzik", "Durduruldu!")
        .setFooter(message.client.user.username, message.client.user.displayAvatarURL())
        .setTimestamp();
        return message.channel.send({ embed: Embed });
        try {
          serverQueue.connection.dispatcher.end();
        } catch (e) {
          return channel.leave();
          this.queue.delete(message.guild.id);
          throw new Error(e);
        }
        this.queue.delete(message.guild.id);
        serverQueue.songs = [];
      }
    }
  }

  async atla(message) {
    var channel = message.member.voice.channel;
    if (!channel) {
      return message.channel.send(":x: Sen bir sesli kanalda değilsin!");
    } else {
      var serverQueue = this.queue.get(message.guild.id);
      if (!serverQueue) {
        return message.channel.send(":x: Bu sunucuda hiç bir şey oynatılmıyor!");
      } else {
        if (!serverQueue.connection) return;
        if (!serverQueue.connection.dispatcher) return;
        serverQueue.playing = true;
        serverQueue.connection.dispatcher.resume();
        var Embed = new MessageEmbed()
        .setAuthor("Müzik Ayarlandı!", "https://github.com/SudhanPlayz/Discord-MusicBot/blob/master/assets/logo.gif?raw=true", "https://discord.gg/delimine")
        .setColor("#5555dd")
        .addField("Müzik", "Atlandı!")
        .setFooter(message.client.user.username, message.client.user.displayAvatarURL())
        .setTimestamp();
        return message.channel.send({ embed: Embed });
      }
      try {
        serverQueue.connection.dispatcher.end();
      } catch (e) {
        serverQueue.voiceChannel.leave();
        this.queue.delete(message.guild.id);
        throw new Error(e);
      }
    }
  }

  async devam(message) {
    var channel = message.member.voice.channel;
    if (!channel) {
      return message.channel.send(":x: Sen bir sesli kanalda değilsin!");
    } else {
      var serverQueue = this.queue.get(message.guild.id);
      if (serverQueue && !serverQueue.playing) {
        serverQueue.playing = true;
        serverQueue.connection.dispatcher.resume();
        var Embed = new MessageEmbed()
        .setAuthor("Müzik Ayarlandı!", "https://github.com/SudhanPlayz/Discord-MusicBot/blob/master/assets/logo.gif?raw=true", "https://discord.gg/delimine")
        .setColor("#5555dd")
        .addField("Müzik", "Devam Ettirildi!")
        .setFooter(message.client.user.username, message.client.user.displayAvatarURL())
        .setTimestamp();
        return message.channel.send({ embed: Embed });
      } else {
        return message.channel.send(":x: Bu sunucuda hiç bir şey oynatılmıyor!");
      }
    }
  }

  async sıra(message, prefix) {
    var channel = message.member.voice.channel;
    if (!channel) {
      return message.channel.send(":x: Sen bir sesli kanalda değilsin!");
    } else {
      const perm = channel.permissionsFor(message.client.user);
      if (!perm.has(["MANAGE_MESSAGES", "ADD_REACTIONS"])) {
        return message.channel.send(":x: Mesajları Yönetmek veya Reaksiyon Eklemek için yetkim eksik!");
      } else {
        var queue = this.queue.get(message.guild.id);
        if (!queue) {
          return message.channel.send(":x: Bu sunucuda hiç bir şey oynatılmıyor!");
        } else {
          var currentPage = 0;
          var embeds = generateQueueEmbed(message, queue.songs);
          var queueEmbed = await message.channel.send(`**\`${currentPage + 1}\`**/**${embeds.length}**`, embeds[currentPage]);
          try {
            await queueEmbed.react("⬅️");
            await queueEmbed.react("🛑");
            await queueEmbed.react("➡️");
          } catch (e) {
            throw new Error(e);
          }
          var filter = (reaction, user) => ["⬅️", "🛑", "➡️"].includes(reaction.emoji.name) && message.author.id === user.id;
          var collector = queueEmbed.createReactionCollector(filter, { time: 60000 });
          collector.on('collect', async (reaction, user) => {
            try {
              if (reaction.emoji.name === "➡️") {
                if (currentPage < embeds.length - 1) {
                  currentPage++;
                  queueEmbed.edit(`**\`${currentPage + 1}\`**/**${embeds.length}**`, embeds[currentPage]);
                }
              } else if (reaction.emoji.name === "⬅️") {
                if (currentPage !== 0) {
                  --currentPage;
                  queueEmbed.edit(`**\`${currentPage + 1}\`**/**${embeds.length}**`, embeds[currentPage]);
                }
              } else {
                collector.stop();
                reaction.message.reactions.removeAll();
              }
            } catch (e) {
              throw new Error(e);
            }
          })
        }
      }
    }
    function generateQueueEmbed(message, queue) {
      var embeds = [];
      var k = 10;
      for (let i = 0; i < queue.length; i += 10) {
        const current = queue.slice(i, k);
        let j = i;
        k += 10;
        var info = current.map((track) => `**\`${++j}\`** | [\`${track.title}\`](${track.url})`).join("\n");
        var serverQueue = this.queue.get(message.guild.id);
        var Embed = new MessageEmbed()
        .setAuthor("Sunucu Şarkıları Sırası", "https://github.com/SudhanPlayz/Discord-MusicBot/blob/master/assets/logo.gif?raw=true", "https://discord.gg/delimine")
        .setThumbnail(message.guild.iconURL())
        .setColor("#5555dd")
        .setDescription(`${info}`)
        .addField("Şimdi Oynayan", `[${queue[0].title}](${queue[0].url})`, true)
        .addField("Metin Kanalı", serverQueue.textChannel, true)
        .addField("Ses Kanalı", serverQueue.voiceChannel, true)
        .setFooter("Şu anda Sunucu Sesi "+serverQueue.volume)
        if (serverQueue.songs.length === 1) embed.setDescription(`Bundan sonra çalınacak şarkı yok \`${prefix}oynat <şarkı_adı>\``)
        embeds.push(Embed);
      }
      return embeds;
    }
  }
}

module.exports = YouTube;
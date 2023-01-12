//reffer wwebjs documentation and do changes as you want.
//also reffer docummentation https://beta.openai.com/docs/api-reference/completions
//and get api key from https://beta.openai.com/account/api-keys and save it into your system as OPENAI_API_KEY as a environment variable (windows only). in linux paste it directly here

const { Configuration, OpenAIApi } = require("openai");
const qrcode = require("qrcode-terminal");
const mime = require("mime-types");
const fs = require("fs");
const translate = require("google-translate-api-x");

const {
  Client,
  LocalAuth,
  MessageMedia,
  Buttons,
  List,
} = require("whatsapp-web.js");
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
  ffmpeg: "/usr/bin/ffmpeg", //This is linux default ffmpeg path || in winodws after extracting ffmpeg.exe to this path change this to ./ffmpeg
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("loading_screen", (percent, message) => {
  console.log("LOADING SCREEN", percent, message);
});

client.on("qr", (qr) => {
  // NOTE: This event will not be fired if a session is specified.
  console.log("QR RECEIVED", qr);
});

client.on("authenticated", () => {
  console.log("AUTHENTICATED");
});

client.on("auth_failure", (msg) => {
  // Fired if session restore was unsuccessful
  console.error("AUTHENTICATION FAILURE", msg);
});

client.on("ready", () => {
  console.log("READY");
});

client.initialize();

client.on("message", async (msg) => {
  let chat = await msg.getChat();
  chat.sendSeen();
  //console.log("MESSAGE RECEIVED", msg);

  //These two are for get openai responses with quoting previous message from bot. These two can do kinda continuous chat as they reads previous message from bot

  //first one is for private chats and it gets sarcastic replies, using openai marv the sarcastic bot example
  if (!chat.isGroup) {
    if (msg.hasQuotedMsg) {
      if (!msg.body.startsWith("!")) {
        if (msg.type === "chat") {
          const quotedMsg = await msg.getQuotedMessage();
          if (quotedMsg.fromMe) {
            msg.react("💬");
            const configuration = new Configuration({
              apiKey: process.env.OPENAI_API_KEY,
            });
            const openai = new OpenAIApi(configuration);
            try {
              const completion = await openai.createCompletion({
                model: "text-davinci-003",
                //use your bot name here in Botname
                prompt:
                  `Botname is a chatbot that reluctantly answers questions with sarcastic responses: \nBotname: ${quotedMsg.body}\n\nYou:` +
                  msg.body +
                  `\nBotname:`,
                temperature: 0.5, //you can change these values reffering api documentation and openai examples
                max_tokens: 60,
                top_p: 0.3,
                frequency_penalty: 0.5,
                presence_penalty: 0,
                user: msg.author,
              });
              //console.log(completion.data.choices[0].text);
              setTimeout(() => {
                msg.react("✅");
                msg.reply(completion.data.choices[0].text);
              }, 300);
            } catch (error) {
              if (error.response) {
                console.log(error.response.status);
                console.log(error.response.data);
              } else {
                console.log(error.message);
              }
            }
          }
        }
      }
    }
  }
  //second one is for group chats and it gets helpful replies, using chat example
  if (chat.isGroup) {
    if (msg.hasQuotedMsg) {
      if (!msg.body.startsWith("!")) {
        if (msg.type === "chat") {
          const quotedMsg = await msg.getQuotedMessage();
          if (quotedMsg.fromMe) {
            msg.react("💬");
            const configuration = new Configuration({
              apiKey: process.env.OPENAI_API_KEY,
            });
            const openai = new OpenAIApi(configuration);
            try {
              const completion = await openai.createCompletion({
                model: "text-davinci-003",
                //here also use your bot name
                prompt:
                  `The following is a conversation with Botname. Botname is helpful, creative, clever, and very friendly.\nBotname: ${quotedMsg.body}\n\nHuman:` +
                  msg.body +
                  `\nBotname:`,
                temperature: 0.9,
                max_tokens: 250,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0.6,
                stop: [" Human:", " Botname:"],
                user: msg.author,
              });
              //console.log(completion.data.choices[0].text);
              setTimeout(() => {
                msg.react("✅");
                msg.reply(completion.data.choices[0].text);
              }, 300);
            } catch (error) {
              if (error.response) {
                console.log(error.response.status);
                console.log(error.response.data);
              } else {
                console.log(error.message);
              }
            }
          }
        }
      }
    }
  }

  //check bot alive
  if (msg.body === "!bot") {
    msg.react("😎");
    msg.reply('I am here. Type & send "!help" to get all commands');
  }
  //check bot commands
  else if (msg.body === "!help") {
    let chat = await msg.getChat();
    const media = MessageMedia.fromFilePath("/root/wabot/bibi.png"); //I have sent image with !help command
    chat.sendMessage(media, {
      caption: `🔰 *Hello I am Botname the Bot* 🔰
      
        ⬇️Commands⬇️

          _!tagall_
          _!sticker_
          _!groupinfo_
          _!botinfo_
          _!bot ..._ (start any message with !bot)
          _!gen ..._ (Dall-E image generation)
          _!code ..._ (Code check)
          _!traen_ (Translate to English)
          _!trasin_ (Translate to Sinhala)
          _!chats_ (Chats that opened within bot)
          _!id_ (Id of a group or chat)
          _!sendowner ..._ (Send message to owner)

          _Also send any message mentioning my previous message for like AI assistant in groups and Sarcastic replies in private chats_
       `,
    });
  }

  //reply to hi and also !bot, !code !gen commands who use without any text
  else if (
    msg.body === "Hi" ||
    msg.body === "hi" ||
    msg.body === "!bot" ||
    msg.body === "!gen" ||
    msg.body === "!code"
  ) {
    setTimeout(() => {
      msg.react("🙃");
      msg.reply("Hi there. How can I help you?");
    }, 400);
  }

  //get bot info
  else if (msg.body === "!botinfo") {
    let info = client.info;
    msg.reply(
      client.sendMessage(
        msg.from,
        `
          *Bot info*
          User name: ${info.pushname}
          Platform: ${info.platform}
          My number: ${info.wid.user}

          _This bot is based on the WhatsApp-Web.js and can do many things. Type !help to get commands_
      `
      )
    );
  }

  // Direct send a new message to owner only from private chats
  else if (msg.body.startsWith("!sendowner ")) {
    msg.react("🔄️");
    if (!chat.isGroup) {
      const contact = await msg.getContact();
      let message = msg.body.slice(11);
      let number = `9xxxxxxxxx@c.us`; //owners number
      setTimeout(() => {
        msg.react("✅");
        msg.reply("Done. Sent to owner");
        client.sendMessage(
          number,
          `${contact.pushname} 
               ${contact.id.user}
          
               ${message}`
        );
      }, 800);
    }
  }

  // Direct send a new message to specific id
  // This is useful when someone use sendowner command and send owner a message
  // Use  number and message afer .sendton like .sendton 947xxxxxxxx hello
  else if (msg.body.startsWith(".sendton ")) {
    let number = msg.body.split(" ")[1];
    let messageIndex = msg.body.indexOf(number) + number.length;
    let message = msg.body.slice(messageIndex, msg.body.length);
    number = number.includes("@c.us") ? number : `${number}@c.us`;
    setTimeout(() => {
      msg.react("✅");
      client.sendMessage(
        number,
        `🔰 *Message from owner* 🔰
            ⬇️
            ${message}`
      );
    }, 500);
  }

  // Get how many chats opened in bot
  else if (msg.body === "!chats") {
    const chats = await client.getChats();
    setTimeout(() => {
      msg.react("✅");
      client.sendMessage(msg.from, `I have ${chats.length} chats open.`);
    }, 400);
  }

  // Get id of a chat
  else if (msg.body === "!id") {
    let id = chat.id.user;
    let number = `947xxxxxxxx@c.us`; //this is owners number and this will send owner the id
    msg.react("✅");
    client.sendMessage(number, id);
    //console.log(id) // can get console also
  }

  //join or leave
  else if (msg.body === "!leave") {
    //Any admin can remove bot from group
    // Leave the group
    const authorId = msg.author;
    let chat = await msg.getChat();
    if (chat.isGroup) {
      for (let participant of chat.participants) {
        if (participant.id._serialized === authorId && participant.isAdmin) {
          chat.leave();
        }
      }
    } else {
      msg.reply("This command can only be used in a group and admins.");
    }
  } else if (msg.body.startsWith("!joinlink ")) {
    // Send .joinlink group link to join. but use any other as this can be used by anyone
    const inviteLink = msg.body.split(" ")[1];
    inviteCode = inviteLink.replace("https://chat.whatsapp.com/", "");
    try {
      await client.acceptInvite(inviteCode);
      msg.react("✅");
      msg.reply("Joined the group.");
    } catch (e) {
      msg.reply("That invite link seems to be invalid.");
    }
  }

  //make whatsapp stickers
  //ffmpeg required
  else if (msg.body === "!sticker") {
    const contact = await msg.getContact();
    if (msg.hasMedia) {
      msg.react("✅");
      msg.downloadMedia().then((media) => {
        if (media) {
          const mediaPath = "./downloaded-media/";

          if (!fs.existsSync(mediaPath)) {
            fs.mkdirSync(mediaPath);
          }

          const extension = mime.extension(media.mimetype);
          const filename = new Date().getTime();
          const fullFilename = mediaPath + filename + "." + extension;
          // Save to file
          try {
            fs.writeFileSync(fullFilename, media.data, {
              encoding: "base64",
            });
            console.log("File downloaded successfully!", fullFilename);
            console.log(fullFilename);
            MessageMedia.fromFilePath((filePath = fullFilename));
            client.sendMessage(
              msg.from,
              new MessageMedia(media.mimetype, media.data, filename),
              {
                sendMediaAsSticker: true,
                stickerAuthor: `${contact.pushname}`,
                stickerName: "Created by Botname Bot to",
              }
            );
            fs.unlinkSync(fullFilename);
            console.log(`File Deleted successfully!`);
          } catch (err) {
            console.log("Failed to save the file:", err);
            console.log(`File Deleted successfully!`);
          }
        }
      });
    } else {
      msg.react("🚫");
      msg.reply(`send image/video/gif with caption *!sticker* `);
    }
  }
  //get group info
  else if (msg.body === "!groupinfo") {
    let chat = await msg.getChat();
    if (chat.isGroup) {
      msg.reply(`
      *Group Details*
      
      Name: ${chat.name}

      Description: ${chat.description}
  
      Created At: ${chat.createdAt.toString()}
  
      Created By: ${chat.owner.user}
  
      Participant count: ${chat.participants.length}
     `);
    } else {
      msg.reply("This command can only be used in a group!");
    }
  }
  //mentioning all group members
  else if (msg.body === "!tagall") {
    const authorId = msg.author;
    let chat = await msg.getChat();
    if (chat.isGroup) {
      for (let participant of chat.participants) {
        if (participant.id._serialized === authorId && participant.isAdmin) {
          let mentions = [];

          for (let participant of chat.participants) {
            const contact = await client.getContactById(
              participant.id._serialized
            );

            mentions.push(contact);
          }
          let quotedMsg = await msg.getQuotedMessage();

          //send quoted msg with mentioning
          if (quotedMsg) {
            msg.react("🔖");
            await chat.sendMessage(quotedMsg.body, { mentions });
            break;
          } else {
            //send a msg with mentioning
            msg.react("🏷️");
            await chat.sendMessage("An admin mentioned all members", {
              mentions,
            });
            break;
          }
        } else if (
          participant.id._serialized === authorId &&
          !participant.isAdmin
        ) {
          if (msg.body === "!tagall") {
            msg.react("🚫");
            msg.reply("The command can only be used by group admins.");
            break;
          }
        }
      }
    }
  }
  //connected openai - chat
  else if (msg.body.startsWith("!bot ")) {
    if (
      //had use this because sometimes hi hello gets weird replies
      msg.body.startsWith("!bot Hi ") ||
      msg.body.startsWith("!bot hi ") ||
      msg.body.startsWith("!bot Hello ") ||
      msg.body.startsWith("!bot hello ") ||
      msg.body.startsWith("!bot Hey ") ||
      msg.body.startsWith("!bot hey ") ||
      msg.body === "!bot Hi" ||
      msg.body === "!bot Hi " ||
      msg.body === "!bot hi" ||
      msg.body === "!bot hi " ||
      msg.body === "!bot Hello" ||
      msg.body === "!bot Hello " ||
      msg.body === "!bot hello" ||
      msg.body === "!bot hello " ||
      msg.body === "!bot Hey" ||
      msg.body === "!bot Hey " ||
      msg.body === "!bot hey" ||
      msg.body === "!bot hey "
    ) {
      setTimeout(() => {
        msg.react("🙃");
        msg.reply("Hi there. How can I help you?");
      }, 400);
    } else {
      msg.react("💬");
      const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const openai = new OpenAIApi(configuration);

      try {
        const completion = await openai.createCompletion({
          model: "text-davinci-003",
          prompt: msg.body.slice(4),
          temperature: 0.9,
          max_tokens: 1000,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0.6,
          user: msg.author,
        });
        //console.log(completion.data.choices[0].text);
        setTimeout(() => {
          msg.react("✅");
          msg.reply(completion.data.choices[0].text);
        }, 300);
      } catch (error) {
        if (error.response) {
          console.log(error.response.status);
          console.log(error.response.data);
        } else {
          console.log(error.message);
        }
      }
    }
  }
  //openai Dall e image gen
  //reffer docummentation https://beta.openai.com/docs/api-reference/images/create  and change values
  else if (msg.body.startsWith("!gen ")) {
    let chat = await msg.getChat();
    msg.react("💬");
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    try {
      const response = await openai.createImage({
        prompt: msg.body.slice(5),
        n: 1,
        size: "1024x1024",
      });
      image_url = response.data.data[0].url;
      const media = await MessageMedia.fromUrl(image_url);
      msg.reply(media);
    } catch (error) {
      if (error.response) {
        console.log(error.response.status);
        console.log(error.response.data);
        msg.reply(
          "Your request was rejected as a result of our safety system. Your prompt may contain text that is not allowed by our safety system."
        );
      } else {
        console.log(error.message);
      }
    }
  }

  //reffer documentation and change values
  else if (msg.body.startsWith("!code ")) {
    msg.react("💬");
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    try {
      const completion = await openai.createCompletion({
        model: "code-davinci-002",
        prompt: msg.body.slice(6),
        temperature: 0,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        user: msg.author,
      });
      //console.log(completion.data.choices[0].text);
      setTimeout(() => {
        msg.react("✅");
        msg.reply(completion.data.choices[0].text);
      }, 300);
    } catch (error) {
      if (error.response) {
        console.log(error.response.status);
        msg.reply("Invalid request or Limit reached. Try again later....");
        console.log(error.response.data);
      } else {
        console.log(error.message);
      }
    }
  }

  //https://cloud.google.com/translate/docs/languages you can get language codes from here

  //Translate any language to English
  else if (msg.body.startsWith("!traen ")) {
    msg.react("🔄️");
    prompt = msg.body.slice(5);
    const res = await translate(`${prompt}`, { to: "en", autoCorrect: true });
    setTimeout(() => {
      msg.react("✅");
      msg.reply(res.text);
    }, 300);
  }

  //Translate any language to Sinhala
  else if (msg.body.startsWith("!trasin ")) {
    msg.react("🔄️");
    prompt = msg.body.slice(5);
    const res = await translate(`${prompt}`, { to: "si", autoCorrect: true });
    setTimeout(() => {
      msg.react("✅");
      msg.reply(res.text);
    }, 300);
  }

  //These are for Used for exchanging papers in my group . But contains how to send media from URl , Buttons & Lists
  else if (msg.body === "!deadlines") {
    let chat = await msg.getChat();
    const media = await MessageMedia.fromUrl("image or any file url link");
    chat.sendMessage(media, {
      caption: "Caption ",
    });
  }

  // Buttons
  else if (msg.body === "!papers") {
    let button1 = new Buttons(
      "Body",
      [{ body: "button name" }],
      "Header",
      "Footer"
    );
    client.sendMessage(msg.from, button1);
  }
  //List
  else if (msg.body === "button name") {
    let sections = [
      {
        title: "List title",
        rows: [
          { title: "1" },
          { title: "2" },
          { title: "3" },
          { title: "4" },
          { title: "5" },
        ],
      },
    ];
    let list1 = new List("List body", "Click Here", sections);
    await client.sendMessage(msg.from, list1);
  }
  //sending local files
  else if (msg.body === "1") {
    const media = MessageMedia.fromFilePath("file path");
    chat.sendMessage(media, { caption: "caption" });
  } else if (msg.body === "2") {
    const media = MessageMedia.fromFilePath("file path");
    chat.sendMessage(media, { caption: "caption" });
  } else if (msg.body === "3") {
    const media = MessageMedia.fromFilePath("file path");
    chat.sendMessage(media, { caption: "caption" });
  } else if (msg.body === "4") {
    const media = MessageMedia.fromFilePath("file path");
    chat.sendMessage(media, { caption: "caption" });
  } else if (msg.body === "5") {
    const media = MessageMedia.fromFilePath("file path");
    chat.sendMessage(media, { caption: "caption" });
  }
});

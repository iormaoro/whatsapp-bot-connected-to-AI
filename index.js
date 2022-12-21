//This code created by https://github.com/ravishkaw getting help from whatsapp-web.js and commit changes as your needs

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
  ffmpeg: "/usr/bin/ffmpeg", //This is linux default ffmpeg path || inn winodws after extracting ffmpeg.exe to this path change this to ./ffmpeg
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
      caption: `🔰 *Hello I am Bibi the Bot* 🔰
      _Still in beta_ 👷‍♂️
      
        ⬇️Commands⬇️

          _!tagall_
          _!sticker_
          _!groupinfo_
          _!botinfo_
          _!bot ..._ (start any message with !bot)
          _!traen_ (Translate to English)
          _!trasin_ (Translate to Sinhala)
       `,
    });
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
  //join or leave
  else if (msg.body === "!leave" && msg.author === "9471xxxxx@c.us") {
    //This means only owner can remove bot from group
    // Leave the group
    let chat = await msg.getChat();
    if (chat.isGroup) {
      chat.leave();
    } else {
      msg.reply("This command can only be used in a group!");
    }
  } else if (
    /*This command works only in group as it is checking msg sender. 
    //if you want to use within private msg just remove msg.author line. But any user who use !join along with link will able
    to add your bot. */

    //send !join invite link
    msg.body.startsWith("!join ") &&
    msg.author === "9471xxxxx@c.us"
  ) {
    const inviteLink = msg.body.split(" ")[1];
    inviteCode = inviteLink.replace("https://chat.whatsapp.com/", "");
    try {
      await client.acceptInvite(inviteCode);
      msg.react("✅");
      msg.reply("Joined the group!");
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
                stickerName: "Created by Bibi Bot to",
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
  //reffer docummentation https://beta.openai.com/docs/api-reference/completions  and change values
  else if (msg.body.startsWith("!bot ")) {
    msg.react("💬");
    const configuration = new Configuration({
      apiKey: (process.env.OPENAI_API_KEY =
        "get api key from https://beta.openai.com/account/api-keys and paste here"),
    });
    const openai = new OpenAIApi(configuration);

    try {
      const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: msg.body.slice(5),
        temperature: 0.9,
        max_tokens: 500,
        top_p: 1,
        frequency_penalty: 0.5,
        presence_penalty: 0.6,
      });
      //console.log(completion.data.choices[0].text);
      msg.reply(completion.data.choices[0].text);
    } catch (error) {
      if (error.response) {
        console.log(error.response.status);
        console.log(error.response.data);
      } else {
        console.log(error.message);
      }
    }
  }
  //openai Dall e image gen
  //reffer docummentation https://beta.openai.com/docs/api-reference/images/create  and change values
  else if (msg.body.startsWith("!gen ")) {
    let chat = await msg.getChat();
    msg.react("💬");
    const configuration = new Configuration({
      apiKey: (process.env.OPENAI_API_KEY =
        "get api key from https://beta.openai.com/account/api-keys and paste here"),
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

  //https://cloud.google.com/translate/docs/languages you can get language codes from here

  //Translate any language to English
  else if (msg.body.startsWith("!traen ")) {
    let chat = await msg.getChat();
    prompt = msg.body.slice(7);
    const res = await translate(`${prompt}`, { to: "en", autoCorrect: true });
    msg.react("✅");
    msg.reply(res.text);
  }
  //Translate any language to Sinhala
  else if (msg.body.startsWith("!trasin ")) {
    let chat = await msg.getChat();
    prompt = msg.body.slice(8);
    const res = await translate(`${prompt}`, { to: "si", autoCorrect: true });
    msg.react("✅");
    msg.reply(res.text);
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
